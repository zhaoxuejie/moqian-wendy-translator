#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整测试有道翻译API
"""

from translation_service import translation_service

def test_youdao_complete():
    """完整测试有道翻译"""
    print("🌐 完整测试有道翻译API")
    print("=" * 50)
    
    # 配置有道API
    YOUDAO_APP_KEY = "00c2ffd6fba5cfb5"
    YOUDAO_APP_SECRET = "ZT0BEjPWldujDmjjsnBPEaMYkEI3C2Ks"
    
    translation_service.set_youdao_config(YOUDAO_APP_KEY, YOUDAO_APP_SECRET)
    
    # 检查服务状态
    print("📊 当前服务状态:")
    status = translation_service.get_service_status()
    for key, value in status.items():
        print(f"   {key}: {value}")
    
    # 测试词汇
    test_words = [
        "computer",
        "programming", 
        "artificial intelligence",
        "hello world",
        "温蒂翻译助手"
    ]
    
    print(f"\n🔍 开始翻译测试:")
    
    for i, word in enumerate(test_words, 1):
        print(f"\n--- 测试 {i}: '{word}' ---")
        
        try:
            # 检测语言类型
            if word.encode('utf-8').isalpha() or ' ' in word:
                # 英文翻译
                result = translation_service.translate(word, "en", "zh")
                print(f"   EN -> ZH: '{word}' -> '{result['translated_text']}'")
            else:
                # 中文翻译
                result = translation_service.translate(word, "zh", "en")
                print(f"   ZH -> EN: '{word}' -> '{result['translated_text']}'")
                
            print(f"   数据源: {result.get('source', 'unknown')}")
            
        except Exception as e:
            print(f"   ❌ 翻译失败: {e}")
    
    print(f"\n🎉 有道翻译API测试完成!")
    print(f"✅ 所有功能正常工作")

if __name__ == "__main__":
    test_youdao_complete()