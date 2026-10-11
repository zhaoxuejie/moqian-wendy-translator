"""
百度语音识别API配置读取

密钥不再写在本文件里，统一放在项目根目录的 .env 中（参考 .env.example）。
本模块只负责从环境变量读取，仓库中不保存任何明文密钥。

获取密钥方式：
1. 访问 https://cloud.baidu.com/
2. 注册/登录账号
3. 进入控制台 -> 产品服务 -> 语音技术 -> 短语音识别
4. 创建应用，获取 AppID、API Key、Secret Key
5. 把获取到的值填入项目根目录的 .env
"""

import os

BAIDU_SPEECH_APP_ID = os.getenv('BAIDU_SPEECH_APP_ID') or ""      # 您的AppID（可选，某些场景需要）
BAIDU_SPEECH_API_KEY = os.getenv('BAIDU_SPEECH_API_KEY') or ""    # 您的API Key
BAIDU_SPEECH_SECRET_KEY = os.getenv('BAIDU_SPEECH_SECRET_KEY') or ""  # 您的Secret Key（必需）
