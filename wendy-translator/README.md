# 温蒂的翻译助手

一个专为女儿温蒂设计的个性化翻译学习应用，采用前后端分离架构，提供友好的用户体验和强大的学习功能。

## 🌟 功能特性

### 核心功能
- 🔄 **智能翻译** - 英中文本互译，支持多种输入方式
- 🤖 **AI对话助手** - 集成DeepSeek AI，提供智能问答和学习辅导
- 📚 **单词本管理** - 保存、复习、掌握程度跟踪
- 📊 **学习进度** - 详细的学习统计和里程碑
- 🏆 **成就系统** - 激励学习的徽章和奖励
- 🎨 **个性化界面** - 多主题、头像、语言切换

### 技术特性
- 💾 **SQLite数据库** - 轻量级本地数据存储
- 🌐 **RESTful API** - 标准化后端接口
- 🤖 **DeepSeek集成** - 强大的AI对话和学习辅助
- 🎯 **响应式设计** - 适配各种设备
- 🔊 **语音朗读** - 发音练习功能
- ⚡ **实时缓存** - 提升翻译性能
- 🔧 **模块化架构** - 清晰的前后端分离设计

## 🏗️ 项目架构

```
wendy-translator/
├── 📱 frontend/               # 前端文件
│   ├── index.html           # 主页面
│   ├── api.js               # API客户端和核心逻辑
│   ├── style.css            # 样式表
│   ├── chat_test.html       # 聊天功能测试页面
│   └── img/                 # 图片资源
│       ├── kenan.jpg        # 柯南头像
│       ├── xiaowanzi.jpg    # 小丸子头像
│       └── duola.jpg        # 哆啦A梦头像
├── 🖥️ backend/               # 后端文件
│   ├── core/                # 核心应用
│   │   ├── app.py          # Flask主服务器
│   │   └── config.py       # 配置管理
│   ├── database/            # 数据库相关
│   │   ├── database_init.py # 数据库初始化
│   │   └── wendy_translator.db # SQLite数据库
│   ├── services/            # 服务层
│   │   ├── translation_service.py # 翻译服务
│   │   ├── deepseek_service.py # DeepSeek AI服务
│   │   ├── configure_api.py # API配置工具
│   │   └── deepseek_config.json # DeepSeek配置文件
│   ├── utils/               # 工具函数
│   │   ├── fix_translation.py # 翻译修复工具
│   │   └── setup_translation_api.py # API设置工具
│   └── tests/               # 测试文件
│       ├── test_api.py      # API测试
│       ├── test_translation_logs.py # 翻译日志测试
│       └── test_*.py        # 其他测试文件
├── ⚙️ config/                # 配置文件
│   ├── requirements.txt     # Python依赖
│   ├── start_app.py         # 启动脚本
│   └── start_app_old.py     # 旧版启动脚本
├── 📊 report/                # 项目报告
│   ├── 项目结构说明.md      # 项目结构文档
│   ├── DeepSeek配置说明.md  # DeepSeek配置指南
│   ├── CSS修复完成报告.md   # CSS修复报告
│   ├── CSS重构完成报告.md   # CSS重构报告
│   └── *.md                 # 其他技术报告
├── 🚀 start.bat              # 项目根目录启动脚本 (Windows)
├── 🚀 start.sh               # 项目根目录启动脚本 (Linux/Mac)
└── 📖 README.md               # 项目文档
```

## 🚀 快速开始

### 系统要求
- Python 3.6+
- 现代浏览器 (Chrome, Firefox, Safari, Edge)

### 🚀 快速启动

**方法一：项目根目录启动（推荐）**

Windows:
```bash
start.bat
```

Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

**方法二：配置目录启动**
```bash
cd Config
python start_app.py
```

**方法三：手动启动**

1. 安装依赖:
```bash
cd Config
pip install -r requirements.txt
```

2. 初始化数据库:
```bash
cd ../backend/database
python database_init.py
```

