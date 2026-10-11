/**
 * 温蒂游戏共享内核（game-kit.js）
 *
 * 三款新游戏（🏹 单词猎人 / 🧠 词汇拼图 / 🗺️ 单词大冒险）共用一套底座，
 * 保证「怎么选词、怎么回炉错词、怎么回传成绩、音效/朗读/双语」三处完全一致，
 * 不用每款游戏各写一遍。
 *
 * 提供的能力：
 *   1. loadWords()        读单词本；词太少时用内置常用词补足，保证游戏能开起来
 *   2. loadStats()        读每个单词在游戏里的历史对错（后端 game_word_stats）
 *   3. buildQueue()       自适应抽词：优先练「掌握程度低 / 常错 / 上次答错」的词
 *   4. noteResult()       记录本局逐词结果，答错的词自动进入回炉队列
 *   5. reportResults()    整局结束后一次性回传后端 → 服务端累计并自动升星；
 *                         断网时先存本地，下次进游戏自动补传
 *   6. celebrateUpgrades() 升星弹提示、3 星走祝贺动画并刷新单词本
 *   7. 音效 / 朗读 / 双语 / 洗牌 / 干扰项挑选 等表现工具
 *
 * 用法：
 *   const kit = new WendyGameKit(this.api, this.app, 'word-hunter');
 *   const words = await kit.loadWords(6);
 *   const stats = await kit.loadStats();
 *   const queue = kit.buildQueue(words, stats, 10);
 */
class WendyGameKit {
    constructor(api, app, gameType) {
        this.api = api;
        this.app = app;
        this.gameType = gameType;
        this.results = [];          // 本局逐词结果 [{word, correct}]
        this.recycleWords = [];     // 待回炉的错词
        this.recycleMarked = {};    // 已排进回炉队列的词（同一个词只回炉一次）
        this.audioContext = null;
        this.audioDisabled = false;
        this.pendingKey = 'wendy_pending_word_stats';
    }

    // ==================== 通用小工具 ====================
    container() {
        return document.getElementById('game-container');
    }

    /** 按当前界面语言取文案：kit.t('中文', 'English') */
    t(zh, en) {
        return (this.app && this.app.currentLanguage === 'en') ? en : zh;
    }

    isEnglishUI() {
        return !!(this.app && this.app.currentLanguage === 'en');
    }

