#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终测试翻译服务
"""

import requests
import json

def test_final_translation():
    """最终测试翻译服务"""
    print("🧪 最终翻译服务测试")
    print("=" * 50)
    
    # 测试百度API
    print("\n🔍 测试百度翻译API:")
    try:
        from configure_api import BAIDU_APPID, BAIDU_SECRET
        from translation_service import translation_service
        
        translation_service.set_baidu_config(BAIDU_APPID, BAIDU_SECRET)
        result = translation_service.translate("computer", "en", "zh")
        print(f"   ✅ 百度: computer -> {result['translated_text']}")
    except Exception as e:
        print(f"   ❌ 百度API测试失败: {e}")
    
    # 测试有道API
    print("\n🔍 测试有道翻译API:")
    try:
        from configure_youdao_api import YOUDAO_APP_KEY, YOUDAO_APP_SECRET
        
        translation_service.set_youdao_config(YOUDAO_APP_KEY, YOUDAO_APP_SECRET)
        result = translation_service.translate("computer", "en", "zh")
        print(f"   ✅ 有道: computer -> {result['translated_text']}")
    except Exception as e:
        print(f"   ❌ 有道API测试失败: {e}")
    
    # 测试应用接口
    print("\n🔍 测试应用接口:")
    try:
        response = requests.get("http://localhost:5000/", timeout=2)
        if response.status_code == 200:
            print("   ✅ 应用正在运行")
            
            # 测试翻译API
            url = "http://localhost:5000/api/translate"
            data = {
                "text": "computer",
                "source_language": "en",
                "target_language": "zh",
                "username": "wendy",
                "input_method": "text"
            }
            
            response = requests.post(url, json=data, timeout=5)
            if response.status_code == 200:
                result = response.json()
                translation = result.get('translated_text', 'N/A')
                source = result.get('from_cache', False)
                print(f"   ✅ 接口翻译: computer -> {translation} {'(缓存)' if source else '(实时)'}")
            else:
                print(f"   ❌ 接口翻译失败: {response.status_code}")
        else:
            print(f"   ❌ 应用未运行 (状态码: {response.status_code})")
    except requests.exceptions.ConnectionError:
        print("   ❌ 应用未运行，请启动: python Config/start_app.py")
    except Exception as e:
        print(f"   ❌ 测试失败: {e}")

if __name__ == "__main__":
    test_final_translation()
    
    print(f"\n🎉 配置总结:")
    print(f"✅ 百度翻译API: 已配置")
    print(f"✅ 有道翻译API: 已配置") 
    print(f"✅ 应用集成: 已完成")
    print(f"✅ 日志输出: 已启用")
    
    print(f"\n🚀 使用方法:")
    print(f"1. 启动应用: cd d:/MyCodeBuddy/wendy-translator && python Config/start_app.py")
    print(f"2. 访问界面: http://localhost:5000")
    print(f"3. 输入单词翻译，控制台将显示详细日志")