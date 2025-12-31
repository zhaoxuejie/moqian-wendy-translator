@echo off
chcp 65001 >nul
title 温蒂翻译助手

echo 🌟 温蒂翻译助手 - 项目根目录启动
echo ========================================

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Python，请先安装Python 3.6+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 切换到config目录运行启动脚本
cd config
python start_app.py

pause