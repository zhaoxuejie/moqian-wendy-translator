"""
百度OCR文字识别API配置
请在此文件中填入您的百度OCR API配置信息

获取方式：
1. 访问 https://cloud.baidu.com/
2. 注册/登录账号
3. 进入控制台 -> 产品服务 -> 文字识别 -> 通用文字识别
4. 创建应用，获取 API Key、Secret Key

注意：
- 百度OCR和百度语音识别可以使用同一个应用的API Key和Secret Key
- 如果此处不配置，系统会自动尝试使用语音识别的API Key
- 如果两个服务使用同一个应用，只需在一个地方配置即可
"""

# 百度OCR API配置（如果与语音识别使用不同的应用，请在此配置）
BAIDU_OCR_API_KEY = "9eVxZ3FrLMJIxdyTLMelH7SG"  # 您的API Key（可与语音识别共用，留空则使用语音识别的Key）
BAIDU_OCR_SECRET_KEY = "TqGzQo4CmpMfSTNP4u0tthaQXRYLN3tC"  # 您的Secret Key（可与语音识别共用，留空则使用语音识别的Key）

