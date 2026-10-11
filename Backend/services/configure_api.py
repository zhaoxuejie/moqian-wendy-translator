#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
百度翻译 API 配置读取

密钥不再写在本文件里，统一放在项目根目录的 .env 中（参考 .env.example）。
本模块只负责从环境变量读取，仓库中不保存任何明文密钥。
"""

# 注意：不在这里修改 sys.stdout，避免与主程序冲突
# 编码处理由主程序统一管理
# 如果作为独立脚本运行，会在 if __name__ == "__main__" 中处理

# 🔧 密钥请配置在项目根目录的 .env 中（字段名见 .env.example）
# 本文件只从环境变量读取，不再保存明文密钥
import os
BAIDU_APPID = os.getenv('BAIDU_APPID') or os.getenv('BAIDU_TRANSLATE_APPID') or ""
BAIDU_SECRET = os.getenv('BAIDU_SECRET') or os.getenv('BAIDU_TRANSLATE_SECRET') or ""

def setup_api():
    """配置翻译API"""
    try:
        if not BAIDU_APPID or not BAIDU_SECRET:
            print("❌ 未检测到百度翻译API配置！")
            print("📝 请在项目根目录的 .env 中设置 BAIDU_APPID 和 BAIDU_SECRET（字段名参考 .env.example）")
            return False
    except UnicodeEncodeError:
        if not BAIDU_APPID or not BAIDU_SECRET:
            print("未检测到百度翻译API配置！")
            print("请在项目根目录的 .env 中设置 BAIDU_APPID 和 BAIDU_SECRET")
            return False
    
    try:
        from translation_service import translation_service
        
        # 配置翻译服务
        translation_service.set_baidu_config(BAIDU_APPID, BAIDU_SECRET)
        
        # 测试翻译
        test_result = translation_service.translate("hello", "en", "zh")
        
        # 安全地获取翻译结果
        translated_text = 'N/A'
        if test_result and isinstance(test_result, dict):
            translated_text = test_result.get('translated_text', 'N/A')
        
        try:
            print("✅ 百度翻译API配置成功！")
            print(f"🧪 测试翻译: 'hello' -> '{translated_text}'")
            print("🎉 现在可以翻译任意英文单词了！")
        except UnicodeEncodeError:
            print("百度翻译API配置成功！")
            print(f"测试翻译: 'hello' -> '{translated_text}'")
            print("现在可以翻译任意英文单词了！")
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
        print("🌐 温蒂翻译助手 - 快速API配置")
    except UnicodeEncodeError:
        print("温蒂翻译助手 - 快速API配置")
    print("=" * 50)
    setup_api()