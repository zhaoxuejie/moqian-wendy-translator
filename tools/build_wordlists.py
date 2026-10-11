#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把人教版（PEP）教材词库转换成本项目「单词本导入」能直接吃的 CSV。

数据来源
--------
https://github.com/kajweb/dict  （第三方整理，3673 stars）

⚠️ 重要说明
    该仓库**没有开源许可证**（license: null），数据格式（wordRank / ukphone /
    remMethod）看起来来自商业词库，来源不透明。
    因此：
      - 生成出来的 CSV 只放在本地 data/wordlists/ 目录，**已被 .gitignore 忽略**
      - 不要把这些词表提交到公开仓库，也不要做商业用途
      - 自己家里给孩子用没问题

输出格式
--------
data/wordlists/<中文册名>.csv，UTF-8，带表头：

    english_word,chinese_meaning,pronunciation,example_sentence,example_translation

CSV 的**文件名（不含扩展名）就是要导入的「来源」名字**，
所以你想改显示名字，直接重命名文件即可。

用法
----
    python tools/build_wordlists.py            # 转换全部
    python tools/build_wordlists.py PEPChuZhong7_1   # 只转换指定册
"""

import csv
import io
import json
import os
import re
import sys
import zipfile
from urllib.request import urlopen

# Windows 控制台默认是 GBK，直接 print 中文和 emoji 会抛 UnicodeEncodeError。
# 统一切到 UTF-8 并允许替换无法编码的字符，保证脚本永远不会因为打印而崩。
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

REPO_TREE = 'https://api.github.com/repos/kajweb/dict/git/trees/master?recursive=1'
RAW_BASE = 'https://raw.githubusercontent.com/kajweb/dict/master/book'

# 项目根目录（本脚本在 tools/ 下）
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_DIR = os.path.join(ROOT, 'data', 'wordlists')

# 要转换的册次：(bookId, 输出文件名)
# 小学高年级 + 初中全套，小学中低年级暂时不需要
BOOKS = [
    ('PEPXiaoXue5_1', '人教版-五年级上册'),
    ('PEPXiaoXue5_2', '人教版-五年级下册'),
    ('PEPXiaoXue6_1', '人教版-六年级上册'),
    ('PEPXiaoXue6_2', '人教版-六年级下册'),
    ('PEPChuZhong7_1', '人教版-初一上册'),
    ('PEPChuZhong7_2', '人教版-初一下册'),
    ('PEPChuZhong8_1', '人教版-初二上册'),
    ('PEPChuZhong8_2', '人教版-初二下册'),
    ('PEPChuZhong9_1', '人教版-初三上册'),
]

CSV_HEADER = [
    'english_word', 'chinese_meaning', 'pronunciation',
    'example_sentence', 'example_translation',
]

# 源数据里偶尔混进来的字段名标签（不是释义内容）
CONTENT_LABEL_RE = re.compile(r'(?:中文释义|英文释义|中释|英释)\s*[:：]\s*')


def log(msg):
    """打印日志，任何编码问题都不能让脚本中断"""
    try:
        print(msg, flush=True)
    except Exception:
        try:
            print(str(msg).encode('ascii', 'replace').decode('ascii'), flush=True)
        except Exception:
            pass


# ---------------------------------------------------------------- 网络

def fetch_bytes(url, timeout=120):
    with urlopen(url, timeout=timeout) as resp:
        return resp.read()


def resolve_zip_names():
    """
    从仓库文件树里找出每册对应的 zip 文件名。

    文件名带数字时间戳前缀（如 1530101067588_PEPChuZhong7_1.zip），
    硬编码容易写错，所以按 `_<bookId>.zip` 后缀匹配，最稳。
    """
    tree = json.loads(fetch_bytes(REPO_TREE).decode('utf-8'))
    wanted = {book_id: None for book_id, _ in BOOKS}

    for item in tree.get('tree', []):
        path = item.get('path', '')
        if not path.startswith('book/') or not path.endswith('.zip'):
            continue
        name = path.split('/', 1)[1]
        stem = name[:-4]
        for book_id in wanted:
            if stem.endswith('_' + book_id):
                wanted[book_id] = name

    return wanted


# ---------------------------------------------------------------- 解析

def pick_meaning(word_content):
    """把 trans 里所有中文释义合并成一个字符串"""
    trans = word_content.get('trans') or []
    parts = []
    for t in trans:
        cn = (t.get('tranCn') or '').strip()
        if not cn:
            continue
        # 源数据里偶尔混进字面量标签，例如
        #   "det 中文释义: 她的;它的〔指雌性动物〕"
        #   "prep 和...在一起；中文释义: 带有；中文释义: 使用"
        # 这些是抓取时留下的字段名，不是释义内容，清掉
        cn = CONTENT_LABEL_RE.sub('', cn).strip()
        if not cn:
            continue
        pos = (t.get('pos') or '').strip()
        text = (pos + ' ' + cn).strip() if pos else cn
        if text not in parts:
            parts.append(text)
    return '；'.join(parts)


def pick_phonetic(word_content):
    """英式 / 美式音标，缺哪个用哪个"""
    uk = (word_content.get('ukphone') or '').strip()
    us = (word_content.get('usphone') or '').strip()

    def wrap(x):
        if not x:
            return ''
        x = x.strip().strip('/')
        return '/' + x + '/'

    uk, us = wrap(uk), wrap(us)
    if uk and us and uk == us:
        return uk
    if uk and us:
        return '英 %s 美 %s' % (uk, us)
    return uk or us


def pick_sentence(word_content):
    """取第一个例句及其翻译"""
    sentence = word_content.get('sentence') or {}
    sentences = sentence.get('sentences') or []
    for s in sentences:
        en = (s.get('sContent') or '').strip()
        cn = (s.get('sCn') or '').strip()
        if en:
            return en, cn
    return '', ''


def parse_word_line(line):
    """
    解析一行 JSON（数据是 JSON Lines 格式），返回一条词记录或 None。

    结构（已实测）：
        {"wordRank":1,"headWord":"old",
         "content":{"word":{"wordHead":"old","content":{
             "ukphone":"əʊld","usphone":"old",
             "sentence":{"sentences":[{"sContent":"...","sCn":"..."}]},
             "trans":[{"tranCn":"老的","pos":"adj"}]}}}}
    """
    line = line.strip()
    if not line:
        return None

    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return None

    head_word = (obj.get('headWord') or '').strip()
    if not head_word:
        return None

    # 逐层取，任何一层缺失都不能让整条数据崩掉
    try:
        word_content = obj['content']['word']['content']
    except (KeyError, TypeError):
        word_content = {}
    if not isinstance(word_content, dict):
        word_content = {}

    meaning = pick_meaning(word_content)
    if not meaning:
        # 没有中文释义的词对单词本没意义，跳过
        return None

    en, cn = pick_sentence(word_content)

    return {
        'english_word': head_word,
        'chinese_meaning': meaning,
        'pronunciation': pick_phonetic(word_content),
        'example_sentence': en,
        'example_translation': cn,
    }


def convert_zip(zip_bytes, book_name):
    """把一个 zip 里的 JSON 转成记录列表"""
    records = []
    seen = set()

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        json_names = [n for n in zf.namelist() if n.lower().endswith('.json')]
        if not json_names:
            raise RuntimeError('zip 里没有找到 json 文件')

        for name in json_names:
            raw = zf.read(name).decode('utf-8-sig', errors='replace')
            for line in raw.splitlines():
                rec = parse_word_line(line)
                if not rec:
                    continue
                key = rec['english_word'].lower()
                if key in seen:
                    continue
                seen.add(key)
                records.append(rec)

    return records


# ---------------------------------------------------------------- 主流程

def write_csv(path, records):
    # 用 utf-8-sig（带 BOM），这样双击用 Excel 打开也不会中文乱码
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADER)
        writer.writeheader()
        writer.writerows(records)


def main():
    only = set(sys.argv[1:])

    os.makedirs(OUT_DIR, exist_ok=True)
    log('输出目录: %s' % OUT_DIR)
    log('')

    log('正在获取仓库文件清单...')
    zip_names = resolve_zip_names()

    missing = [b for b, n in zip_names.items() if not n]
    if missing:
        log('⚠️  以下册次没在仓库里找到，将跳过: %s' % ', '.join(missing))
        log('')

    total_words = 0
    summary = []

    for book_id, out_name in BOOKS:
        if only and book_id not in only and out_name not in only:
            continue

        zip_name = zip_names.get(book_id)
        if not zip_name:
            continue

        url = '%s/%s' % (RAW_BASE, zip_name)
        try:
            log('↓ %s  (%s)' % (book_id, zip_name))
            zip_bytes = fetch_bytes(url)
            records = convert_zip(zip_bytes, out_name)
        except Exception as exc:
            log('  ❌ 失败: %s: %s' % (type(exc).__name__, exc))
            continue

        out_path = os.path.join(OUT_DIR, out_name + '.csv')
        write_csv(out_path, records)

        with_sentence = sum(1 for r in records if r['example_sentence'])
        with_phonetic = sum(1 for r in records if r['pronunciation'])
        total_words += len(records)

        summary.append((out_name, len(records), with_phonetic, with_sentence))
        log('  ✅ %d 词（音标 %d，例句 %d）-> %s.csv'
            % (len(records), with_phonetic, with_sentence, out_name))

    log('')
    log('=' * 62)
    log('%-22s %7s %7s %7s' % ('册次', '词数', '有音标', '有例句'))
    log('-' * 62)
    for name, count, ph, se in summary:
        log('%-22s %7d %7d %7d' % (name, count, ph, se))
    log('-' * 62)
    log('%-22s %7d' % ('合计', total_words))
    log('')
    log('✅ 完成。文件在 %s' % OUT_DIR)
    log('   记得：这个目录已在 .gitignore 里，不会被提交。')


if __name__ == '__main__':
    main()