    shuffle(array) {
        const list = (array || []).slice();
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = list[i];
            list[i] = list[j];
            list[j] = tmp;
        }
        return list;
    }

    randomInt(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    // ==================== 单词来源 ====================
    /**
     * 读取单词本里的单词；不足 minCount 个时用内置常用词补齐。
     * @param {number} minCount 至少需要多少个词才够玩
     */
    async loadWords(minCount) {
        const need = minCount || 4;
        let raw = [];
        try {
            const res = await this.api.getWordbook();
            if (res && res.success && Array.isArray(res.words)) {
                raw = res.words;
            }
        } catch (error) {
            console.warn('[kit] 读取单词本失败，改用内置常用词:', error);
        }

        const seen = {};
        const words = [];
        raw.forEach(item => {
            if (!item || !item.english_word || !item.chinese_meaning) return;
            const word = String(item.english_word).trim();
            const meaning = String(item.chinese_meaning).trim();
            if (!word || !meaning) return;
            const key = word.toLowerCase();
            if (seen[key]) return;
            seen[key] = true;
            words.push({
                english_word: word,
                chinese_meaning: meaning,
                pronunciation: item.pronunciation || '',
                example_sentence: item.example_sentence || '',
                example_translation: item.example_translation || '',
                word_image: item.word_image || '',
                mastery_level: item.mastery_level || 0,
                fromBook: true
            });
        });

        if (words.length < need) {
            for (let i = 0; i < WendyGameKit.FALLBACK_WORDS.length; i++) {
                if (words.length >= need) break;
                const pair = WendyGameKit.FALLBACK_WORDS[i];
                const key = pair[0].toLowerCase();
                if (seen[key]) continue;
                seen[key] = true;
                words.push({
                    english_word: pair[0],
                    chinese_meaning: pair[1],
                    pronunciation: '',
                    example_sentence: '',
                    example_translation: '',
                    word_image: '',
                    mastery_level: 0,
                    fromBook: false
                });
            }
        }

        return words;
    }

    /** 读取逐词历史表现（服务端 game_word_stats），失败时返回空对象，不影响游戏 */
    async loadStats() {
        try {
            const res = await this.api.getGameWordStats();
            if (res && res.success && res.stats) return res.stats;
        } catch (error) {
            console.warn('[kit] 读取游戏单词统计失败（不影响游戏）:', error);
        }
        return {};
    }

    /** 过滤出适合当前玩法使用的单词（如拼写游戏要排除短语和超长词） */
    filterUsable(words, options) {
        const opts = options || {};
        const minLen = opts.minLen || 2;
        const maxLen = opts.maxLen || 20;
        const allowSpace = !!opts.allowSpace;
        return (words || []).filter(w => {
            const word = w.english_word;
            if (word.length < minLen || word.length > maxLen) return false;
            if (!allowSpace && /\s/.test(word)) return false;
            if (!/^[a-zA-Z'\-]+$/.test(word)) return false;
            return true;
        });
    }

    /**
     * 自适应抽词：掌握程度越低、错得越多、上次答错的词，被抽中的概率越大；
     * 已掌握（3 星）的词降权但偶尔仍会复习到。
     */
    buildQueue(words, stats, count) {
        const pool = (words || []).slice();
        const picked = [];
        const statOf = (w) => (stats && stats[w.english_word]) ? stats[w.english_word] : null;
        const weightOf = (w) => {
            let weight = 1;
            const level = w.mastery_level || 0;
            if (level < 3) weight += (3 - level) * 1.2;
            else weight += 0.25;
            const s = statOf(w);
            if (s) {
                weight += Math.min(s.wrong || 0, 5) * 0.8;
                if (s.last_result === 0) weight += 2.5;      // 上次答错 → 重点复习
                weight -= Math.min(s.streak || 0, 3) * 0.4;  // 正在连对 → 暂时降权
            }
            if (!w.fromBook) weight *= 0.7;                  // 内置补位词优先级略低
            return Math.max(0.15, weight);
        };

        const target = Math.min(count || pool.length, pool.length);
        while (picked.length < target && pool.length > 0) {
            let total = 0;
            for (let i = 0; i < pool.length; i++) total += weightOf(pool[i]);
            let r = Math.random() * total;
            let chosen = pool.length - 1;
            let acc = 0;
            for (let i = 0; i < pool.length; i++) {
                acc += weightOf(pool[i]);
                if (r <= acc) { chosen = i; break; }
            }
            picked.push(pool.splice(chosen, 1)[0]);
        }
        return picked;
    }

    /**
     * 挑选干扰项。preferSimilar 为真时优先选「长度相同 / 首字母相同」的词，
     * 让选择题在后期明显更有挑战（cat / cap / car 这种最容易混）。
     */
    pickDistractors(target, pool, count, preferSimilar) {
        const targetWord = target.english_word.toLowerCase();
        const others = (pool || []).filter(w => w.english_word.toLowerCase() !== targetWord);
        if (!preferSimilar) return this.shuffle(others).slice(0, count);

        const targetLen = target.english_word.length;
        const targetFirst = targetWord.charAt(0);
        const sorted = others.map(w => {
            const word = w.english_word;
            const lenGap = Math.abs(word.length - targetLen);
            const sameFirst = word.charAt(0).toLowerCase() === targetFirst ? 0 : 1;
            return { word: w, score: lenGap * 2 + sameFirst };
        }).sort((a, b) => a.score - b.score);

        const nearCount = Math.max(count * 2, Math.min(6, sorted.length));
        const near = sorted.slice(0, nearCount).map(item => item.word);
        const picked = this.shuffle(near).slice(0, count);
        if (picked.length < count) {
            const rest = sorted.slice(nearCount).map(item => item.word);
            return picked.concat(this.shuffle(rest).slice(0, count - picked.length));
        }
        return picked;
    }

    /**
     * 挑选拼写游戏的干扰字母。干扰字母绝不与单词本身的字母重复，
     * 否则会出现「两种拼法都对」的歧义。
     */
    pickExtraLetters(word, count) {
        const usable = 'abcdefghijklmnoprstuvwy'.split('');
        const lower = String(word || '').toLowerCase();
        const candidates = usable.filter(ch => lower.indexOf(ch) === -1);
        return this.shuffle(candidates).slice(0, count);
    }

    // ==================== 本局结果与错词回炉 ====================
    noteResult(word, correct) {
        const text = word && word.english_word ? word.english_word : String(word || '');
        if (!text) return !!correct;
        this.results.push({ word: text, correct: !!correct });
        if (!correct) {
            const key = text.toLowerCase();
            if (!this.recycleMarked[key]) {
                this.recycleMarked[key] = true;
                this.recycleWords.push(word);
            }
        }
        return !!correct;
    }

    /** 本局答错的词数 */
    wrongCount() {
        return this.results.filter(item => !item.correct).length;
    }

    /** 本局答错过的单词文本（去重，用于结算展示） */
    wrongWords() {
        const seen = {};
        const list = [];
        this.results.forEach(item => {
            if (item.correct) return;
            const key = item.word.toLowerCase();
            if (seen[key]) return;
            seen[key] = true;
            list.push(item.word);
        });
        return list;
    }

    /** 取一个待回炉的错词（每个词每局只回炉一次），没有则返回 null */
    takeRecycleWord() {
        if (!this.recycleWords.length) return null;
        return this.recycleWords.shift();
    }

    // ==================== 成绩回传 ====================
    /**
     * 整局结束后把逐词结果回传后端。
     * 成功时返回 { upgraded: [...] }（自动升星的单词），失败时存本地待补传。
     */
    async reportResults() {
        if (!this.results.length) return { upgraded: [] };
        await this.flushPending();
        try {
            const res = await this.api.saveGameWordStats({
                username: 'wendy',
                game_type: this.gameType,
                results: this.results
            });
            if (res && res.success) {
                return { upgraded: res.upgraded || [], words: res.words || [] };
            }
        } catch (error) {
            console.warn('[kit] 回传游戏单词结果失败，已暂存本地待补传:', error);
        }
        this.queuePending({ game_type: this.gameType, results: this.results });
        return { upgraded: [], offline: true };
    }

    queuePending(payload) {
        try {
            let list = JSON.parse(localStorage.getItem(this.pendingKey) || '[]');
            if (!Array.isArray(list)) list = [];
            list.push(payload);
            localStorage.setItem(this.pendingKey, JSON.stringify(list.slice(-20)));
        } catch (error) {
            console.warn('[kit] 暂存待回传数据失败:', error);
        }
    }

    async flushPending() {
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem(this.pendingKey) || '[]');
        } catch (error) {
            list = [];
        }
        if (!Array.isArray(list) || !list.length) return;

        const remain = [];
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!item || !item.results || !item.results.length) continue;
            try {
                const res = await this.api.saveGameWordStats({
                    username: 'wendy',
                    game_type: item.game_type || this.gameType,
                    results: item.results
                });
                if (!res || !res.success) remain.push(item);
            } catch (error) {
                remain.push(item);
            }
        }
        try {
            if (remain.length) localStorage.setItem(this.pendingKey, JSON.stringify(remain));
            else localStorage.removeItem(this.pendingKey);
        } catch (error) {
            /* 存不进去也不影响游戏 */
        }
    }

    /** 升星喜报：逐个提示，3 星额外走祝贺动画，并刷新单词本显示 */
    celebrateUpgrades(upgraded) {
        if (!upgraded || !upgraded.length) return;
        upgraded.forEach((item, index) => {
            setTimeout(() => {
                const name = item.english_word || '';
                if (item.mastered) {
                    this.app.showNotification(this.t('「' + name + '」满 3 星，进「我的单词」啦！',
                        '"' + name + '" is now 3 stars!'), 'success');
                    if (this.app.showCongratulation) this.app.showCongratulation();
                } else {
                    this.app.showNotification(this.t('「' + name + '」升到 ' + item.mastery_level + ' 星啦！',
                        '"' + name + '" reached ' + item.mastery_level + ' star(s)!'), 'success');
                }
                if (this.app.loadWordbook) this.app.loadWordbook();
            }, index * 1200);
        });
    }

    // ==================== 音效 ====================
    initAudioContext() {
        if (this.audioDisabled) return null;
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.warn('音频上下文初始化失败:', error);
                this.audioDisabled = true;   // 浏览器不支持时不要每次发声都重试并刷屏
            }
        }
        return this.audioContext;
    }

    playTone(frequency, duration, type, volume, delay) {
        try {
            const ctx = this.initAudioContext();
            if (!ctx) return;
            const startAt = ctx.currentTime + (delay || 0);
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.frequency.value = frequency;
            oscillator.type = type || 'sine';
            const baseVolume = (this.app && this.app.currentVolume) ? this.app.currentVolume() : 0.5;
            gainNode.gain.setValueAtTime(baseVolume * (volume || 0.3), startAt);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startAt + duration);
            oscillator.start(startAt);
            oscillator.stop(startAt + duration);
        } catch (error) {
            /* 音效失败不影响游戏 */
        }
    }

    playCorrect() {
        this.playTone(660, 0.09, 'sine', 0.28, 0);
        this.playTone(880, 0.12, 'sine', 0.26, 0.06);
    }

    playWrong() {
        this.playTone(240, 0.18, 'triangle', 0.22, 0);
    }

    playCombo(combo) {
        const base = 520 + Math.min((combo || 1) * 35, 420);
        this.playTone(base, 0.12, 'sine', 0.3, 0);
        this.playTone(base * 1.26, 0.14, 'sine', 0.26, 0.08);
    }

    playCoin() {
        this.playTone(1180, 0.07, 'square', 0.16, 0);
        this.playTone(1560, 0.09, 'square', 0.14, 0.06);
    }

    playUnlock() {
        const notes = [523, 659, 784, 1046];
        notes.forEach((freq, i) => this.playTone(freq, 0.16, 'sine', 0.3, i * 0.1));
    }

    playComplete() {
        this.playUnlock();
    }

    // ==================== 朗读 ====================
    /** 朗读英文单词（走应用统一入口，语音/音量/后端兜底都跟随设置） */
    speakWord(word, rate) {
        if (!this.app || !this.app.speak) return;
        try {
            this.app.speak(word, { rate: rate || 0.9 });
        } catch (error) {
            console.warn('朗读失败:', error);
        }
    }

    /** 朗读中文（提示语等） */
    speakChinese(text, rate) {
        if (!this.app || !this.app.speak) return;
        try {
            this.app.speak(text, { rate: rate || 1.0, lang: 'zh-CN' });
        } catch (error) {
            console.warn('朗读失败:', error);
        }
    }

    stopSpeaking() {
        if (this.app && this.app.stopSpeaking) {
            try { this.app.stopSpeaking(); } catch (error) { /* 忽略 */ }
        }
    }

    // ==================== 结算/存档 ====================
    /** 保存一整局的成绩（发现页里程碑按 game_type 统计） */
    async saveGameRecord(payload) {
        const data = {
            username: 'wendy',
            game_type: this.gameType,
            score: payload.score || 0,
            correct_count: payload.correct_count || 0,
            total_questions: payload.total_questions || 0,
            max_combo: payload.max_combo || 0,
            accuracy: payload.accuracy || 0
        };
        try {
            const res = await this.api.saveGameRecord(data);
            return !!(res && res.success);
        } catch (error) {
            console.error('保存游戏记录失败:', error);
            return false;
        }
    }

    /** 读取本游戏的进度存档（跨设备一致），失败时返回空对象 */
    async loadProgress() {
        try {
            const res = await this.api.getGameProgress('wendy', this.gameType);
            if (res && res.success && res.progress) return res.progress;
        } catch (error) {
            console.warn('[kit] 读取游戏进度失败（不影响游戏）:', error);
        }
        return {};
    }

    /** 写入本游戏的进度存档，items 为 {key: value}，可一次写多条 */
    async saveProgress(items) {
        if (!items || !Object.keys(items).length) return false;
        try {
            const res = await this.api.saveGameProgress({
                username: 'wendy',
                game_type: this.gameType,
                items: items
            });
            return !!(res && res.success);
        } catch (error) {
            console.warn('[kit] 保存游戏进度失败（不影响游戏）:', error);
            return false;
        }
    }

    /** 通用结算界面（含「错词回炉」清单与升星喜报展示位） */
    renderResultPanel(options) {
        const opts = options || {};
        const stats = opts.stats || [];
        const wrongWords = opts.wrongWords || [];
        let wrongHtml = '';
        if (wrongWords.length) {
            wrongHtml = '<div class="kit-result-wrong">' +
                '<div class="kit-result-wrong-title">' + this.t('错词回炉', 'Words to review') + '</div>' +
                '<div class="kit-result-wrong-list">' + wrongWords.map(w => '<span class="kit-wrong-chip">' + this.escapeHtml(w) + '</span>').join('') + '</div>' +
                '</div>';
        }
        // 统计项沿用 api.js 里 updateGameLanguage() 认识的 id（final-score-label 等），
        // 这样中英界面切换时标签会自动跟着变，不用各游戏重复实现。
        return '<div class="word-game-result kit-result">' +
            '<div class="result-title">' +
            '<span class="result-title-zh">' + (opts.titleZh || '挑战完成！') + '</span>' +
            '<span class="result-title-en">' + (opts.titleEn || 'Challenge Complete!') + '</span>' +
            '</div>' +
            '<div class="result-stats">' + stats.map(item =>
                '<div class="result-stat-item">' +
                '<div class="result-stat-value">' + item.value + '</div>' +
                '<div class="result-stat-label"' + (item.id ? ' id="' + item.id + '"' : '') + '>' + item.label + '</div>' +
                '</div>').join('') + '</div>' +
            wrongHtml +
            (opts.extraHtml || '') +
            '<div class="result-actions">' +
            '<button class="result-btn" id="play-again-btn">' + this.t('再玩一次', 'Play Again') + '</button>' +
            '<button class="result-btn secondary" id="back-to-discover-btn">' + this.t('返回发现', 'Back to Discover') + '</button>' +
            '</div>' +
            '</div>';
    }

    escapeHtml(text) {
        return String(text === null || text === undefined ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// 内置常用词：单词本词太少时用来把游戏撑起来（都是单个单词，适合拼写与选择）
WendyGameKit.FALLBACK_WORDS = [
    ['apple', '苹果'], ['banana', '香蕉'], ['orange', '橙子'], ['cake', '蛋糕'],
    ['cat', '猫'], ['dog', '狗'], ['bird', '鸟'], ['fish', '鱼'],
    ['rabbit', '兔子'], ['monkey', '猴子'], ['tiger', '老虎'], ['panda', '熊猫'],
    ['book', '书'], ['pencil', '铅笔'], ['school', '学校'], ['teacher', '老师'],
    ['friend', '朋友'], ['family', '家庭'], ['music', '音乐'], ['garden', '花园'],
    ['sun', '太阳'], ['moon', '月亮'], ['star', '星星'], ['rain', '雨'],
    ['tree', '树'], ['flower', '花'], ['water', '水'], ['milk', '牛奶'],
    ['red', '红色'], ['blue', '蓝色'], ['green', '绿色'], ['happy', '快乐的'],
    ['run', '跑'], ['jump', '跳'], ['sing', '唱歌'], ['swim', '游泳'],
    ['window', '窗户'], ['table', '桌子'], ['morning', '早上'], ['night', '夜晚']
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WendyGameKit;
}
