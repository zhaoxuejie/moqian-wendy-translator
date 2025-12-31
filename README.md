# 温蒂的翻译助手

一个专为女儿温蒂设计的个性化翻译学习应用，采用前后端分离架构，提供友好的用户体验和强大的学习功能。

## 🌟 功能特性

### 核心功能
- 🔄 **智能翻译** - 英中文本互译，支持多种输入方式
  - 🏆 **金山词霸优先** - 单个英文单词优先使用金山词霸，提供详细词典信息
  - 📖 **完整词典信息** - 词性、美式音标、发音音频、例句及例句翻译
  - 🔄 **智能备用** - 金山词霸无结果时自动切换到有道翻译
  - 🔊 **音频播放** - 支持单词发音和例句发音播放
- 🤖 **AI对话助手（小语）** - 集成DeepSeek AI，温蒂的英语学习小伙伴和智能翻译助手
- 📚 **单词本管理** - 保存、复习、掌握程度跟踪
- 📊 **学习进度** - 详细的学习统计和里程碑
  - 📅 **连续学习天数** - 从今天往前统计连续学习天数
  - 🏆 **成就徽章** - 总掌握单词数 × 3 枚徽章
  - 📈 **本月掌握** - 统计当月达到3星掌握的单词数
  - 📊 **总计掌握** - 统计所有达到3星掌握的单词总数
- 🏆 **成就系统** - 激励学习的徽章和奖励
- 🎨 **个性化界面** - 多主题、头像、语言切换
- 🎤 **语音设置** - 支持中英文语音切换，简短昵称显示（小柔、小星、小莹等）
- 💬 **鼓励消息** - 随机显示鼓励话语，激励学习
- 🎮 **单词游戏系统** - 发现页提供多种单词学习游戏
  - 🎯 **单词挑战** - 根据中文意思选择对应英文单词，支持连击奖励
  - ⏱️ **限时挑战** - 在限定时间内尽可能答对更多题目，答对可获得时间奖励
  - 🔥 **连击奖励** - 连击数越高得分倍数越高，支持连击保护机制
  - 🤖 **小语AI对战** - 与AI（小语）进行答题对战，比拼得分和正确率
  - ⚡ **单词速射** - 单词快速下落，需要快速点击正确答案，支持多种模式
  - 🧩 **记忆配对** - 翻牌配对游戏，找到单词和中文意思的配对
  - 🔊 **游戏音效** - 所有游戏支持音效反馈，提升游戏体验
  - 📊 **游戏里程碑** - 每个游戏独立的统计数据（游戏次数、答题数、最高得分、最高连击）
  - 🎨 **游戏卡片** - 9款游戏卡片展示，支持分页浏览
  - 📁 **模块化架构** - 每个游戏独立的目录结构（HTML+CSS+JS），便于扩展和维护
- 🖼️ **图片搜索** - 集成Pixabay API，为单词提供记忆图片
- 🎤 **语音输入** - 集成百度语音API，支持按住说话转文字
- 📷 **图像识别** - 集成百度OCR API，支持拍照识别文字

### 技术特性
- 💾 **SQLite数据库** - 轻量级本地数据存储
- 🌐 **RESTful API** - 标准化后端接口
- 🤖 **DeepSeek集成** - 强大的AI对话和学习辅助
- 🎯 **响应式设计** - 适配各种设备
- 🔊 **语音朗读** - 发音练习功能
  - 🎵 **Web Speech API** - 浏览器原生语音合成
  - 🎤 **语音选择** - 支持选择中英文语音，显示简短昵称
  - 🔊 **音频播放** - 支持MP3音频播放（金山词霸、有道翻译）
- ⚡ **实时缓存** - 提升翻译性能
- 🎵 **游戏音效系统** - 基于Web Audio API的音效生成，支持音量控制和动态音调调整
- 🔧 **模块化架构** - 清晰的前后端分离设计
- 📝 **实时日志** - 翻译服务日志实时输出，便于调试

## 🏗️ 项目架构

