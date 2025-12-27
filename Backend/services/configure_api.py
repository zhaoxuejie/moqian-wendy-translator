#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速配置百度翻译API
直接替换这个文件中的配置信息
"""

# 注意：不在这里修改 sys.stdout，避免与主程序冲突
# 编码处理由主程序统一管理
# 如果作为独立脚本运行，会在 if __name__ == "__main__" 中处理

# 🔧 在这里配置你的百度翻译API信息
BAIDU_APPID = "20251126002506512"  # 替换为你的APP ID
BAIDU_SECRET = "_i1JUTEK3Zc6a8JQhhzn"  # 替换为你的密钥

def setup_api():
    """配置翻译API"""
    try:
        if BAIDU_APPID == "你的百度翻译APPID" or BAIDU_SECRET == "你的百度翻译密钥":
            print("❌ 请先配置API信息！")
            print("📝 请编辑此文件，将 BAIDU_APPID 和 BAIDU_SECRET 替换为你的真实信息")
            return False
    except UnicodeEncodeError:
        if BAIDU_APPID == "你的百度翻译APPID" or BAIDU_SECRET == "你的百度翻译密钥":
            print("请先配置API信息！")
            print("请编辑此文件，将 BAIDU_APPID 和 BAIDU_SECRET 替换为你的真实信息")
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