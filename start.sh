#!/bin/bash

echo "🌟 温蒂翻译助手 - 项目根目录启动"
echo "========================================"

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 未检测到Python3，请先安装Python 3.6+"
    exit 1
fi

# 切换到Config目录运行启动脚本
cd Config
python3 start_app.py