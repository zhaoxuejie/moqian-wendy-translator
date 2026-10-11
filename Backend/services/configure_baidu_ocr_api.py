"""
百度OCR文字识别API配置读取

密钥不再写在本文件里，统一放在项目根目录的 .env 中（参考 .env.example）。
本模块只负责从环境变量读取，仓库中不保存任何明文密钥。

获取密钥方式：
1. 访问 https://cloud.baidu.com/
2. 注册/登录账号
3. 进入控制台 -> 产品服务 -> 文字识别 -> 通用文字识别
4. 创建应用，获取 API Key、Secret Key
5. 把获取到的值填入项目根目录的 .env

说明：
- 百度OCR和百度语音识别可以使用同一个应用的API Key和Secret Key
- 如果此处不配置，系统会自动尝试使用语音识别的API Key
- 如果两个服务使用同一个应用，只需在 .env 里配置一处即可
"""

import os

BAIDU_OCR_API_KEY = os.getenv('BAIDU_OCR_API_KEY') or ""      # 您的API Key（可与语音识别共用，留空则使用语音识别的Key）
BAIDU_OCR_SECRET_KEY = os.getenv('BAIDU_OCR_SECRET_KEY') or ""  # 您的Secret Key（可与语音识别共用，留空则使用语音识别的Key）
