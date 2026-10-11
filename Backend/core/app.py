#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
温蒂翻译助手后端服务
Flask API服务器
"""

import sys
import io

# 设置输出编码为UTF-8（Windows控制台支持）
if sys.platform == 'win32':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except:
        pass

# 禁用输出缓冲，确保日志实时显示
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(line_buffering=True)
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(line_buffering=True)
except:
    # 如果reconfigure不可用，尝试设置环境变量
    import os
    os.environ['PYTHONUNBUFFERED'] = '1'

from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import sqlite3
import os
import json
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()
from datetime import datetime, date, timedelta
import hashlib
import requests
import time
import random
from functools import wraps
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from services.translation_service import translation_service
from services.image_service import image_service
from services.speech_service import speech_service
from services.tts_service import tts_service
from services.ocr_service import ocr_service
from services.wordlist_service import wordlist_service
from core.config import translation_config

# ===== 目录解析 =====
# 仓库中的目录是 Frontend/、Backend/、Config/（首字母大写），
# 而 Docker 镜像里通过 COPY 的目标路径变成了 /app/frontend、/app/backend、/app/config（小写）。
# Linux 文件系统区分大小写，必须按实际存在的名字解析，否则会加载不到前端文件。
def _resolve_dir(base_dir, name):
    """在 base_dir 下以不区分大小写的方式定位 name 对应的实际目录"""
    direct = os.path.join(base_dir, name)
    if os.path.isdir(direct):
        return direct
    try:
        for entry in os.listdir(base_dir):
            if entry.lower() == name.lower() and os.path.isdir(os.path.join(base_dir, entry)):
                return os.path.join(base_dir, entry)
    except OSError:
        pass
    return direct

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FRONTEND_DIR = _resolve_dir(BASE_DIR, 'frontend')
DATABASE_DIR = _resolve_dir(BASE_DIR, 'database')
# 教材词表目录（由 tools/build_wordlists.py 生成）。
# 词表内容不进 Git（第三方数据无许可证），所以这个目录本地有、仓库里没有。
WORDPACK_DIR = os.getenv('WORDPACK_DIR') or os.path.join(_resolve_dir(BASE_DIR, 'data'), 'wordlists')

# 注意：这里刻意不设置 static_folder / static_url_path。
# 之前写的是 Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')，
# 那会让 Flask 自动注册一条 /<path:filename> 静态路由，把下面手写的
# static_files() 完全遮蔽掉（url_map 里两条规则同名，内置那条先注册、先匹配）。
# 后果：BASE_DIR 回退分支从未执行，也无法为 sw.js 单独设置响应头。
# 现在统一交给 static_files() 处理，实际行为与之前一致，但逻辑不再失效。
app = Flask(__name__, static_folder=None)
CORS(app)  # 允许跨域请求

# 配置
# 数据库路径：优先使用环境变量，否则使用默认路径（绝对路径，不依赖当前工作目录）
DATABASE = os.getenv('DATABASE_PATH', os.path.join(DATABASE_DIR, 'wendy_translator.db'))

# Flask 会话签名密钥。应用当前未使用会话登录，所以不再写死固定值；
# 如需启用会话，请通过环境变量 FLASK_SECRET_KEY 设置（这样服务重启后会话不会失效）。
SECRET_KEY = os.getenv('FLASK_SECRET_KEY') or os.urandom(32).hex()

# 教材词表：启动时扫描一次目录，把可用词书打印出来（导入功能用）
wordlist_service.set_directory(WORDPACK_DIR)

# 导入DeepSeek服务
from services.deepseek_service import deepseek_service

# 鼓励话语列表
ENCOURAGEMENT_MESSAGES = [
    "亲爱的温蒂，你进步真棒！爸爸为你感到骄傲！",
    "温蒂，你的努力让爸爸非常感动！继续加油！",
    "宝贝，你每天都在进步，爸爸为你感到自豪！",
    "温蒂，你的坚持和努力是最棒的！爸爸爱你！",
    "亲爱的温蒂，看到你认真学习的样子，爸爸心里暖暖的！",
    "温蒂，你真的很棒！爸爸相信你会越来越优秀！",
    "宝贝，你的每一个进步都是爸爸最大的快乐！",
    "温蒂，你认真学习的样子真美！爸爸为你骄傲！",
    "亲爱的温蒂，你的努力不会白费，爸爸永远支持你！",
    "温蒂，你是爸爸的骄傲！继续加油，你是最棒的！",
    "宝贝，看到你一天天进步，爸爸心里满满的幸福！",
    "温蒂，你的坚持让爸爸看到了你的成长！真棒！",
    "亲爱的温蒂，你的努力让爸爸非常感动！继续加油！",
    "温蒂，你认真学习的样子是爸爸眼中最美的风景！",
    "宝贝，你的每一个进步都让爸爸为你感到骄傲！",
    "温蒂，你是爸爸心中最棒的小宝贝！继续努力！",
    "亲爱的温蒂，你的坚持和努力是最珍贵的品质！",
    "温蒂，看到你认真学习，爸爸心里满满的幸福感！",
    "宝贝，你的进步让爸爸看到了你的无限可能！",
    "温蒂，你是爸爸的骄傲！继续加油，未来可期！"
]

# 所有API配置已由 core/config.py 统一加载
# translation_config 在导入时自动执行 load_config()
# 配置优先级：环境变量 > 配置文件

# 数据库连接
def get_db():
    """获取数据库连接"""
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row  # 使结果可以像字典一样访问
    return db

def query_db(query, args=(), one=False):
    """查询数据库"""
    db = get_db()
    try:
        cursor = db.execute(query, args)
        result = cursor.fetchall()
        db.close()
        return (result[0] if result else None) if one else result
    except Exception as e:
        print(f"数据库查询错误: {e}")
        db.close()
        return None

def execute_db(query, args=()):
    """执行数据库操作（插入、更新、删除）"""
    db = get_db()
    try:
        cursor = db.execute(query, args)
        db.commit()
        last_id = cursor.lastrowid
        db.close()
        return last_id
    except Exception as e:
        print(f"数据库操作错误: {e}")
        db.rollback()
        db.close()
        return None

# 错误处理装饰器
def handle_errors(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            print(f"API错误: {e}")
            return jsonify({'error': str(e), 'success': False}), 500
    return wrapper

# 静态文件服务
@app.route('/')
def index():
    """返回主页"""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    """提供静态文件服务"""
    # 首先尝试从 frontend 目录提供文件（绝对路径，不依赖当前工作目录）
    frontend_path = os.path.join(FRONTEND_DIR, filename)
    if os.path.exists(frontend_path):
        response = send_from_directory(FRONTEND_DIR, filename)
        # Service Worker 脚本必须禁止缓存，否则它会一直用旧的，
        # 前端更新后用户要等很久甚至永远拿不到新版本
        if filename == 'sw.js':
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response

    # 然后尝试从项目根目录提供文件
    root_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(root_path):
        return send_from_directory(BASE_DIR, filename)

    return f'File not found: {filename}', 404

# ====== 健康检查 API ======
@app.route('/api/health')
def health_check():
    """健康检查端点"""
    try:
        # 检查数据库连接
        conn = sqlite3.connect(DATABASE)
        conn.close()
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database': 'connected'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }), 500

# ====== 用户管理 API ======
@app.route('/api/user/profile', methods=['GET'])
@handle_errors
def get_user_profile():
    """获取用户资料"""
    username = request.args.get('username', 'wendy')
    
    user = query_db(
        'SELECT * FROM users WHERE username = ?',
        (username,),
        one=True
    )
    
    if user:
        # sqlite3.Row 对象不支持 .get() 方法，需要使用字典访问或 try-except
        user_dict = dict(user)
        return jsonify({
            'success': True,
            'user': {
                'id': user_dict.get('id'),
                'username': user_dict.get('username'),
                'display_name': user_dict.get('display_name'),
                'avatar': user_dict.get('avatar'),
                'theme': user_dict.get('theme'),
                'language': user_dict.get('language'),
                'volume': user_dict.get('volume', 50),
                'voice_name': user_dict.get('voice_name', ''),
                'voice_lang': user_dict.get('voice_lang', '')
            }
        })
    else:
        return jsonify({'success': False, 'error': '用户不存在'}), 404

@app.route('/api/user/profile', methods=['POST'])
@handle_errors
def update_user_profile():
    """更新用户资料"""
    data = request.get_json()
    username = data.get('username', 'wendy')
    
    # 构建更新语句
    update_fields = []
    update_values = []
    
    for field in ['display_name', 'avatar', 'theme', 'language', 'volume', 'voice_name', 'voice_lang']:
        if field in data:
            update_fields.append(f"{field} = ?")
            update_values.append(data[field])
    
    if update_fields:
        update_values.append(username)
        query = f'UPDATE users SET updated_at = CURRENT_TIMESTAMP, {", ".join(update_fields)} WHERE username = ?'
        execute_db(query, tuple(update_values))
        
        return jsonify({'success': True, 'message': '资料更新成功'})
    else:
        return jsonify({'success': False, 'error': '没有需要更新的字段'}), 400

# ====== 翻译 API ======
@app.route('/api/translate', methods=['POST'])
@handle_errors
def translate_text():
    """翻译文本"""
    data = request.get_json()
    text = data.get('text', '').strip()
    source_lang = data.get('source_language', 'auto')
    target_lang = data.get('target_language', 'zh')
    username = data.get('username', 'wendy')
    input_method = data.get('input_method', 'text')
    
    if not text:
        return jsonify({'success': False, 'error': '翻译文本不能为空'}), 400
    
    # 检查缓存
    cache_key = hashlib.md5(f"{text}{source_lang}{target_lang}".encode()).hexdigest()
    cached_result = query_db(
        'SELECT * FROM translation_cache WHERE source_text = ? AND source_language = ? AND target_language = ?',
        (text, source_lang, target_lang),
        one=True
    )
    
    if cached_result:
        # 记录翻译历史
        record_translation_history(username, text, cached_result['translated_text'], source_lang, target_lang, input_method)
        return jsonify({
            'success': True,
            'original_text': text,
            'translated_text': cached_result['translated_text'],
            'part_of_speech': '',  # 缓存中暂不存储词性
            'pronunciation': cached_result['pronunciation'],
            'example_sentence': cached_result['example_sentence'],
            'example_translation': cached_result['example_translation'],
            'audio_url': '',  # 缓存中暂不存储audio_url，需要时重新获取
            'example_audio_url': '',  # 缓存中暂不存储example_audio_url，需要时重新获取
            'source': 'cache',
            'from_cache': True
        })
    
    # 调用翻译API（这里使用模拟翻译，实际可以集成百度、腾讯等翻译服务）
    translation_result = call_translation_api(text, source_lang, target_lang)
    
    if translation_result:
        # 缓存翻译结果
        execute_db('''
            INSERT OR REPLACE INTO translation_cache 
            (source_text, source_language, target_language, translated_text, pronunciation, example_sentence, example_translation)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            text, source_lang, target_lang,
            translation_result['translated_text'],
            translation_result.get('pronunciation', ''),
            translation_result.get('example_sentence', ''),
            translation_result.get('example_translation', '')
        ))
        
        # 记录翻译历史
        record_translation_history(username, text, translation_result['translated_text'], source_lang, target_lang, input_method)
        
        return jsonify({
            'success': True,
            'original_text': translation_result.get('original_text', text),
            'translated_text': translation_result['translated_text'],
            'part_of_speech': translation_result.get('part_of_speech', ''),
            'pronunciation': translation_result.get('pronunciation', ''),
            'example_sentence': translation_result.get('example_sentence', ''),
            'example_translation': translation_result.get('example_translation', ''),
            'audio_url': translation_result.get('audio_url', ''),
            'example_audio_url': translation_result.get('example_audio_url', ''),
            'source': translation_result.get('source', 'unknown'),
            'from_cache': False
        })
    else:
        return jsonify({'success': False, 'error': '翻译失败'}), 500

def call_translation_api(text, source_lang, target_lang):
    """
    调用翻译API
    支持多种翻译服务：百度、有道、腾讯等
    """
    try:
        # 使用翻译服务模块进行翻译
        result = translation_service.translate(text, source_lang, target_lang)
        
        # 如果是API翻译，尝试增强词汇信息
        if result.get('source') in ['baidu', 'youdao', 'tencent']:
            result = translation_service.enhance_with_word_info(text, result)
        
        return result
        
    except Exception as e:
        print(f"翻译API调用失败: {e}")
        return {
            'translated_text': f"[翻译]{text}",
            'pronunciation': '',
            'example_sentence': '',
            'example_translation': '',
            'source': 'error'
        }

def record_translation_history(username, original_text, translated_text, source_lang, target_lang, input_method):
    """记录翻译历史"""
    # 获取用户ID
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if user:
        execute_db('''
            INSERT INTO translation_history 
            (user_id, original_text, translated_text, source_language, target_language, input_method)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user['id'], original_text, translated_text, source_lang, target_lang, input_method))
        
        # 更新学习进度
        update_learning_progress(user['id'])

# ====== 单词本管理 API ======
# 前端筛选「手动添加的词」用的标记值。
# 不能直接用空字符串，因为空字符串已经被用来表示「不筛选」了。
SOURCE_FILTER_MANUAL = '__none__'

@app.route('/api/wordbook', methods=['GET'])
@handle_errors
def get_wordbook():
    """获取单词本，可用 ?source= 按教材册次筛选"""
    username = request.args.get('username', 'wendy')
    source = (request.args.get('source') or '').strip()
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    sql = 'SELECT * FROM wordbook WHERE user_id = ?'
    params = [user['id']]
    if source == SOURCE_FILTER_MANUAL:
        sql += " AND (source IS NULL OR source = '')"
    elif source:
        sql += ' AND source = ?'
        params.append(source)
    sql += ' ORDER BY created_at DESC'
    
    words = query_db(sql, tuple(params)) or []
    
    word_list = []
    for word in words:
        word_list.append({
            'id': word['id'],
            'english_word': word['english_word'],
            'chinese_meaning': word['chinese_meaning'],
            'pronunciation': word['pronunciation'],
            'example_sentence': word['example_sentence'],
            'example_translation': word['example_translation'],
            'word_image': word['word_image'],
            'mastery_level': word['mastery_level'],
            'review_count': word['review_count'],
            'last_reviewed': word['last_reviewed'],
            # 教材导入带进来的字段，详情弹窗要用
            'source': word['source'] or '',
            'part_of_speech': word['part_of_speech'] or '',
            'more_examples': word['more_examples'] or '',
            'uk_speech': word['uk_speech'] or '',
            'us_speech': word['us_speech'] or ''
        })
    
    # 返回当前单词本里已有的来源清单及各自词数，供前端渲染筛选下拉。
    # 不改动上面的筛选结果，所以即使正在按册筛选也能拿到完整清单。
    source_rows = query_db('''
        SELECT source, COUNT(*) AS cnt
        FROM wordbook
        WHERE user_id = ?
        GROUP BY source
        ORDER BY source
    ''', (user['id'],)) or []
    sources = [
        {'source': row['source'] or '', 'count': row['cnt']}
        for row in source_rows
    ]
    
    return jsonify({
        'success': True,
        'words': word_list,
        'total': len(word_list),
        'sources': sources
    })

# ====== 教材词书（导入单词本） ======
@app.route('/api/wordlists', methods=['GET'])
@handle_errors
def list_wordlists():
    """
    列出 data/wordlists/ 里可导入的教材词书。

    in_wordbook 表示这本词书里已经有多少词在这个用户的单词本里了，
    方便界面显示「已导入 12 / 392」，也解释了为什么导入后词数比册次总数少
    —— 不同册之间会有重复的单词（比如 hello、good），
    这些词在第一次导入时就进去了，会保留最初那册的来源标记。
    """
    username = request.args.get('username', 'wendy')

    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404

    packs = wordlist_service.list_packs()

    existing = query_db(
        'SELECT english_word FROM wordbook WHERE user_id = ?', (user['id'],)
    ) or []
    owned = {(row['english_word'] or '').strip().lower() for row in existing}

    result = []
    for pack in packs:
        records = wordlist_service.read_pack(pack['id']) or []
        already = sum(1 for r in records if r['english_word'].lower() in owned)
        result.append({
            'id': pack['id'],
            'name': pack['name'],
            'word_count': pack['word_count'],
            'in_wordbook': already
        })

    return jsonify({
        'success': True,
        'available': wordlist_service.available(),
        'directory': wordlist_service.directory or '',
        'wordlists': result
    })

@app.route('/api/wordbook/import', methods=['POST'])
@handle_errors
def import_wordlist():
    """
    把一册教材词表导入单词本。

    - 已存在的单词会**更新词条内容**（词性、例句、音标、真人发音标识），
      所以词表格式升级后重新导入一次就能刷新，不用删数据重来
    - **刻意不覆盖** mastery_level / review_count / last_reviewed / source：
      用户的星级和复习记录不能因为重导就丢，来源也保留第一次导入的那册
    - 返回 imported（新增）/ updated（更新）/ total
    """
    data = request.get_json(silent=True) or {}
    username = data.get('username', 'wendy')
    pack_id = (data.get('source') or data.get('id') or '').strip()

    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404

    if not pack_id:
        return jsonify({'success': False, 'error': '缺少 source 参数'}), 400

    # read_pack 只接受目录里真实存在的 ID，不接受任意路径，因此没有路径穿越风险
    records = wordlist_service.read_pack(pack_id)
    if records is None:
        return jsonify({
            'success': False,
            'error': '找不到这本词书：%s（请确认 data/wordlists/ 里有对应 CSV）' % pack_id
        }), 404
    if not records:
        return jsonify({'success': False, 'error': '这本词书是空的'}), 400

    conn = get_db()
    try:
        existing = {
            (row[0] or '').strip().lower()
            for row in conn.execute(
                'SELECT english_word FROM wordbook WHERE user_id = ?', (user['id'],)
            )
        }

        imported = sum(
            1 for r in records if r['english_word'].lower() not in existing
        )
        updated = len(records) - imported

        # upsert：新词插入，老词只更新内容字段。
        # 注意 DO UPDATE 里没有 mastery_level / review_count / last_reviewed / source，
        # 这是有意为之 —— 重导词表不该影响用户已有的学习进度。
        conn.executemany('''
            INSERT INTO wordbook
                (user_id, english_word, chinese_meaning, pronunciation,
                 part_of_speech, example_sentence, example_translation,
                 more_examples, uk_speech, us_speech, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, english_word) DO UPDATE SET
                chinese_meaning     = excluded.chinese_meaning,
                pronunciation       = excluded.pronunciation,
                part_of_speech      = excluded.part_of_speech,
                example_sentence    = excluded.example_sentence,
                example_translation = excluded.example_translation,
                more_examples       = excluded.more_examples,
                uk_speech           = excluded.uk_speech,
                us_speech           = excluded.us_speech,
                updated_at          = CURRENT_TIMESTAMP
        ''', [
            (
                user['id'],
                r['english_word'],
                r['chinese_meaning'],
                r.get('pronunciation') or '',
                r.get('part_of_speech') or '',
                r.get('example_sentence') or '',
                r.get('example_translation') or '',
                r.get('more_examples') or '',
                r.get('uk_speech') or '',
                r.get('us_speech') or '',
                pack_id
            )
            for r in records
        ])
        conn.commit()
    finally:
        conn.close()

    print('📚 导入词书「%s」: 新增 %d 词，更新 %d 词'
          % (pack_id, imported, updated))

    return jsonify({
        'success': True,
        'source': pack_id,
        'imported': imported,
        'updated': updated,
        'total': len(records)
    })

@app.route('/api/wordbook', methods=['POST'])
@handle_errors
def add_to_wordbook():
    """添加单词到单词本"""
    data = request.get_json()
    username = data.get('username', 'wendy')
    english_word = data.get('english_word', '').strip()
    chinese_meaning = data.get('chinese_meaning', '').strip()
    
    if not english_word or not chinese_meaning:
        return jsonify({'success': False, 'error': '英文单词和中文意思不能为空'}), 400
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    # 检查单词是否已存在
    existing_word = query_db(
        'SELECT id FROM wordbook WHERE user_id = ? AND english_word = ?',
        (user['id'], english_word.lower()),
        one=True
    )
    
    if existing_word:
        return jsonify({'success': False, 'error': '单词已在单词本中'}), 400
    
    # 添加单词
    word_id = execute_db('''
        INSERT INTO wordbook 
        (user_id, english_word, chinese_meaning, pronunciation, example_sentence, example_translation, word_image)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        user['id'],
        english_word.lower(),
        chinese_meaning,
        data.get('pronunciation', ''),
        data.get('example_sentence', ''),
        data.get('example_translation', ''),
        data.get('word_image', '')
    ))
    
    if word_id:
        # 检查是否获得"第一个单词"成就
        check_achievement(user['id'], 'first_word', '第一个单词', '成功添加第一个单词到单词本！', '🏆')
        
        return jsonify({
            'success': True,
            'message': '单词添加成功',
            'word_id': word_id
        })
    else:
        return jsonify({'success': False, 'error': '添加单词失败'}), 500

@app.route('/api/wordbook/<int:word_id>', methods=['PUT'])
@handle_errors
def update_word_mastery(word_id):
    """更新单词掌握程度"""
    data = request.get_json()
    mastery_level = data.get('mastery_level', 0)
    username = data.get('username', 'wendy')
    
    if not (0 <= mastery_level <= 3):
        return jsonify({'success': False, 'error': '掌握程度必须是0-3之间'}), 400
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    # 更新掌握程度
    execute_db('''
        UPDATE wordbook 
        SET mastery_level = ?, review_count = review_count + 1, last_reviewed = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    ''', (mastery_level, word_id, user['id']))
    
    # 如果达到3星，检查成就
    if mastery_level == 3:
        check_achievement(user['id'], 'master_word', '单词掌握', '成功掌握一个单词！', '⭐')
    
    return jsonify({
        'success': True,
        'message': '掌握程度更新成功'
    })

@app.route('/api/wordbook/<int:word_id>', methods=['DELETE'])
@handle_errors
def delete_word(word_id):
    """删除单词"""
    username = request.args.get('username', 'wendy')
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    execute_db('DELETE FROM wordbook WHERE id = ? AND user_id = ?', (word_id, user['id']))
    
    return jsonify({
        'success': True,
        'message': '单词删除成功'
    })

# ====== 学习进度 API ======
@app.route('/api/progress', methods=['GET'])
@handle_errors
def get_learning_progress():
    """获取学习进度"""
    username = request.args.get('username', 'wendy')
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    # 获取总学习统计
    stats = query_db('''
        SELECT 
            COUNT(DISTINCT id) as total_words,
            COUNT(CASE WHEN mastery_level >= 2 THEN 1 END) as mastered_words,
            SUM(review_count) as total_reviews,
            MAX(last_reviewed) as last_study_date
        FROM wordbook 
        WHERE user_id = ?
    ''', (user['id'],), one=True)
    
    # 1. 获取连续学习天数（从今天往前连续统计）
    # 思路：从今天开始往前检查，直到遇到没有学习记录的那天
    streak_days = 0
    check_date = date.today()
    max_check_days = 365  # 最多检查365天，避免无限循环
    checked_days = 0
    
    while checked_days < max_check_days:
        # 检查这一天是否有学习记录（翻译记录或单词本操作）
        has_activity = query_db('''
            SELECT COUNT(*) as count FROM learning_progress 
            WHERE user_id = ? AND learn_date = ?
        ''', (user['id'], check_date.isoformat()), one=True)
        
        if has_activity and has_activity['count'] > 0:
            streak_days += 1
            check_date = check_date - timedelta(days=1)
            checked_days += 1
        else:
            break
    
    # 2. 统计掌握单词数（mastery_level = 3）
    mastered_words_stats = query_db('''
        SELECT COUNT(*) as count
        FROM wordbook 
        WHERE user_id = ? AND mastery_level = 3
    ''', (user['id'],), one=True)
    
    mastered_words_count = mastered_words_stats['count'] if mastered_words_stats and mastered_words_stats['count'] is not None else 0
    print(f"📊 掌握单词数统计: user_id={user['id']}, mastered_words_count={mastered_words_count}")
    
    # 3. 统计本月掌握的单词数（mastery_level = 3 且本月达到3星）
    # 注意：这里统计的是本月达到3星的单词，检查 last_reviewed 是本月
    monthly_mastered_stats = query_db('''
        SELECT COUNT(*) as count
        FROM wordbook 
        WHERE user_id = ? 
        AND mastery_level = 3
        AND strftime('%Y-%m', last_reviewed) = strftime('%Y-%m', 'now')
    ''', (user['id'],), one=True)
    
    monthly_mastered_count = monthly_mastered_stats['count'] if monthly_mastered_stats and monthly_mastered_stats['count'] is not None else 0
    
    # 4. 成就勋章数量 = 掌握单词数 × 3
    achievements_count = mastered_words_count * 3
    
    # 获取本月学习时间（从 learning_progress 表）
    monthly_time = query_db('''
        SELECT 
            SUM(time_spent) as time_this_month
        FROM learning_progress 
        WHERE user_id = ? 
        AND strftime('%Y-%m', learn_date) = strftime('%Y-%m', 'now')
    ''', (user['id'],), one=True)
    
    # 确保所有值都有默认值，避免 None 错误
    progress_data = {
        'total_words': stats['total_words'] if stats and stats['total_words'] is not None else 0,
        'mastered_words': stats['mastered_words'] if stats and stats['mastered_words'] is not None else 0,
        'total_reviews': stats['total_reviews'] if stats and stats['total_reviews'] is not None else 0,
        'streak_days': streak_days,  # 连续学习天数
        'words_this_month': monthly_mastered_count,  # 本月掌握的单词数
        'total_mastered_words': mastered_words_count,  # 总计掌握的单词数
        'time_this_month': monthly_time['time_this_month'] if monthly_time and monthly_time['time_this_month'] is not None else 0,
        'achievements_count': achievements_count,  # 成就勋章数量 = 掌握单词数 × 3
        'last_study_date': stats['last_study_date'] if stats else None
    }
    
    print(f"📊 返回进度数据: total_mastered_words={progress_data['total_mastered_words']}, achievements_count={progress_data['achievements_count']}")
    
    return jsonify({
        'success': True,
        'progress': progress_data
    })

@app.route('/api/achievements', methods=['GET'])
@handle_errors
def get_achievements():
    """获取成就列表"""
    username = request.args.get('username', 'wendy')
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    achievements = query_db('''
        SELECT * FROM achievements 
        WHERE user_id = ? 
        ORDER BY earned_at DESC
    ''', (user['id'],))
    
    achievement_list = []
    for achievement in achievements:
        achievement_list.append({
            'id': achievement['id'],
            'type': achievement['achievement_type'],
            'name': achievement['achievement_name'],
            'description': achievement['achievement_description'],
            'badge_icon': achievement['badge_icon'],
            'earned_at': achievement['earned_at']
        })
    
    return jsonify({
        'success': True,
        'achievements': achievement_list,
        'total': len(achievement_list)
    })

# ====== 鼓励话语 API ======
@app.route('/api/encouragement', methods=['GET'])
@handle_errors
def get_encouragement():
    """获取随机鼓励话语"""
    # 随机选择一条鼓励话语
    message = random.choice(ENCOURAGEMENT_MESSAGES)
    
    return jsonify({
        'success': True,
        'message': message
    })

# ====== 辅助函数 ======
def update_learning_progress(user_id):
    """更新学习进度"""
    today = date.today().isoformat()
    
    # 检查今天的进度记录是否存在
    existing_progress = query_db(
        'SELECT id FROM learning_progress WHERE user_id = ? AND learn_date = ?',
        (user_id, today),
        one=True
    )
    
    if existing_progress:
        # 更新今天的记录
        execute_db('''
            UPDATE learning_progress 
            SET translation_count = translation_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND learn_date = ?
        ''', (user_id, today))
    else:
        # 创建今天的记录
        execute_db('''
            INSERT INTO learning_progress (user_id, learn_date, words_learned, translation_count)
            VALUES (?, ?, 0, 1)
        ''', (user_id, today))

def check_achievement(user_id, achievement_type, achievement_name, achievement_description, badge_icon):
    """检查并授予成就"""
    # 检查是否已获得该成就
    existing_achievement = query_db(
        'SELECT id FROM achievements WHERE user_id = ? AND achievement_type = ?',
        (user_id, achievement_type),
        one=True
    )
    
    if not existing_achievement:
        # 授予新成就
        execute_db('''
            INSERT INTO achievements (user_id, achievement_type, achievement_name, achievement_description, badge_icon)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, achievement_type, achievement_name, achievement_description, badge_icon))
        
        return True
    return False

# ====== AI对话 API ======
@app.route('/api/chat', methods=['POST'])
@handle_errors
def chat_with_ai():
    """AI对话接口"""
    print("🚀 收到AI对话请求")
    
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        context = data.get('context', '')
        username = data.get('username', 'wendy')
        
        print(f"📋 请求参数:")
        print(f"   - 用户: {username}")
        print(f"   - 消息: {message}")
        print(f"   - 上下文: {context}")
        
        if not message:
            print("❌ 消息内容为空")
            return jsonify({'success': False, 'error': '消息内容不能为空'}), 400
        
        print("📞 调用DeepSeek服务...")
        
        # 调用DeepSeek服务
        result = deepseek_service.chat(message, context)
        
        print(f"📝 DeepSeek服务返回:")
        print(f"   - 成功: {result.get('success')}")
        if result.get('success'):
            print(f"   - 回复长度: {len(result.get('response', ''))}")
        else:
            print(f"   - 错误: {result.get('error')}")
        
        # 记录对话历史（可选）
        if result.get('success'):
            user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
            if user:
                # 这里可以添加对话历史记录功能
                print(f"💾 用户ID: {user['id']}，可以记录对话历史")
        
        print("🎯 返回API响应")
        return jsonify(result)
        
    except Exception as e:
        print(f"💥 对话API异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'服务异常: {str(e)}',
            'response': '抱歉，对话服务出现异常，请稍后再试。'
        })

# ====== 语音识别 API ======
@app.route('/api/speech/recognize', methods=['POST'])
@handle_errors
def recognize_speech():
    """语音识别接口"""
    print("🎤 收到语音识别请求")
    
    try:
        # 检查是否有音频文件
        if 'audio' not in request.files:
            return jsonify({'success': False, 'error': '未找到音频文件'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'success': False, 'error': '音频文件为空'}), 400
        
        # 获取参数
        language = request.form.get('language', 'en')  # 默认英文
        format_type = request.form.get('format', 'wav')  # 默认wav
        rate = int(request.form.get('rate', 16000))  # 默认16kHz
        # 客户端实测录音时长（毫秒），仅用于排查问题；未传则为 None
        try:
            duration_ms = int(request.form.get('duration_ms')) if request.form.get('duration_ms') else None
        except (TypeError, ValueError):
            duration_ms = None
        
        # 读取音频数据
        audio_data = audio_file.read()
        
        # WAV 头 44 字节；16kHz/16bit/单声道 每秒 32000 字节
        est_seconds = max(0.0, (len(audio_data) - 44) / 32000.0)
        
        print(f"📋 请求参数:")
        print(f"   - 语言: {language}")
        print(f"   - 格式: {format_type}")
        print(f"   - 采样率: {rate}")
        print(f"   - 音频大小: {len(audio_data)} 字节 (约 {est_seconds:.2f} 秒)")
        if duration_ms is not None:
            print(f"   - 客户端录音时长: {duration_ms} ms")
        if est_seconds < 0.5:
            print(f"   ⚠️  音频过短（{est_seconds:.2f} 秒），百度会判为无效并返回 3307/3310")
        
        # 调用语音识别服务
        result = speech_service.recognize_audio(
            audio_data=audio_data,
            format=format_type,
            rate=rate,
            language=language
        )
        
        print(f"📝 语音识别服务返回:")
        print(f"   - 成功: {result.get('success')}")
        if result.get('success'):
            print(f"   - 识别文本: {result.get('text', '')}")
        else:
            print(f"   - 错误: {result.get('error')}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"💥 语音识别API异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'服务异常: {str(e)}'
        }), 500

# ====== 语音合成 API ======
@app.route('/api/speech/tts', methods=['POST'])
def synthesize_speech():
    """
    语音合成接口，成功时直接返回 MP3 音频。

    为什么需要：浏览器的 Web Speech API 依赖系统 TTS 引擎。
    华为浏览器等国产浏览器往往没有可用引擎，getVoices() 返回空数组，
    speechSynthesis.speak() 会静默失败（不报错也不出声）。
    这时前端改用这个接口拿到 MP3 再播放，就能绕开浏览器差异。
    """
    try:
        data = request.get_json(silent=True) or {}
        text = (data.get('text') or '').strip()
        if not text:
            return jsonify({'success': False, 'error': '缺少 text 参数'}), 400

        lang = data.get('lang', 'zh')
        rate = data.get('rate', 1.0)
        per = data.get('per', 0)

        if not tts_service.is_configured():
            return jsonify({
                'success': False,
                'error': '未配置百度语音合成，请在 .env 里设置 BAIDU_SPEECH_API_KEY 与 BAIDU_SPEECH_SECRET_KEY'
            }), 503

        print(f"🔊 收到语音合成请求: lang={lang} rate={rate} per={per} 文本长度={len(text)}")
        audio, mime = tts_service.synthesize(text, lang=lang, rate=rate, per=per)
        print(f"✅ 语音合成完成: {len(audio)} 字节")

        # 音频内容由文本+参数唯一决定，交给浏览器缓存一天，省百度额度
        resp = Response(audio, mimetype=mime)
        resp.headers['Cache-Control'] = 'public, max-age=86400'
        return resp

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        print(f"💥 语音合成API异常: {type(e).__name__}: {e}")
        return jsonify({'success': False, 'error': f'语音合成失败: {str(e)}'}), 500

@app.route('/api/speech/tts/stats', methods=['GET'])
def tts_stats():
    """
    语音合成的缓存与用量统计。

    baidu_calls 是**真正消耗百度免费额度**的次数，
    可以随时打开这个地址确认缓存有没有在省额度。
    """
    info = tts_service.cache_info()
    info['configured'] = tts_service.is_configured()
    return jsonify(info)

# ====== OCR文字识别 API ======
@app.route('/api/ocr/recognize', methods=['POST'])
@handle_errors
def recognize_ocr():
    """OCR文字识别接口"""
    print("📷 收到OCR识别请求")
    
    try:
        # 检查是否有图片文件
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': '未找到图片文件'}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'success': False, 'error': '图片文件为空'}), 400
        
        # 获取参数
        accurate = request.form.get('accurate', 'false').lower() == 'true'  # 是否使用高精度版
        language_type = request.form.get('language', 'ENG')  # 默认英文
        
        # 读取图片数据
        image_data = image_file.read()
        
        print(f"📋 请求参数:")
        print(f"   - 高精度: {accurate}")
        print(f"   - 语言: {language_type}")
        print(f"   - 图片大小: {len(image_data)} 字节")
        
        # 调用OCR服务
        result = ocr_service.recognize_text(
            image_data=image_data,
            accurate=accurate,
            language_type=language_type
        )
        
        print(f"📝 OCR服务返回:")
        print(f"   - 成功: {result.get('success')}")
        if result.get('success'):
            print(f"   - 识别文本: {result.get('text', '')}")
        else:
            print(f"   - 错误: {result.get('error')}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"💥 OCR API异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'服务异常: {str(e)}'
        }), 500

# ====== 单词详情 API ======
@app.route('/api/word/detail', methods=['GET'])
@handle_errors
def get_word_detail():
    """获取单词详情（从数据库）"""
    try:
        word = request.args.get('word', '').strip().lower()
        if not word:
            return jsonify({'success': False, 'error': '单词不能为空'}), 400
        
        # 从数据库查询
        detail = query_db(
            'SELECT * FROM word_details WHERE english_word = ?',
            (word,),
            one=True
        )
        
        if detail:
            import json
            # 将 sqlite3.Row 转换为字典，以便使用 .get() 方法
            detail_dict = dict(detail)
            return jsonify({
                'success': True,
                'word': detail_dict['english_word'],
                'chinese_meaning': detail_dict.get('chinese_meaning', ''),
                'part_of_speech': detail_dict.get('part_of_speech', ''),
                'pronunciation': detail_dict.get('pronunciation', ''),
                'word_image_url': detail_dict.get('word_image_url', ''),
                'memory_image_url': detail_dict.get('memory_image_url', ''),
                'memory_image_keyword': detail_dict.get('memory_image_keyword', ''),
                'word_forms': json.loads(detail_dict['word_forms']) if detail_dict.get('word_forms') else [],
                'synonyms': json.loads(detail_dict['synonyms']) if detail_dict.get('synonyms') else [],
                'antonyms': json.loads(detail_dict['antonyms']) if detail_dict.get('antonyms') else [],
                'more_examples': json.loads(detail_dict['more_examples']) if detail_dict.get('more_examples') else [],
                'from_cache': True
            })
        else:
            return jsonify({'success': False, 'error': '未找到单词详情'}), 404
            
    except Exception as e:
        print(f"💥 获取单词详情异常: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/word/detail', methods=['POST'])
@handle_errors
def save_word_detail():
    """保存单词详情到数据库"""
    try:
        data = request.get_json()
        word = data.get('word', '').strip().lower()
        
        if not word:
            return jsonify({'success': False, 'error': '单词不能为空'}), 400
        
        import json
        
        # 检查是否已存在
        existing = query_db(
            'SELECT id FROM word_details WHERE english_word = ?',
            (word,),
            one=True
        )
        
        if existing:
            # 更新
            execute_db('''
                UPDATE word_details SET
                    chinese_meaning = ?,
                    part_of_speech = ?,
                    pronunciation = ?,
                    word_image_url = ?,
                    memory_image_url = ?,
                    memory_image_keyword = ?,
                    word_forms = ?,
                    synonyms = ?,
                    antonyms = ?,
                    more_examples = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE english_word = ?
            ''', (
                data.get('chinese_meaning', ''),
                data.get('part_of_speech', ''),
                data.get('pronunciation', ''),
                data.get('word_image_url', ''),
                data.get('memory_image_url', ''),
                data.get('memory_image_keyword', ''),
                json.dumps(data.get('word_forms', []), ensure_ascii=False),
                json.dumps(data.get('synonyms', []), ensure_ascii=False),
                json.dumps(data.get('antonyms', []), ensure_ascii=False),
                json.dumps(data.get('more_examples', []), ensure_ascii=False),
                word
            ))
        else:
            # 插入
            execute_db('''
                INSERT INTO word_details 
                (english_word, chinese_meaning, part_of_speech, pronunciation, 
                 word_image_url, memory_image_url, memory_image_keyword, word_forms, synonyms, antonyms, more_examples)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                word,
                data.get('chinese_meaning', ''),
                data.get('part_of_speech', ''),
                data.get('pronunciation', ''),
                data.get('word_image_url', ''),
                data.get('memory_image_url', ''),
                data.get('memory_image_keyword', ''),
                json.dumps(data.get('word_forms', []), ensure_ascii=False),
                json.dumps(data.get('synonyms', []), ensure_ascii=False),
                json.dumps(data.get('antonyms', []), ensure_ascii=False),
                json.dumps(data.get('more_examples', []), ensure_ascii=False)
            ))
        
        return jsonify({'success': True, 'message': '单词详情已保存'})
        
    except Exception as e:
        print(f"💥 保存单词详情异常: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ====== 图片服务 API ======
@app.route('/api/word/image', methods=['GET'])
@handle_errors
def get_word_image():
    """获取单词相关图片"""
    print("🖼️  收到图片请求")
    
    try:
        keyword = request.args.get('keyword', '').strip()
        lang = request.args.get('lang', 'zh')  # 默认中文搜索
        per_page = request.args.get('per_page', '3')  # 返回图片数量，默认3张
        
        # 转换为整数，确保在合理范围内
        try:
            per_page = int(per_page)
            # Pixabay 的 per_page 合法区间是 3-200，低于 3 会被直接拒绝（HTTP 400）
            per_page = max(3, min(per_page, 20))
        except (ValueError, TypeError):
            per_page = 3
        
        if not keyword:
            return jsonify({'success': False, 'error': '关键词不能为空'}), 400
        
        print(f"📋 请求参数:")
        print(f"   - 关键词: {keyword}")
        print(f"   - 语言: {lang}")
        print(f"   - 数量: {per_page}")
        
        # 调用图片服务
        result = image_service.search_image(keyword, lang=lang, per_page=per_page)
        
        print(f"📝 图片服务返回:")
        print(f"   - 成功: {result.get('success')}")
        if result.get('success'):
            print(f"   - 找到图片数: {result.get('total', 0)}")
            print(f"   - 图片URL: {result.get('image_url', '')[:50]}...")
        else:
            print(f"   - 错误: {result.get('error')}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"💥 图片API异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'服务异常: {str(e)}'
        }), 500

# ====== 游戏 API ======
@app.route('/api/games/stats', methods=['GET'])
@handle_errors
def get_game_stats():
    """获取游戏统计数据，支持按游戏类型过滤"""
    print("🎮 收到游戏统计请求")
    
    try:
        username = request.args.get('username', 'wendy')
        game_type = request.args.get('game_type', None)  # 可选：按游戏类型过滤
        
        user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
        
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
        user_id = user['id']
        
        # 构建查询条件
        where_clause = 'WHERE user_id = ?'
        params = [user_id]
        
        if game_type:
            where_clause += ' AND game_type = ?'
            params.append(game_type)
            print(f"📊 查询游戏类型: {game_type}")
        
        # 统计总游戏次数
        total_games = query_db(
            f'SELECT COUNT(*) as count FROM game_records {where_clause}',
            tuple(params),
            one=True
        )
        
        # 统计总答题数
        total_questions = query_db(
            f'SELECT SUM(total_questions) as total FROM game_records {where_clause}',
            tuple(params),
            one=True
        )
        
        # 统计最高得分
        highest_score = query_db(
            f'SELECT MAX(score) as max_score FROM game_records {where_clause}',
            tuple(params),
            one=True
        )
        
        # 统计最高连击
        max_combo = query_db(
            f'SELECT MAX(max_combo) as max_combo FROM game_records {where_clause}',
            tuple(params),
            one=True
        )
        
        return jsonify({
            'success': True,
            'total_games': total_games['count'] if total_games else 0,
            'total_questions': total_questions['total'] if total_questions and total_questions['total'] else 0,
            'highest_score': highest_score['max_score'] if highest_score and highest_score['max_score'] else 0,
            'max_combo': max_combo['max_combo'] if max_combo and max_combo['max_combo'] else 0
        })
        
    except Exception as e:
        print(f"💥 游戏统计API异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'服务异常: {str(e)}'
        }), 500

@app.route('/api/games/record', methods=['POST'])
@handle_errors
def save_game_record():
    """保存游戏记录"""
    print("🎮 收到游戏记录保存请求")
    
    try:
        data = request.get_json()
        username = data.get('username', 'wendy')
        game_type = data.get('game_type', '')
        score = data.get('score', 0)
        correct_count = data.get('correct_count', 0)
        total_questions = data.get('total_questions', 0)
        max_combo = data.get('max_combo', 0)
        accuracy = data.get('accuracy', 0)
        
        if not game_type:
            return jsonify({'success': False, 'error': '游戏类型不能为空'}), 400
        
        user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
        if not user:
            return jsonify({'success': False, 'error': '用户不存在'}), 404
        
        user_id = user['id']
        
        # 保存游戏记录
        execute_db('''
            INSERT INTO game_records 
            (user_id, game_type, score, correct_count, total_questions, max_combo, accuracy)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, game_type, score, correct_count, total_questions, max_combo, accuracy))
        
        print(f"✅ 游戏记录已保存: {game_type}, 得分: {score}")
        
        return jsonify({
            'success': True,
            'message': '游戏记录已保存'
        })
        
    except Exception as e:
        print(f"💥 保存游戏记录API异常: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'服务异常: {str(e)}'
        }), 500

# ====== 游戏背记回流 API ======
# 游戏里每答一个词就回传一次结果，服务端负责三件事：
#   1) 累计对错次数与连对次数 —— 错词回炉、自适应出题的数据来源
#   2) 连续答对达到阈值时给单词本自动 +1 星（上限 3 星）
#   3) 返回升星结果，让前端弹祝贺动画
MASTERY_STREAK_TARGET = 3          # 连续答对多少次自动升 1 星
MAX_WORD_RESULTS_PER_REPORT = 200  # 一次上报最多处理的单词条数
MAX_PROGRESS_VALUE_LENGTH = 20000  # 单条进度存档的最大长度（字符）


@app.route('/api/games/word-stats', methods=['POST'])
@handle_errors
def save_game_word_stats():
    """保存游戏里的逐词对错结果，并在连对达标时自动升星"""
    data = request.get_json(silent=True) or {}
    username = data.get('username', 'wendy')
    game_type = (data.get('game_type') or '').strip() or 'unknown'
    results = data.get('results') or []
    
    if not isinstance(results, list) or not results:
        return jsonify({'success': False, 'error': 'results 不能为空'}), 400
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    user_id = user['id']
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    upgraded = []
    word_feedback = []
    
    db = get_db()
    try:
        cursor = db.cursor()
        for item in results[:MAX_WORD_RESULTS_PER_REPORT]:
            if not isinstance(item, dict):
                continue
            word = str(item.get('word') or '').strip()[:100]
            if not word:
                continue
            correct = bool(item.get('correct'))
            
            cursor.execute('''
                INSERT OR IGNORE INTO game_word_stats
                (user_id, english_word, correct_count, wrong_count, streak, best_streak,
                 last_result, last_seen, created_at, updated_at)
                VALUES (?, ?, 0, 0, 0, 0, 0, ?, ?, ?)
            ''', (user_id, word, now_str, now_str, now_str))
            
            if correct:
                cursor.execute('''
                    UPDATE game_word_stats
                    SET correct_count = correct_count + 1,
                        streak = streak + 1,
                        best_streak = MAX(best_streak, streak + 1),
                        last_result = 1,
                        last_seen = ?,
                        updated_at = ?
                    WHERE user_id = ? AND english_word = ?
                ''', (now_str, now_str, user_id, word))
            else:
                cursor.execute('''
                    UPDATE game_word_stats
                    SET wrong_count = wrong_count + 1,
                        streak = 0,
                        last_result = 0,
                        last_seen = ?,
                        updated_at = ?
                    WHERE user_id = ? AND english_word = ?
                ''', (now_str, now_str, user_id, word))
            
            row = cursor.execute('''
                SELECT streak, correct_count, wrong_count
                FROM game_word_stats
                WHERE user_id = ? AND english_word = ?
            ''', (user_id, word)).fetchone()
            streak = row['streak'] if row else 0
            correct_count = row['correct_count'] if row else 0
            wrong_count = row['wrong_count'] if row else 0
            
            # 单词本里有这个词，且连对达标 → 自动升 1 星
            if correct and streak >= MASTERY_STREAK_TARGET:
                wb = cursor.execute('''
                    SELECT id, mastery_level FROM wordbook
                    WHERE user_id = ? AND english_word = ?
                ''', (user_id, word)).fetchone()
                if wb and (wb['mastery_level'] or 0) < 3:
                    new_level = (wb['mastery_level'] or 0) + 1
                    cursor.execute('''
                        UPDATE wordbook
                        SET mastery_level = ?, review_count = review_count + 1,
                            last_reviewed = ?, updated_at = ?
                        WHERE id = ?
                    ''', (new_level, now_str, now_str, wb['id']))
                    # 升星后连对计数清零：下一次升星要再连对 3 次
                    cursor.execute('''
                        UPDATE game_word_stats SET streak = 0, updated_at = ?
                        WHERE user_id = ? AND english_word = ?
                    ''', (now_str, user_id, word))
                    streak = 0
                    upgraded.append({
                        'id': wb['id'],
                        'english_word': word,
                        'mastery_level': new_level,
                        'mastered': new_level >= 3
                    })
                elif wb:
                    # 已经是 3 星：只留复习痕迹，不再升星
                    cursor.execute('''
                        UPDATE wordbook
                        SET review_count = review_count + 1,
                            last_reviewed = ?, updated_at = ?
                        WHERE id = ?
                    ''', (now_str, now_str, wb['id']))
            
            word_feedback.append({
                'word': word,
                'correct': correct,
                'streak': streak,
                'correct_count': correct_count,
                'wrong_count': wrong_count
            })
        
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    
    # 升到 3 星的单词补发成就，与手动点星的行为保持一致
    for item in upgraded:
        if item['mastered']:
            check_achievement(user_id, 'master_word', '单词掌握', '成功掌握一个单词！', '⭐')
    
    print(f"🎮 游戏单词结果已记录: {game_type}, {len(word_feedback)} 词, 自动升星 {len(upgraded)} 个")
    return jsonify({
        'success': True,
        'game_type': game_type,
        'processed': len(word_feedback),
        'upgraded': upgraded,
        'words': word_feedback
    })


@app.route('/api/games/word-stats', methods=['GET'])
@handle_errors
def get_game_word_stats():
    """获取当前用户所有单词的游戏表现（供游戏做自适应出题、错词回炉）"""
    username = request.args.get('username', 'wendy')
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    rows = query_db('''
        SELECT english_word, correct_count, wrong_count, streak, best_streak,
               last_result, last_seen
        FROM game_word_stats
        WHERE user_id = ?
    ''', (user['id'],))
    
    stats = {}
    for row in (rows or []):
        stats[row['english_word']] = {
            'correct': row['correct_count'] or 0,
            'wrong': row['wrong_count'] or 0,
            'streak': row['streak'] or 0,
            'best_streak': row['best_streak'] or 0,
            'last_result': row['last_result'] or 0,
            'last_seen': row['last_seen']
        }
    
    return jsonify({'success': True, 'stats': stats, 'total': len(stats)})


@app.route('/api/games/progress', methods=['GET'])
@handle_errors
def get_game_progress():
    """读取游戏进度存档（手机与电脑共用同一份）"""
    username = request.args.get('username', 'wendy')
    game_type = (request.args.get('game_type') or '').strip()
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    if game_type:
        rows = query_db('''
            SELECT progress_key, value FROM game_progress
            WHERE user_id = ? AND game_type = ?
        ''', (user['id'], game_type))
    else:
        rows = query_db('''
            SELECT game_type, progress_key, value FROM game_progress
            WHERE user_id = ?
        ''', (user['id'],))
    
    progress = {}
    for row in (rows or []):
        if game_type:
            key = row['progress_key']
        else:
            key = f"{row['game_type']}::{row['progress_key']}"
        try:
            progress[key] = json.loads(row['value']) if row['value'] is not None else None
        except (TypeError, ValueError):
            progress[key] = row['value']
    
    return jsonify({'success': True, 'game_type': game_type, 'progress': progress})


@app.route('/api/games/progress', methods=['POST'])
@handle_errors
def save_game_progress():
    """写入游戏进度存档，items 为 {key: value}，可一次写多条"""
    data = request.get_json(silent=True) or {}
    username = data.get('username', 'wendy')
    game_type = (data.get('game_type') or '').strip()
    items = data.get('items')
    
    if not game_type:
        return jsonify({'success': False, 'error': 'game_type 不能为空'}), 400
    if not isinstance(items, dict) or not items:
        return jsonify({'success': False, 'error': 'items 不能为空'}), 400
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    user_id = user['id']
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    saved = 0
    
    db = get_db()
    try:
        cursor = db.cursor()
        for key, value in list(items.items())[:200]:
            key = str(key).strip()[:100]
            if not key:
                continue
            payload = json.dumps(value, ensure_ascii=False)
            if len(payload) > MAX_PROGRESS_VALUE_LENGTH:
                continue
            cursor.execute('''
                INSERT OR REPLACE INTO game_progress
                (user_id, game_type, progress_key, value, updated_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, game_type, key, payload, now_str))
            saved += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
    
    print(f"💾 游戏进度已保存: {game_type}, {saved} 条")
    return jsonify({'success': True, 'saved': saved})

# 启动服务器
if __name__ == '__main__':
    print("🚀 温蒂翻译助手后端服务启动")
    print("=" * 40)
    
    # 检查数据库
    if not os.path.exists(DATABASE):
        print("❌ 数据库不存在，请先运行 python Backend/scripts/database_init.py")
        exit(1)
    
    # 确保word_details表存在
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='word_details'
        """)
        if not cursor.fetchone():
            print("📦 检测到word_details表不存在，正在创建...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS word_details (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    english_word VARCHAR(100) NOT NULL UNIQUE,
                    chinese_meaning VARCHAR(200),
                    part_of_speech VARCHAR(50),
                    pronunciation VARCHAR(100),
                    word_image_url VARCHAR(500),
                    memory_image_url VARCHAR(500),
                    word_forms TEXT,
                    synonyms TEXT,
                    antonyms TEXT,
                    more_examples TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            print("✅ word_details表创建成功")
        conn.close()
    except Exception as e:
        print(f"⚠️  检查word_details表时出错: {e}")
        print("   建议运行 python Backend/scripts/database_init.py 来初始化数据库")
    
    print(f"📁 工作目录: {os.getcwd()}")
    print(f"💾 数据库: {DATABASE}")
    print("🌐 服务地址: http://localhost:5000")
    print("=" * 40)
    
    # 启动Flask应用
    # 调试模式默认开启（方便本地开发）；容器部署时通过 FLASK_DEBUG=false 关闭，
    # 避免 Werkzeug 调试器在生产环境暴露（调试器可执行任意代码）。
    DEBUG_MODE = os.getenv('FLASK_DEBUG', 'true').strip().lower() in ('1', 'true', 'yes', 'on')
    if DEBUG_MODE:
        print("⚠️  调试模式已开启（生产环境请设置 FLASK_DEBUG=false）")
    app.run(debug=DEBUG_MODE, host='0.0.0.0', port=5000, use_reloader=False)