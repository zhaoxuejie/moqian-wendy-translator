/**
 * 🏹 单词猎人（Word Hunter）
 *
 * 玩法：猎场里飘着几个写着英文单词的目标，打中「对的那一个」。
 *   - 听音模式（主打）：只播单词发音，靠耳朵找目标 → 训练「听音 → 认形」
 *   - 语义模式：给中文意思，打中对应英文 → 训练「看义 → 认词」
 *   - 连对 5 个进入「狂暴时刻」：8 秒内金色目标、双倍分、速度更快
 *   - 打错不扣命、不结束：把正确目标高亮 + 读一遍，让她自己补答
 *   - 每 4 题插一个「错词回炉」，本局答错的词一定会再考一次
 *
 * 单词来源：她自己的单词本（不足时由 game-kit 用内置常用词补足）
 * 成绩去向：game_records（里程碑）+ game_word_stats（自动升星 / 错词回炉）
 */
class WordHunterGame {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.kit = new WendyGameKit(api, app, 'word-hunter');
        this.words = [];
        this.queue = [];
        this.targets = [];
        this.question = null;
        this.state = null;
        this.rafId = null;
        this.timerId = null;
        this.lastFrame = 0;
        this.locked = false;
        this.paused = false;
        this.bounds = { width: 320, height: 320 };
        this.onResize = null;
        this.finished = false;
    }

    // ==================== 生命周期 ====================
    async start() {
        this.cleanup();
        this.kit = new WendyGameKit(this.api, this.app, 'word-hunter');
        this.finished = false;

        const words = await this.kit.loadWords(4);
        if (!words || words.length < 4) {
            this.app.showNotification(this.kit.t('单词不够玩啦，先去单词本加几个单词吧', 'Add more words first'), 'warning');
            return;
        }
        this.words = words;
        this.statsCache = await this.kit.loadStats();

        this.app.openGameModal();
        this.buildShell();
        this.resetState();
        this.refillQueue();
        this.bindArenaEvents();
        this.measureArena();
        this.tick();
        this.timerId = setInterval(() => this.tick(), 1000);
        this.startLoop();
        this.nextQuestion();
        this.app.updateGameLanguage();
    }

    resetState() {
        this.state = {
            score: 0,
            combo: 0,
            maxCombo: 0,
            correct: 0,
            total: 0,          // 已结算的题目数（不管对错）
            timeLeft: 60,
            rageUntil: 0,
            modeCounter: 0
        };
        this.targets = [];
        this.locked = false;
        this.paused = false;
    }

    buildShell() {
        const container = this.kit.container();
        if (!container) return;
        container.innerHTML = `
            <div class="word-hunter-game" id="hunter-root">
                <div class="game-header">
                    <div class="game-title">
                        <span class="game-title-zh">单词猎人</span>
                        <span class="game-title-en">Word Hunter</span>
                    </div>
                    <div class="game-stats">
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="score-label">得分</span>
                            <span class="game-stat-value" id="hunter-score">0</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="combo-label">连击</span>
                            <span class="game-stat-value" id="hunter-combo">0</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="timer-label">剩余时间</span>
                            <span class="game-stat-value" id="hunter-time">60</span>
                        </div>
                    </div>
                </div>
                <div class="game-progress-bar">
                    <div class="game-progress-fill" id="hunter-time-bar" style="width: 100%"></div>
                </div>
                <div class="hunter-prompt" id="hunter-prompt"></div>
                <div class="hunter-arena" id="hunter-arena"></div>
                <div class="hunter-hint" id="hunter-hint"></div>
            </div>
        `;
    }

    bindArenaEvents() {
        const arena = document.getElementById('hunter-arena');
        if (!arena) return;
        arena.addEventListener('click', (event) => {
            const el = event.target.closest ? event.target.closest('.hunter-target') : null;
            if (!el) return;
            const target = this.targets.filter(t => t.el === el)[0];
            if (target) this.handleTap(target);
        });

        this.onResize = () => this.measureArena();
        window.addEventListener('resize', this.onResize);
    }

    measureArena() {
        const arena = document.getElementById('hunter-arena');
        if (!arena) return;
        this.bounds = {
            width: arena.clientWidth || 320,
            height: arena.clientHeight || 320
        };
    }

    isModalOpen() {
        const modal = document.getElementById('game-modal');
        return !!(modal && modal.classList.contains('show'));
    }

    // ==================== 出题 ====================
    refillQueue() {
        const size = Math.max(4, Math.min(8, this.words.length));
        this.queue = this.kit.buildQueue(this.words, this.statsCache || {}, size);
    }

    nextQuestion() {
        if (this.finished) return;
        if (!this.queue.length) this.refillQueue();

        // 换题先停掉上一题正在念的发音，避免"耳朵里还是上一题、屏幕已是新题"
        this.kit.stopSpeaking();

        let word = this.queue.shift();
        // 每 4 题插一个「错词回炉」：优先安排本局答错过的词
        if (this.state.total > 0 && this.state.total % 4 === 0) {
            const recycled = this.kit.takeRecycleWord();
            if (recycled) word = recycled;
        }
        if (!word) {
            this.endGame();
            return;
        }

        this.state.modeCounter++;
        // 听音为主（每 3 题里有 1 题看中文，避免一直听会累）
        const mode = (this.state.modeCounter % 3 === 0) ? 'meaning' : 'listen';

        const extraTargets = this.state.total < 6 ? 3 : (this.state.total < 14 ? 4 : 5);
        const distractors = this.kit.pickDistractors(word, this.words, extraTargets, this.state.total >= 8);
        const options = this.kit.shuffle([word].concat(distractors));

        this.question = {
            word: word,
            mode: mode,
            failed: false,
            answered: false
        };

        this.renderPrompt();
        this.spawnTargets(options, word);
        this.locked = false;

        if (mode === 'listen') {
            this.kit.speakWord(word.english_word);
        }
    }

    renderPrompt() {
        const prompt = document.getElementById('hunter-prompt');
        if (!prompt) return;
        const isListen = this.question.mode === 'listen';
        if (isListen) {
            prompt.className = 'hunter-prompt hunter-prompt-listen';
            prompt.innerHTML = `
                <button class="hunter-speaker-btn" id="hunter-replay" title="再听一遍">
                    <i class="fas fa-volume-up"></i>
                </button>
                <span class="hunter-prompt-text">${this.kit.t('听一听，打中这个单词', 'Listen, then hit that word')}</span>
            `;
            const replay = document.getElementById('hunter-replay');
            if (replay) {
                replay.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.kit.speakWord(this.question.word.english_word);
                    this.kit.playTone(900, 0.06, 'sine', 0.15, 0);
                });
            }
        } else {
            prompt.className = 'hunter-prompt hunter-prompt-meaning';
            prompt.innerHTML = `
                <span class="hunter-prompt-text">${this.kit.t('打中这个意思的英文单词', 'Hit the English word for this')}</span>
                <span class="hunter-prompt-meaning">${this.kit.escapeHtml(this.question.word.chinese_meaning)}</span>
            `;
        }
    }

    // ==================== 目标 ====================
    spawnTargets(options, correctWord) {
        const arena = document.getElementById('hunter-arena');
        if (!arena) return;
        this.targets = [];
        arena.innerHTML = '';

        const level = this.state.total;
        const speed = this.kit.clamp(20 + level * 1.6, 20, 58);

        options.forEach((word, index) => {
            const el = document.createElement('div');
            el.className = 'hunter-target';
            el.setAttribute('data-word', word.english_word);
            el.innerHTML = `<span class="hunter-target-word">${this.kit.escapeHtml(word.english_word)}</span>`;
            arena.appendChild(el);

            const isCorrect = word.english_word === correctWord.english_word;
            const angle = Math.random() * Math.PI * 2;
            const target = {
                el: el,
                word: word,
                isCorrect: isCorrect,
                dead: false,
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                width: el.offsetWidth || 80,
                height: el.offsetHeight || 34
            };
            this.targets.push(target);
        });

        this.placeTargets();
        this.targets.forEach(target => this.applyTransform(target));
    }

    /** 尽量散开摆放，避免一开始就叠在一起 */
    placeTargets() {
        const W = this.bounds.width;
        const H = this.bounds.height;
        const placed = [];
        this.targets.forEach(target => {
            const maxX = Math.max(0, W - target.width);
            const maxY = Math.max(0, H - target.height);
            let best = null;
            for (let attempt = 0; attempt < 24; attempt++) {
                const x = Math.random() * maxX;
                const y = Math.random() * maxY;
                let minDistance = Infinity;
                placed.forEach(p => {
                    const dx = (p.x + p.width / 2) - (x + target.width / 2);
                    const dy = (p.y + p.height / 2) - (y + target.height / 2);
                    minDistance = Math.min(minDistance, Math.sqrt(dx * dx + dy * dy));
                });
                if (minDistance === Infinity || minDistance > 78) {
                    best = { x: x, y: y };
                    break;
                }
                if (!best || minDistance > best.distance) {
                    best = { x: x, y: y, distance: minDistance };
                }
            }
            target.x = best ? best.x : Math.random() * maxX;
            target.y = best ? best.y : Math.random() * maxY;
            if (target.x + target.width > W) target.x = Math.max(0, W - target.width);
            if (target.y + target.height > H) target.y = Math.max(0, H - target.height);
            placed.push(target);
        });
    }

    applyTransform(target) {
        if (!target.el) return;
        target.el.style.transform = 'translate(' + Math.round(target.x) + 'px, ' + Math.round(target.y) + 'px)';
    }

    // ==================== 物理循环 ====================
    startLoop() {
        this.lastFrame = 0;
        const step = (ts) => {
            this.rafId = requestAnimationFrame(step);
            if (this.finished) return;
            if (!this.isModalOpen()) {
                this.paused = true;
                this.lastFrame = ts;
                return;
            }
            this.paused = false;
            if (!this.lastFrame) {
                this.lastFrame = ts;
                return;
            }
            let dt = (ts - this.lastFrame) / 1000;
            this.lastFrame = ts;
            if (dt > 0.05) dt = 0.05;   // 切后台回来不要瞬移
            this.updatePhysics(dt);
        };
        this.rafId = requestAnimationFrame(step);
    }

    updatePhysics(dt) {
        const W = this.bounds.width;
        const H = this.bounds.height;
        const raging = this.state && this.state.rageUntil > Date.now();
        const speedScale = raging ? 1.7 : 1;
        this.targets.forEach(target => {
            if (target.dead) return;
            target.x += target.vx * speedScale * dt;
            target.y += target.vy * speedScale * dt;
            if (target.x <= 0) { target.x = 0; target.vx = Math.abs(target.vx); }
            if (target.x + target.width >= W) { target.x = Math.max(0, W - target.width); target.vx = -Math.abs(target.vx); }
            if (target.y <= 0) { target.y = 0; target.vy = Math.abs(target.vy); }
            if (target.y + target.height >= H) { target.y = Math.max(0, H - target.height); target.vy = -Math.abs(target.vy); }
            this.applyTransform(target);
        });
    }

    // ==================== 交互 ====================
    handleTap(target) {
        if (this.locked || this.finished || this.paused || !this.question) return;
        if (!target || !target.el) return;

        const question = this.question;

        // ---- 打错 ----
        if (!target.isCorrect) {
            if (question.failed) {
                // 已经错过一次：再点错的目标只晃一下
                this.shake(target);
                this.kit.playTone(220, 0.1, 'triangle', 0.15, 0);
                return;
            }
            question.failed = true;
            this.kit.noteResult(question.word, false);
            this.state.total++;
            this.state.combo = 0;
            this.shake(target);
            this.kit.playWrong();
            this.markDead(target);
            this.showAnswerHint();
            this.updateHud();
            return;
        }

        // ---- 打对（提示之后自己补答：给少量分，不重复记成绩）----
        if (question.failed) {
            this.addScore(5);
            this.kit.playCorrect();
            this.explode(target, 5);
            this.updateHud();
            this.locked = true;
            setTimeout(() => {
                if (this.finished) return;
                this.nextQuestion();
            }, 620);
            return;
        }

        // ---- 一次答对 ----
        question.answered = true;
        this.kit.noteResult(question.word, true);
        this.state.correct++;
        this.state.total++;
        this.state.combo++;
        if (this.state.combo > this.state.maxCombo) this.state.maxCombo = this.state.combo;

        const raging = this.state.rageUntil > Date.now();
        const base = 10 + Math.min(this.state.combo, 10);
        const points = raging ? base * 2 : base;
        this.addScore(points);
        this.state.timeLeft = Math.min(this.state.timeLeft + 1, 75);

        this.kit.playCorrect();
        if (this.state.combo >= 5 && this.state.combo % 5 === 0) this.kit.playCombo(this.state.combo);
        if (this.state.combo === 5 && !raging) this.enterRage();
        this.explode(target, points);
        this.updateHud();
        this.locked = true;
        setTimeout(() => {
            if (this.finished) return;
            this.nextQuestion();
        }, 620);
    }

    markDead(target) {
        target.dead = true;
        if (target.el) target.el.classList.add('hunter-dead');
    }

    /** 打错后把正确目标高亮 + 读一遍，让她自己补答 */
    showAnswerHint() {
        const correctTarget = this.targets.filter(t => t.isCorrect)[0];
        if (correctTarget && correctTarget.el) {
            correctTarget.el.classList.add('hunter-answer-glow');
        }
        const hint = document.getElementById('hunter-hint');
        if (hint) {
            hint.className = 'hunter-hint hunter-hint-show';
            hint.innerHTML = this.kit.t(
                '别急，它长这样：<strong>' + this.kit.escapeHtml(this.question.word.english_word) + '</strong>（再点一下它就赢了）',
                'Almost! It looks like <strong>' + this.kit.escapeHtml(this.question.word.english_word) + '</strong> — tap it'
            );
        }
        setTimeout(() => {
            const el = document.getElementById('hunter-hint');
            if (el) el.className = 'hunter-hint';
        }, 2200);
    }

    addScore(points) {
        this.state.score += points;
        return points;
    }

    updateHud() {
        const scoreEl = document.getElementById('hunter-score');
        const comboEl = document.getElementById('hunter-combo');
        const timeEl = document.getElementById('hunter-time');
        if (scoreEl) scoreEl.textContent = this.state.score;
        if (comboEl) comboEl.textContent = this.state.combo;
        if (timeEl) timeEl.textContent = Math.max(0, Math.ceil(this.state.timeLeft));
    }

    enterRage() {
        this.state.rageUntil = Date.now() + 8000;
        const root = document.getElementById('hunter-root');
        if (root) root.classList.add('hunter-rage');
        const banner = document.createElement('div');
        banner.className = 'hunter-rage-banner';
        banner.id = 'hunter-rage-banner';
        banner.textContent = this.kit.t('🔥 狂暴时刻 8 秒 · 双倍分', '🔥 Frenzy! 8s · double score');
        const arena = document.getElementById('hunter-arena');
        if (arena) arena.appendChild(banner);
        this.kit.playUnlock();
        setTimeout(() => {
            const el = document.getElementById('hunter-rage-banner');
            if (el) el.remove();
            const r = document.getElementById('hunter-root');
            if (r) r.classList.remove('hunter-rage');
        }, 8000);
    }

    // ==================== 特效 ====================
    explode(target, points) {
        const rect = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
        this.burst(rect.x, rect.y);
        this.floatText(rect.x, rect.y, '+' + (points || 10), 'hunter-float-score');
        if (target.el) {
            target.el.classList.add('hunter-hit');
            target.dead = true;
        }
    }

    burst(x, y) {
        const arena = document.getElementById('hunter-arena');
        if (!arena) return;
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('span');
            particle.className = 'hunter-particle';
            const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
            const distance = 26 + Math.random() * 30;
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.setProperty('--dx', (Math.cos(angle) * distance).toFixed(1) + 'px');
            particle.style.setProperty('--dy', (Math.sin(angle) * distance).toFixed(1) + 'px');
            particle.style.background = i % 2 === 0 ? '#ffd54f' : '#ff8a65';
            arena.appendChild(particle);
            setTimeout(() => particle.remove(), 700);
        }
    }

    floatText(x, y, text, className) {
        const arena = document.getElementById('hunter-arena');
        if (!arena) return;
        const el = document.createElement('span');
        el.className = 'hunter-float ' + (className || '');
        el.textContent = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        arena.appendChild(el);
        setTimeout(() => el.remove(), 900);
    }

    shake(target) {
        if (!target.el) return;
        target.el.classList.add('hunter-shake');
        setTimeout(() => {
            if (target.el) target.el.classList.remove('hunter-shake');
        }, 400);
    }

    // ==================== 计时 ====================
    tick() {
        if (this.finished || !this.state) return;
        if (!this.isModalOpen()) return;   // 关掉弹窗就暂停，回来继续
        if (this.paused) return;

        this.state.timeLeft -= 1;
        if (this.state.timeLeft <= 5 && this.state.timeLeft > 0) {
            this.kit.playTone(700, 0.05, 'sine', 0.12, 0);
        }
        this.updateHud();

        const bar = document.getElementById('hunter-time-bar');
        if (bar) {
            const percent = this.kit.clamp((this.state.timeLeft / 60) * 100, 0, 100);
            bar.style.width = percent + '%';
            bar.classList.toggle('hunter-time-low', this.state.timeLeft <= 10);
        }

        if (this.state.timeLeft <= 0) this.endGame();
    }

    // ==================== 结算 ====================
    async endGame() {
        if (this.finished) return;
        this.finished = true;
        this.locked = true;
        this.stopLoop();
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.kit.stopSpeaking();
        this.kit.playComplete();

        const state = this.state;
        const accuracy = state.total > 0 ? ((state.correct / state.total) * 100).toFixed(0) : '0';
        const container = this.kit.container();
        if (!container) return;

        container.innerHTML = this.kit.renderResultPanel({
            titleZh: '狩猎结束！',
            titleEn: 'Hunt Finished!',
            stats: [
                { value: state.score, label: '最终得分', id: 'final-score-label' },
                { value: state.correct + '/' + state.total, label: '答对题数', id: 'correct-count-label' },
                { value: accuracy + '%', label: '正确率', id: 'accuracy-label' },
                { value: state.maxCombo, label: '最高连击', id: 'max-combo-label' }
            ],
            wrongWords: this.kit.wrongWords()
        });
        this.app.updateGameLanguage();

        const againBtn = document.getElementById('play-again-btn');
        if (againBtn) againBtn.addEventListener('click', () => this.start());
        const backBtn = document.getElementById('back-to-discover-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.cleanup();
                this.app.closeGameModal();
                this.app.loadGameMilestones('word-hunter');
            });
        }

        const saved = await this.kit.saveGameRecord({
            score: state.score,
            correct_count: state.correct,
            total_questions: state.total,
            max_combo: state.maxCombo,
            accuracy: accuracy
        });
        if (saved) {
            setTimeout(() => this.app.loadGameMilestones('word-hunter'), 400);
        }

        const report = await this.kit.reportResults();
        this.kit.celebrateUpgrades(report.upgraded);
    }

    stopLoop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    cleanup() {
        this.finished = true;
        this.stopLoop();
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        if (this.onResize) {
            window.removeEventListener('resize', this.onResize);
            this.onResize = null;
        }
        this.kit.stopSpeaking();
        this.targets = [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordHunterGame;
}