```
wendy-translator/
├── 📱 Frontend/               # 前端文件（注意：实际目录名为Frontend）
│   ├── index.html           # 主页面
│   ├── api.js               # API客户端和核心逻辑
│   │                         # - 翻译结果显示
│   │                         # - 语音设置管理
│   │                         # - 学习进度统计
│   │                         # - AI对话处理
│   ├── style.css            # 样式表
│   └── img/                 # 图片资源
│       ├── kenan.jpg        # 柯南头像
│       ├── xiaowanzi.jpg    # 小丸子头像
│       └── duola.jpg        # 哆啦A梦头像
├── 🖥️ Backend/               # 后端文件（注意：实际目录名为Backend）
│   ├── core/                # 核心应用
│   │   ├── app.py          # Flask主服务器
│   │   │                   # - RESTful API路由
│   │   │                   # - 学习进度统计
│   │   │                   # - 用户资料管理
│   │   │                   # - 鼓励消息API
│   │   └── config.py       # 配置管理
│   ├── database/            # 数据库相关
│   │   ├── database_init.py # 数据库初始化
│   │   │                   # - 创建数据表
│   │   │                   # - 添加新字段（audio_url, voice_name等）
│   │   └── wendy_translator.db # SQLite数据库
│   ├── services/            # 服务层
│   │   ├── translation_service.py # 翻译服务
│   │   │                       # - 金山词霸集成
│   │   │                       # - 有道翻译备用
│   │   │                       # - 音频URL提取
│   │   │                       # - 例句提取
│   │   ├── deepseek_service.py # DeepSeek AI服务
│   │   │                       # - AI角色定义（小语）
│   │   ├── image_service.py # 图片搜索服务
│   │   │                       # - Pixabay API集成
│   │   │                       # - 关键词清理
│   │   ├── speech_service.py # 语音识别服务
│   │   │                       # - 百度语音API集成
│   │   │                       # - 音频格式转换
│   │   ├── ocr_service.py   # 图像识别服务
│   │   │                       # - 百度OCR API集成
│   │   ├── configure_api.py # 百度API配置工具
│   │   ├── configure_youdao_api.py # 有道API配置工具
│   │   ├── configure_baidu_speech_api.py # 百度语音API配置
│   │   ├── configure_baidu_ocr_api.py # 百度OCR API配置
│   │   └── deepseek_config.json # DeepSeek配置文件
│   ├── utils/               # 工具函数
│   │   ├── fix_translation.py # 翻译修复工具
│   │   └── setup_translation_api.py # API设置工具
│   └── tests/               # 测试文件
│       ├── test_api.py      # API测试
│       ├── test_translation_logs.py # 翻译日志测试
│       └── test_*.py        # 其他测试文件
├── ⚙️ Config/                # 配置文件（注意：实际目录名为Config）
│   ├── requirements.txt     # Python依赖
│   ├── requirements.txt     # Python依赖
│   └── start_app.py         # 启动脚本
│                             # - 依赖检查
│                             # - 数据库初始化
│                             # - API配置
│                             # - 实时日志输出
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
3. 查看翻译结果，包含：
   - **原单词** - 输入的英文单词
   - **词性** - 单词的词性（名词、动词等）
   - **词意** - 中文翻译
   - **美式音标** - 美式英语音标标注
   - **发音按钮** - 点击小喇叭图标播放单词发音
   - **例句** - 英文例句及中文翻译
   - **例句发音** - 点击例句旁的小喇叭播放例句音频
4. **翻译策略**：
   - 单个英文单词：优先使用金山词霸，提供完整词典信息
   - 句子或短语：使用有道翻译API
   - 自动备用：金山词霸无结果时自动切换到有道翻译

### 单词本管理
1. 翻译后点击"添加到单词本"
2. 在"单词本"标签页查看所有单词
3. 点击星星设置掌握程度（0-3星）
4. 三星单词会显示祝贺动画

### 个性化设置
1. 点击右上角头像打开设置
2. **更换头像**: 选择喜欢的角色头像（柯南、小丸子、哆啦A梦）
3. **更换主题**: 粉色、蓝色、紫色、绿色四种主题
4. **语言设置**: 中文/英文界面切换
   - 切换语言时，所有界面文本（包括语音设置）都会同步更新
5. **音效设置**: 调节朗读音量
6. **语音设置**: 选择AI语音朗读的声音
   - 支持中英文语音分类显示
   - 语音选项显示为简短昵称（如：小柔、小星、小莹等）
   - 鼠标悬停显示完整语音名称
   - 支持中英文界面切换

### AI对话助手 (小语)
1. 切换到"对话"标签页
2. 输入英语学习问题或想要探讨的内容
3. **小语**（温蒂的英语学习小伙伴和智能翻译助手）提供详细解答和个性化辅导
4. 支持连续对话和上下文理解
5. 提供英语学习建议和语法解释
6. 支持语音朗读AI回复（点击消息旁的小喇叭图标）

#### 使用示例
- "请解释apple这个单词的用法"
- "帮我分析这个英语句子的语法"
- "我想学习关于水果的英语单词"

#### 小语的特点
- 名字：小语（不是温蒂，温蒂是用户）
- 角色：温蒂的英语学习小伙伴和智能翻译助手
- 风格：像好朋友一样陪伴学习，提供鼓励和支持

### 学习跟踪
1. 查看"成长记录"了解学习统计
2. **连续学习天数** - 从今天往前统计连续学习的天数
3. **成就徽章** - 总掌握单词数 × 3 枚徽章（每掌握一个单词获得3枚徽章）
4. **本月掌握** - 统计当月达到3星掌握的单词数量
5. **总计掌握** - 统计所有达到3星掌握的单词总数
6. **我的单词** - 查看所有已掌握的单词（3星单词）
   - 每个单词卡片右上角有发音按钮
   - 支持点击播放单词发音
7. **鼓励消息** - 页面顶部随机显示鼓励话语，激励学习

## 🔧 API 接口

### 翻译服务
- `POST /api/translate` - 文本翻译
  - **翻译策略**：
    - 单个英文单词：优先使用金山词霸API，提供完整词典信息
    - 句子或短语：使用有道翻译API
    - 自动备用：金山词霸无结果时自动切换到有道翻译
  - **返回字段**：
    - `original_text` - 原文本
    - `translated_text` - 翻译结果
    - `part_of_speech` - 词性
    - `pronunciation` - 美式音标
    - `audio_url` - 单词发音音频URL
    - `example_sentence` - 英文例句
    - `example_translation` - 例句翻译
    - `example_audio_url` - 例句发音音频URL
    - `source` - 翻译来源（iciba/youdao/baidu等）
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
  - `streak_days` - 连续学习天数（从今天往前统计）
  - `achievements_count` - 成就徽章数（总掌握单词数 × 3）
  - `words_this_month` - 本月掌握的单词数（3星单词）
  - `total_mastered_words` - 总计掌握的单词数（所有3星单词）
  - `mastered_words` - 已掌握的单词列表
- `GET /api/achievements` - 获取成就列表
- `GET /api/progress/daily` - 获取每日学习数据
- `GET /api/encouragement` - 获取随机鼓励消息

### 单词详情
- `GET /api/word/detail` - 获取单词详细信息（包含词态变化、同义词、反义词、例句、记忆图片等）
- `POST /api/word/detail` - 保存单词详细信息到数据库
- `GET /api/word/image` - 搜索单词相关图片（Pixabay API）
  - 支持 `per_page` 参数控制返回图片数量

### 语音和图像识别
- `POST /api/speech/recognize` - 语音转文字（百度语音API）
  - 支持按住说话功能
  - 自动转换为WAV格式
- `POST /api/ocr/recognize` - 图像识别文字（百度OCR API）
  - 支持图片上传识别
  - 自动填充到输入框

### 游戏系统
- `GET /api/games/stats` - 获取游戏统计数据
  - 支持 `game_type` 参数按游戏类型过滤
  - 返回：总游戏次数、总答题数、最高得分、最高连击
- `POST /api/games/record` - 保存游戏记录
  - 保存游戏类型、得分、正确数、总题数、最高连击、正确率等

### 系统配置
- `GET /api/config/translation` - 获取翻译API配置
- `POST /api/config/translation` - 更新翻译API配置
- `GET /api/config/deepseek` - 获取DeepSeek配置状态

## 🗄️ 数据库结构

### 用户表 (users)
- 用户基本信息和设置
- `voice_name` - 用户选择的语音名称
- `voice_lang` - 用户选择的语音语言（zh/en）

### 单词本 (wordbook)
- 保存的单词和掌握程度
- `audio_url` - 单词发音音频URL（支持金山词霸和有道翻译的音频）

### 翻译历史 (translation_history)
- 所有翻译记录

### 学习进度 (learning_progress)
- 每日学习统计

### 成就 (achievements)
- 获得的成就徽章

### 翻译缓存 (translation_cache)
- 翻译结果缓存
- `audio_url` - 单词发音音频URL
- `example_audio_url` - 例句发音音频URL
- `part_of_speech` - 词性

### 单词详情 (word_details)
- 单词详细信息存储
- `english_word` - 英文单词
- `chinese_meaning` - 中文意思
- `part_of_speech` - 词性
- `pronunciation` - 音标
- `word_forms` - 词态变化（JSON格式）
- `synonyms` - 同义词（JSON格式，包含word和meaning）
- `antonyms` - 反义词（JSON格式，包含word和meaning）
- `more_examples` - 更多例句（JSON格式）
- `memory_image_url` - 记忆图片URL
- `memory_image_keyword` - 记忆图片关键词

### 游戏记录 (game_records)
- 游戏统计数据
- `user_id` - 用户ID
- `game_type` - 游戏类型（word-challenge等）
- `score` - 得分
- `correct_count` - 答对题数
- `total_questions` - 总题数
- `max_combo` - 最高连击
- `accuracy` - 正确率
- `created_at` - 创建时间

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
# AI角色定义
SYSTEM_PROMPT = """你是小语，温蒂的英语学习小伙伴和智能翻译助手。
你是温蒂的学习伙伴，要像好朋友一样陪伴她学习。
记住你的名字是小语。"""
```

