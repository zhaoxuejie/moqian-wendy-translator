#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
有道翻译 API 配置读取

密钥不再写在本文件里，统一放在项目根目录的 .env 中（参考 .env.example）。
本模块只负责从环境变量读取，仓库中不保存任何明文密钥。
"""

# 注意：不在这里修改 sys.stdout，避免与主程序冲突
# 编码处理由主程序统一管理
# 如果作为独立脚本运行，会在 if __name__ == "__main__" 中处理

# 密钥请配置在项目根目录的 .env 中（字段名见 .env.example）
# 本文件只从环境变量读取，不再保存明文密钥
import os
YOUDAO_APP_KEY = os.getenv('YOUDAO_APPKEY') or os.getenv('YOUDAO_TRANSLATE_APPKEY') or ""
YOUDAO_APP_SECRET = os.getenv('YOUDAO_SECRET') or os.getenv('YOUDAO_TRANSLATE_SECRET') or ""

def setup_youdao_api():
    """配置有道翻译API"""
    try:
        if not YOUDAO_APP_KEY or not YOUDAO_APP_SECRET:
            print("❌ 未检测到有道翻译API配置！")
            print("📝 请在项目根目录的 .env 中设置 YOUDAO_APPKEY 和 YOUDAO_SECRET（字段名参考 .env.example）")
            return False
    except UnicodeEncodeError:
        if not YOUDAO_APP_KEY or not YOUDAO_APP_SECRET:
            print("未检测到有道翻译API配置！")
            print("请在项目根目录的 .env 中设置 YOUDAO_APPKEY 和 YOUDAO_SECRET")
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