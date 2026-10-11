"""
语音合成服务模块
使用百度「短文本在线合成」API 把文字转成 MP3 音频。

为什么需要这个模块：
    浏览器自带的 Web Speech API（speechSynthesis）依赖**系统 TTS 引擎**。
    国产浏览器（如华为浏览器）很多没有可用引擎，getVoices() 返回空数组，
    此时 speechSynthesis.speak() 会**静默失败** —— 不报错、也不出声。
    改由服务端合成 MP3 返回，前端用 <audio> 播放，就不受浏览器差异影响。

实测结论（决定了下面的实现方式）：
    - 返回的是**裸 MP3 帧**（起始字节 ff f3），没有 ID3 头
      => 多段音频可以直接字节拼接，长文本分片合成后再拼起来即可
    - 单次 200 字可正常合成
    - spd 参数确实生效（spd 越大音频越短）
"""

import hashlib
import os
import re
import time
from collections import OrderedDict
from typing import Optional, Tuple

import requests


class TTSService:
    """百度短文本在线合成服务类"""

    # 百度基础版发音人。精品音库需要额外权限，这里只用基础版，保证可用。
    VALID_SPEAKERS = (0, 1, 3, 4)
    SPEAKER_NAMES = {
        0: '度小美（女声）',
        1: '度小宇（男声）',
        3: '度逍遥（男声）',
        4: '度丫丫（童声女声）',
    }

    def __init__(self):
        self.app_id: Optional[str] = None
        self.api_key: Optional[str] = None
        self.secret_key: Optional[str] = None

        self.token_url = 'https://openapi.baidu.com/oauth/2.0/token'
        self.tts_url = 'https://tsn.baidu.com/text2audio'

        self.access_token: Optional[str] = None
        self.token_expire_time: float = 0

        # 单次请求的文本上限。实测 200 字可通过，这里保持一致并留余量。
        self.max_chunk_chars = 200
        # 单次朗读的总长度上限，避免这个接口被当成免费 TTS 网关滥用
        self.max_total_chars = 600

        # 合成结果缓存：同一个单词会被反复朗读，没必要每次都消耗额度
        self._cache: 'OrderedDict[tuple, bytes]' = OrderedDict()
        self._cache_limit = 300
        # 简单统计，方便排查
        self.cache_hits = 0
        self.cache_misses = 0
        self.disk_hits = 0

        # 磁盘缓存目录：放在持久化卷里，容器重建/重启都不会丢，
        # 这样"一个单词只调用一次百度"才真的成立。
        self.cache_dir = self._resolve_cache_dir()
        self._disk_file_limit = 3000
        self._writes_since_cleanup = 0
        try:
            os.makedirs(self.cache_dir, exist_ok=True)
            print(f"💾 [语音合成] 磁盘缓存目录: {self.cache_dir}")
        except Exception as e:
            print(f"⚠️  [语音合成] 无法创建磁盘缓存目录，将只用内存缓存: {e}")
            self.cache_dir = None

    def _resolve_cache_dir(self) -> Optional[str]:
        """缓存目录优先跟随数据库所在目录（那是 compose 里持久化的卷）"""
        configured = os.getenv('TTS_CACHE_DIR')
        if configured:
            return configured

        db_path = os.getenv('DATABASE_PATH')
        if db_path:
            return os.path.join(os.path.dirname(db_path), 'tts_cache')

        here = os.path.dirname(os.path.abspath(__file__))
        return os.path.abspath(os.path.join(here, '..', '..', 'database', 'tts_cache'))

    # ---------- 配置 ----------

    def set_config(self, app_id: str, api_key: str, secret_key: str):
        """设置百度语音合成 API 配置"""
        self.app_id = app_id
        self.api_key = api_key
        self.secret_key = secret_key
        # 换密钥就让旧 token 失效
        self.access_token = None
        self.token_expire_time = 0
        print("✅ 已配置百度语音合成API")

    def is_configured(self) -> bool:
        return bool(self.api_key and self.secret_key)

    # ---------- 令牌 ----------

    def get_access_token(self) -> Optional[str]:
        """获取访问令牌（带缓存，有效期 30 天）"""
        if self.access_token and time.time() < self.token_expire_time:
            return self.access_token

        if not self.is_configured():
            print("❌ 百度语音合成API未配置")
            return None

        try:
            response = requests.post(self.token_url, params={
                'grant_type': 'client_credentials',
                'client_id': self.api_key,
                'client_secret': self.secret_key,
            }, timeout=10)

            if response.status_code != 200:
                print(f"❌ [语音合成] 获取令牌失败: {response.status_code}, {response.text[:200]}")
                return None

            data = response.json()
            token = data.get('access_token')
            if not token:
                print(f"❌ [语音合成] 返回中没有 access_token: {data.get('error')} {data.get('error_description')}")
                return None

            expires_in = data.get('expires_in', 2592000)  # 默认 30 天
            self.access_token = token
            self.token_expire_time = time.time() + expires_in - 300  # 提前 5 分钟刷新
            print(f"✅ [语音合成] 访问令牌获取成功，有效期 {expires_in} 秒")
            return token

        except Exception as e:
            print(f"❌ [语音合成] 获取令牌异常: {type(e).__name__}: {e}")
            return None

    # ---------- 文本切分 ----------

    def _normalize_lang(self, lang: str) -> str:
        """把前端传来的 zh-CN / en-US 等归一成百度认识的 zh / en"""
        lang = (lang or '').lower()
        if lang.startswith('en'):
            return 'en'
        if lang.startswith('ct') or 'yue' in lang:
            return 'ct'
        return 'zh'

    def _rate_to_spd(self, rate: float) -> int:
        """把前端习惯的 rate（1.0 为正常）换算成百度的 spd（0-15，默认 5）"""
        try:
            rate = float(rate)
        except (TypeError, ValueError):
            rate = 1.0
        spd = int(round(rate * 5))
        return max(0, min(15, spd))

    def _normalize_speaker(self, per) -> int:
        try:
            per = int(per)
        except (TypeError, ValueError):
            per = 0
        return per if per in self.VALID_SPEAKERS else 0

    def _split_text(self, text: str):
        """
        按句子切分，尽量在标点处断开。
        因为每段音频是独立合成的，在句子中间硬切会让听感很突兀。
        """
        pieces = re.split(r'(?<=[。！？；!?;])', text)
        chunks = []
        for piece in pieces:
            piece = piece.strip()
            if not piece:
                continue
            # 单句还是超长，只能硬切
            while len(piece) > self.max_chunk_chars:
                chunks.append(piece[:self.max_chunk_chars])
                piece = piece[self.max_chunk_chars:]
            if piece:
                chunks.append(piece)
        return chunks

    # ---------- 磁盘缓存 ----------

    def _disk_path(self, cache_key: tuple) -> Optional[str]:
        if not self.cache_dir:
            return None
        raw = '\u0000'.join(str(x) for x in cache_key).encode('utf-8')
        digest = hashlib.sha256(raw).hexdigest()[:32]
        return os.path.join(self.cache_dir, digest + '.mp3')

    def _load_from_disk(self, cache_key: tuple) -> Optional[bytes]:
        path = self._disk_path(cache_key)
        if not path or not os.path.exists(path):
            return None
        try:
            with open(path, 'rb') as f:
                return f.read()
        except Exception as e:
            print(f"⚠️  [语音合成] 读取磁盘缓存失败: {e}")
            return None

    def _save_to_disk(self, cache_key: tuple, audio: bytes):
        path = self._disk_path(cache_key)
        if not path:
            return
        try:
            # 先写临时文件再原子改名，避免并发读到写了一半的文件
            tmp = path + '.tmp'
            with open(tmp, 'wb') as f:
                f.write(audio)
            os.replace(tmp, path)

            self._writes_since_cleanup += 1
            if self._writes_since_cleanup >= 20:
                self._writes_since_cleanup = 0
                self._cleanup_disk()
        except Exception as e:
            print(f"⚠️  [语音合成] 写入磁盘缓存失败: {e}")

    def _cleanup_disk(self):
        """文件数超限时，按修改时间删掉最旧的一批"""
        if not self.cache_dir:
            return
        try:
            files = [
                os.path.join(self.cache_dir, name)
                for name in os.listdir(self.cache_dir)
                if name.endswith('.mp3')
            ]
            if len(files) <= self._disk_file_limit:
                return
            files.sort(key=os.path.getmtime)
            for path in files[:len(files) - self._disk_file_limit]:
                try:
                    os.remove(path)
                except OSError:
                    pass
            print(f"🧹 [语音合成] 磁盘缓存已清理至 {self._disk_file_limit} 个文件")
        except Exception as e:
            print(f"⚠️  [语音合成] 清理磁盘缓存失败: {e}")

    # ---------- 合成 ----------

    def _synthesize_chunk(self, token: str, text: str, lan: str, spd: int, per: int) -> bytes:
        """合成一段文本，失败抛异常"""
        response = requests.post(self.tts_url, data={
            'tex': text,
            'tok': token,
            'cuid': 'wendy-translator',
            'ctp': 1,
            'lan': lan,
            'spd': spd,
            'pit': 5,
            'vol': 9,
            'per': per,
            'aue': 3,  # 3 = mp3
        }, timeout=20)

        content_type = response.headers.get('Content-Type', '')
        if 'audio' in content_type:
            return response.content

        # 失败时百度返回的是 JSON
        detail = ''
        try:
            data = response.json()
            detail = f"err_no={data.get('err_no')} err_msg={data.get('err_msg')}"
        except Exception:
            detail = response.text[:200]
        raise RuntimeError(f"百度语音合成失败: {detail}")

    def synthesize(self, text: str, lang: str = 'zh', rate: float = 1.0,
                   per: int = 0) -> Tuple[bytes, str]:
        """
        合成语音。

        返回 (音频字节, MIME 类型)。失败时抛 RuntimeError。
        """
        text = (text or '').strip()
        if not text:
            raise ValueError('文本为空')

        if len(text) > self.max_total_chars:
            text = text[:self.max_total_chars]

        lan = self._normalize_lang(lang)
        spd = self._rate_to_spd(rate)
        speaker = self._normalize_speaker(per)

        cache_key = (text, lan, spd, speaker)

        # 1) 内存缓存
        cached = self._cache.get(cache_key)
        if cached is not None:
            self._cache.move_to_end(cache_key)
            self.cache_hits += 1
            return cached, 'audio/mp3'

        # 2) 磁盘缓存（容器重启、电脑重启后依然有效）
        disk_audio = self._load_from_disk(cache_key)
        if disk_audio is not None:
            self.disk_hits += 1
            self._cache[cache_key] = disk_audio
            if len(self._cache) > self._cache_limit:
                self._cache.popitem(last=False)
            return disk_audio, 'audio/mp3'

        # 3) 两种缓存都没有，只能真的调用百度了
        self.cache_misses += 1

        token = self.get_access_token()
        if not token:
            raise RuntimeError('百度语音合成未配置或获取令牌失败')

        chunks = self._split_text(text)
        if not chunks:
            raise ValueError('文本为空')

        # 分别是裸 MP3 帧，可以直接字节拼接（已实测无 ID3 头）
        parts = [self._synthesize_chunk(token, chunk, lan, spd, speaker) for chunk in chunks]
        audio = b''.join(parts)

        self._cache[cache_key] = audio
        if len(self._cache) > self._cache_limit:
            self._cache.popitem(last=False)  # 超限就丢最早的一条
        self._save_to_disk(cache_key, audio)

        return audio, 'audio/mp3'

    def cache_info(self) -> dict:
        """
        缓存与用量统计。
        「baidu_calls」就是真正会消耗百度免费额度的次数，
        可以用它来确认缓存到底有没有在省额度。
        """
        disk_files = 0
        disk_bytes = 0
        if self.cache_dir and os.path.isdir(self.cache_dir):
            try:
                for name in os.listdir(self.cache_dir):
                    if name.endswith('.mp3'):
                        disk_files += 1
                        disk_bytes += os.path.getsize(os.path.join(self.cache_dir, name))
            except OSError:
                pass

        return {
            # 已经合成好、以后不会再调用百度的音频条数
            'cached_sounds': disk_files,
            'cached_megabytes': round(disk_bytes / 1024 / 1024, 2),
            'memory_entries': len(self._cache),
            # 真正打到百度的次数 —— 消耗免费额度的就是它
            'baidu_calls': self.cache_misses,
            # 因为命中缓存而省下的百度调用次数
            'saved_baidu_calls': self.cache_hits + self.disk_hits,
            'memory_hits': self.cache_hits,
            'disk_hits': self.disk_hits,
            'cache_dir': self.cache_dir,
        }


# 全局单例
tts_service = TTSService()
