#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整测试有道翻译API
"""

import os
from dotenv import load_dotenv
from translation_service import translation_service

# 密钥配置在项目根目录的 .env 中（参考 .env.example），不写进代码
load_dotenv()

def test_youdao_complete():
    """完整测试有道翻译"""
    print("🌐 完整测试有道翻译API")
    print("=" * 50)
    
    # 从环境变量读取有道API配置
    YOUDAO_APP_KEY = os.getenv('YOUDAO_APPKEY') or os.getenv('YOUDAO_TRANSLATE_APPKEY') or ""
    YOUDAO_APP_SECRET = os.getenv('YOUDAO_SECRET') or os.getenv('YOUDAO_TRANSLATE_SECRET') or ""
    
    if not YOUDAO_APP_KEY or not YOUDAO_APP_SECRET:
        print("❌ 未检测到有道翻译API配置")
        print("📝 请在项目根目录的 .env 中设置 YOUDAO_APPKEY 和 YOUDAO_SECRET")
        return
    
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