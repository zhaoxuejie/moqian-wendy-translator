# 教材词库目录

这个目录用来放**教材单词表**，供「单词本导入」功能使用。

> ⚠️ **这个目录里的 CSV 不会进入 Git。**
> 用 `data/wordlists/*` 忽略全部内容，只放行本说明文件。

---

## 为什么要单独放、不进仓库

这些教材词表来自第三方整理，**没有开源许可证**：

| 来源 | Stars | 许可证 |
|---|---:|---|
| [kajweb/dict](https://github.com/kajweb/dict) | 3673 | ❌ 无 |
| [SteveSuv/remix-words-funny](https://github.com/SteveSuv/remix-words-funny) | 1575 | ❌ 无 |
| [lizliz404/pep-words](https://github.com/lizliz404/pep-words) | 1 | ❌ 无 |

而且从数据格式（`wordRank` / `ukphone` / `remMethod`）看，来源很可能是商业词库。

**风险分层：**

| 用法 | 风险 |
|---|---|
| 自己电脑上给孩子用 | 🟢 基本为零 |
| 打包进公开的 GitHub 仓库 | 🟡 等于公开分发，有被投诉的可能 |
| 商业 / 教学用途 | 🔴 不建议 |

所以本项目的做法是：**功能进仓库，数据不进仓库**。
导入功能是公开代码，词表文件留在你自己电脑上。

---

## 生成词表

仓库里带了转换脚本，直接跑就行：

```bash
python tools/build_wordlists.py
```

它会自动：

1. 从 `kajweb/dict` 拉取仓库文件清单（文件名带时间戳前缀，脚本按后缀匹配，不用手写）
2. 下载所需册次的 zip
3. 解析 JSON Lines，抽取字段
4. 输出成下面格式的 CSV

只转换某一册：

```bash
python tools/build_wordlists.py PEPChuZhong7_1
```

## CSV 格式

UTF-8（带 BOM，Excel 双击不乱码），**12 列**，首行是表头：

```csv
english_word,part_of_speech,chinese_meaning,pronunciation,example_sentence,example_translation,example_sentence_2,example_translation_2,example_sentence_3,example_translation_3,uk_speech,us_speech
morning,n,早晨；上午,英 /'mɔːnɪŋ/ 美 /'mɔrnɪŋ/,I hated those cold winter mornings.,我讨厌冬天里寒冷的早晨。,...,...,...,...,morning&type=1,morning&type=2
```

| 列 | 说明 | 必填 |
|---|---|:--:|
| `english_word` | 英文单词 | ✅ |
| `part_of_speech` | 词性，独立一列（`n` / `adj` / `prep`…） | |
| `chinese_meaning` | 中文释义（多个词性用 `；` 连接） | ✅ |
| `pronunciation` | 音标 | |
| `example_sentence` / `example_translation` | 第 1 条例句及翻译 | |
| `example_sentence_2` / `example_translation_2` | 第 2 条 | |
| `example_sentence_3` / `example_translation_3` | 第 3 条 | |
| `uk_speech` / `us_speech` | 真人发音标识，形如 `morning&type=2` | |

**没有中文释义的词会被脚本自动跳过**——没有释义对背单词没意义。
**例句不足 3 条时脚本会补空列**，保证列数固定、不会串行。

`part_of_speech` 独立成一列，是因为单词详情弹窗要单独展示词性；
早期版本把它拼在释义前面（`n 早晨；上午`），显示时还得再拆一次。

导入时第 2、3 条例句会被收成 JSON 存进 `wordbook.more_examples` 一列，
不在数据库里为它们多堆 4 个字段。

> 注：人教版**小学**那 4 册的源数据里没有词性（实测 0/525），初中各册都有。
> 小学词的词性暂时为空，不影响导入和使用。

## 来源名字怎么来的

导入时显示的「来源」名字 = **CSV 文件名去掉扩展名**。

所以想改显示名字，直接重命名文件：

```
人教版-初一上册.csv   →   导入后显示为「人教版-初一上册」
```

## 自己加词表

不限于人教版，也不限于脚本拉的那几册。只要符合上面的 CSV 格式，
丢进这个目录，导入功能就能识别。

比如你自己整理的：

```
data/wordlists/我的错题本.csv
data/wordlists/外研版-初二上册.csv
```

## 当前已生成的册次

人教版小学高年级 + 初中（脚本里的 `BOOKS` 列表）：

| 册次 | bookId |
|---|---|
| 五年级上册 / 下册 | `PEPXiaoXue5_1` / `PEPXiaoXue5_2` |
| 六年级上册 / 下册 | `PEPXiaoXue6_1` / `PEPXiaoXue6_2` |
| 初一上册 / 下册 | `PEPChuZhong7_1` / `PEPChuZhong7_2` |
| 初二上册 / 下册 | `PEPChuZhong8_1` / `PEPChuZhong8_2` |
| 初三上册 | `PEPChuZhong9_1` |

需要小学中低年级（三年级、四年级）或高中，改脚本里的 `BOOKS` 列表即可。
