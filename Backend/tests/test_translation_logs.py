#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试翻译服务的日志输出
"""

from translation_service import translation_service

def test_translation_logs():
    """测试翻译日志"""
    print("🧪 测试翻译服务日志输出")
    print("=" * 50)
    
    # 设置百度API配置
    BAIDU_APPID = "20251126002506512"
    BAIDU_SECRET = "_i1JUTEK3Zc6a8JQhhzn"
    translation_service.set_baidu_config(BAIDU_APPID, BAIDU_SECRET)
    
    print(f"\n📊 当前服务状态:")
    status = translation_service.get_service_status()
    for key, value in status.items():
        print(f"   {key}: {value}")
    
    print(f"\n🔄 开始测试翻译...")
    
    # 测试几个词汇
    test_words = ["hello", "world", "computer", "python", "artificial"]
    
    for i, word in enumerate(test_words, 1):
        print(f"\n--- 测试 {i}: '{word}' ---")
        try:
            result = translation_service.translate(word, "en", "zh")
            print(f"✅ 翻译完成: {word} -> {result['translated_text']}")
            print(f"   数据源: {result.get('source', 'unknown')}")
            print(f"   音标: {result.get('pronunciation', '无')}")
        except Exception as e:
            print(f"❌ 翻译失败: {e}")
    
    print(f"\n🎯 测试完成!")

if __name__ == "__main__":
    test_translation_logs()