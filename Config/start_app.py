#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
温蒂翻译助手启动脚本
一键启动整个应用
"""

import os
import sys
import io
import subprocess
import webbrowser
import time
import threading
from pathlib import Path

# 设置输出编码为UTF-8（Windows控制台支持）
if sys.platform == 'win32':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except:
        pass

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 6):
        print("❌ 需要Python 3.6或更高版本")
        print(f"当前版本: {sys.version}")
        return False
    print(f"✅ Python版本检查通过: {sys.version}")
    return True

def install_dependencies():
    """安装依赖包（仅在需要时安装）"""
    print("📦 检查依赖包...")
    try:
        # 切换到Config目录
        config_dir = os.path.join(os.path.dirname(__file__))
        requirements_path = os.path.join(config_dir, 'requirements.txt')
        
        # 快速检查关键依赖是否已安装
        try:
            import flask
            import flask_cors
            import requests
            # 如果关键包都已安装，跳过安装步骤
            print("✅ 依赖包已就绪")
            return True
        except ImportError:
            # 有关键包缺失，执行安装
            print("📦 检测到缺失的依赖包，正在安装...")
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "-r", requirements_path],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )
            if result.returncode == 0:
                print("✅ 依赖包安装完成")
            else:
                print("⚠️ 依赖包安装可能有问题，但继续启动...")
            return True
    except Exception as e:
        print(f"⚠️ 依赖包检查异常: {e}，继续启动...")
        return True  # 即使检查失败也继续启动

def init_database():
    """初始化数据库"""
    print("💾 初始化数据库...")
    try:
        subprocess.check_call([sys.executable, "backend/database/database_init.py"])
        print("✅ 数据库初始化完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 数据库初始化失败: {e}")
        return False

def configure_translation_api():
    """配置翻译API"""
    print("🔧 配置翻译API...")
    try:
        # 切换到Backend/services目录（注意大小写）
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        services_dir = os.path.join(project_root, "Backend", "services")
        
        # 检查目录是否存在
        if not os.path.exists(services_dir):
            print(f"⚠️ 服务目录不存在: {services_dir}")
            return True  # 继续启动，使用模拟翻译
        
        # 运行API配置脚本，使用UTF-8编码避免GBK解码错误
        # 注意：Python 3.7+ 支持 encoding 参数
        try:
            result = subprocess.run(
                [sys.executable, "configure_api.py"], 
                cwd=services_dir, 
                capture_output=True, 
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=10
            )
        except TypeError:
            # Python 3.6 不支持 encoding 参数，使用环境变量
            env = os.environ.copy()
            env['PYTHONIOENCODING'] = 'utf-8'
            result = subprocess.run(
                [sys.executable, "configure_api.py"], 
                cwd=services_dir, 
                capture_output=True, 
                text=True,
                env=env,
                timeout=10
            )
        
        if result.returncode == 0:
            print("✅ 翻译API配置成功")
            if result.stdout:
                # 安全地显示输出，避免索引错误
                try:
                    output = result.stdout[-200:] if len(result.stdout) > 200 else result.stdout
                    print(output)
                except:
                    pass
            return True
        else:
            print("⚠️ 翻译API配置失败，将使用模拟翻译")
            if result.stderr:
                # 安全地显示错误，避免索引错误
                try:
                    error_output = result.stderr[-200:] if len(result.stderr) > 200 else result.stderr
                    print(error_output)
                except:
                    pass
            return True  # 配置失败也要继续启动
    except Exception as e:
        print(f"⚠️ 翻译API配置异常: {e}")
        import traceback
        traceback.print_exc()
        return True  # 配置失败也要继续启动

def start_backend():
    """启动后端服务"""
    print("🚀 启动后端服务...")
    try:
        # 在新线程中启动Flask应用
        def run_flask():
            subprocess.call([sys.executable, "backend/core/app.py"])
        
        flask_thread = threading.Thread(target=run_flask)
        flask_thread.daemon = True
        flask_thread.start()
        
        # 等待服务启动
        time.sleep(3)
        print("✅ 后端服务已启动 (http://localhost:5000)")
        return True
    except Exception as e:
        print(f"❌ 后端服务启动失败: {e}")
        return False

def open_browser():
    """打开浏览器"""
    print("🌐 打开浏览器...")
    try:
        webbrowser.open("http://localhost:5000")
        print("✅ 浏览器已打开")
        return True
    except Exception as e:
        print(f"⚠️ 无法自动打开浏览器: {e}")
        print("请手动访问: http://localhost:5000")
        return False

def show_app_info():
    """显示应用信息"""
    print("\n" + "=" * 50)
    print("🎉 温蒂翻译助手启动成功！")
    print("=" * 50)
    print("📱 应用信息:")
    print("   - 前端界面: http://localhost:5000")
    print("   - API接口: http://localhost:5000/api")
    print("   - 数据库: wendy_translator.db")
    print("")
    print("👤 用户信息:")
    print("   - 默认用户: wendy")
    print("   - 默认主题: 粉色")
    print("   - 默认语言: 中文")
    print("")
    print("🔧 功能特性:")
    print("   - ✅ 英中翻译")
    print("   - ✅ AI对话助手")
    print("   - ✅ 单词本管理（支持分页）")
    print("   - ✅ 学习进度跟踪")
    print("   - ✅ 个性化设置")
    print("   - ✅ 语音朗读")
    print("   - ✅ 成就系统")
    print("")
    print("💡 使用提示:")
    print("   - 输入英文单词进行翻译")
    print("   - 使用AI对话功能深度学习")
    print("   - 点击麦克风模拟语音输入")
    print("   - 点击相机模拟图片识别")
    print("   - 将单词添加到单词本进行学习")
    print("   - 点击星星标记掌握程度")
    print("   - 点击头像更换主题和设置")
    print("")
    print("按 Ctrl+C 停止服务")
    print("=" * 50)

def main():
    """主函数"""
    print("🌟 温蒂翻译助手 - 一键启动脚本")
    print("=" * 40)
    
    # 检查工作目录
    script_dir = Path(__file__).parent.parent  # 回到项目根目录
    os.chdir(script_dir)
    print(f"📁 工作目录: {script_dir}")
    
    # 检查必要文件
    required_files = [
        'backend/core/app.py', 
        'backend/database/database_init.py', 
        'frontend/index.html', 
        'frontend/api.js'
    ]
    missing_files = [f for f in required_files if not os.path.exists(f)]
    if missing_files:
        print(f"❌ 缺少必要文件: {', '.join(missing_files)}")
        return False
    
    # 执行初始化步骤
    steps = [
        ("检查Python版本", check_python_version),
        ("安装依赖包", install_dependencies),
        ("初始化数据库", init_database),
        ("配置翻译API", configure_translation_api),
        ("启动后端服务", start_backend),
        ("打开浏览器", open_browser)
    ]
    
    for step_name, step_func in steps:
        print(f"\n🔄 {step_name}...")
        if not step_func():
            print(f"❌ {step_name}失败，启动终止")
            return False
    
    # 显示应用信息
    show_app_info()
    
    # 保持服务运行
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n👋 服务已停止")
        print("感谢使用温蒂翻译助手！")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)