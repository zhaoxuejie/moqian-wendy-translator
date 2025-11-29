"""
翻译服务配置文件
管理各种翻译API的密钥和配置
"""

import os
from services.translation_service import translation_service

class TranslationConfig:
    """翻译服务配置类"""
    
    def __init__(self):
        self.load_config()
        
    def load_config(self):
        """加载配置"""
        # 从环境变量或配置文件加载
        
        # 百度翻译API配置
        baidu_appid = os.getenv('BAIDU_APPID') or os.getenv('BAIDU_TRANSLATE_APPID')
        baidu_secret = os.getenv('BAIDU_SECRET') or os.getenv('BAIDU_TRANSLATE_SECRET')
        
        if baidu_appid and baidu_secret:
            translation_service.set_baidu_config(baidu_appid, baidu_secret)
            print("✅ 已加载百度翻译API配置")
        else:
            print("ℹ️  百度翻译API未配置，使用模拟翻译")
            
        # 有道翻译API配置
        youdao_appkey = os.getenv('YOUDAO_APPKEY') or os.getenv('YOUDAO_TRANSLATE_APPKEY')
        youdao_secret = os.getenv('YOUDAO_SECRET') or os.getenv('YOUDAO_TRANSLATE_SECRET')
        
        if youdao_appkey and youdao_secret:
            translation_service.set_youdao_config(youdao_appkey, youdao_secret)
            print("✅ 已加载有道翻译API配置")
            
        # 可以在这里添加其他翻译服务的配置
        
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