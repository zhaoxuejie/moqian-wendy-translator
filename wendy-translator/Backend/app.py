#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
温蒂翻译助手后端服务
Flask API服务器
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
import json
from datetime import datetime, date
import hashlib
import requests
import time
from functools import wraps
from translation_service import translation_service
from config import translation_config

app = Flask(__name__, static_folder='../Frontend', static_url_path='')
CORS(app)  # 允许跨域请求

# 配置
import os
DATABASE = os.path.join(os.path.dirname(__file__), 'wendy_translator.db')
SECRET_KEY = 'wendy-translator-secret-key-2024'

# 配置翻译API
try:
    # 优先配置有道翻译API
    from configure_youdao_api import YOUDAO_APP_KEY, YOUDAO_APP_SECRET
    translation_service.set_youdao_config(YOUDAO_APP_KEY, YOUDAO_APP_SECRET)
    print("✅ 有道翻译API已配置")
except ImportError:
    print("ℹ️  有道翻译API配置文件未找到")
except Exception as e:
    print(f"⚠️  有道翻译API配置失败: {e}")
    print("🔄 尝试配置百度翻译API...")
    try:
        from configure_api import BAIDU_APPID, BAIDU_SECRET
        translation_service.set_baidu_config(BAIDU_APPID, BAIDU_SECRET)
        print("✅ 百度翻译API已配置")
    except ImportError:
        print("ℹ️  百度翻译API配置文件未找到，使用模拟翻译")
    except Exception as e2:
        print(f"⚠️  百度翻译API配置失败: {e2}")
        print("ℹ️  将使用模拟翻译服务")

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
    return send_from_directory('../Frontend', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    """提供静态文件服务"""
    return send_from_directory('../Frontend', filename)

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
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'display_name': user['display_name'],
                'avatar': user['avatar'],
                'theme': user['theme'],
                'language': user['language'],
                'volume': user['volume']
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
    
    for field in ['display_name', 'avatar', 'theme', 'language', 'volume']:
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
            'pronunciation': cached_result['pronunciation'],
            'example_sentence': cached_result['example_sentence'],
            'example_translation': cached_result['example_translation'],
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
            'original_text': text,
            'translated_text': translation_result['translated_text'],
            'pronunciation': translation_result.get('pronunciation', ''),
            'example_sentence': translation_result.get('example_sentence', ''),
            'example_translation': translation_result.get('example_translation', ''),
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
@app.route('/api/wordbook', methods=['GET'])
@handle_errors
def get_wordbook():
    """获取单词本"""
    username = request.args.get('username', 'wendy')
    
    user = query_db('SELECT id FROM users WHERE username = ?', (username,), one=True)
    if not user:
        return jsonify({'success': False, 'error': '用户不存在'}), 404
    
    words = query_db('''
        SELECT * FROM wordbook 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ''', (user['id'],))
    
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
            'last_reviewed': word['last_reviewed']
        })
    
    return jsonify({
        'success': True,
        'words': word_list,
        'total': len(word_list)
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
    
    # 获取连续学习天数
    streak_days = query_db('''
        SELECT COUNT(*) as streak_count
        FROM learning_progress 
        WHERE user_id = ? 
        AND learn_date >= date('now', '-7 days')
    ''', (user['id'],), one=True)
    
    # 获取本月学习统计
    monthly_stats = query_db('''
        SELECT 
            COUNT(*) as words_this_month,
            SUM(time_spent) as time_this_month
        FROM learning_progress 
        WHERE user_id = ? 
        AND strftime('%Y-%m', learn_date) = strftime('%Y-%m', 'now')
    ''', (user['id'],), one=True)
    
    # 获取成就数量
    achievement_count = query_db(
        'SELECT COUNT(*) as count FROM achievements WHERE user_id = ?',
        (user['id'],),
        one=True
    )
    
    return jsonify({
        'success': True,
        'progress': {
            'total_words': stats['total_words'] or 0,
            'mastered_words': stats['mastered_words'] or 0,
            'total_reviews': stats['total_reviews'] or 0,
            'streak_days': streak_days['streak_count'] or 0,
            'words_this_month': monthly_stats['words_this_month'] or 0,
            'time_this_month': monthly_stats['time_this_month'] or 0,
            'achievements_count': achievement_count['count'] or 0,
            'last_study_date': stats['last_study_date']
        }
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

# 启动服务器
if __name__ == '__main__':
    print("🚀 温蒂翻译助手后端服务启动")
    print("=" * 40)
    
    # 检查数据库
    if not os.path.exists(DATABASE):
        print("❌ 数据库不存在，请先运行 python database_init.py")
        exit(1)
    
    print(f"📁 工作目录: {os.getcwd()}")
    print(f"💾 数据库: {DATABASE}")
    print("🌐 服务地址: http://localhost:5000")
    print("=" * 40)
    
    # 启动Flask应用
    app.run(debug=True, host='0.0.0.0', port=5000)