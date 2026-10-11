# 使用 Python 3.9 作为基础镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    FLASK_APP=backend/core/app.py \
    FLASK_ENV=production

# 使用阿里云镜像源加速 apt（中国用户）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY Config/requirements.txt /app/requirements.txt

# 安装 Python 依赖
# 使用国内镜像源加速（apt 已用阿里云，pip 同理）。
# 海外网络可用 --build-arg PIP_INDEX_URL=https://pypi.org/simple/ 覆盖。
ARG PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
RUN pip install --no-cache-dir \
    -i ${PIP_INDEX_URL} \
    --timeout 120 \
    --retries 5 \
    -r requirements.txt

# 复制项目文件（源路径必须与仓库中的实际大小写一致）
COPY Backend/ /app/backend/
COPY Frontend/ /app/frontend/
COPY Config/ /app/config/

# 创建数据库目录
RUN mkdir -p /app/database

# 设置权限
RUN chmod +x /app/backend/scripts/database_init.py

# 暴露端口
EXPOSE 5000

# 创建启动脚本
RUN echo '#!/bin/bash\n\
set -e\n\
cd /app\n\
export DATABASE_PATH="/app/database/wendy_translator.db"\n\
echo "💾 初始化数据库..."\n\
python backend/scripts/database_init.py\n\
echo "🚀 启动应用..."\n\
exec python backend/core/app.py\n\
' > /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# 启动应用
ENTRYPOINT ["/app/docker-entrypoint.sh"]

