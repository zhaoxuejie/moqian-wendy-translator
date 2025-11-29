#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试翻译功能
"""

from translation_service import translation_service
from configure_api import BAIDU_APPID, BAIDU_SECRET

def test_translation():
    """测试翻译功能"""
    print("🧪 快速测试翻译功能")
    print("=" * 40)
    
    # 配置API
    print(f"🔧 配置百度翻译API...")
    print(f"   APP ID: {BAIDU_APPID}")
    print(f"   SECRET: {BAIDU_SECRET[:8]}...")
    
    translation_service.set_baidu_config(BAIDU_APPID, BAIDU_SECRET)
    
    # 检查状态
    print(f"\n📊 服务状态:")
    status = translation_service.get_service_status()
    for key, value in status.items():
        print(f"   {key}: {value}")
    
    # 测试翻译
    print(f"\n🔍 测试翻译:")
    test_words = ["computer", "hello", "world"]
    
    for word in test_words:
        print(f"\n--- 翻译 '{word}' ---")
        try:
            result = translation_service.translate(word, "en", "zh")
            print(f"   原文: {word}")
            print(f"   译文: {result['translated_text']}")
            print(f"   数据源: {result.get('source', 'unknown')}")
            if result.get('pronunciation'):
                print(f"   音标: {result['pronunciation']}")
        except Exception as e:
            print(f"   错误: {e}")

if __name__ == "__main__":
    test_translation()