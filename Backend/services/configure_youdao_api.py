#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置有道翻译API
"""

YOUDAO_APP_KEY = "00c2ffd6fba5cfb5"      # 应用ID
YOUDAO_APP_SECRET = "ZT0BEjPWldujDmjjsnBPEaMYkEI3C2Ks"  # 应用密钥

def setup_youdao_api():
    """配置有道翻译API"""
    if YOUDAO_APP_KEY == "你的有道翻译AppKey" or YOUDAO_APP_SECRET == "你的有道翻译密钥":
        print("❌ 请先配置API信息！")
        print("📝 请编辑此文件，将 YOUDAO_APP_KEY 和 YOUDAO_APP_SECRET 替换为你的真实信息")
        return False
    
    try:
        from translation_service import translation_service
        
        # 配置有道翻译服务
        translation_service.set_youdao_config(YOUDAO_APP_KEY, YOUDAO_APP_SECRET)
        
        # 测试翻译
        test_result = translation_service.translate("hello", "en", "zh")
        
        print("✅ 有道翻译API配置成功！")
        print(f"🧪 测试翻译: 'hello' -> '{test_result.get('translated_text', 'N/A')}'")
        print("🎉 现在可以使用有道翻译了！")
        return True
        
    except Exception as e:
        print(f"❌ 配置失败: {e}")
        return False

if __name__ == "__main__":
    print("🌐 温蒂翻译助手 - 有道翻译API配置")
    print("=" * 50)
    setup_youdao_api()