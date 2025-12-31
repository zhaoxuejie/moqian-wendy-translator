# 使用 Python 3.9 作为基础镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_APP=Backend/core/app.py \
    FLASK_ENV=production

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY Config/requirements.txt /app/requirements.txt

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY Backend/ /app/Backend/
COPY Frontend/ /app/Frontend/
COPY Config/ /app/Config/

# 创建数据库目录
RUN mkdir -p /app/Backend/database

# 设置权限
RUN chmod +x /app/Backend/database/database_init.py

# 暴露端口
EXPOSE 5000

# 创建启动脚本
RUN echo '#!/bin/bash\n\
set -e\n\
echo "💾 初始化数据库..."\n\
python Backend/database/database_init.py\n\
echo "🚀 启动应用..."\n\
python Backend/core/app.py\n\
' > /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# 启动应用
ENTRYPOINT ["/app/docker-entrypoint.sh"]

