#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
温蒂翻译助手启动脚本
一键启动整个应用
"""

import os
import sys
import io
import socket
import subprocess
import urllib.request
import webbrowser
import time
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
        # 切换到config目录
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
        subprocess.check_call([sys.executable, "Backend/scripts/database_init.py"])
        print("✅ 数据库初始化完成")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ 数据库初始化失败: {e}")
        return False

def configure_translation_api():
    """检查翻译API配置（配置会在 app.py 启动时自动加载）"""
    print("🔧 检查翻译API配置...")
    # 注意：实际的API配置会在 app.py 启动时由 core/config.py 自动加载
    # 这里只做简单的检查，不进行实际配置
    try:
        # 检查是否有环境变量或配置文件
        has_env = (
            os.getenv('BAIDU_APPID') or os.getenv('YOUDAO_APPKEY') or
            os.getenv('BAIDU_TRANSLATE_APPID') or os.getenv('YOUDAO_TRANSLATE_APPKEY')
        )
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        services_dir = os.path.join(project_root, "Backend", "services")
        
        has_config_file = (
            os.path.exists(os.path.join(services_dir, "configure_api.py")) or
            os.path.exists(os.path.join(services_dir, "configure_youdao_api.py"))
        )
        
        if has_env or has_config_file:
            print("✅ 检测到API配置（将在服务启动时自动加载）")
        else:
            print("ℹ️  未检测到API配置，将使用模拟翻译")
        
        return True
    except Exception as e:
        print(f"⚠️ 检查API配置时出现异常: {e}")
        return True  # 检查失败也要继续启动

# 用于探测本地健康检查接口。显式禁用代理，避免系统代理（如 127.0.0.1:7890）
# 把本机请求劫持走导致误判。
_PROBE_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def probe_health(url="http://127.0.0.1:5000/api/health", timeout=1.5):
    """请求健康检查接口；能正常返回 200 才说明后端真的起来了"""
    try:
        with _PROBE_OPENER.open(url, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False


def port_in_use(host="127.0.0.1", port=5000):
    """检测端口上是否已经有程序在监听"""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    try:
        return s.connect_ex((host, port)) == 0
    except Exception:
        return False
    finally:
        s.close()


def format_exit_code(code):
    """把退出码转成可读文本（Windows 下被强制结束会返回 0xFFFFFFFF）"""
    if code is None:
        return "退出码未知"
    if code in (4294967295, -1):
        return "被强制结束"
    return f"退出码 {code}"


def start_backend():
    """启动后端服务，并确认它真的起来了

    Returns:
        成功 -> subprocess.Popen 对象（供主循环监测）
        失败 -> None
    """
    print("🚀 启动后端服务...")

    # 端口预检：Windows 下两个进程可以同时绑定同一端口，
    # 若此处已有服务（例如 Docker 容器），健康检查会被对方应答，
    # 出现「看起来启动成功、实际访问到别的服务」的假象，因此直接终止。
    if port_in_use():
        print("❌ 端口 5000 已被其它程序占用，无法启动。")
        print("   Windows 允许两个进程同时绑定同一端口，届时访问到哪个服务是不确定的，")
        print("   且健康检查可能被对方应答，导致误判为启动成功。")
        print("   常见占用方：")
        print("     - Docker 容器：执行 docker compose down 停止")
        print("     - 上一次未正常退出的实例：在任务管理器中结束对应的 python 进程")
        print("   请先释放端口后重试。")
        return None

    env = os.environ.copy()
    env['PYTHONUNBUFFERED'] = '1'  # 禁用输出缓冲，确保日志实时显示

    try:
        proc = subprocess.Popen(
            [sys.executable, "-u", "Backend/core/app.py"],
            env=env
        )
    except Exception as e:
        print(f"❌ 无法启动后端进程: {e}")
        return None

    # 等待后端就绪。同时监测进程状态：
    # 后端一旦崩溃就立刻报错返回，绝不再无条件宣布「启动成功」。
    deadline = time.time() + 30
    while time.time() < deadline:
        exit_code = proc.poll()
        if exit_code is not None:
            print(f"❌ 后端服务启动失败：进程已退出（{format_exit_code(exit_code)}）")
            print("   常见原因：端口 5000 被占用、依赖缺失、Python 版本不匹配。")
            print("   请查看上方日志中的具体报错。")
            return None

        if probe_health():
            print("✅ 后端服务已启动 (http://localhost:5000)")
            sys.stdout.flush()  # 刷新输出，确保信息立即显示
            return proc

        time.sleep(0.5)

    print("❌ 后端服务启动超时：30 秒内未通过 /api/health 健康检查")
    proc.terminate()
    return None

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
    # 添加多个空行和明显的分隔符，确保信息不被覆盖
    print("\n\n")
    print("=" * 70)
    print("🎉 温蒂翻译助手启动成功！")
    print("=" * 70)
    print("\n📱 应用信息:")
    print("   - 前端界面: http://localhost:5000")
    print("   - API接口: http://localhost:5000/api")
    print("   - 数据库: wendy_translator.db")
    print("\n👤 用户信息:")
    print("   - 默认用户: wendy")
    print("   - 默认主题: 粉色")
    print("   - 默认语言: 中文")
    print("\n🔧 功能特性:")
    print("   - ✅ 英中翻译")
    print("   - ✅ AI对话助手")
    print("   - ✅ 单词本管理（支持分页）")
    print("   - ✅ 学习进度跟踪")
    print("   - ✅ 个性化设置")
    print("   - ✅ 语音朗读")
    print("   - ✅ 成就系统")
    print("   - ✅ 多种单词学习游戏")
    print("   - ✅ 游戏音效系统")
    print("\n💡 使用提示:")
    print("   - 输入英文单词进行翻译")
    print("   - 使用AI对话功能深度学习")
    print("   - 点击麦克风模拟语音输入")
    print("   - 点击相机模拟图片识别")
    print("   - 将单词添加到单词本进行学习")
    print("   - 点击星星标记掌握程度")
    print("   - 点击头像更换主题和设置")
    print("   - 在发现页体验各种单词学习游戏")
    print("\n" + "=" * 70)
    print("⚠️  按 Ctrl+C 停止服务")
    print("=" * 70)
    print("\n")
    # 强制刷新输出缓冲区，确保信息立即显示
    sys.stdout.flush()

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
        'Backend/core/app.py', 
        'Backend/scripts/database_init.py', 
        'Frontend/index.html', 
        'Frontend/api.js'
    ]
    missing_files = [f for f in required_files if not os.path.exists(f)]
    if missing_files:
        print(f"❌ 缺少必要文件: {', '.join(missing_files)}")
        return False
    
    # 执行初始化步骤（这些步骤返回 True/False）
    steps = [
        ("检查Python版本", check_python_version),
        ("安装依赖包", install_dependencies),
        ("初始化数据库", init_database),
        ("配置翻译API", configure_translation_api),
    ]
    
    for step_name, step_func in steps:
        print(f"\n🔄 {step_name}...")
        if not step_func():
            print(f"❌ {step_name}失败，启动终止")
            return False
    
    # 启动后端服务，并等它真正通过健康检查
    print("\n🔄 启动后端服务...")
    backend_proc = start_backend()
    if backend_proc is None:
        print("❌ 启动终止")
        return False
    
    # 后端确认就绪后，再打开浏览器
    print("\n🔄 打开浏览器...")
    open_browser()
    
    # 显示应用信息（在 Flask 日志之后显示，确保可见）
    show_app_info()
    
    # 保持服务运行，并持续监测后端是否意外退出
    try:
        while True:
            if backend_proc.poll() is not None:
                print("\n" + "=" * 70)
                print(f"❌ 后端服务已意外退出（{format_exit_code(backend_proc.returncode)}）")
                print("   前端页面将无法访问，请查看上方日志排查原因。")
                print("=" * 70)
                sys.stdout.flush()
                return False
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n" + "=" * 70)
        print("👋 正在停止服务...")
        # 一并结束后端子进程，避免留下占着端口的孤儿进程
        if backend_proc.poll() is None:
            backend_proc.terminate()
            try:
                backend_proc.wait(timeout=5)
            except Exception:
                backend_proc.kill()
        print("感谢使用温蒂翻译助手！")
        print("=" * 70)
        sys.stdout.flush()
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)