3. 启动服务:
```bash
cd ../core
python app.py
```

4. 访问应用: http://localhost:5000

## 📱 使用指南

### 基础翻译
1. 在输入框输入英文单词或句子
2. 点击"开始翻译"按钮
3. 查看翻译结果和例句
4. 点击喇叭图标听发音

### 单词本管理
1. 翻译后点击"添加到单词本"
2. 在"单词本"标签页查看所有单词
3. 点击星星设置掌握程度（0-3星）
4. 三星单词会显示祝贺动画

### 个性化设置
1. 点击右上角头像打开设置
2. **更换头像**: 选择喜欢的角色头像
3. **更换主题**: 粉色、蓝色、紫色、绿色
4. **语言设置**: 中文/英文界面
5. **音效设置**: 调节朗读音量

### AI对话助手 (DeepSeek)
1. 切换到"对话"标签页
2. 输入英语学习问题或想要探讨的内容
3. AI助手提供详细解答和个性化辅导
4. 支持连续对话和上下文理解
5. 提供英语学习建议和语法解释

#### 使用示例
- "请解释apple这个单词的用法"
- "帮我分析这个英语句子的语法"
- "我想学习关于水果的英语单词"

### 学习跟踪
1. 查看"成长记录"了解学习统计
2. 连续学习天数、单词掌握数
3. 成就徽章激励持续学习

## 🔧 API 接口

### 翻译服务
- `POST /api/translate` - 文本翻译（支持百度、有道等多种API）
- `POST /api/translate/baidu` - 百度翻译专用接口
- `POST /api/translate/youdao` - 有道翻译专用接口

### AI对话服务 (DeepSeek)
- `POST /api/chat` - AI对话问答
- `GET /api/chat/history` - 获取对话历史

### 用户管理
- `GET /api/user/profile` - 获取用户资料
- `POST /api/user/profile` - 更新用户资料
- `POST /api/user/avatar` - 更新用户头像

### 单词本
- `GET /api/wordbook` - 获取单词列表
- `POST /api/wordbook` - 添加新单词
- `PUT /api/wordbook/{id}` - 更新掌握程度
- `DELETE /api/wordbook/{id}` - 删除单词
- `GET /api/wordbook/statistics` - 获取单词本统计

### 学习进度
- `GET /api/progress` - 获取学习统计
- `GET /api/achievements` - 获取成就列表
- `GET /api/progress/daily` - 获取每日学习数据

### 系统配置
- `GET /api/config/translation` - 获取翻译API配置
- `POST /api/config/translation` - 更新翻译API配置
- `GET /api/config/deepseek` - 获取DeepSeek配置状态

## 🗄️ 数据库结构

### 用户表 (users)
- 用户基本信息和设置

### 单词本 (wordbook)
- 保存的单词和掌握程度

### 翻译历史 (translation_history)
- 所有翻译记录

### 学习进度 (learning_progress)
- 每日学习统计

### 成就 (achievements)
- 获得的成就徽章

### 翻译缓存 (translation_cache)
- 翻译结果缓存

## 🎨 界面设计

### 主题色彩
- **粉色主题**: 温馨可爱 (默认)
- **蓝色主题**: 清新科技
- **紫色主题**: 优雅神秘
- **绿色主题**: 自然活力

### 交互元素
- 流畅动画过渡
- 悬停效果反馈
- 响应式布局
- 无障碍设计

## 🔧 开发说明

### DeepSeek AI配置
1. 在 `backend/services/deepseek_config.json` 中配置API密钥：
```json
{
    "api_key": "your_deepseek_api_key",
    "model": "deepseek-chat",
    "max_tokens": 2000,
    "temperature": 0.7
}
```

2. 在 `backend/services/deepseek_service.py` 中自定义AI行为：
```python
# 自定义系统提示词
SYSTEM_PROMPT = """你是温蒂的英语学习助手，专门帮助小朋友学习英语。
请用简单易懂的语言回答问题，提供学习建议和鼓励。"""
```

