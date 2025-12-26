# 温蒂的翻译助手

一个专为女儿温蒂设计的个性化翻译学习应用，采用前后端分离架构，提供友好的用户体验和强大的学习功能。

## 🌟 功能特性

### 核心功能
- 🔄 **智能翻译** - 英中文本互译，支持文本、语音、相机输入
- 📚 **单词本管理** - 保存、复习、掌握程度跟踪
- 📊 **学习进度** - 详细的学习统计和里程碑
- 🏆 **成就系统** - 激励学习的徽章和奖励
- 🎨 **个性化界面** - 多主题、头像、语言切换

### 技术特性
- 💾 **SQLite数据库** - 轻量级本地数据存储
- 🌐 **RESTful API** - 标准化后端接口
- 🎯 **响应式设计** - 适配各种设备
- 🔊 **语音朗读** - 发音练习功能
- ⚡ **实时缓存** - 提升翻译性能

## 🏗️ 项目架构

```
wendy-translator/
├── 📱 Frontend/               # 前端文件
│   ├── index.html           # 主页面
│   ├── api.js               # API客户端
│   └── img/                # 图片资源
├── 🖥️ Backend/               # 后端文件
│   ├── app.py              # Flask服务器
│   ├── database_init.py    # 数据库初始化
│   └── wendy_translator.db # SQLite数据库
├── ⚙️ Config/               # 配置文件
│   ├── requirements.txt    # Python依赖
│   ├── start_app.py        # 启动脚本
│   ├── run.bat            # Windows批处理脚本
│   └── run.sh             # Linux/Mac脚本
├── 🚀 start.bat              # 项目根目录启动脚本 (Windows)
├── 🚀 start.sh               # 项目根目录启动脚本 (Linux/Mac)
└── 📖 README.md               # 项目文档
```

## 🚀 快速开始

### 系统要求
- Python 3.8+
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
cd ../Backend
python database_init.py
```

3. 启动服务:
```bash
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

### 学习跟踪
1. 查看"成长记录"了解学习统计
2. 连续学习天数、单词掌握数
3. 成就徽章激励持续学习

## 🔧 API 接口

### 用户管理
- `GET /api/user/profile` - 获取用户资料
- `POST /api/user/profile` - 更新用户资料

### 翻译功能
- `POST /api/translate` - 文本翻译

### 单词本
- `GET /api/wordbook` - 获取单词列表
- `POST /api/wordbook` - 添加新单词
- `PUT /api/wordbook/{id}` - 更新掌握程度
- `DELETE /api/wordbook/{id}` - 删除单词

### 学习进度
- `GET /api/progress` - 获取学习统计
- `GET /api/achievements` - 获取成就列表

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

### 添加新翻译API
在 `app.py` 的 `call_translation_api` 函数中集成翻译服务：
```python
# 示例：集成百度翻译
def call_translation_api(text, source_lang, target_lang):
    # 调用百度翻译API
    # 返回标准格式结果
    pass
```

### 扩展数据库
修改 `database_init.py` 添加新表或字段：
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
在 `index.html` 中添加新主题：
```css
.theme-orange {
    --primary: #ff9500;
    --secondary: #ffb347;
    --accent: #ff6b6b;
}
```

## 🐛 常见问题

### 服务启动失败
- 检查Python版本 (需要3.6+)
- 确认端口5000未被占用
- 重新安装依赖包

### 翻译功能异常
- 检查网络连接
- 查看控制台错误信息
- 验证API密钥配置

### 数据保存失败
- 确认数据库文件存在
- 检查文件权限
- 重新初始化数据库

## 📈 更新日志

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