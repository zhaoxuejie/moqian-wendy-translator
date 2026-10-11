/**
 * 🧠 词汇拼图（LexiPuzzle）
 *
 * 玩法：给中文意思，把打散的字母拖/点进格子里拼出英文单词。
 * 这是三款里「记得最牢」的一款 —— 前面的游戏都是「认」，这一款是「写」。
 *
 * 三级难度自动递进（长单词会自动留在简单档，避免挫败）：
 *   第 1 关 字母池拼写：乱序字母 + 1~2 个多余干扰字母
 *   第 2 关 首字母提示：首字母已锁好，字母池里还有 1 个干扰字母
 *   第 3 关 听写挑战：只给中文 + 自动读一遍，字母池不多不少
 *
 * 引导式纠错（拼错不结束、不给答案）：
 *   错一次 → 绿/红标出哪几个位置对了，只把错的退回字母池
 *   再错   → 直接告诉她某个位置该是哪个字母
 *   还错   → 一起把它拼完，然后进入下一题
 *
 * 记分：一次拼对 = 高分（另加速度奖励、「零提示」加成与连击加成），
 *       用了提示/错了仍然给基础分 —— 让她愿意继续试。
 * 收集：每拼对一个词收下一块「单词碎片」，存服务端，手机和电脑同步。
 */
