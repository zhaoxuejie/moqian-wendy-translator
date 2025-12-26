# DeepSeek AI 服务配置说明

## 配置方法

### 方法一：使用环境变量（推荐）

设置系统环境变量：
```bash
# Windows
set DEEPSEEK_API_KEY=your_api_key_here

# Linux/macOS
export DEEPSEEK_API_KEY=your_api_key_here
```

### 方法二：使用配置文件

1. 复制模板文件：
   ```bash
   cp deepseek_config.json.example deepseek_config.json
   ```

2. 编辑配置文件，填入您的API密钥：
   ```json
   {
     "api_key": "sk-your-deepseek-api-key",
     "base_url": "https://api.deepseek.com/v1",
     "model": "deepseek-chat",
     "max_tokens": 2000,
     "temperature": 0.7
   }
   ```

## 获取API密钥

1. 访问 [DeepSeek官网](https://www.deepseek.com/)
2. 注册账号并登录
3. 前往API控制台
4. 创建新的API密钥
5. 复制API密钥并按照上述方法配置

## 配置验证

配置完成后，重启应用，如果看到以下消息则表示配置成功：
```
✅ DeepSeek API配置已加载 (模型: deepseek-chat)
```

如果看到以下消息，请检查配置：
```
ℹ️ DeepSeek API未配置，请设置DEEPSEEK_API_KEY环境变量或创建配置文件
```

## 功能特性

- 🤖 支持智能对话
- 📚 专为小学生学习优化
- 🎯 上下文感知回复
- ⚡ 快速响应
- 🛡️ 错误处理和降级方案

## 注意事项

- API密钥请妥善保管，不要提交到版本控制系统
- 建议设置合适的token限制以控制成本
- 可以根据需要调整temperature参数控制回复的创造性
- 如果API调用失败，系统会提供友好的错误提示