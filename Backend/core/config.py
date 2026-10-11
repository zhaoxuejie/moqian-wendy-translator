"""
统一配置管理模块
管理所有API的密钥和配置（翻译、语音、OCR等）
优先级：环境变量 > 配置文件
"""

import os
import sys

# 添加父目录到路径，以便导入 services
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# 导入服务
from services.translation_service import translation_service
from services.speech_service import speech_service
from services.tts_service import tts_service
from services.ocr_service import ocr_service

class TranslationConfig:
    """翻译服务配置类"""
    
    def __init__(self):
        self.load_config()
        
    def load_config(self):
        """加载所有API配置（统一入口）"""
        # 加载翻译API配置
        self._load_translation_config()
        
        # 加载语音识别API配置
        self._load_speech_config()
        
        # 加载OCR API配置
        self._load_ocr_config()
    
    def _load_translation_config(self):
        """加载翻译API配置（百度、有道），支持优先级控制"""
        # 读取优先级配置（环境变量）
        preferred_service = os.getenv('TRANSLATION_SERVICE', '').lower()
        
        # 有道翻译API配置
        youdao_appkey = os.getenv('YOUDAO_APPKEY') or os.getenv('YOUDAO_TRANSLATE_APPKEY')
        youdao_secret = os.getenv('YOUDAO_SECRET') or os.getenv('YOUDAO_TRANSLATE_SECRET')
        has_youdao = False
        
        if youdao_appkey and youdao_secret:
            translation_service.set_youdao_config(youdao_appkey, youdao_secret, set_as_current=False)
            has_youdao = True
            print("✅ 有道翻译API已配置（从环境变量）")
        else:
            # 尝试从配置文件读取
            try:
                from services.configure_youdao_api import YOUDAO_APP_KEY, YOUDAO_APP_SECRET
                if YOUDAO_APP_KEY and YOUDAO_APP_SECRET:
                    translation_service.set_youdao_config(YOUDAO_APP_KEY, YOUDAO_APP_SECRET, set_as_current=False)
                    has_youdao = True
                    print("✅ 有道翻译API已配置（从配置文件）")
            except ImportError:
                pass
            except Exception as e:
                print(f"⚠️  有道翻译API配置失败: {e}")
        
        # 百度翻译API配置
        baidu_appid = os.getenv('BAIDU_APPID') or os.getenv('BAIDU_TRANSLATE_APPID')
        baidu_secret = os.getenv('BAIDU_SECRET') or os.getenv('BAIDU_TRANSLATE_SECRET')
        has_baidu = False
        
        if baidu_appid and baidu_secret:
            translation_service.set_baidu_config(baidu_appid, baidu_secret, set_as_current=False)
            has_baidu = True
            print("✅ 百度翻译API已配置（从环境变量）")
        else:
            # 尝试从配置文件读取
            try:
                from services.configure_api import BAIDU_APPID, BAIDU_SECRET
                if BAIDU_APPID and BAIDU_SECRET:
                    translation_service.set_baidu_config(BAIDU_APPID, BAIDU_SECRET, set_as_current=False)
                    has_baidu = True
                    print("✅ 百度翻译API已配置（从配置文件）")
            except ImportError:
                pass
            except Exception as e:
                print(f"⚠️  百度翻译API配置失败: {e}")
        
        # 根据优先级设置当前使用的服务
        if preferred_service == 'youdao' and has_youdao:
            translation_service.set_preferred_service('youdao')
            if has_baidu:
                print("ℹ️  有道翻译已设置为优先服务，百度翻译作为备用")
        elif preferred_service == 'baidu' and has_baidu:
            translation_service.set_preferred_service('baidu')
            if has_youdao:
                print("ℹ️  百度翻译已设置为优先服务，有道翻译作为备用")
        else:
            # 默认策略：如果配置了有道，优先使用有道；否则使用百度；都没有则使用模拟
            if has_youdao:
                translation_service.set_preferred_service('youdao')
                if has_baidu:
                    print("ℹ️  有道翻译已设置为优先服务（默认），百度翻译作为备用")
            elif has_baidu:
                translation_service.set_preferred_service('baidu')
                print("ℹ️  百度翻译已设置为优先服务（默认）")
            else:
                translation_service.set_preferred_service('mock')
                print("ℹ️  未检测到翻译API配置，将使用模拟翻译")
    
    def _load_speech_config(self):
        """加载百度语音识别 / 语音合成API配置（两者共用同一套凭证）"""
        env_app_id = os.getenv('BAIDU_SPEECH_APP_ID')
        env_api_key = os.getenv('BAIDU_SPEECH_API_KEY')
        env_secret_key = os.getenv('BAIDU_SPEECH_SECRET_KEY')
        
        if env_api_key and env_secret_key:
            self._apply_speech_config(env_app_id or '', env_api_key, env_secret_key, '环境变量')
            return
        
        # 尝试从配置文件读取
        try:
            from services.configure_baidu_speech_api import BAIDU_SPEECH_APP_ID, BAIDU_SPEECH_API_KEY, BAIDU_SPEECH_SECRET_KEY
            if BAIDU_SPEECH_API_KEY and BAIDU_SPEECH_SECRET_KEY:
                self._apply_speech_config(BAIDU_SPEECH_APP_ID, BAIDU_SPEECH_API_KEY, BAIDU_SPEECH_SECRET_KEY, '配置文件')
        except ImportError:
            pass
        except Exception as e:
            print(f"⚠️  百度语音API配置失败: {e}")
    
    def _apply_speech_config(self, app_id, api_key, secret_key, source):
        """语音识别与语音合成用的都是百度语音技术，同一套凭证"""
        speech_service.set_config(app_id, api_key, secret_key)
        tts_service.set_config(app_id, api_key, secret_key)
        print(f"✅ 百度语音识别 + 语音合成API已配置（从{source}）")
    
    def _load_ocr_config(self):
        """加载百度OCR API配置"""
        env_ocr_api_key = os.getenv('BAIDU_OCR_API_KEY')
        env_ocr_secret_key = os.getenv('BAIDU_OCR_SECRET_KEY')
        
        if env_ocr_api_key and env_ocr_secret_key:
            ocr_service.set_config(env_ocr_api_key, env_ocr_secret_key)
            print("✅ 百度OCR API已配置（从环境变量）")
        else:
            # 尝试从配置文件读取
            try:
                from services.configure_baidu_ocr_api import BAIDU_OCR_API_KEY, BAIDU_OCR_SECRET_KEY
                if BAIDU_OCR_API_KEY and BAIDU_OCR_SECRET_KEY:
                    ocr_service.set_config(BAIDU_OCR_API_KEY, BAIDU_OCR_SECRET_KEY)
                    print("✅ 百度OCR API已配置（从配置文件）")
                else:
                    # 如果OCR未配置，尝试使用语音识别的API Key（可以共用）
                    self._try_use_speech_key_for_ocr()
            except ImportError:
                # 配置文件不存在，尝试使用语音识别的API Key
                self._try_use_speech_key_for_ocr()
            except Exception as e:
                print(f"⚠️  百度OCR API配置失败: {e}")
    
    def _try_use_speech_key_for_ocr(self):
        """尝试使用语音识别的API Key作为OCR的备用方案"""
        env_speech_api_key = os.getenv('BAIDU_SPEECH_API_KEY')
        env_speech_secret_key = os.getenv('BAIDU_SPEECH_SECRET_KEY')
        
        if env_speech_api_key and env_speech_secret_key:
            ocr_service.set_config(env_speech_api_key, env_speech_secret_key)
            print("✅ 百度OCR API已配置（使用语音识别的API Key，从环境变量）")
        else:
            try:
                from services.configure_baidu_speech_api import BAIDU_SPEECH_API_KEY, BAIDU_SPEECH_SECRET_KEY
                if BAIDU_SPEECH_API_KEY and BAIDU_SPEECH_SECRET_KEY:
                    ocr_service.set_config(BAIDU_SPEECH_API_KEY, BAIDU_SPEECH_SECRET_KEY)
                    print("✅ 百度OCR API已配置（使用语音识别的API Key，从配置文件）")
            except ImportError:
                pass
        
    def setup_baidu_api(self, appid: str, secret: str):
        """设置百度翻译API"""
        translation_service.set_baidu_config(appid, secret)
        
        # 保存到环境变量（可选）
        os.environ['BAIDU_APPID'] = appid
        os.environ['BAIDU_SECRET'] = secret
        
        print(f"✅ 百度翻译API配置成功")
        print(f"   APP ID: {appid[:8]}... (已隐藏)")
        print(f"   密钥: {secret[:8]}... (已隐藏)")
        
    def setup_youdao_api(self, app_key: str, app_secret: str):
        """设置有道翻译API"""
        translation_service.set_youdao_config(app_key, app_secret)
        
        # 保存到环境变量（可选）
        os.environ['YOUDAO_APPKEY'] = app_key
        os.environ['YOUDAO_SECRET'] = app_secret
        
        print(f"✅ 有道翻译API配置成功")
        print(f"   APP Key: {app_key[:8]}... (已隐藏)")
        print(f"   密钥: {app_secret[:8]}... (已隐藏)")
        
    def get_service_status(self):
        """获取翻译服务状态"""
        return translation_service.get_service_status()
        
    def test_translation(self, text: str, from_lang: str = "en", to_lang: str = "zh"):
        """测试翻译功能"""
        try:
            result = translation_service.translate(text, from_lang, to_lang)
            print(f"🔍 测试翻译: '{text}' -> '{result.get('translated_text', 'N/A')}'")
            print(f"   数据源: {result.get('source', 'unknown')}")
            return True
        except Exception as e:
            print(f"❌ 翻译测试失败: {e}")
            return False

# 全局配置实例
translation_config = TranslationConfig()