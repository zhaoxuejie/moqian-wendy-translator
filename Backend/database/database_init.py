#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
温蒂翻译助手数据库初始化脚本
创建SQLite数据库和表结构
"""

import sqlite3
import os
from datetime import datetime

def init_database():
    """初始化数据库"""
    # 数据库文件路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, 'wendy_translator.db')
    
    # 连接数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 创建用户表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                avatar VARCHAR(200) DEFAULT 'img/kenan.jpg',
                theme VARCHAR(20) DEFAULT 'pink',
                language VARCHAR(10) DEFAULT 'zh',
                volume INTEGER DEFAULT 50,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 创建单词本表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS wordbook (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                english_word VARCHAR(100) NOT NULL,
                chinese_meaning VARCHAR(200) NOT NULL,
                pronunciation VARCHAR(100),
                example_sentence TEXT,
                example_translation TEXT,
                word_image VARCHAR(200),
                mastery_level INTEGER DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                last_reviewed TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, english_word)
            )
        """)
        
        # 创建翻译历史表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS translation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                original_text TEXT NOT NULL,
                translated_text TEXT NOT NULL,
                source_language VARCHAR(10) DEFAULT 'auto',
                target_language VARCHAR(10) DEFAULT 'zh',
                input_method VARCHAR(20) DEFAULT 'text',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # 创建学习进度表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                learn_date DATE NOT NULL,
                words_learned INTEGER DEFAULT 0,
                translation_count INTEGER DEFAULT 0,
                time_spent INTEGER DEFAULT 0,
                streak_days INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, learn_date)
            )
        """)
        
        # 创建成就表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                achievement_type VARCHAR(50) NOT NULL,
                achievement_name VARCHAR(100) NOT NULL,
                achievement_description TEXT,
                badge_icon VARCHAR(200),
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, achievement_type)
            )
        """)
        
        # 创建翻译缓存表（提高性能）
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS translation_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_text VARCHAR(500) NOT NULL,
                source_language VARCHAR(10) NOT NULL,
                target_language VARCHAR(10) NOT NULL,
                translated_text TEXT NOT NULL,
                pronunciation VARCHAR(100),
                example_sentence TEXT,
                example_translation TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(source_text, source_language, target_language)
            )
        """)
        
        # 插入默认用户（温蒂）
        cursor.execute("""
            INSERT OR IGNORE INTO users (username, display_name, avatar, theme, language, volume)
            VALUES ('wendy', '温蒂', 'img/kenan.jpg', 'pink', 'zh', 50)
        """)
        
        # 插入一些初始单词到单词本
        initial_words = [
            ('apple', '苹果', '/ˈæp.əl/', 'I like to eat red apples.', '我喜欢吃红苹果。', '🍎'),
            ('cat', '猫', '/kæt/', 'The cat is sleeping on the sofa.', '猫正在沙发上睡觉。', '🐱'),
            ('sun', '太阳', '/sʌn/', 'The sun is shining brightly today.', '今天阳光明媚。', '☀️'),
            ('book', '书', '/bʊk/', 'I am reading an interesting book.', '我正在读一本有趣的书。', '📚'),
            ('flower', '花', '/ˈflaʊ.ər/', 'The flowers in the garden are beautiful.', '花园里的花很美。', '🌸'),
            ('house', '房子', '/haʊs/', 'They live in a big house.', '他们住在一所大房子里。', '🏠')
        ]
        
        # 获取默认用户ID
        cursor.execute('SELECT id FROM users WHERE username = "wendy"')
        user_id = cursor.fetchone()[0]
        
        # 插入初始单词
        for word_data in initial_words:
            cursor.execute("""
                INSERT OR IGNORE INTO wordbook 
                (user_id, english_word, chinese_meaning, pronunciation, example_sentence, example_translation, word_image)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, *word_data))
        
        # 提交事务
        conn.commit()
        print("✅ 数据库初始化成功！")
        print(f"📍 数据库位置: {db_path}")
        print(f"📊 初始数据:")
        print(f"   - 用户: 1")
        print(f"   - 单词本: {len(initial_words)} 个单词")
        
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def check_database():
    """检查数据库状态"""
    db_path = os.path.join(os.path.dirname(__file__), 'wendy_translator.db')
    
    if not os.path.exists(db_path):
        print("❌ 数据库文件不存在")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 检查表是否存在
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        
        print("✅ 数据库连接成功")
        print(f"📋 数据表: {', '.join(tables)}")
        
        # 检查数据统计
        if 'users' in tables:
            cursor.execute('SELECT COUNT(*) FROM users')
            user_count = cursor.fetchone()[0]
            print(f"👥 用户数: {user_count}")
        
        if 'wordbook' in tables:
            cursor.execute('SELECT COUNT(*) FROM wordbook')
            word_count = cursor.fetchone()[0]
            print(f"📖 单词数: {word_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据库检查失败: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 温蒂翻译助手数据库初始化")
    print("=" * 40)
    
    # 检查是否需要初始化
    db_path = os.path.join(os.path.dirname(__file__), 'wendy_translator.db')
    if not os.path.exists(db_path):
        print("📦 首次运行，正在创建数据库...")
        init_database()
    else:
        print("🔍 检查数据库状态...")
        check_database()
    
    print("=" * 40)
    print("✨ 数据库操作完成！")