### 语音设置配置
- **语音昵称映射**: 在 `frontend/api.js` 的 `WendyApp` 类中配置 `voiceNicknames` 对象
- **昵称池**: 在 `nicknamePool` 数组中添加更多简短昵称
- **多语言支持**: 在 `frontend/index.html` 的 `translations` 对象中添加语音设置相关文本

### 翻译服务架构

#### 金山词霸集成
- **API地址**: `https://www.iciba.com/_next/data/0uoz6g5Mqy_2ryPPl06a0/word.json?w={word}`
- **数据提取**:
  - 音标：`baesInfo.symbols.ph_am`（美式音标）
  - 音频URL：`baesInfo.symbols.ph_am_mp3`
  - 词性：`baesInfo.symbols.parts[0].part`
  - 词意：`baesInfo.symbols.parts[0].means[0]`
  - 例句：`new_sentence[0].sentences[0].en`（英文）和 `cn`（中文）
  - 例句音频：`new_sentence[0].sentences[0].ttsUrl`
- **使用策略**: 仅对单个英文单词使用，提供完整词典信息

#### 有道翻译集成
- **备用策略**: 当金山词霸无结果时自动使用
- **支持功能**: 句子翻译、短语翻译
- **音频支持**: 支持句子音频播放

#### 添加新翻译API
在 `backend/services/translation_service.py` 中集成翻译服务：
```python
# 示例：集成新的翻译API
def _translate_new_api(self, text, from_lang, to_lang):
    """新翻译API实现"""
    # 调用新API
    # 返回标准格式结果，必须包含以下字段：
    return {
        'original_text': text,
        'translated_text': '翻译结果',
        'part_of_speech': '',  # 词性
        'pronunciation': '',   # 音标
        'audio_url': '',       # 单词音频URL
        'example_sentence': '', # 例句
        'example_translation': '', # 例句翻译
        'example_audio_url': '', # 例句音频URL
        'source': 'new_api'    # 来源标识
    }
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
- **金山词霸无结果**：系统会自动切换到有道翻译，这是正常行为
- **音标或例句缺失**：某些单词可能没有完整信息，系统会尽量补充
- **音频播放失败**：会自动降级到Web Speech API进行语音合成

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

### 语音设置问题
- **语音选项不显示**：确认浏览器支持Web Speech API（Chrome、Edge、Safari等）
- **语音昵称不显示**：检查 `frontend/api.js` 中的 `voiceNicknames` 映射表
- **语音设置文本未切换**：确认 `frontend/index.html` 中的 `translations` 对象包含语音相关文本

### 学习进度统计问题
- **连续学习天数不正确**：系统从今天往前统计，确保每天都有学习记录
- **成就徽章数量**：计算公式为 `总掌握单词数 × 3`
- **本月掌握单词数**：只统计当月达到3星掌握的单词
- **总计掌握单词数**：统计所有达到3星掌握的单词

## 🧪 测试和调试

### 测试文件
项目包含测试文件用于功能验证：

- `Backend/tests/test_api.py` - 后端API测试

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

### v1.4.1 (2025-12-31)
- ✅ **游戏音效系统** - 为所有小游戏添加了完整的音效反馈系统
  - 🎵 **Web Audio API集成** - 使用浏览器原生音频API生成音效，无需外部音频文件
  - 🔊 **单词挑战音效** - 答对、答错、连击、游戏完成音效
  - ⏱️ **限时挑战音效** - 答对、答错、时间奖励、连击、游戏结束音效
  - 🔥 **连击奖励音效** - 答对、答错、连击里程碑、连击保护、游戏结束音效
  - 🤖 **AI对战音效** - 玩家/AI答对答错音效、玩家/AI获胜音效
  - ⚡ **单词速射音效** - 答对、答错、漏掉、连击、完美模式、游戏结束音效
  - 🧩 **记忆配对音效** - 翻牌、配对成功、配对失败、完美配对、连击、游戏结束音效
  - 🎚️ **音量控制** - 所有音效与项目音量设置联动，支持统一调节
  - 🎨 **音效设计** - 不同操作有不同音效，连击音效随连击数动态变化，提升游戏体验

### v1.4.0 (2024-12-30)
- ✅ **游戏系统重构** - 为每个游戏创建独立目录结构（HTML+CSS+JS），便于扩展和维护
- ✅ **单词挑战游戏** - 完整的单词挑战游戏实现，支持连击奖励系统
- ✅ **游戏里程碑功能** - 每个游戏独立的统计数据展示（游戏次数、答题数、最高得分、最高连击）
- ✅ **游戏记录保存** - 游戏结束后自动保存记录到数据库
- ✅ **游戏卡片分页** - 超过8个游戏卡片时自动分页显示
- ✅ **发现页优化** - 游戏卡片图标去重，间距调整优化
- ✅ **图片搜索功能** - 集成Pixabay API，为单词提供记忆图片
- ✅ **语音输入功能** - 集成百度语音API，支持按住说话转文字
- ✅ **图像识别功能** - 集成百度OCR API，支持拍照识别文字
- ✅ **单词详情卡片** - 显示词态变化、同义词、反义词、更多例句、记忆图片等完整信息
- ✅ **数据库优化** - 新增word_details和game_records表，支持数据持久化

### v1.3.0 (2024-12-27)
- ✅ **金山词霸集成** - 单个英文单词优先使用金山词霸，提供完整词典信息
- ✅ **详细翻译结果** - 显示词性、美式音标、发音音频、例句及例句翻译
- ✅ **音频播放功能** - 支持单词发音和例句发音播放（MP3音频）
- ✅ **学习进度优化** - 连续学习天数、成就徽章（总掌握×3）、本月掌握、总计掌握
- ✅ **语音设置功能** - 支持中英文语音切换，简短昵称显示（小柔、小星、小莹等）
- ✅ **鼓励消息** - 随机显示鼓励话语，激励学习
- ✅ **AI角色优化** - DeepSeek AI角色名称改为"小语"，作为温蒂的学习小伙伴
- ✅ **多语言支持** - 语音设置支持中英文界面切换
- ✅ **实时日志** - 翻译服务日志实时输出，便于调试
- ✅ **编码优化** - 修复Windows下的Unicode编码问题

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