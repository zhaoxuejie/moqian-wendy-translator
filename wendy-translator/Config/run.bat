@echo off
chcp 65001 >nul
title 温蒂翻译助手

echo 🌟 温蒂翻译助手 - 一键启动
echo ================================

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Python，请先安装Python 3.6+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 切换到Config目录运行启动脚本
cd /d "%~dp0"
python start_app.py

pause