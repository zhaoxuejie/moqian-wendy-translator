#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试用户界面翻译接口
"""

import requests
import json

def test_interface_translation():
    """测试界面翻译功能"""
    print("🧪 测试用户界面翻译功能")
    print("=" * 50)
    
    # 先启动服务（如果未启动）
    print("🔍 检查服务状态...")
    try:
        response = requests.get("http://localhost:5000/", timeout=2)
        print("✅ 服务正在运行")
    except requests.exceptions.ConnectionError:
        print("❌ 服务未运行，请先启动:")
        print("   cd d:/MyCodeBuddy/wendy-translator")
        print("   python Config/start_app.py")
        return
    except Exception as e:
        print(f"❌ 服务检查失败: {e}")
        return
    
    # 测试computer翻译
    print(f"\n🔍 测试 'computer' 翻译...")
    
    url = "http://localhost:5000/api/translate"
    data = {
        "text": "computer",
        "source_language": "en", 
        "target_language": "zh",
        "username": "wendy",
        "input_method": "text"
    }
    
    try:
        print(f"📤 发送请求...")
        response = requests.post(url, json=data, timeout=10)
        
        print(f"📥 响应状态: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 翻译成功!")
            print(f"   原文: {result.get('original_text', 'N/A')}")
            print(f"   译文: {result.get('translated_text', 'N/A')}")
            print(f"   音标: {result.get('pronunciation', '无')}")
            print(f"   例句: {result.get('example_sentence', '无')}")
            print(f"   例句翻译: {result.get('example_translation', '无')}")
            print(f"   缓存: {'是' if result.get('from_cache') else '否'}")
            
            # 检查是否是有效翻译
            if result.get('translated_text') and not result['translated_text'].startswith('[翻译]'):
                print(f"\n🎉 翻译功能正常工作！")
            else:
                print(f"\n⚠️ 翻译结果异常，可能是配置问题")
        else:
            print(f"❌ 翻译失败!")
            try:
                error_data = response.json()
                print(f"   错误信息: {error_data}")
            except:
                print(f"   响应内容: {response.text}")
                
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    # 测试其他词汇
    print(f"\n🔍 测试其他词汇...")
    test_words = ["hello", "world", "python", "programming"]
    
    for word in test_words:
        print(f"\n--- 测试 '{word}' ---")
        data["text"] = word
        
        try:
            response = requests.post(url, json=data, timeout=5)
            if response.status_code == 200:
                result = response.json()
                translation = result.get('translated_text', 'N/A')
                print(f"   ✅ {word} -> {translation}")
            else:
                print(f"   ❌ 翻译失败 (状态码: {response.status_code})")
        except Exception as e:
            print(f"   ❌ 请求异常: {e}")

if __name__ == "__main__":
    test_interface_translation()