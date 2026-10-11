# Docker 部署指南

## 前置要求
- Docker 20.10+
- Docker Compose 2.0+

## 快速开始

### 1. 配置环境变量
复制 `.env.example` 为 `.env` 并填写你的 API 密钥：
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 API 密钥
```

`docker compose` 会自动读取项目根目录的 `.env` 并注入容器。
**密钥不需要写进 `docker-compose.yml`，也不会被打进镜像**
（`.dockerignore` 已排除 `.env`）。

### 2. 创建数据目录
```bash
mkdir -p database
```

### 3. 构建并启动
```bash
docker-compose up -d --build
```

> 构建时 apt 与 pip 均默认使用阿里云镜像源。
> 海外网络可用 `docker-compose build --build-arg PIP_INDEX_URL=https://pypi.org/simple/` 覆盖 pip 源。

### 4. 查看日志
```bash
docker-compose logs -f
```

### 5. 停止服务
```bash
docker-compose down
```

## 数据持久化

数据库文件会保存在 `./database/` 目录中，即使容器删除，数据也不会丢失。

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## 生产环境建议

1. **使用 Nginx 作为反向代理**
   - 配置 HTTPS
   - 负载均衡（如果需要）

2. **数据备份**
   - 定期备份 `database/` 目录
   - 建议使用定时任务自动备份

3. **安全配置**
   - 使用 Docker Secrets 管理敏感信息
   - 配置防火墙规则
   - 限制容器资源使用

4. **监控和日志**
   - 配置日志收集
   - 监控容器健康状态

## 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f wendy-translator

# 重启服务
docker-compose restart

# 停止并删除容器
docker-compose down

# 停止并删除容器和卷（注意：会删除数据）
docker-compose down -v

# 进入容器
docker-compose exec wendy-translator bash

# 查看容器资源使用
docker stats wendy-translator
```

## 故障排查

### 容器无法启动
1. 查看日志：`docker-compose logs wendy-translator`
2. 检查端口是否被占用：`netstat -an | grep 5000`
3. 检查环境变量配置是否正确

### 数据库初始化失败
1. 检查数据目录权限：`ls -la database/`
2. 手动初始化：进入容器执行 `python backend/scripts/database_init.py`

### 健康检查失败
1. 检查应用是否正常启动
2. 确认 `/api/health` 端点是否可用
3. 检查容器内网络连接

## 环境变量说明

所有 API 配置都是可选的，如果不配置，相关功能将使用模拟数据或降级处理。

- `BAIDU_APPID` / `BAIDU_SECRET`: 百度翻译 API
- `YOUDAO_APPKEY` / `YOUDAO_SECRET`: 有道翻译 API
- `TRANSLATION_SERVICE`: 翻译优先级，`youdao`（默认）或 `baidu`
- `DEEPSEEK_API_KEY`: DeepSeek AI API
- `BAIDU_SPEECH_*`: 百度语音识别 API
- `BAIDU_OCR_*`: 百度 OCR API
- `PIXABAY_API_KEY`: Pixabay 图片 API，用于单词配图 / 记忆图片功能
  （点击翻译结果区的苹果图标触发）。Pixabay **必须带 key**，留空则该功能不可用。
- `FLASK_DEBUG`: 是否开启 Flask 调试模式，容器中默认为 `false`。
  调试模式会启用 Werkzeug 交互式调试器，**生产环境务必保持关闭**。
- `TZ`: 容器时区，默认 `Asia/Shanghai`。
  不设置时容器为 UTC，日志和 `/api/health` 返回的时间会比本地慢 8 小时。