class LexiPuzzleGame {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.kit = new WendyGameKit(api, app, 'lexipuzzle');
        this.words = [];
        this.queue = [];
        this.question = null;
        this.state = null;
        this.slotEls = [];
        this.tileEls = {};
        this.locked = false;
        this.finished = false;
        this.collected = [];
    }

    // ==================== 生命周期 ====================
    async start() {
        this.cleanup();
        this.kit = new WendyGameKit(this.api, this.app, 'lexipuzzle');
        this.finished = false;

        const all = await this.kit.loadWords(6);
        // 拼写只要单个单词：短语（what time）、超长词、带撇号/连字符的都不要
        let usable = this.kit.filterUsable(all, { minLen: 2, maxLen: 12 })
            .filter(w => /^[a-zA-Z]+$/.test(w.english_word));
        if (usable.length < 4) {
            usable = this.kit.filterUsable(all, { minLen: 2, maxLen: 16 })
                .filter(w => /^[a-zA-Z]+$/.test(w.english_word));
        }
        if (usable.length < 4) {
            this.app.showNotification(this.kit.t('单词不够玩啦，先去单词本加几个单词吧', 'Add more words first'), 'warning');
            return;
        }
        this.words = usable;

        const stats = await this.kit.loadStats();
        const progress = await this.kit.loadProgress();
        this.collected = Array.isArray(progress.pieces) ? progress.pieces.slice(0, 300) : [];

        this.app.openGameModal();
        this.buildShell();

        const totalWords = 8;
        this.state = {
            score: 0,
            combo: 0,
            maxCombo: 0,
            perfectCount: 0,
            correct: 0,
            total: 0,
            index: 0,
            totalWords: totalWords,
            startAt: Date.now()
        };
        this.statsCache = stats;
        this.queue = this.buildLongQueue(totalWords);
        this.bindEvents();
        this.nextQuestion();
        this.app.updateGameLanguage();
    }

    /** 抽够 totalWords 道题（词不够就再来一轮，拼写重复出现正好加深记忆） */
    buildLongQueue(totalWords) {
        let queue = [];
        let guard = 0;
        while (queue.length < totalWords && guard < 6) {
            guard++;
            const batch = this.kit.buildQueue(this.words, this.statsCache || {}, this.words.length);
            if (!batch.length) break;
            queue = queue.concat(batch);
        }
        // 第一题不要和上一局重样的开场词，随机打散前面一段
        return queue.slice(0, totalWords);
    }

    buildShell() {
        const container = this.kit.container();
        if (!container) return;
        container.innerHTML = `
            <div class="lexi-game" id="lexi-root">
                <div class="game-header">
                    <div class="game-title">
                        <span class="game-title-zh">词汇拼图</span>
                        <span class="game-title-en">LexiPuzzle</span>
                    </div>
                    <div class="game-stats">
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="score-label">得分</span>
                            <span class="game-stat-value" id="lexi-score">0</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="combo-label">连击</span>
                            <span class="game-stat-value" id="lexi-combo">0</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="questions-label">答题</span>
                            <span class="game-stat-value" id="lexi-progress">1/8</span>
                        </div>
                    </div>
                </div>
                <div class="lexi-prompt">
                    <button class="lexi-speaker-btn" id="lexi-replay" title="再听一遍">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <div class="lexi-meaning" id="lexi-meaning">—</div>
                    <div class="lexi-level" id="lexi-level"></div>
                </div>
                <div class="lexi-slots" id="lexi-slots"></div>
                <div class="lexi-pool" id="lexi-pool"></div>
                <div class="lexi-actions">
                    <button class="lexi-btn" id="lexi-hint-btn">💡 提示</button>
                    <button class="lexi-btn" id="lexi-clear-btn">🧹 重来</button>
                </div>
                <div class="lexi-feedback" id="lexi-feedback"></div>
            </div>
        `;
        this.slotEls = [];
        this.tileEls = {};
    }

    bindEvents() {
        const root = document.getElementById('lexi-root');
        if (!root) return;
        root.addEventListener('click', (event) => {
            const target = event.target;
            const tileEl = target.closest ? target.closest('.lexi-tile') : null;
            if (tileEl) {
                this.placeTile(tileEl.getAttribute('data-tile'));
                return;
            }
            const slotEl = target.closest ? target.closest('.lexi-slot') : null;
            if (slotEl) {
                this.removeSlot(parseInt(slotEl.getAttribute('data-slot'), 10));
                return;
            }
            const hintEl = target.closest ? target.closest('#lexi-hint-btn') : null;
            if (hintEl) {
                this.useHint();
                return;
            }
            const clearEl = target.closest ? target.closest('#lexi-clear-btn') : null;
            if (clearEl) {
                this.clearAll();
                return;
            }
            const replayEl = target.closest ? target.closest('#lexi-replay') : null;
            if (replayEl) {
                this.replayWord();
            }
        });
    }

    isModalOpen() {
        const modal = document.getElementById('game-modal');
        return !!(modal && modal.classList.contains('show'));
    }

    // ==================== 出题 ====================
    pickLevel(index, word) {
        // 长单词一直留在简单档：12 个字母还要凭记忆拼出来太难了
        if (word.english_word.length >= 9) return 1;
        if (word.english_word.length >= 7 && index >= 5) return 2;
        if (index < 3) return 1;
        if (index < 6) return 2;
        return 3;
    }

    pickExtraLetters(word, count) {
        // 统一走共享内核：干扰字母从不与单词本身的字母重复
        return this.kit.pickExtraLetters(word, count);
    }

    nextQuestion() {
        if (this.finished) return;
        this.locked = false;

        if (this.state.index >= this.state.totalWords) {
            this.endGame();
            return;
        }

        if (!this.queue.length) this.queue = this.buildLongQueue(2);
        let word = this.queue.shift();

        // 错词回炉：每 3 题安排一个本局拼错过的词
        if (this.state.index > 0 && this.state.index % 3 === 0) {
            const recycled = this.kit.takeRecycleWord();
            if (recycled) word = recycled;
        }
        if (!word) {
            this.endGame();
            return;
        }

        this.buildQuestion(word);
    }

    buildQuestion(word) {
        // 换题先停掉上一题正在念的发音，保证"看到的和听到的是同一个词"
        this.kit.stopSpeaking();
        const level = this.pickLevel(this.state.index, word);
        const letters = word.english_word.split('');
        const extraCount = level === 1 ? (letters.length <= 4 ? 2 : 1) : (level === 2 ? 1 : 0);
        const distractors = extraCount ? this.pickExtraLetters(word.english_word, extraCount) : [];
        const poolChars = this.kit.shuffle(letters.concat(distractors));
        const pool = poolChars.map((ch, i) => ({ id: 'tile' + i + '_' + ch, char: ch, used: false }));
        const slots = new Array(letters.length).fill(null);
        const lockedSlots = [];

        // 第 2 关：首字母已经替她放好并锁住
        if (level === 2) {
            const first = pool.filter(t => t.char === letters[0])[0];
            if (first) {
                first.used = true;
                slots[0] = first;
                lockedSlots.push(0);
            }
        }

        this.question = {
            word: word,
            level: level,
            pool: pool,
            slots: slots,
            lockedSlots: lockedSlots,
            attempts: 0,
            hintUsed: false,
            startAt: Date.now()
        };

        this.renderQuestion();
    }

    renderQuestion() {
        const q = this.question;
        const meaningEl = document.getElementById('lexi-meaning');
        const levelEl = document.getElementById('lexi-level');
        const slotsEl = document.getElementById('lexi-slots');
        const poolEl = document.getElementById('lexi-pool');
        const hintBtn = document.getElementById('lexi-hint-btn');
        const clearBtn = document.getElementById('lexi-clear-btn');
        if (!slotsEl || !poolEl) return;

        if (meaningEl) meaningEl.textContent = q.word.chinese_meaning;
        if (levelEl) {
            const names = {
                1: this.kit.t('第 1 关 · 字母池拼写', 'Level 1 · Letter pool'),
                2: this.kit.t('第 2 关 · 首字母提示', 'Level 2 · First-letter hint'),
                3: this.kit.t('第 3 关 · 听写挑战', 'Level 3 · Dictation')
            };
            levelEl.textContent = names[q.level] || '';
        }
        if (hintBtn) hintBtn.innerHTML = '💡 ' + this.kit.t('提示', 'Hint');
        if (clearBtn) clearBtn.innerHTML = '🧹 ' + this.kit.t('重来', 'Clear');

        slotsEl.innerHTML = q.slots.map((tile, i) =>
            '<button class="lexi-slot" data-slot="' + i + '"></button>'
        ).join('');
        poolEl.innerHTML = q.pool.map(tile =>
            '<button class="lexi-tile" data-tile="' + tile.id + '">' + this.kit.escapeHtml(tile.char) + '</button>'
        ).join('');

        this.slotEls = [];
        const slotNodes = slotsEl.querySelectorAll('.lexi-slot');
        for (let i = 0; i < slotNodes.length; i++) this.slotEls.push(slotNodes[i]);
        this.tileEls = {};
        const tileNodes = poolEl.querySelectorAll('.lexi-tile');
        for (let i = 0; i < tileNodes.length; i++) {
            this.tileEls[tileNodes[i].getAttribute('data-tile')] = tileNodes[i];
        }

        this.feedback('');
        this.refreshBoard();
        this.updateHud();

        // 听写关：不给看，先读一遍
        if (q.level === 3) {
            this.kit.speakWord(q.word.english_word);
        }
    }

    /** 就地刷新棋盘（不重绘 DOM，保留动画手感） */
    refreshBoard() {
        const q = this.question;
        if (!q) return;
        q.slots.forEach((tile, i) => {
            const el = this.slotEls[i];
            if (!el) return;
            el.textContent = tile ? tile.char : '';
            el.classList.toggle('filled', !!tile);
            el.classList.toggle('locked', q.lockedSlots.indexOf(i) !== -1);
        });
        q.pool.forEach(tile => {
            const el = this.tileEls[tile.id];
            if (!el) return;
            el.classList.toggle('used', !!tile.used);
            el.disabled = !!tile.used;
        });
    }

    // ==================== 交互 ====================
    placeTile(tileId) {
        if (this.locked || this.finished || !this.question) return;
        const q = this.question;
        const tile = q.pool.filter(t => t.id === tileId)[0];
        if (!tile || tile.used) return;
        const emptyIndex = q.slots.indexOf(null);
        if (emptyIndex === -1) return;

        q.slots[emptyIndex] = tile;
        tile.used = true;
        this.kit.playTone(600 + emptyIndex * 25, 0.05, 'sine', 0.12, 0);
        this.refreshBoard();

        if (q.slots.indexOf(null) === -1) {
            this.locked = true;   // 拼满了，先锁住防止乱点
            setTimeout(() => this.checkAnswer(), 260);
        }
    }

    removeSlot(index) {
        if (this.locked || this.finished || !this.question) return;
        const q = this.question;
        if (isNaN(index) || index < 0 || index >= q.slots.length) return;
        if (q.lockedSlots.indexOf(index) !== -1) return;
        const tile = q.slots[index];
        if (!tile) return;

        tile.used = false;
        q.slots[index] = null;
        this.kit.playTone(420, 0.05, 'sine', 0.1, 0);
        this.refreshBoard();
    }

    clearAll() {
        if (this.locked || this.finished || !this.question) return;
        const q = this.question;
        q.slots.forEach((tile, i) => {
            if (!tile) return;
            if (q.lockedSlots.indexOf(i) !== -1) return;
            tile.used = false;
            q.slots[i] = null;
        });
        this.kit.playTone(380, 0.08, 'sine', 0.12, 0);
        this.refreshBoard();
    }

    replayWord() {
        if (!this.question) return;
        this.kit.speakWord(this.question.word.english_word);
    }

    useHint() {
        if (this.locked || this.finished || !this.question) return;
        const q = this.question;
        const target = q.word.english_word;
        q.hintUsed = true;

        // 优先补第一个「空着或填错」的位置
        let index = -1;
        for (let i = 0; i < q.slots.length; i++) {
            const tile = q.slots[i];
            if (!tile || tile.char.toLowerCase() !== target[i].toLowerCase()) { index = i; break; }
        }
        if (index === -1) return;

        this.revealSlot(index, target);
        this.feedback(this.kit.t(
            '给你「' + target[index] + '」这个字母～',
            'Here is the letter "' + target[index] + '"'
        ));
        this.refreshBoard();
        this.updateHud();
    }

    // ==================== 判定 ====================
    checkAnswer() {
        const q = this.question;
        if (!q) return;
        const attempt = q.slots.map(t => (t ? t.char : '')).join('');
        const target = q.word.english_word;
        if (attempt.toLowerCase() === target.toLowerCase()) {
            this.onSolved();
        } else {
            this.onFailed(target);
        }
    }

    onSolved() {
        const q = this.question;
        const target = q.word.english_word;
        const perfect = q.attempts === 0 && !q.hintUsed;
        const seconds = (Date.now() - q.startAt) / 1000;

        let points = perfect ? 20 : (q.attempts === 0 ? 12 : 6);
        if (perfect && seconds <= 12) points += 5;
        points += Math.min(this.state.combo, 5) * 2;
        this.state.score += points;
        this.state.combo++;
        if (this.state.combo > this.state.maxCombo) this.state.maxCombo = this.state.combo;
        if (perfect) this.state.perfectCount++;
        this.state.total++;
        // 「答对」= 自己把单词拼出来了（哪怕中间错过、用过提示）。
        // 只有被「一起拼完」（第三次还错）的才算没答对 —— 对小孩子来说，
        // 改对了还显示 0 分太打击人；拼写水平用「一次拼对」单独体现。
        this.state.correct++;

        // 逐词成绩：一次拼对记「对」；错过一次的已经在 onFailed 里记过「错」，不重复记
        if (q.attempts === 0) this.kit.noteResult(q.word, true);

        this.locked = true;
        this.slotEls.forEach(el => { if (el) el.classList.add('solved'); });
        this.kit.playCorrect();
        this.kit.speakWord(target);
        this.collectPiece(target);
        if (perfect) this.showComboReward(this.state.combo);
        this.feedback(this.kit.t('拼对啦！' + target, 'Correct! ' + target));
        this.updateHud();

        setTimeout(() => {
            if (this.finished) return;
            this.state.index++;
            this.nextQuestion();
        }, 1000);
    }

    onFailed(target) {
        const q = this.question;
        q.attempts++;

        if (q.attempts === 1) {
            this.kit.noteResult(q.word, false);
            this.state.combo = 0;
        }
        this.kit.playWrong();
        this.markSlotFeedback(target);
        this.shakeBoard();

        if (q.attempts === 1) {
            this.feedback(this.kit.t('绿色的是对的，红色的再想想～', 'Green are right — try again on the red ones'));
            setTimeout(() => {
                if (this.finished) return;
                this.clearWrongSlots(target);
                this.refreshBoard();
                this.locked = false;
            }, 950);
            return;
        }

        if (q.attempts === 2) {
            const index = this.firstWrongIndex(target);
            this.feedback(this.kit.t(
                '提示：第 ' + (index + 1) + ' 个字母是「' + target[index] + '」',
                'Hint: letter ' + (index + 1) + ' is "' + target[index] + '"'
            ));
            setTimeout(() => {
                if (this.finished) return;
                this.clearWrongSlots(target);
                this.revealSlot(index, target);
                this.refreshBoard();
                this.locked = false;
            }, 950);
            return;
        }

        // 第三次还错：一起把它拼完，绝不卡在这里
        this.feedback(this.kit.t('我们一起拼完它：' + target, 'Let us finish it together: ' + target));
        setTimeout(() => {
            if (this.finished) return;
            // 先把填错的字母整批退回池子，保证待会儿每个位置都能找到需要的字母
            this.clearWrongSlots(target);
            this.refreshBoard();
            this.revealAll(target);
            this.refreshBoard();
            this.kit.playTone(520, 0.14, 'sine', 0.2, 0);
            setTimeout(() => {
                if (this.finished) return;
                this.state.total++;
                this.updateHud();
                setTimeout(() => {
                    if (this.finished) return;
                    this.state.index++;
                    this.nextQuestion();
                }, 900);
            }, 1100);
        }, 500);
    }

    markSlotFeedback(target) {
        const q = this.question;
        q.slots.forEach((tile, i) => {
            const el = this.slotEls[i];
            if (!el || !tile) return;
            const right = tile.char.toLowerCase() === target[i].toLowerCase();
            el.classList.toggle('right', right);
            el.classList.toggle('wrong', !right);
        });
    }

    firstWrongIndex(target) {
        const q = this.question;
        for (let i = 0; i < q.slots.length; i++) {
            const tile = q.slots[i];
            if (!tile || tile.char.toLowerCase() !== target[i].toLowerCase()) return i;
        }
        return 0;
    }

    /** 只把「填错的位置」退回字母池，填对的位置留着 —— 让她看得见自己的进展 */
    clearWrongSlots(target) {
        const q = this.question;
        q.slots.forEach((tile, i) => {
            const el = this.slotEls[i];
            if (el) el.classList.remove('right', 'wrong', 'wrongline');
            if (!tile) return;
            if (q.lockedSlots.indexOf(i) !== -1) return;
            if (tile.char.toLowerCase() === target[i].toLowerCase()) return;
            tile.used = false;
            q.slots[i] = null;
        });
    }

    revealSlot(index, target) {
        const q = this.question;
        const need = target[index];
        // 该位置原本的字母先退回池子
        const old = q.slots[index];
        if (old) { old.used = false; q.slots[index] = null; }
        const tile = q.pool.filter(t => !t.used && t.char === need)[0]
            || q.pool.filter(t => !t.used && t.char.toLowerCase() === need.toLowerCase())[0];
        if (!tile) return;
        tile.used = true;
        q.slots[index] = tile;
        if (q.lockedSlots.indexOf(index) === -1) q.lockedSlots.push(index);
        this.kit.playTone(880, 0.08, 'sine', 0.16, 0);
    }

    revealAll(target) {
        const q = this.question;
        for (let i = 0; i < target.length; i++) {
            const tile = q.slots[i];
            if (tile && tile.char.toLowerCase() === target[i].toLowerCase()) {
                if (q.lockedSlots.indexOf(i) === -1) q.lockedSlots.push(i);
                continue;
            }
            this.revealSlot(i, target);
        }
        this.slotEls.forEach(el => { if (el) el.classList.add('solved'); });
    }

    collectPiece(word) {
        const key = word.toLowerCase();
        if (this.collected.indexOf(key) !== -1) return;
        this.collected.push(key);
        const count = this.collected.length;
        this.feedback(this.kit.t('🧩 收下一块单词碎片（共 ' + count + ' 块）', '🧩 Piece collected (total ' + count + ')'));
        this.kit.saveProgress({ pieces: this.collected });
    }

    // ==================== 表现 ====================
    feedback(text, type) {
        const el = document.getElementById('lexi-feedback');
        if (!el) return;
        el.textContent = text || '';
        el.className = 'lexi-feedback' + (text ? ' show' : '') + (type ? ' ' + type : '');
    }

    shakeBoard() {
        const slotsEl = document.getElementById('lexi-slots');
        if (!slotsEl) return;
        slotsEl.classList.add('lexi-shake');
        setTimeout(() => slotsEl.classList.remove('lexi-shake'), 420);
    }

    showComboReward(combo) {
        const root = document.getElementById('lexi-root');
        if (!root) return;
        const el = document.createElement('div');
        el.className = 'combo-reward';
        el.innerHTML = '<div class="combo-reward-text">' + this.kit.t(combo + ' 连击！完美拼合', combo + ' combo! Perfect') + '</div>';
        root.appendChild(el);
        setTimeout(() => el.remove(), 1400);
    }

    updateHud() {
        const scoreEl = document.getElementById('lexi-score');
        const comboEl = document.getElementById('lexi-combo');
        const progressEl = document.getElementById('lexi-progress');
        if (scoreEl) scoreEl.textContent = this.state.score;
        if (comboEl) comboEl.textContent = this.state.combo;
        if (progressEl) {
            const current = Math.min(this.state.index + 1, this.state.totalWords);
            progressEl.textContent = current + '/' + this.state.totalWords;
        }
    }

    // ==================== 结算 ====================
    async endGame() {
        if (this.finished) return;
        this.finished = true;
        this.locked = true;
        this.kit.stopSpeaking();
        this.kit.playComplete();

        const state = this.state;
        const accuracy = state.total > 0 ? ((state.correct / state.total) * 100).toFixed(0) : '0';
        const seconds = Math.max(1, Math.round((Date.now() - state.startAt) / 1000));
        const container = this.kit.container();
        if (!container) return;

        container.innerHTML = this.kit.renderResultPanel({
            titleZh: '拼图完成！',
            titleEn: 'Puzzle Complete!',
            stats: [
                { value: state.score, label: '最终得分', id: 'final-score-label' },
                { value: state.correct + '/' + state.total, label: '答对题数', id: 'correct-count-label' },
                { value: accuracy + '%', label: '正确率', id: 'accuracy-label' },
                { value: state.maxCombo, label: '最高连击', id: 'max-combo-label' }
            ],
            wrongWords: this.kit.wrongWords(),
            extraHtml: '<div class="kit-upgrade-banner">🧩 ' + this.kit.t(
                '单词碎片 ' + this.collected.length + ' 块 · 用时 ' + seconds + ' 秒 · 一次拼对 ' + state.perfectCount + ' 个',
                'Pieces: ' + this.collected.length + ' · ' + seconds + 's · ' + state.perfectCount + ' perfect'
            ) + '</div>'
        });
        this.app.updateGameLanguage();

        const againBtn = document.getElementById('play-again-btn');
        if (againBtn) againBtn.addEventListener('click', () => this.start());
        const backBtn = document.getElementById('back-to-discover-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.cleanup();
                this.app.closeGameModal();
                this.app.loadGameMilestones('lexipuzzle');
            });
        }

        const saved = await this.kit.saveGameRecord({
            score: state.score,
            correct_count: state.correct,
            total_questions: state.total,
            max_combo: state.maxCombo,
            accuracy: accuracy
        });
        if (saved) setTimeout(() => this.app.loadGameMilestones('lexipuzzle'), 400);

        const report = await this.kit.reportResults();
        this.kit.celebrateUpgrades(report.upgraded);
    }

    cleanup() {
        this.finished = true;
        this.kit.stopSpeaking();
        this.question = null;
        this.slotEls = [];
        this.tileEls = {};
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LexiPuzzleGame;
}
