#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
温蒂翻译助手数据库初始化脚本
创建SQLite数据库和表结构
"""

import sqlite3
import os
import sys
from datetime import datetime

# 设置标准输出编码为UTF-8（解决Windows下emoji显示问题）
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 游戏回流相关表的建表语句
# init_database（全新库）与 ensure_game_tables（老库补表）共用，避免建表语句写两遍。
#
# game_word_stats：记录每个单词在游戏里的对错与连对次数，支撑
#   1) 错词回炉（答错的词下次优先出现）
#   2) 自适应出题（优先练掌握程度低的词）
#   3) 游戏自动升星（连对达标时给单词本 +1 星）
# game_progress：游戏进度存档（大冒险的地图/关卡星级等），让手机和电脑进度一致。
GAME_TABLES_SQL = [
    """
    CREATE TABLE IF NOT EXISTS game_word_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        english_word VARCHAR(100) NOT NULL,
        correct_count INTEGER DEFAULT 0,
        wrong_count INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        last_result INTEGER DEFAULT 0,
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, english_word)
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_game_word_stats_user
    ON game_word_stats(user_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS game_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_type VARCHAR(50) NOT NULL,
        progress_key VARCHAR(100) NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, game_type, progress_key)
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_game_progress_user
    ON game_progress(user_id, game_type)
    """
]


def init_database(quiet=False):
    """初始化数据库"""
    # 数据库文件路径：优先使用环境变量，否则使用默认路径
    db_path = os.getenv('DATABASE_PATH')
    if not db_path:
        # 默认路径：项目根目录的 database/wendy_translator.db
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))  # backend -> 项目根目录
        db_path = os.path.join(project_root, 'database', 'wendy_translator.db')
    
    # 确保目录存在
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    
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
                voice_name VARCHAR(100) DEFAULT '',
                voice_lang VARCHAR(10) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 如果表已存在，检查是否需要添加新字段
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'voice_name' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN voice_name VARCHAR(100) DEFAULT ''")
        if 'voice_lang' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN voice_lang VARCHAR(10) DEFAULT ''")
        
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
        
        # 创建单词详情表（存储单词详细信息）
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS word_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                english_word VARCHAR(100) NOT NULL UNIQUE,
                chinese_meaning VARCHAR(200),
                part_of_speech VARCHAR(50),
                pronunciation VARCHAR(100),
                word_image_url VARCHAR(500),
                memory_image_url VARCHAR(500),
                memory_image_keyword VARCHAR(200),
                word_forms TEXT,
                synonyms TEXT,
                antonyms TEXT,
                more_examples TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 创建游戏记录表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS game_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                game_type VARCHAR(50) NOT NULL,
                score INTEGER DEFAULT 0,
                correct_count INTEGER DEFAULT 0,
                total_questions INTEGER DEFAULT 0,
                max_combo INTEGER DEFAULT 0,
                accuracy DECIMAL(5, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # 如果表已存在，检查是否需要添加新字段
        cursor.execute("PRAGMA table_info(word_details)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'memory_image_keyword' not in columns:
            cursor.execute("ALTER TABLE word_details ADD COLUMN memory_image_keyword VARCHAR(200)")
        
        # 创建游戏回流相关表（错词回炉 / 自适应出题 / 自动升星 / 跨设备进度）
        for sql in GAME_TABLES_SQL:
            cursor.execute(sql)
        
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
        if not quiet:
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

def check_database(quiet=False):
    """检查数据库状态"""
    db_path = os.getenv('DATABASE_PATH')
    if not db_path:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        db_path = os.path.join(project_root, 'database', 'wendy_translator.db')
    
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
        
        if not quiet:
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
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

def ensure_word_details_table(quiet=False):
    """确保word_details表存在（用于已存在的数据库）"""
    db_path = os.getenv('DATABASE_PATH')
    if not db_path:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        db_path = os.path.join(project_root, 'database', 'wendy_translator.db')
    
    if not os.path.exists(db_path):
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 检查word_details表是否存在
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='word_details'
        """)
        table_exists = cursor.fetchone() is not None
        
        if not table_exists:
            if not quiet:
                print("📦 创建word_details表...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS word_details (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    english_word VARCHAR(100) NOT NULL UNIQUE,
                    chinese_meaning VARCHAR(200),
                    part_of_speech VARCHAR(50),
                    pronunciation VARCHAR(100),
                    word_image_url VARCHAR(500),
                    memory_image_url VARCHAR(500),
                    memory_image_keyword VARCHAR(200),
                    word_forms TEXT,
                    synonyms TEXT,
                    antonyms TEXT,
                    more_examples TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            if not quiet:
                print("✅ word_details表创建成功")
            return True
        else:
            # 检查是否需要添加memory_image_keyword字段
            cursor.execute("PRAGMA table_info(word_details)")
            columns = [column[1] for column in cursor.fetchall()]
            if 'memory_image_keyword' not in columns:
                if not quiet:
                    print("📦 添加memory_image_keyword字段...")
                cursor.execute("ALTER TABLE word_details ADD COLUMN memory_image_keyword VARCHAR(200)")
                conn.commit()
                if not quiet:
                    print("✅ memory_image_keyword字段添加成功")
        
        # 检查game_records表是否存在
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='game_records'
        """)
        game_records_exists = cursor.fetchone() is not None
        
        if not game_records_exists:
            if not quiet:
                print("📦 创建game_records表...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS game_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    game_type VARCHAR(50) NOT NULL,
                    score INTEGER DEFAULT 0,
                    correct_count INTEGER DEFAULT 0,
                    total_questions INTEGER DEFAULT 0,
                    max_combo INTEGER DEFAULT 0,
                    accuracy DECIMAL(5, 2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            conn.commit()
            if not quiet:
                print("✅ game_records表创建成功")
        
        return True
    except Exception as e:
        print(f"❌ 创建word_details表失败: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False
    finally:
        conn.close()

def ensure_game_tables(quiet=False):
    """确保游戏回流相关表存在（用于已经建好的老数据库）"""
    db_path = os.getenv('DATABASE_PATH')
    if not db_path:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        db_path = os.path.join(project_root, 'database', 'wendy_translator.db')
    
    if not os.path.exists(db_path):
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        for sql in GAME_TABLES_SQL:
            cursor.execute(sql)
        conn.commit()
        if not quiet:
            print("✅ 游戏回流数据表已就绪（game_word_stats / game_progress）")
        return True
    except Exception as e:
        print(f"❌ 创建游戏回流数据表失败: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    quiet_mode = os.getenv('DATABASE_INIT_QUIET', 'false').lower() == 'true'
    
    if not quiet_mode:
        print("🚀 温蒂翻译助手数据库初始化")
        print("=" * 40)
    
    # 检查是否需要初始化
    db_path = os.getenv('DATABASE_PATH')
    if not db_path:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        db_path = os.path.join(project_root, 'database', 'wendy_translator.db')
    
    if not os.path.exists(db_path):
        if not quiet_mode:
            print("📦 首次运行，正在创建数据库...")
        init_database(quiet=quiet_mode)
    else:
        if not quiet_mode:
            print("🔍 检查数据库状态...")
        check_database(quiet=quiet_mode)
        # 确保word_details表存在
        ensure_word_details_table(quiet=quiet_mode)
    
    # 确保游戏回流数据表存在（全新库和老库都走一遍，幂等）
    ensure_game_tables(quiet=quiet_mode)
    
    if not quiet_mode:
        print("=" * 40)
        print("✨ 数据库操作完成！")