### 添加新翻译API
在 `backend/services/translation_service.py` 中集成翻译服务：
```python
# 示例：集成新的翻译API
class NewTranslationService(TranslationService):
    def call_translation_api(self, text, source_lang, target_lang):
        # 调用新API
        # 返回标准格式结果
        pass
```

### 扩展数据库
修改 `backend/database/database_init.py` 添加新表或字段：
```python
# 添加新表
cursor.execute('''
    CREATE TABLE IF NOT EXISTS new_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        -- 字段定义
    )
''')
```

### 自定义主题
在 `frontend/style.css` 中添加新主题：
```css
.theme-orange {
    --primary: #ff9500;
    --secondary: #ffb347;
    --accent: #ff6b6b;
}
```

### 前端API调用
使用 `frontend/api.js` 中的 WendyApp 类：
```javascript
// 翻译调用
await wendyApp.translateText("hello world", "en", "zh");

// AI对话调用
await wendyApp.handleChat("请解释apple这个单词");

// 添加到单词本
await wendyApp.handleAddToWordbook();
```

## 🐛 常见问题

### 服务启动失败
- 检查Python版本 (需要3.8+)
- 确认端口5000未被占用
- 重新安装依赖包：`pip install -r config/requirements.txt`

### 翻译功能异常
- 检查网络连接
- 查看控制台错误信息
- 验证翻译API密钥配置（百度、有道等）
- 检查 `backend/services/` 中的配置文件

### AI对话功能异常
- 验证DeepSeek API密钥是否正确配置
- 检查 `backend/services/deepseek_config.json` 文件
- 查看后端控制台的AI服务日志
- 确认网络可以访问DeepSeek API

### 聊天消息显示问题
- 检查CSS样式是否正确加载
- 确认 `frontend/api.js` 中的 `addChatMessage` 函数
- 验证头像图标是否正确显示

### 数据保存失败
- 确认数据库文件存在 (`backend/database/wendy_translator.db`)
- 检查文件权限
- 重新初始化数据库：`python backend/database/database_init.py`

## 🧪 测试和调试

### 测试文件
项目包含多个测试文件用于功能验证：

- `frontend/chat_test.html` - 聊天功能测试
- `frontend/css_chat_test.html` - CSS样式测试
- `frontend/css_fix_test.html` - CSS修复验证
- `frontend/final_css_fix_test.html` - 最终修复验证
- `backend/tests/test_api.py` - 后端API测试
- `backend/tests/test_translation_logs.py` - 翻译日志测试

### 调试指南
1. **前端调试**：打开浏览器开发者工具查看控制台日志
2. **后端调试**：查看Flask服务器的控制台输出
3. **数据库调试**：使用SQLite工具查看 `wendy_translator.db`
4. **API调试**：查看 `backend/tests/` 目录下的测试用例

### 性能优化
- 翻译结果缓存提升响应速度
- 前端资源压缩减少加载时间
- 数据库索引优化查询性能

## 📈 更新日志

### v1.2.0 (2024-11-29)
- ✅ DeepSeek AI对话集成
- ✅ CSS样式冲突修复
- ✅ 聊天消息显示优化
- ✅ 模块化架构重构
- ✅ 完整的测试套件

### v1.1.0 (2024-01-25)
- ✅ 多翻译API支持
- ✅ 单词本功能完善
- ✅ 用户界面优化

### v1.0.0 (2024-01-20)
- ✅ 基础翻译功能
- ✅ 单词本管理
- ✅ 用户界面设计
- ✅ 数据库架构
- ✅ API接口开发

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目：

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

本项目为个人学习项目，仅供家庭使用。

## 💝 致谢

为女儿温蒂打造，充满爱意的学习助手 🌸

---

> "亲爱的温蒂，希望这个应用能陪伴你快乐学习英语，每一天都有新的进步！" - 爸爸