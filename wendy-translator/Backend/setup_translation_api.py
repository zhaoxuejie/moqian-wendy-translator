#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
翻译API配置助手
帮助用户快速配置各种翻译API
"""

from config import translation_config
import json

def print_banner():
    """打印欢迎横幅"""
    print("=" * 60)
    print("🌐 温蒂翻译助手 - API配置助手")
    print("=" * 60)
    print()

def show_current_status():
    """显示当前配置状态"""
    print("📊 当前翻译服务状态:")
    status = translation_config.get_service_status()
    
    print(f"   当前服务: {status['current_service']}")
    print(f"   百度API配置: {'✅ 已配置' if status['baidu_configured'] else '❌ 未配置'}")
    print(f"   支持语言: {', '.join(status['supported_languages'])}")
    print()

def show_api_info():
    """显示API申请信息"""
    print("📋 支持的翻译API:")
    print()
    
    print("1️⃣ 百度翻译API (推荐)")
    print("   📝 申请地址: https://fanyi-api.baidu.com/")
    print("   💰 免费额度: 每月200万字符")
    print("   🎯 优点: 中文翻译质量好，稳定可靠")
    print("   ⚠️  需要实名认证")
    print()
    
    print("2️⃣ 腾讯翻译君API")
    print("   📝 申请地址: https://cloud.tencent.com/product/tmt")
    print("   💰 免费额度: 每月500万字符")
    print("   🎯 优点: 腾讯出品，集成简单")
    print("   ⚠️  需要腾讯云账号")
    print()
    
    print("3️⃣ 有道智云翻译API")
    print("   📝 申请地址: https://ai.youdao.com/")
    print("   💰 免费额度: 每月100万字符")
    print("   🎯 优点: 网易有道，教育领域强")
    print("   ⚠️  需要有道账号")
    print()

def configure_baidu_api():
    """配置百度翻译API"""
    print("\n🔧 配置百度翻译API:")
    
    appid = input("   请输入百度翻译APP ID: ").strip()
    if not appid:
        print("❌ APP ID不能为空")
        return False
        
    secret = input("   请输入百度翻译密钥: ").strip()
    if not secret:
        print("❌ 密钥不能为空")
        return False
    
    try:
        # 测试配置
        translation_config.setup_baidu_api(appid, secret)
        
        # 测试翻译
        if translation_config.test_translation("hello"):
            print("✅ 百度翻译API配置成功！")
            print("🎉 现在可以翻译任意英文单词了！")
            return True
        else:
            print("❌ API测试失败，请检查配置")
            return False
            
    except Exception as e:
        print(f"❌ 配置失败: {e}")
        return False

def save_config_to_file():
    """保存配置到文件"""
    print("\n💾 保存配置信息:")
    
    config_file = "translation_config.json"
    
    try:
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump({
                'baidu_appid': input("   百度翻译APP ID (留空则不保存): ").strip(),
                'baidu_secret': input("   百度翻译密钥 (留空则不保存): ").strip(),
                'note': '这个文件包含敏感信息，请妥善保管，不要提交到版本控制'
            }, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 配置已保存到 {config_file}")
        print("⚠️  请注意保管此文件，不要泄露给他人")
        
    except Exception as e:
        print(f"❌ 保存失败: {e}")

def test_translation_function():
    """测试翻译功能"""
    print("\n🧪 测试翻译功能:")
    
    test_words = [
        "hello",
        "computer", 
        "programming",
        "温蒂的翻译助手",
        "beautiful"
    ]
    
    print("   测试词汇翻译:")
    for word in test_words:
        try:
            result = translation_config.test_translation(word)
            if result:
                print(f"   ✅ '{word}' -> 翻译成功")
            else:
                print(f"   ❌ '{word}' -> 翻译失败")
        except Exception as e:
            print(f"   ❌ '{word}' -> 错误: {e}")

def interactive_setup():
    """交互式配置"""
    while True:
        print("\n" + "=" * 40)
        print("🛠️  配置选项:")
        print("1. 查看当前状态")
        print("2. 查看API申请信息")
        print("3. 配置百度翻译API")
        print("4. 测试翻译功能")
        print("5. 保存配置到文件")
        print("0. 退出")
        print("=" * 40)
        
        choice = input("\n请选择操作 (0-5): ").strip()
        
        if choice == "0":
            print("👋 配置助手退出")
            break
        elif choice == "1":
            show_current_status()
        elif choice == "2":
            show_api_info()
        elif choice == "3":
            configure_baidu_api()
        elif choice == "4":
            test_translation_function()
        elif choice == "5":
            save_config_to_file()
        else:
            print("❌ 无效选择，请重新输入")

def main():
    """主函数"""
    print_banner()
    show_current_status()
    interactive_setup()

if __name__ == "__main__":
    main()