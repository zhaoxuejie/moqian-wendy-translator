#!/bin/bash

echo "🌟 温蒂翻译助手 - 项目根目录启动"
echo "========================================"

# 检查Python是否安装
if ! command -v python &> /dev/null; then
    echo "❌ 未检测到Python3，请先安装Python 3.6+"
    exit 1
fi

# 切换到 Config 目录运行启动脚本
# 注意：仓库里的目录名是 Config（首字母大写），Linux/Mac 区分大小写
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/Config" || { echo "❌ 未找到 Config 目录"; exit 1; }
python start_app.py