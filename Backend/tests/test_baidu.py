#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试百度翻译API
"""

import os
import requests
import hashlib
import random
from dotenv import load_dotenv

# 密钥配置在项目根目录的 .env 中（参考 .env.example），不写进代码
load_dotenv()
BAIDU_APPID = os.getenv('BAIDU_APPID') or os.getenv('BAIDU_TRANSLATE_APPID') or ""
BAIDU_SECRET = os.getenv('BAIDU_SECRET') or os.getenv('BAIDU_TRANSLATE_SECRET') or ""

def test_baidu_api():
    """直接测试百度翻译API"""
    if not BAIDU_APPID or not BAIDU_SECRET:
        print("❌ 未检测到百度翻译API配置")
        print("📝 请在项目根目录的 .env 中设置 BAIDU_APPID 和 BAIDU_SECRET")
        return

    print("🔍 测试百度翻译API")
    print(f"   APP ID: {BAIDU_APPID}")
    print(f"   密钥: {BAIDU_SECRET[:8]}...")
    
    # 构建请求参数
    text = "hello"
    salt = str(random.randint(32768, 65536))
    sign_str = BAIDU_APPID + text + salt + BAIDU_SECRET
    sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
    
    params = {
        'appid': BAIDU_APPID,
        'q': text,
        'from': 'en',
        'to': 'zh',
        'salt': salt,
        'sign': sign
    }
    
    print(f"\n📤 请求参数:")
    print(f"   文本: {text}")
    print(f"   随机数: {salt}")
    print(f"   签名: {sign[:16]}...")
    
    try:
        url = "https://fanyi-api.baidu.com/api/trans/vip/translate"
        response = requests.get(url, params=params, timeout=10)
        
        print(f"\n📥 响应状态: {response.status_code}")
        print(f"📥 响应内容: {response.text[:200]}...")
        
        result = response.json()
        
        if 'error_code' in result:
            error_codes = {
                '52001': 'APP ID错误',
                '52002': '请检查您的拼写',
                '52003': '请检查您的密钥',
                '54000': '必填参数为空',
                '54001': '签名错误',
                '54003': '访问频率受限',
                '54004': '账户余额不足',
                '54005': '长query请求频繁',
                '58000': '客户端IP非法',
                '58001': '译文语言方向不支持',
                '58002': '服务当前已关闭',
                '90107': '认证未通过或未生效'
            }
            
            error_code = result.get('error_code')
            error_msg = result.get('error_msg', '未知错误')
            meaning = error_codes.get(error_code, '未知错误代码')
            
            print(f"\n❌ 百度翻译错误:")
            print(f"   错误代码: {error_code}")
            print(f"   错误信息: {error_msg}")
            print(f"   错误含义: {meaning}")
        else:
            print(f"\n✅ 翻译成功!")
            print(f"   翻译结果: {result}")
            translation = result['trans_result'][0]['dst']
            print(f"   hello -> {translation}")
            
    except Exception as e:
        print(f"\n❌ 请求失败: {e}")

if __name__ == "__main__":
    print("🌐 百度翻译API测试工具")
    print("=" * 50)
    test_baidu_api()