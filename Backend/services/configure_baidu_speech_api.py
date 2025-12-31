"""
百度语音识别API配置
请在此文件中填入您的百度语音识别API配置信息

获取方式：
1. 访问 https://cloud.baidu.com/
2. 注册/登录账号
3. 进入控制台 -> 产品服务 -> 语音技术 -> 短语音识别
4. 创建应用，获取 AppID、API Key、Secret Key

注意：优先从环境变量读取，如果没有则使用配置文件中的值
"""

# 优先从环境变量读取，如果没有则使用配置文件中的值
import os
BAIDU_SPEECH_APP_ID = os.getenv('BAIDU_SPEECH_APP_ID') or "121658826"  # 您的AppID（可选，某些场景需要）
BAIDU_SPEECH_API_KEY = os.getenv('BAIDU_SPEECH_API_KEY') or "9eVxZ3FrLMJIxdyTLMelH7SG"  # 您的API Key
BAIDU_SPEECH_SECRET_KEY = os.getenv('BAIDU_SPEECH_SECRET_KEY') or "TqGzQo4CmpMfSTNP4u0tthaQXRYLN3tC"  # 您的Secret Key（必需）

