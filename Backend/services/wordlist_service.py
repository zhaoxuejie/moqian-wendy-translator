"""
教材词表（词书）服务

从 data/wordlists/*.csv 读取教材单词表，供「导入单词本」功能使用。

设计要点
--------
1. **文件名就是词书 ID**
   `人教版-初一上册.csv` 的 ID 和显示名都是「人教版-初一上册」。
   想改显示名直接重命名文件即可。

2. **防路径穿越**
   `pack_id` 是客户端传上来的。这里不接受任何拼接出来的路径 ——
   只先在目录里枚举出真实文件，再按 ID 查表。这样
   `../../.env` 之类的输入根本匹配不到任何条目，天然安全。

3. **按 mtime 缓存解析结果**
   一册 77KB、500 词，解析一次约几毫秒。缓存后重复请求（比如
   界面反复刷新导入列表）不会重复读盘。文件被重新生成时 mtime 变化，
   缓存自动失效。

数据文件不进 Git，原因见 data/wordlists/README.md。
"""

import csv
import json
import os
from typing import Dict, List, Optional

# CSV 里必须有的列（其余列可选）
REQUIRED_FIELDS = ('english_word', 'chinese_meaning')

# 直接按列名透传到数据库的字段
PASSTHROUGH_FIELDS = (
    'pronunciation',
    'part_of_speech',
    'example_sentence',
    'example_translation',
    'uk_speech',
    'us_speech',
)

# 第 2、3 条例句在 CSV 里是固定列，写库时收成一个 JSON 数组存进 more_examples，
# 免得数据库里为它们多堆 4 个列
EXTRA_SENTENCE_INDEXES = (2, 3)


def _cell(row: Dict[str, str], name: str) -> str:
    return (row.get(name) or '').strip()


def _collect_more_examples(row: Dict[str, str]) -> str:
    """把第 2、3 条例句收成 JSON 数组字符串"""
    items = []
    for index in EXTRA_SENTENCE_INDEXES:
        en = _cell(row, 'example_sentence_%d' % index)
        cn = _cell(row, 'example_translation_%d' % index)
        if en:
            items.append({'en': en, 'cn': cn})
    return json.dumps(items, ensure_ascii=False) if items else ''


class WordlistService:
    """教材词表目录的读取与缓存"""

    def __init__(self):
        self.directory: Optional[str] = None
        # { 文件绝对路径: (mtime, size, 记录列表) }
        self._cache: Dict[str, tuple] = {}

    # ---------------------------------------------------------- 配置

    def set_directory(self, path: str):
        """设置词表目录（由 config 在启动时注入）"""
        self.directory = path
        self._cache.clear()

        if not path:
            print('ℹ️  未配置教材词表目录，导入词书功能不可用')
            return

        if not os.path.isdir(path):
            print('ℹ️  教材词表目录不存在（%s），导入词书功能不可用' % path)
            print('   需要的话执行: python tools/build_wordlists.py')
            return

        packs = self.list_packs()
        if packs:
            total = sum(p['word_count'] for p in packs)
            print('✅ 教材词表已就绪: %d 册，共 %d 词（%s）' % (len(packs), total, path))
        else:
            print('ℹ️  教材词表目录为空（%s）' % path)
            print('   需要的话执行: python tools/build_wordlists.py')

    def available(self) -> bool:
        return bool(self.directory) and os.path.isdir(self.directory)

    # ---------------------------------------------------------- 内部

    def _scan(self) -> List[Dict]:
        """
        枚举目录下的 CSV。

        返回 [{id, name, path, mtime, size}]，按文件名排序。
        只认 .csv，忽略 README 等其它文件。
        """
        if not self.available():
            return []

        found = []
        try:
            names = sorted(os.listdir(self.directory))
        except OSError as exc:
            print('⚠️  读取教材词表目录失败: %s' % exc)
            return []

        for name in names:
            if not name.lower().endswith('.csv'):
                continue
            path = os.path.join(self.directory, name)
            if not os.path.isfile(path):
                continue

            pack_id = name[:-4]  # 去掉 .csv
            if not pack_id:
                continue

            try:
                stat = os.stat(path)
            except OSError:
                continue

            found.append({
                'id': pack_id,
                'name': pack_id,
                'path': path,
                'mtime': stat.st_mtime,
                'size': stat.st_size,
            })

        return found

    def _load(self, entry: Dict) -> Optional[List[Dict]]:
        """读取并解析一个 CSV，带 mtime 缓存"""
        path = entry['path']
        cache_key = (entry['mtime'], entry['size'])

        cached = self._cache.get(path)
        if cached and cached[0] == cache_key:
            return cached[1]

        try:
            # utf-8-sig：生成时带了 BOM，用 Excel 打开不会乱码；这里也要能读
            with open(path, 'r', encoding='utf-8-sig', newline='') as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames or []

                missing = [c for c in REQUIRED_FIELDS if c not in headers]
                if missing:
                    print('⚠️  词表 %s 缺少必需列 %s，已跳过' % (entry['id'], missing))
                    self._cache[path] = (cache_key, None)
                    return None

                records = []
                seen = set()
                for row in reader:
                    word = (row.get('english_word') or '').strip()
                    meaning = (row.get('chinese_meaning') or '').strip()
                    if not word or not meaning:
                        continue

                    key = word.lower()
                    if key in seen:
                        continue
                    seen.add(key)

                    record = {
                        'english_word': word,
                        'chinese_meaning': meaning,
                        'more_examples': _collect_more_examples(row),
                    }
                    for field in PASSTHROUGH_FIELDS:
                        record[field] = _cell(row, field)
                    records.append(record)

        except Exception as exc:
            print('⚠️  解析词表 %s 失败: %s: %s' % (entry['id'], type(exc).__name__, exc))
            self._cache[path] = (cache_key, None)
            return None

        self._cache[path] = (cache_key, records)
        return records

    # ---------------------------------------------------------- 对外

    def list_packs(self) -> List[Dict]:
        """列出所有可用词书及词数"""
        packs = []
        for entry in self._scan():
            records = self._load(entry)
            if records is None:
                continue
            packs.append({
                'id': entry['id'],
                'name': entry['name'],
                'word_count': len(records),
            })
        return packs

    def read_pack(self, pack_id: str) -> Optional[List[Dict]]:
        """
        按 ID 读取一册词表。

        ID 必须来自 list_packs() 的枚举结果，不接受任意路径字符串，
        因此不存在路径穿越问题。
        """
        if not pack_id:
            return None

        pack_id = str(pack_id).strip()
        for entry in self._scan():
            if entry['id'] == pack_id:
                return self._load(entry)
        return None


# 全局单例
wordlist_service = WordlistService()
