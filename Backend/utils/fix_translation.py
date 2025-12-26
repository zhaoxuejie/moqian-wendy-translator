#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复翻译配置问题
"""

def fix_translation_config():
    """修复翻译配置"""
    print("🔧 修复翻译配置问题")
    print("=" * 40)
    
    # 检查配置文件
    try:
        from configure_api import BAIDU_APPID, BAIDU_SECRET
        print(f"✅ 配置文件读取成功")
        print(f"   APP ID: {BAIDU_APPID}")
        print(f"   SECRET: {BAIDU_SECRET[:8]}...")
        
        # 配置翻译服务
        from translation_service import translation_service
        translation_service.set_baidu_config(BAIDU_APPID, BAIDU_SECRET)
        
        print(f"✅ 翻译服务配置成功")
        
        # 测试翻译
        print(f"\n🧪 测试翻译...")
        result = translation_service.translate("computer", "en", "zh")
        print(f"   computer -> {result['translated_text']}")
        print(f"   数据源: {result.get('source', 'unknown')}")
        
        if result.get('translated_text') and not result['translated_text'].startswith('[翻译]'):
            print(f"\n🎉 翻译配置修复成功！")
            return True
        else:
            print(f"\n❌ 翻译配置仍有问题")
            return False
            
    except Exception as e:
        print(f"❌ 修复失败: {e}")
        return False

if __name__ == "__main__":
    success = fix_translation_config()
    if success:
        print(f"\n✅ 修复完成！现在可以:")
        print(f"   1. 重启应用: python Config/start_app.py")
        print(f"   2. 或者直接访问: http://localhost:5000")
    else:
        print(f"\n❌ 修复失败，请检查配置")