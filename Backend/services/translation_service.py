"""
翻译服务模块
支持多种翻译API接口
"""

import requests
import hashlib
import random
import time
import json
from typing import Dict, Optional, List

class TranslationService:
    """翻译服务类"""
    
    def __init__(self):
        # 百度翻译API配置 (需要在环境变量或配置文件中设置)
        self.baidu_appid = None  # 百度翻译APP ID
        self.baidu_secret = None # 百度翻译密钥
        self.baidu_url = "https://fanyi-api.baidu.com/api/trans/vip/translate"
        
        # 有道翻译API配置
        self.youdao_app_key = None
        self.youdao_app_secret = None
        self.youdao_url = "https://openapi.youdao.com/api"
        
        # 腾讯翻译API配置
        self.tencent_secretid = None
        self.tencent_secretkey = None
        
        # 当前使用的翻译服务
        self.current_service = "mock"  # mock, baidu, youdao, tencent
        
    def set_baidu_config(self, appid: str, secret: str):
        """设置百度翻译配置"""
        self.baidu_appid = appid
        self.baidu_secret = secret
        self.current_service = "baidu"
        try:
            print("✅ 已配置百度翻译API")
        except (UnicodeEncodeError, ValueError, OSError):
            print("已配置百度翻译API")
        
    def set_youdao_config(self, app_key: str, app_secret: str):
        """设置有道翻译配置"""
        self.youdao_app_key = app_key
        self.youdao_app_secret = app_secret
        self.current_service = "youdao"
        try:
            print("✅ 已配置有道翻译API")
        except (UnicodeEncodeError, ValueError, OSError):
            print("已配置有道翻译API")
        
    def translate(self, text: str, from_lang: str = "auto", to_lang: str = "zh") -> Dict:
        """
        翻译文本
        优先使用金山词霸，有道翻译作为备用
        Args:
            text: 待翻译文本
            from_lang: 源语言 (auto, en, zh等)
            to_lang: 目标语言 (zh, en等)
        Returns:
            翻译结果字典，包含：原单词、词性、词意、美式音标、音频URL、例句、例句翻译
        """
        print(f"\n{'='*60}")
        print(f"📝 [翻译服务] 开始翻译: '{text}' ({from_lang} -> {to_lang})")
        print(f"{'='*60}")
        
        # 优先使用金山词霸（仅对单个英文单词）
        if from_lang in ['en', 'auto'] and to_lang == 'zh':
            word_clean = text.strip().lower()
            if word_clean.isalpha() and ' ' not in word_clean:
                print(f"🔍 [策略] 检测到单个英文单词，优先使用金山词霸")
                result = self._translate_with_iciba_priority(text, from_lang, to_lang)
                if result and result.get('translated_text'):
                    print(f"✅ [策略] 使用金山词霸翻译成功")
                    return result
                else:
                    print(f"⚠️  [策略] 金山词霸无结果，切换到备用翻译服务")
        
        # 使用配置的翻译服务作为备用
        print(f"🔍 [策略] 使用配置的翻译服务: {self.current_service}")
        if self.current_service == "baidu":
            return self._translate_baidu(text, from_lang, to_lang)
        elif self.current_service == "youdao":
            return self._translate_youdao(text, from_lang, to_lang)
        elif self.current_service == "tencent":
            return self._translate_tencent(text, from_lang, to_lang)
        else:
            return self._translate_mock(text, from_lang, to_lang)
    
    def _translate_baidu(self, text: str, from_lang: str, to_lang: str) -> Dict:
        """百度翻译API"""
        if not self.baidu_appid or not self.baidu_secret:
            return self._get_fallback_result(text)
        
        # 构建请求参数
        salt = str(random.randint(32768, 65536))
        sign_str = self.baidu_appid + text + salt + self.baidu_secret
        sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
        
        params = {
            'appid': self.baidu_appid,
            'q': text,
            'from': from_lang,
            'to': to_lang,
            'salt': salt,
            'sign': sign
        }
        
        try:
            # 打印请求日志
            print(f"🔍 [百度翻译] 请求翻译: '{text}' ({from_lang} -> {to_lang})")
            print(f"   APP ID: {self.baidu_appid[:8]}...")
            print(f"   签名: {sign[:16]}...")
            
            response = requests.get(self.baidu_url, params=params, timeout=5)
            result = response.json()
            
            print(f"📥 [百度翻译] 响应状态: {response.status_code}")
            print(f"   响应内容: {str(result)[:200]}...")
            
            if 'error_code' in result:
                error_code = result.get('error_code')
                error_msg = result.get('error_msg', '未知错误')
                print(f"❌ [百度翻译] 翻译失败!")
                print(f"   错误代码: {error_code}")
                print(f"   错误信息: {error_msg}")
                return self._get_fallback_result(text)
            
            # 解析百度翻译结果
            translation_result = result['trans_result'][0]['dst']
            
            # 打印成功日志
            print(f"✅ [百度翻译] 翻译成功!")
            print(f"   原文: '{text}'")
            print(f"   译文: '{translation_result}'")
            print(f"   方向: {from_lang} -> {to_lang}")
            
            # 尝试获取更多词汇信息（这里简化处理）
            return {
                'translated_text': translation_result,
                'pronunciation': '',  # 百度API不直接提供音标
                'example_sentence': '',
                'example_translation': '',
                'audio_url': '',
                'source': 'baidu'
            }
            
        except Exception as e:
            print(f"❌ [百度翻译] 请求异常: {e}")
            return self._get_fallback_result(text)
    
    def _translate_youdao(self, text: str, from_lang: str, to_lang: str) -> Dict:
        """有道翻译API"""
        if not self.youdao_app_key or not self.youdao_app_secret:
            print("❌ [有道翻译] 未配置API密钥，使用回退翻译")
            return self._get_fallback_result(text)
        
        import time
        import uuid
        import base64
        import hashlib
        
        try:
            # 打印请求日志
            print(f"🌐 [有道翻译] 开始请求翻译")
            print(f"   原文: '{text}'")
            print(f"   方向: {from_lang} -> {to_lang}")
            print(f"   APP Key: {self.youdao_app_key[:8]}...")
            
            # 构建请求参数
            curtime = str(int(time.time()))
            salt = str(uuid.uuid1())
            
            # 计算input参数（根据有道API规范）
            text_length = len(text)
            if text_length <= 20:
                input_str = text
            else:
                input_str = text[:10] + str(text_length) + text[-10:]
            
            # 有道翻译签名算法 (v3): sha256(appKey + input + salt + curtime + appSecret)
            sign_str = self.youdao_app_key + input_str + salt + curtime + self.youdao_app_secret
            sign = hashlib.sha256(sign_str.encode('utf-8')).hexdigest()
            
            # 语言代码转换
            lang_map = {
                'en': 'en', 'zh': 'zh-CHS', 'auto': 'auto'
            }
            from_lang = lang_map.get(from_lang, from_lang)
            to_lang = lang_map.get(to_lang, to_lang)
            
            params = {
                'q': text,
                'from': from_lang,
                'to': to_lang,
                'appKey': self.youdao_app_key,
                'salt': salt,
                'sign': sign,
                'signType': 'v3',
                'curtime': curtime
            }
            
            print(f"   签名: {sign[:16]}...")
            print(f"   时间戳: {curtime}")
            
            url = "https://openapi.youdao.com/api"
            response = requests.get(url, params=params, timeout=10)
            result = response.json()
            
            print(f"📥 [有道翻译] 收到响应")
            print(f"   状态码: {response.status_code}")
            
            # 检查响应结构
            if 'basic' in result:
                print(f"   [有道翻译] ✓ 找到basic字段（包含词典信息）")
            else:
                print(f"   [有道翻译] ✗ 未找到basic字段（免费版可能不包含）")
            
            if 'web' in result and result['web']:
                print(f"   [有道翻译] ✓ 找到web字段（包含网络例句）")
            else:
                print(f"   [有道翻译] ✗ 未找到web字段")
            
            # 检查错误
            if result.get('errorCode') != '0':
                error_codes = {
                    '108': 'appKey无效',
                    '109': 'batchLog格式不正确',
                    '110': '查询次数不足',
                    '111': '访问IP受限',
                    '201': '缺少必填的参数',
                    '202': '语言不支持',
                    '203': '文本过长',
                    '301': '账户已欠费',
                    '302': '账户未开通',
                    '303': '访问频率受限'
                }
                
                error_code = result.get('errorCode', 'unknown')
                error_msg = result.get('error_msg', '未知错误')
                meaning = error_codes.get(error_code, '未知错误代码')
                
                print(f"❌ [有道翻译] 翻译失败!")
                print(f"   错误代码: {error_code}")
                print(f"   错误信息: {error_msg}")
                print(f"   错误含义: {meaning}")
                return self._get_fallback_result(text)
            
            # 解析翻译结果
            if 'translation' in result and result['translation']:
                translation_result = result['translation'][0]
                
                # 提取音标（优先使用美式音标，其次英式，最后普通音标）
                pronunciation = ''
                if 'basic' in result and result['basic']:
                    basic = result['basic']
                    # 优先使用美式音标，其次英式，最后普通音标
                    pronunciation = basic.get('us-phonetic') or basic.get('uk-phonetic') or basic.get('phonetic', '')
                    if pronunciation:
                        # 格式化音标显示（添加斜杠）
                        if not pronunciation.startswith('/'):
                            pronunciation = f'/{pronunciation}/'
                        print(f"   [有道翻译] ✓ 提取音标: {pronunciation}")
                    else:
                        print(f"   [有道翻译] ✗ basic中无音标信息")
                else:
                    print(f"   [有道翻译] ✗ basic字段不存在，无法提取音标")
                
                # 提取例句（从web字段中获取网络例句）
                example_sentence = ''
                example_translation = ''
                
                # 优先从web字段获取例句
                if 'web' in result and result['web'] and len(result['web']) > 0:
                    # 取第一个网络释义作为例句
                    web_item = result['web'][0]
                    if 'value' in web_item and web_item['value'] and len(web_item['value']) > 0:
                        # value是一个数组，取第一个作为例句
                        example_sentence = web_item['value'][0]
                        # 如果有key，可以作为例句的翻译提示
                        if 'key' in web_item:
                            example_translation = web_item['key']
                        print(f"   [有道翻译] ✓ 从web字段提取例句: {example_sentence[:50]}...")
                    else:
                        print(f"   [有道翻译] ✗ web字段中无例句")
                else:
                    print(f"   [有道翻译] ✗ web字段不存在或为空")
                
                # 如果web字段没有例句，尝试从basic.explains中获取（作为备选）
                if not example_sentence and 'basic' in result and result['basic']:
                    basic = result['basic']
                    if 'explains' in basic and basic['explains'] and len(basic['explains']) > 0:
                        # explains是释义列表，通常不是例句，但可以作为参考
                        # 这里我们只取第一个释义作为参考，不当作例句
                        pass
                
                # 有道翻译不提供音频URL，留空
                audio_url = ''
                
                # 打印成功日志（包含提取的信息）
                print(f"✅ [有道翻译] 翻译成功!")
                print(f"   原文: '{text}'")
                print(f"   译文: '{translation_result}'")
                if pronunciation:
                    print(f"   音标: {pronunciation}")
                else:
                    print(f"   音标: (无)")
                if example_sentence:
                    print(f"   例句: {example_sentence[:50]}...")
                else:
                    print(f"   例句: (无)")
                if audio_url:
                    print(f"   音频: {audio_url}")
                else:
                    print(f"   音频: (无)")
                print(f"   方向: {from_lang} -> {to_lang}")
                
                return {
                    'original_text': text,
                    'translated_text': translation_result,
                    'part_of_speech': '',  # 有道翻译不提供词性
                    'pronunciation': pronunciation,
                    'example_sentence': example_sentence,
                    'example_translation': example_translation,
                    'audio_url': audio_url,
                    'source': 'youdao'
                }
            else:
                print(f"❌ [有道翻译] 响应格式异常")
                return self._get_fallback_result(text)
                
        except Exception as e:
            print(f"❌ [有道翻译] 请求异常: {e}")
            return self._get_fallback_result(text)
    
    def _translate_tencent(self, text: str, from_lang: str, to_lang: str) -> Dict:
        """腾讯翻译API"""
        # 腾讯翻译实现（这里提供框架）
        return self._get_fallback_result(text)
    
    def _translate_mock(self, text: str, from_lang: str, to_lang: str) -> Dict:
        """模拟翻译（当前使用）"""
        # 打印模拟翻译日志
        print(f"📖 [模拟翻译] 请求翻译: '{text}' ({from_lang} -> {to_lang})")
        
        # 保持原有的模拟词典逻辑
        translation_dict = {
            'apple': {'translated': '苹果', 'pronunciation': '/ˈæp.əl/', 'example': 'I like to eat red apples.', 'example_translation': '我喜欢吃红苹果。', 'emoji': '🍎'},
            'cat': {'translated': '猫', 'pronunciation': '/kæt/', 'example': 'The cat is sleeping on the sofa.', 'example_translation': '猫正在沙发上睡觉。', 'emoji': '🐱'},
            'sun': {'translated': '太阳', 'pronunciation': '/sʌn/', 'example': 'The sun is shining brightly today.', 'example_translation': '今天阳光明媚。', 'emoji': '☀️'},
            'book': {'translated': '书', 'pronunciation': '/bʊk/', 'example': 'I am reading an interesting book.', 'example_translation': '我正在读一本有趣的书。', 'emoji': '📚'},
            'flower': {'translated': '花', 'pronunciation': '/ˈflaʊ.ər/', 'example': 'The flowers in the garden are beautiful.', 'example_translation': '花园里的花很美。', 'emoji': '🌸'},
            'house': {'translated': '房子', 'pronunciation': '/haʊs/', 'example': 'They live in a big house.', 'example_translation': '他们住在一所大房子里。', 'emoji': '🏠'},
            'dog': {'translated': '狗', 'pronunciation': '/dɔːɡ/', 'example': 'The dog is playing in the park.', 'example_translation': '狗在公园里玩耍。', 'emoji': '🐕'},
            'tree': {'translated': '树', 'pronunciation': '/triː/', 'example': 'Birds are singing in the tree.', 'example_translation': '鸟儿在树上唱歌。', 'emoji': '🌳'},
            'water': {'translated': '水', 'pronunciation': '/ˈwɔː.tər/', 'example': 'Drink more water every day.', 'example_translation': '每天多喝水。', 'emoji': '💧'},
            'moon': {'translated': '月亮', 'pronunciation': '/muːn/', 'example': 'The moon is very bright tonight.', 'example_translation': '今晚的月亮很亮。', 'emoji': '🌙'}
        }
        
        text_lower = text.lower().strip()
        
        if text_lower in translation_dict:
            result = translation_dict[text_lower]
            return {
                'translated_text': result['translated'],
                'pronunciation': result['pronunciation'],
                'example_sentence': result['example'],
                'example_translation': result['example_translation'],
                'audio_url': '',
                'source': 'mock'
            }
        else:
            # 对于未知词汇，返回简单翻译
            return {
                'translated_text': f"[翻译]{text}",
                'pronunciation': '',
                'example_sentence': '',
                'example_translation': '',
                'audio_url': '',
                'source': 'mock_fallback'
            }
    
    def _get_fallback_result(self, text: str) -> Dict:
        """当API调用失败时的回退结果"""
        return {
            'translated_text': f"[翻译]{text}",
            'pronunciation': '',
            'example_sentence': '',
            'example_translation': '',
            'audio_url': '',
            'source': 'fallback'
        }
    
    def _translate_with_iciba_priority(self, text: str, from_lang: str, to_lang: str) -> Dict:
        """
        优先使用金山词霸翻译，失败时使用有道翻译
        """
        print(f"🌐 [金山词霸] 尝试获取单词信息: '{text}'")
        iciba_data = self._get_word_info_from_iciba(text)
        
        if iciba_data and iciba_data.get('meaning'):
            # 金山词霸有结果，构建翻译结果
            result = {
                'original_text': text,
                'translated_text': iciba_data.get('meaning', ''),
                'part_of_speech': iciba_data.get('part_of_speech', ''),
                'pronunciation': iciba_data.get('pronunciation', ''),
                'audio_url': iciba_data.get('audio_url', ''),
                'example_sentence': iciba_data.get('example_sentence', ''),
                'example_translation': iciba_data.get('example_translation', ''),
                'source': 'iciba'
            }
            print(f"✅ [金山词霸] 翻译成功")
            print(f"   词意: {result['translated_text']}")
            if result['part_of_speech']:
                print(f"   词性: {result['part_of_speech']}")
            if result['pronunciation']:
                print(f"   音标: {result['pronunciation']}")
            if result['audio_url']:
                print(f"   音频: {result['audio_url']}")
            if result['example_sentence']:
                print(f"   例句: {result['example_sentence']}")
            return result
        else:
            # 金山词霸无结果，使用有道翻译
            print(f"⚠️  [金山词霸] 无结果，切换到有道翻译")
            youdao_result = self._translate_youdao(text, from_lang, to_lang)
            if youdao_result:
                youdao_result['original_text'] = text
                youdao_result['part_of_speech'] = ''  # 有道翻译不提供词性
                youdao_result['source'] = 'youdao_fallback'
                print(f"✅ [有道翻译] 备用翻译成功")
            return youdao_result
    
    def _get_word_info_from_iciba(self, word: str) -> Dict:
        """
        从金山词霸获取单词信息（音标、例句、发音等）
        使用金山词霸JSON API: https://www.iciba.com/_next/data/0uoz6g5Mqy_2ryPPl06a0/word.json?w={单词}
        """
        if not word or len(word.strip()) == 0:
            return {}
        
        # 只对单个英文单词尝试获取信息
        word_clean = word.strip().lower()
        if not word_clean.isalpha() or ' ' in word_clean:
            return {}
        
        try:
            # 金山词霸JSON API
            url = f"https://www.iciba.com/_next/data/0uoz6g5Mqy_2ryPPl06a0/word.json?w={word_clean}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Referer": "https://www.iciba.com/",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
            }
            
            print(f"   [金山词霸] 请求URL: {url}")
            response = requests.get(url, headers=headers, timeout=5)
            print(f"   [金山词霸] HTTP状态码: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   [金山词霸] 响应成功，开始解析JSON")
                data = response.json()
                
                # 解析JSON结构，查找baseInfo
                result = {}
                
                # 尝试从不同路径获取baseInfo（注意：API中拼写是baesInfo，不是baseInfo）
                base_info = None
                # 路径1: data.pageProps.initialReduxState.word.wordInfo.baesInfo（注意拼写）
                if 'pageProps' in data and isinstance(data['pageProps'], dict):
                    if 'initialReduxState' in data['pageProps']:
                        irs = data['pageProps']['initialReduxState']
                        if isinstance(irs, dict) and 'word' in irs:
                            word_data = irs['word']
                            if isinstance(word_data, dict) and 'wordInfo' in word_data:
                                word_info = word_data['wordInfo']
                                if isinstance(word_info, dict):
                                    # 注意：API中字段名是baesInfo（拼写错误），不是baseInfo
                                    if 'baesInfo' in word_info:
                                        base_info = word_info['baesInfo']
                                        print(f"   [金山词霸] ✓ 从wordInfo.baesInfo找到数据")
                                    elif 'baseInfo' in word_info:
                                        base_info = word_info['baseInfo']
                                        print(f"   [金山词霸] ✓ 从wordInfo.baseInfo找到数据")
                # 路径2: data.pageProps.baseInfo
                if not base_info and 'pageProps' in data and isinstance(data['pageProps'], dict):
                    if 'baseInfo' in data['pageProps']:
                        base_info = data['pageProps']['baseInfo']
                        print(f"   [金山词霸] ✓ 从data.pageProps.baseInfo找到baseInfo")
                # 路径3: data.baseInfo
                if not base_info and 'baseInfo' in data:
                    base_info = data['baseInfo']
                    print(f"   [金山词霸] ✓ 从data.baseInfo找到baseInfo")
                # 路径4: data.props.pageProps.baseInfo
                if not base_info and 'props' in data and 'pageProps' in data['props'] and 'baseInfo' in data['props']['pageProps']:
                    base_info = data['props']['pageProps']['baseInfo']
                    print(f"   [金山词霸] ✓ 从data.props.pageProps.baseInfo找到baseInfo")
                
                if base_info:
                    print(f"   [金山词霸] 找到baesInfo数据")
                    
                    # 从symbols数组提取信息
                    if 'symbols' in base_info and isinstance(base_info['symbols'], list) and len(base_info['symbols']) > 0:
                        symbol = base_info['symbols'][0]
                        print(f"   [金山词霸] 找到symbols数组，开始提取数据")
                        
                        # 提取音标（优先美式）
                        pronunciation = ''
                        if 'ph_am' in symbol and symbol['ph_am']:
                            pronunciation = symbol['ph_am']
                            print(f"   [金山词霸] 找到美式音标: {pronunciation}")
                        elif 'ph_en' in symbol and symbol['ph_en']:
                            pronunciation = symbol['ph_en']
                            print(f"   [金山词霸] 找到英式音标: {pronunciation}")
                        
                        if pronunciation:
                            # 格式化音标显示（添加斜杠）
                            if not pronunciation.startswith('/'):
                                pronunciation = f'/{pronunciation}/'
                            result['pronunciation'] = pronunciation
                        
                        # 提取发音MP3 URL（优先美式）
                        audio_url = ''
                        if 'ph_am_mp3' in symbol and symbol['ph_am_mp3']:
                            audio_url = symbol['ph_am_mp3']
                            print(f"   [金山词霸] 找到美式发音URL: {audio_url[:80]}...")
                        elif 'ph_en_mp3' in symbol and symbol['ph_en_mp3']:
                            audio_url = symbol['ph_en_mp3']
                            print(f"   [金山词霸] 找到英式发音URL: {audio_url[:80]}...")
                        
                        if audio_url:
                            result['audio_url'] = audio_url if audio_url.startswith('http') else f"https://www.iciba.com{audio_url}"
                        
                        # 提取词性和词意（从parts数组）
                        if 'parts' in symbol and isinstance(symbol['parts'], list) and len(symbol['parts']) > 0:
                            first_part = symbol['parts'][0]
                            if isinstance(first_part, dict):
                                # 词性
                                if 'part' in first_part and first_part['part']:
                                    result['part_of_speech'] = first_part['part']
                                    print(f"   [金山词霸] 提取词性: {result['part_of_speech']}")
                                
                                # 词意
                                if 'means' in first_part:
                                    means = first_part['means']
                                    if isinstance(means, list) and len(means) > 0:
                                        result['meaning'] = means[0]
                                        print(f"   [金山词霸] 提取词意: {result['meaning'][:50]}...")
                                    elif isinstance(means, str):
                                        result['meaning'] = means
                                        print(f"   [金山词霸] 提取词意: {result['meaning'][:50]}...")
                    else:
                        print(f"   [金山词霸] symbols字段不存在或为空")
                
                # 提取例句（优先从new_sentence获取第一个例句）
                example_sentence = ''
                example_translation = ''
                
                if 'pageProps' in data and isinstance(data['pageProps'], dict):
                    page_props = data['pageProps']
                    # 优先从initialReduxState.word.wordInfo.new_sentence获取例句
                    if 'initialReduxState' in page_props:
                        irs = page_props['initialReduxState']
                        if isinstance(irs, dict) and 'word' in irs:
                            word_data = irs['word']
                            if isinstance(word_data, dict) and 'wordInfo' in word_data:
                                word_info = word_data['wordInfo']
                                if isinstance(word_info, dict) and 'new_sentence' in word_info:
                                    sentences = word_info['new_sentence']
                                    print(f"   [金山词霸] 找到new_sentence字段，共{len(sentences) if isinstance(sentences, list) else 0}个例句组")
                                    if isinstance(sentences, list) and len(sentences) > 0:
                                        # 取第一个例句组
                                        first_sentence_group = sentences[0]
                                        print(f"   [金山词霸] 第一个例句组数据结构: {type(first_sentence_group)}")
                                        if isinstance(first_sentence_group, dict):
                                            # 从sentences数组中取第一个
                                            if 'sentences' in first_sentence_group and isinstance(first_sentence_group['sentences'], list) and len(first_sentence_group['sentences']) > 0:
                                                first_sentence_item = first_sentence_group['sentences'][0]
                                                print(f"   [金山词霸] 找到sentences数组，共{len(first_sentence_group['sentences'])}个例句")
                                                if isinstance(first_sentence_item, dict):
                                                    # 从en和cn字段提取例句
                                                    example_sentence = first_sentence_item.get('en', '')
                                                    example_translation = first_sentence_item.get('cn', '')
                                                    
                                                    # 如果例句有音频URL，保存到result中
                                                    sentence_audio_url = first_sentence_item.get('ttsUrl', '')
                                                    
                                                    if example_sentence:
                                                        result['example_sentence'] = example_sentence
                                                        result['example_translation'] = example_translation
                                                        # 保存例句音频URL
                                                        if sentence_audio_url:
                                                            # 如果URL不是完整URL，添加域名前缀
                                                            if not sentence_audio_url.startswith('http'):
                                                                result['example_audio_url'] = f"https://www.iciba.com{sentence_audio_url}" if sentence_audio_url.startswith('/') else f"https://www.iciba.com/{sentence_audio_url}"
                                                            else:
                                                                result['example_audio_url'] = sentence_audio_url
                                                        print(f"   [金山词霸] ✓ 从new_sentence.sentences提取第一个例句")
                                                        print(f"      英文: {example_sentence[:60]}...")
                                                        if example_translation:
                                                            print(f"      中文: {example_translation[:60]}...")
                                                        if sentence_audio_url:
                                                            print(f"      例句音频: {result.get('example_audio_url', sentence_audio_url)[:60]}...")
                                                    else:
                                                        print(f"   [金山词霸] ✗ sentences第一个例句中未找到en字段")
                                                        print(f"      可用字段: {list(first_sentence_item.keys())}")
                                                else:
                                                    print(f"   [金山词霸] ✗ sentences第一个元素不是字典类型")
                                            else:
                                                print(f"   [金山词霸] ✗ 第一个例句组中未找到sentences字段或sentences为空")
                                                print(f"      可用字段: {list(first_sentence_group.keys())}")
                                        else:
                                            print(f"   [金山词霸] ✗ new_sentence第一个元素不是字典类型")
                                    else:
                                        print(f"   [金山词霸] ✗ new_sentence为空或不是列表")
                                else:
                                    print(f"   [金山词霸] ✗ wordInfo中未找到new_sentence字段")
                    
                    # 如果new_sentence没有结果，尝试从pageProps的sentenceSample字段
                    if not result.get('example_sentence') and 'sentenceSample' in page_props and page_props['sentenceSample']:
                        sentences = page_props['sentenceSample']
                        if isinstance(sentences, list) and len(sentences) > 0:
                            first_sentence = sentences[0]
                            if isinstance(first_sentence, dict):
                                result['example_sentence'] = first_sentence.get('sentence', '')
                                result['example_translation'] = first_sentence.get('translation', '')
                                if result['example_sentence']:
                                    print(f"   [金山词霸] ✓ 从sentenceSample提取例句: {result['example_sentence'][:50]}...")
                            elif isinstance(first_sentence, str):
                                result['example_sentence'] = first_sentence
                                print(f"   [金山词霸] ✓ 从sentenceSample提取例句: {result['example_sentence'][:50]}...")
                
                if result:
                    print(f"   [金山词霸] 成功获取信息")
                    return result
                else:
                    print(f"   [金山词霸] 未找到有效数据")
        except requests.exceptions.Timeout:
            print(f"   [金山词霸] 请求超时")
        except requests.exceptions.RequestException as e:
            print(f"   [金山词霸] 网络请求失败: {e}")
        except json.JSONDecodeError as e:
            print(f"   [金山词霸] JSON解析失败: {e}")
        except Exception as e:
            print(f"   [金山词霸] 获取信息失败: {type(e).__name__}: {e}")
        
        return {}
    
    def enhance_with_word_info(self, word: str, translation_result: Dict) -> Dict:
        """
        为翻译结果增强词汇信息（音标、例句、发音等）
        使用金山词霸API补充信息
        """
        # 如果是单个英文单词，尝试从金山词霸获取详细信息
        if word.strip().count(' ') == 0 and word.isalpha():
            try:
                iciba_data = self._get_word_info_from_iciba(word)
                if iciba_data:
                    # 补充音标（如果翻译结果中没有）
                    if not translation_result.get('pronunciation') and iciba_data.get('pronunciation'):
                        translation_result['pronunciation'] = iciba_data['pronunciation']
                    
                    # 补充例句（如果翻译结果中没有）
                    if not translation_result.get('example_sentence') and iciba_data.get('example_sentence'):
                        translation_result['example_sentence'] = iciba_data['example_sentence']
                        if iciba_data.get('example_translation'):
                            translation_result['example_translation'] = iciba_data['example_translation']
                    
                    # 补充音频URL
                    if iciba_data.get('audio_url'):
                        translation_result['audio_url'] = iciba_data['audio_url']
            except Exception as e:
                print(f"增强词汇信息失败: {e}")
        
        return translation_result
    
    def get_supported_languages(self) -> List[str]:
        """获取支持的语言列表"""
        return ["zh", "en", "ja", "ko", "fr", "de", "es", "ru"]
    
    def get_service_status(self) -> Dict:
        """获取翻译服务状态"""
        return {
            'current_service': self.current_service,
            'baidu_configured': bool(self.baidu_appid and self.baidu_secret),
            'supported_languages': self.get_supported_languages()
        }


# 全局翻译服务实例
translation_service = TranslationService()