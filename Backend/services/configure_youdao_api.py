#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置有道翻译API
"""

# 注意：不在这里修改 sys.stdout，避免与主程序冲突
# 编码处理由主程序统一管理
# 如果作为独立脚本运行，会在 if __name__ == "__main__" 中处理

# 优先从环境变量读取，如果没有则使用配置文件中的值
import os
YOUDAO_APP_KEY = os.getenv('YOUDAO_APPKEY') or os.getenv('YOUDAO_TRANSLATE_APPKEY') or "00c2ffd6fba5cfb5"      # 应用ID
YOUDAO_APP_SECRET = os.getenv('YOUDAO_SECRET') or os.getenv('YOUDAO_TRANSLATE_SECRET') or "ZT0BEjPWldujDmjjsnBPEaMYkEI3C2Ks"  # 应用密钥

def setup_youdao_api():
    """配置有道翻译API"""
    try:
        if YOUDAO_APP_KEY == "你的有道翻译AppKey" or YOUDAO_APP_SECRET == "你的有道翻译密钥":
            print("❌ 请先配置API信息！")
            print("📝 请编辑此文件，将 YOUDAO_APP_KEY 和 YOUDAO_APP_SECRET 替换为你的真实信息")
            return False
    except UnicodeEncodeError:
        if YOUDAO_APP_KEY == "你的有道翻译AppKey" or YOUDAO_APP_SECRET == "你的有道翻译密钥":
            print("请先配置API信息！")
            print("请编辑此文件，将 YOUDAO_APP_KEY 和 YOUDAO_APP_SECRET 替换为你的真实信息")
            return False
    
    try:
        from translation_service import translation_service
        
        # 配置有道翻译服务
        translation_service.set_youdao_config(YOUDAO_APP_KEY, YOUDAO_APP_SECRET)
        
        # 测试翻译
        test_result = translation_service.translate("hello", "en", "zh")
        
        # 安全地获取翻译结果
        translated_text = 'N/A'
        if test_result and isinstance(test_result, dict):
            translated_text = test_result.get('translated_text', 'N/A')
        
        try:
            print("✅ 有道翻译API配置成功！")
            print(f"🧪 测试翻译: 'hello' -> '{translated_text}'")
            print("🎉 现在可以使用有道翻译了！")
        except UnicodeEncodeError:
            print("有道翻译API配置成功！")
            print(f"测试翻译: 'hello' -> '{translated_text}'")
            print("现在可以使用有道翻译了！")
        return True
        
    except Exception as e:
        try:
            print(f"❌ 配置失败: {e}")
        except UnicodeEncodeError:
            print(f"配置失败: {e}")
        return False

if __name__ == "__main__":
    # 只在作为独立脚本运行时设置编码
    import sys
    import io
    if sys.platform == 'win32':
        try:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        except:
            pass
    
    try:
        print("🌐 温蒂翻译助手 - 有道翻译API配置")
    except UnicodeEncodeError:
        print("温蒂翻译助手 - 有道翻译API配置")
    print("=" * 50)
    setup_youdao_api()