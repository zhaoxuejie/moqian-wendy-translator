#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试翻译API接口
"""

import requests
import json

def test_translate_api():
    """测试翻译API"""
    print("🧪 测试翻译API接口")
    print("=" * 50)
    
    url = "http://localhost:5000/api/translate"
    
    # 测试数据
    test_data = {
        "text": "computer",
        "source_language": "en",
        "target_language": "zh",
        "username": "wendy",
        "input_method": "text"
    }
    
    try:
        print(f"📤 发送请求: {json.dumps(test_data, ensure_ascii=False, indent=2)}")
        print(f"🌐 目标URL: {url}")
        
        response = requests.post(url, json=test_data, timeout=10)
        
        print(f"\n📥 响应状态: {response.status_code}")
        print(f"📥 响应头: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ 翻译成功!")
            print(f"   原文: {result.get('original_text', 'N/A')}")
            print(f"   译文: {result.get('translated_text', 'N/A')}")
            print(f"   音标: {result.get('pronunciation', '无')}")
            print(f"   例句: {result.get('example_sentence', '无')}")
            print(f"   例句翻译: {result.get('example_translation', '无')}")
            print(f"   缓存: {'是' if result.get('from_cache') else '否'}")
        else:
            print(f"\n❌ 翻译失败!")
            try:
                error_data = response.json()
                print(f"   错误信息: {error_data}")
            except:
                print(f"   响应内容: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print(f"\n❌ 连接失败!")
        print(f"   请确保应用程序正在运行: http://localhost:5000")
        print(f"   启动命令: cd d:/MyCodeBuddy/wendy-translator && python config/start_app.py")
    except Exception as e:
        print(f"\n❌ 请求异常: {e}")

def test_server_status():
    """测试服务器状态"""
    print("\n🔍 测试服务器状态")
    print("-" * 30)
    
    try:
        response = requests.get("http://localhost:5000/", timeout=5)
        print(f"✅ 服务器运行中 (状态码: {response.status_code})")
        return True
    except requests.exceptions.ConnectionError:
        print(f"❌ 服务器未运行")
        return False
    except Exception as e:
        print(f"❌ 服务器检查失败: {e}")
        return False

if __name__ == "__main__":
    # 先检查服务器状态
    if test_server_status():
        test_translate_api()
    else:
        print("\n🚀 请先启动应用程序:")
        print("   cd d:/MyCodeBuddy/wendy-translator")
        print("   python config/start_app.py")