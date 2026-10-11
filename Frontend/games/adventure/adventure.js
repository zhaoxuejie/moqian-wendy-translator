/**
 * 🗺️ 单词大冒险（Word Adventure）
 *
 * 三款里唯一的「长线闯关」玩法：一座主题岛 5 个关卡，每关 5 道混合题，
 * 通关拿星星、掉贴纸、解锁下一关，最后一关是守关怪 Boss 战。
 * 作用是把「认词（猎人）→ 拼词（拼图）」串成一条能天天想玩的线。
 *
 * 一期内容：森林岛（5 关）。
 * 数据结构里 ISLANDS 是数组、每关题型在 LEVEL_PATTERNS 里声明，
 * 之后想加「海洋岛 / 太空岛」只要往数组里加一项，不用改引擎。
 *
 * 每关题型：choice（看中文选英文）/ listen（听发音选英文）/ spell（拼写）
 * 一关 5 题，题目从她自己的单词本里按「自适应 + 错词回炉」抽取。
 *
 * 星级：完成就有星（不给 0 星，避免打击）——
 *   5/5 一次答对 → ⭐⭐⭐；3~4 个 → ⭐⭐；0~2 个 → ⭐
 * 星星只升不降，通关即解锁下一关，可反复刷星。
 *
 * Boss 关：守关怪 5 点血，一次答对扣 2 点、错过再答对扣 1 点；
 * 打完（扣到 0）算通关；没打完可以再挑战 —— 输了也只是「它还在」，不会结束游戏。
 *
 * 进度存档：星星 / 贴纸 / 解锁到第几关 / Boss 是否打退，
 * 全部存服务端 game_progress（key: stars / stickers / unlocked / bossDefeated），
 * 手机和电脑共用同一份进度。
 */
class WordAdventureGame {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.kit = new WendyGameKit(api, app, 'adventure');
        this.words = [];
        this.progress = { stars: {}, stickers: [], unlocked: 1, bossDefeated: false };
        this.state = null;
        this.question = null;
        this.slotEls = [];
        this.tileEls = {};
        this.locked = false;
        this.finished = false;
        this.answeredQuestions = 0;
    }

    // ==================== 静态配置 ====================
    static get ISLANDS() {
        return [{
            id: 'forest',
            name: '森林岛',
            nameEn: 'Forest Island',
            emoji: '🌳',
            levels: 5,
            // 每关：小标题 + 掉落的贴纸
            levelTitles: [
                { zh: '森林入口', en: 'Forest Gate', sticker: '🐿️' },
                { zh: '松鼠的树洞', en: 'Squirrel Hollow', sticker: '🦉' },
                { zh: '猫头鹰的谜题', en: 'Owl Riddles', sticker: '🦊' },
                { zh: '狐狸的岔路', en: 'Fox Crossroad', sticker: '🐻' },
                { zh: '守关怪', en: 'Island Boss', sticker: '🦌' }
            ],
            storyZh: '小语：森林岛的动物们把单词藏起来了，闯过 5 关就能救回它们！',
            storyEn: 'Xiaoyu: The forest animals hid the words. Clear 5 levels to set them free!'
        }];
    }

    /** 每关 5 题的题型编排（第 5 关是 Boss 关，题型同第 3 关的风格） */
    static get LEVEL_PATTERNS() {
        return {
            1: ['choice', 'choice', 'listen', 'choice', 'listen'],
            2: ['listen', 'choice', 'spell', 'choice', 'listen'],
            3: ['choice', 'listen', 'spell', 'listen', 'choice'],
            4: ['spell', 'choice', 'listen', 'spell', 'choice'],
            5: ['choice', 'listen', 'spell', 'listen', 'choice']
        };
    }

    // ==================== 生命周期 ====================
    async start() {
        this.cleanup();
        this.kit = new WendyGameKit(this.api, this.app, 'adventure');
        this.finished = false;

        const all = await this.kit.loadWords(5);
        const usable = this.kit.filterUsable(all, { minLen: 2, maxLen: 16 });
        if (usable.length < 4) {
            this.app.showNotification(this.kit.t('单词不够玩啦，先去单词本加几个单词吧', 'Add more words first'), 'warning');
            return;
        }
        this.words = usable;
        this.statsCache = await this.kit.loadStats();

        const progress = await this.kit.loadProgress();
        this.progress = {
            stars: (progress.stars && typeof progress.stars === 'object') ? progress.stars : {},
            stickers: Array.isArray(progress.stickers) ? progress.stickers : [],
            unlocked: parseInt(progress.unlocked, 10) || 1,
            bossDefeated: !!progress.bossDefeated
        };

        this.app.openGameModal();
        this.renderMap();
        this.app.updateGameLanguage();
    }

    island() {
        return WordAdventureGame.ISLANDS[0];
    }

    levelKey(level) {
        return this.island().id + '-' + level;
    }

    starsOf(level) {
        return this.progress.stars[this.levelKey(level)] || 0;
    }

    totalStars() {
        let sum = 0;
        const island = this.island();
        for (let i = 1; i <= island.levels; i++) sum += this.starsOf(i);
        return sum;
    }

    // ==================== 地图 ====================
    renderMap() {
        const container = this.kit.container();
        if (!container) return;
        const island = this.island();
        const unlocked = Math.max(1, Math.min(this.progress.unlocked, island.levels));

        const nodes = [];
        for (let level = 1; level <= island.levels; level++) {
            const stars = this.starsOf(level);
            const isLocked = level > unlocked;
            const isBoss = level === island.levels;
            const title = island.levelTitles[level - 1];
            nodes.push(
                '<button class="adv-node' + (isLocked ? ' adv-locked' : '') + (isBoss ? ' adv-boss' : '') + '"' +
                ' data-level="' + level + '"' + (isLocked ? ' disabled' : '') + '>' +
                '<span class="adv-node-index">' + (isBoss ? '👑' : level) + '</span>' +
                '<span class="adv-node-title">' + this.kit.escapeHtml(this.kit.isEnglishUI() ? title.en : title.zh) + '</span>' +
                '<span class="adv-node-stars">' + (isLocked ? '🔒' : this.starsHtml(stars)) + '</span>' +
                '</button>'
            );
        }

        const stickerHtml = island.levelTitles.map(item =>
            '<span class="adv-sticker' + (this.progress.stickers.indexOf(item.sticker) !== -1 ? '' : ' adv-sticker-empty') + '">' +
            item.sticker + '</span>'
        ).join('');

        const nextLevel = Math.min(unlocked, island.levels);
        const cleared = this.progress.unlocked > island.levels || this.starsOf(island.levels) > 0;

        container.innerHTML = `
            <div class="adv-game" id="adv-root">
                <div class="game-header">
                    <div class="game-title">
                        <span class="game-title-zh">单词大冒险</span>
                        <span class="game-title-en">Word Adventure</span>
                    </div>
                    <div class="game-stats">
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="adv-stars-label">${this.kit.t('星星', 'Stars')}</span>
                            <span class="game-stat-value" id="adv-stars">${this.totalStars()}/${island.levels * 3}</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="adv-stickers-label">${this.kit.t('贴纸', 'Stickers')}</span>
                            <span class="game-stat-value" id="adv-stickers">${this.progress.stickers.length}/${island.levels}</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="adv-levels-label">${this.kit.t('关卡', 'Level')}</span>
                            <span class="game-stat-value" id="adv-level">${Math.min(this.progress.unlocked, island.levels)}/${island.levels}</span>
                        </div>
                    </div>
                </div>

                <div class="adv-island-head">
                    <span class="adv-island-emoji">${island.emoji}</span>
                    <span class="adv-island-name">${this.kit.isEnglishUI() ? island.nameEn : island.name}</span>
                </div>
                <div class="adv-story">${this.kit.escapeHtml(this.kit.isEnglishUI() ? island.storyEn : island.storyZh)}</div>

                <div class="adv-map">${nodes.join('')}</div>

                <div class="adv-stickers-row">
                    <span class="adv-stickers-label">${this.kit.t('贴纸册', 'Sticker book')}</span>
                    <span class="adv-stickers">${stickerHtml}</span>
                </div>

                <div class="adv-actions">
                    <button class="adv-btn adv-btn-main" id="adv-play">${cleared ? this.kit.t('再挑战一次', 'Play again') : this.kit.t('开始第 ' + nextLevel + ' 关', 'Start level ' + nextLevel)}</button>
                </div>
                <div class="adv-hint">${this.kit.t('点地图上的关卡也能直接进入', 'Tap a level on the map to start')}</div>
            </div>
        `;

        const root = document.getElementById('adv-root');
        if (root) {
            root.addEventListener('click', (event) => {
                const node = event.target.closest ? event.target.closest('.adv-node') : null;
                if (node && !node.disabled) {
                    this.startLevel(parseInt(node.getAttribute('data-level'), 10));
                    return;
                }
                const playBtn = event.target.closest ? event.target.closest('#adv-play') : null;
                if (playBtn) {
                    this.startLevel(Math.min(this.progress.unlocked, island.levels));
                }
            });
        }
    }

    starsHtml(stars) {
        let html = '';
        for (let i = 1; i <= 3; i++) {
            html += '<span class="adv-star' + (i <= stars ? ' on' : '') + '">★</span>';
        }
        return html;
    }

    // ==================== 关卡 ====================
    startLevel(level) {
        const island = this.island();
        if (level < 1 || level > island.levels) return;
        if (level > this.progress.unlocked) {
            this.app.showNotification(this.kit.t('先通过上一关哦', 'Clear the previous level first'), 'info');
            return;
        }

        // 必须复位：上一关结算时会把 finished 置为 true（防止重复结算），
        // 若不清掉，点「下一关」进来后 nextQuestion() 会直接 return，题目区是空的。
        this.finished = false;

        const pattern = WordAdventureGame.LEVEL_PATTERNS[level] || WordAdventureGame.LEVEL_PATTERNS[1];
        const title = island.levelTitles[level - 1];
        const isBoss = level === island.levels;

        // 每关重新抽词：自适应 + 上一关的错词优先回炉
        let queue = this.kit.buildQueue(this.words, this.statsCache || {}, pattern.length);
        while (queue.length < pattern.length) {
            const more = this.kit.buildQueue(this.words, this.statsCache || {}, pattern.length - queue.length);
            if (!more.length) break;
            queue = queue.concat(more);
        }
        const recycled = this.kit.takeRecycleWord();
        if (recycled) queue.unshift(recycled);

        this.state = {
            level: level,
            isBoss: isBoss,
            title: title,
            pattern: pattern,
            queue: queue,
            index: 0,
            score: 0,
            firstTryCorrect: 0,
            combo: 0,
            maxCombo: 0,
            bossHp: isBoss ? 5 : 0,
            bossMaxHp: 5,
            startAt: Date.now()
        };
        this.question = null;
        this.locked = false;
        this.answeredQuestions = 0;

        this.renderLevelShell();
        this.nextQuestion();
    }

    renderLevelShell() {
        const container = this.kit.container();
        if (!container) return;
        const state = this.state;
        const title = state.title;
        container.innerHTML = `
            <div class="adv-game adv-level" id="adv-root">
                <div class="adv-level-head">
                    <button class="adv-back" id="adv-back">🗺️ ${this.kit.t('地图', 'Map')}</button>
                    <div class="adv-level-title">
                        <span class="adv-level-no">${this.kit.t('第 ' + state.level + ' 关', 'Level ' + state.level)}</span>
                        <span class="adv-level-name">${this.kit.escapeHtml(this.kit.isEnglishUI() ? title.en : title.zh)}</span>
                    </div>
                    <div class="adv-level-score" id="adv-score">0</div>
                </div>
                ${state.isBoss ? `
                <div class="adv-boss">
                    <div class="adv-boss-face" id="adv-boss-face">🐉</div>
                    <div class="adv-boss-bar"><div class="adv-boss-hp" id="adv-boss-hp" style="width: 100%"></div></div>
                    <div class="adv-boss-label" id="adv-boss-label">${this.kit.t('守关怪血量 5/5', 'Boss HP 5/5')}</div>
                </div>` : ''}
                <div class="adv-progress">
                    <div class="adv-progress-fill" id="adv-progress-fill" style="width: 0%"></div>
                </div>
                <div class="adv-question" id="adv-question"></div>
                <div class="adv-feedback" id="adv-feedback"></div>
            </div>
        `;
        const back = document.getElementById('adv-back');
        if (back) {
            back.addEventListener('click', () => {
                this.returnToMap();
            });
        }
    }

    returnToMap() {
        this.finished = false;
        this.question = null;
        this.locked = true;
        this.kit.stopSpeaking();
        this.renderMap();
        // 关卡里退出来也要把这一关的进度留在后端（错词/统计已随 reportResults 存）
        this.flushResults();
    }

    async flushResults() {
        if (!this.kit.results.length) return;
        const report = await this.kit.reportResults();
        this.kit.results = [];
        this.kit.celebrateUpgrades(report.upgraded);
    }

    // ==================== 出题 ====================
    nextQuestion() {
        if (this.finished || !this.state) return;
        if (this.state.index >= this.state.pattern.length) {
            this.endLevel();
            return;
        }
        this.locked = false;

        const type = this.state.pattern[this.state.index];
        let word = this.state.queue.shift();
        if (!word) {
            const more = this.kit.buildQueue(this.words, this.statsCache || {}, 1);
            word = more[0];
        }
        if (!word) {
            this.endLevel();
            return;
        }

        // 拼写题不适合长单词：超过 8 个字母就改成选择题，避免挫败
        let finalType = type;
        if (type === 'spell' && word.english_word.length > 8) finalType = 'choice';

        this.question = {
            type: finalType,
            word: word,
            failed: false,
            hintUsed: false,
            resolved: false
        };
        this.renderQuestion();
        this.updateLevelHud();
    }

    renderQuestion() {
        const box = document.getElementById('adv-question');
        if (!box) return;
        // 换题先把上一题正在念的发音停掉：屏幕上已经是新题，
        // 耳朵里还在放上一题的单词，孩子会觉得"读的和看到的不一样"
        this.kit.stopSpeaking();
        if (this.question.type === 'spell') this.renderSpell();
        else this.renderChoice(this.question.type === 'listen');
    }

    /** 选择题 / 听音题 */
    renderChoice(isListen) {
        const box = document.getElementById('adv-question');
        if (!box) return;
        const q = this.question;
        const level = this.state.level;
        const distractors = this.kit.pickDistractors(q.word, this.words, 3, level >= 3);
        const options = this.kit.shuffle([q.word].concat(distractors));
        q.options = options;

        box.innerHTML = `
            <div class="adv-prompt ${isListen ? 'adv-prompt-listen' : ''}">
                ${isListen
                    ? '<button class="adv-speaker" id="adv-replay"><i class="fas fa-volume-up"></i></button>' +
                      '<span class="adv-prompt-text">' + this.kit.t('听一听，选对的那个词', 'Listen and pick the word') + '</span>'
                    : '<span class="adv-prompt-text">' + this.kit.t('选出下面意思对应的英文单词', 'Pick the English word for this') + '</span>' +
                      '<span class="adv-prompt-meaning">' + this.kit.escapeHtml(q.word.chinese_meaning) + '</span>'}
            </div>
            <div class="adv-options">
                ${options.map(o => '<button class="adv-option" data-word="' + this.kit.escapeHtml(o.english_word) + '">' + this.kit.escapeHtml(o.english_word) + '</button>').join('')}
            </div>
        `;

        const optionEls = box.querySelectorAll('.adv-option');
        for (let i = 0; i < optionEls.length; i++) {
            optionEls[i].addEventListener('click', () => {
                this.answerChoice(optionEls[i].getAttribute('data-word'));
            });
        }
        const replay = document.getElementById('adv-replay');
        if (replay) {
            replay.addEventListener('click', () => {
                this.kit.speakWord(q.word.english_word);
            });
        }
        if (isListen) this.kit.speakWord(q.word.english_word);
    }

    answerChoice(pickedWord) {
        if (this.locked || this.finished || !this.question) return;
        const q = this.question;
        const target = q.word.english_word;
        const box = document.getElementById('adv-question');
        const optionEls = (box || document).querySelectorAll('.adv-option');
        for (let i = 0; i < optionEls.length; i++) {
            const el = optionEls[i];
            const word = el.getAttribute('data-word');
            if (word === target) el.classList.add('right');
            else if (word === pickedWord) el.classList.add('wrong');
            el.disabled = true;
        }

        const isCorrect = pickedWord.toLowerCase() === target.toLowerCase();

        // 点到正确项：第一次算全分，答错后补答算安慰分（onCorrect 内部区分）
        if (isCorrect) {
            this.onCorrect(q.failed);
            return;
        }

        if (q.failed) {
            // 已经错过一次，再点错只是晃一下
            this.kit.playWrong();
            return;
        }

        q.failed = true;
        this.kit.noteResult(q.word, false);
        this.state.combo = 0;
        this.kit.playWrong();
        this.feedback(this.kit.t('正确答案是「' + target + '」，记住它～', 'It is "' + target + '"'));
        this.kit.speakWord(target);
        this.updateLevelHud();
        this.locked = true;
        // 0.9 秒后解锁，让她能自己点一下正确答案（给 8 分安慰）；1.7 秒后自动继续，不会卡住
        setTimeout(() => {
            if (!this.finished && q === this.question && !q.resolved) this.locked = false;
        }, 900);
        setTimeout(() => {
            if (this.finished || q !== this.question || q.resolved) return;
            this.advance();
        }, 1700);
    }

    /** 拼写题 */
    renderSpell() {
        const box = document.getElementById('adv-question');
        if (!box) return;
        const q = this.question;
        const letters = q.word.english_word.split('');
        const extra = letters.length <= 4 ? 1 : 0;
        const distractors = extra ? this.kit.pickExtraLetters(letters.join(''), extra) : [];
        const poolChars = this.kit.shuffle(letters.concat(distractors));
        q.pool = poolChars.map((ch, i) => ({ id: 't' + i + '_' + ch, char: ch, used: false }));
        q.slots = new Array(letters.length).fill(null);

        box.innerHTML = `
            <div class="adv-prompt">
                <button class="adv-speaker" id="adv-replay"><i class="fas fa-volume-up"></i></button>
                <span class="adv-prompt-text">${this.kit.t('把单词拼出来', 'Spell the word')}</span>
                <span class="adv-prompt-meaning">${this.kit.escapeHtml(q.word.chinese_meaning)}</span>
            </div>
            <div class="adv-slots" id="adv-slots">
                ${q.slots.map((_, i) => '<button class="adv-slot" data-slot="' + i + '"></button>').join('')}
            </div>
            <div class="adv-tiles" id="adv-tiles">
                ${q.pool.map(t => '<button class="adv-tile" data-tile="' + t.id + '">' + this.kit.escapeHtml(t.char) + '</button>').join('')}
            </div>
            <div class="adv-tools">
                <button class="adv-tool" id="adv-spell-hint">💡 ${this.kit.t('提示', 'Hint')}</button>
                <button class="adv-tool" id="adv-spell-clear">🧹 ${this.kit.t('重来', 'Clear')}</button>
            </div>
        `;

        this.slotEls = [];
        const slotNodes = box.querySelectorAll('.adv-slot');
        for (let i = 0; i < slotNodes.length; i++) this.slotEls.push(slotNodes[i]);
        this.tileEls = {};
        const tileNodes = box.querySelectorAll('.adv-tile');
        for (let i = 0; i < tileNodes.length; i++) this.tileEls[tileNodes[i].getAttribute('data-tile')] = tileNodes[i];

        const slotsEl = document.getElementById('adv-slots');
        if (slotsEl) {
            slotsEl.addEventListener('click', (event) => {
                const el = event.target.closest ? event.target.closest('.adv-slot') : null;
                if (el) this.spellRemove(parseInt(el.getAttribute('data-slot'), 10));
            });
        }
        const tilesEl = document.getElementById('adv-tiles');
        if (tilesEl) {
            tilesEl.addEventListener('click', (event) => {
                const el = event.target.closest ? event.target.closest('.adv-tile') : null;
                if (el) this.spellPlace(el.getAttribute('data-tile'));
            });
        }
        const hintBtn = document.getElementById('adv-spell-hint');
        if (hintBtn) hintBtn.addEventListener('click', () => this.spellHint());
        const clearBtn = document.getElementById('adv-spell-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => this.spellClear());
        const replay = document.getElementById('adv-replay');
        if (replay) replay.addEventListener('click', () => this.kit.speakWord(q.word.english_word));

        this.refreshSpellBoard();
        this.kit.speakWord(q.word.english_word);
    }

    refreshSpellBoard() {
        const q = this.question;
        if (!q || !q.slots) return;
        q.slots.forEach((tile, i) => {
            const el = this.slotEls[i];
            if (!el) return;
            el.textContent = tile ? tile.char : '';
            el.classList.toggle('filled', !!tile);
        });
        q.pool.forEach(tile => {
            const el = this.tileEls[tile.id];
            if (!el) return;
            el.classList.toggle('used', !!tile.used);
        });
    }

    spellPlace(tileId) {
        if (this.locked || !this.question || !this.question.pool) return;
        const q = this.question;
        const tile = q.pool.filter(t => t.id === tileId)[0];
        if (!tile || tile.used) return;
        const empty = q.slots.indexOf(null);
        if (empty === -1) return;
        q.slots[empty] = tile;
        tile.used = true;
        this.kit.playTone(600 + empty * 25, 0.05, 'sine', 0.12, 0);
        this.refreshSpellBoard();
        if (q.slots.indexOf(null) === -1) {
            this.locked = true;
            setTimeout(() => this.spellCheck(), 250);
        }
    }

    spellRemove(index) {
        if (this.locked || !this.question || !this.question.slots) return;
        const q = this.question;
        const tile = q.slots[index];
        if (!tile || tile.locked) return;
        tile.used = false;
        q.slots[index] = null;
        this.kit.playTone(420, 0.05, 'sine', 0.1, 0);
        this.refreshSpellBoard();
    }

    spellClear() {
        if (this.locked || !this.question || !this.question.slots) return;
        const q = this.question;
        q.slots.forEach((tile, i) => {
            if (!tile || tile.locked) return;
            tile.used = false;
            q.slots[i] = null;
        });
        this.refreshSpellBoard();
    }

    spellHint() {
        if (this.locked || !this.question || !this.question.slots) return;
        const q = this.question;
        const target = q.word.english_word;
        q.hintUsed = true;
        let index = -1;
        for (let i = 0; i < q.slots.length; i++) {
            const tile = q.slots[i];
            if (!tile || tile.char.toLowerCase() !== target[i].toLowerCase()) { index = i; break; }
        }
        if (index === -1) return;
        const old = q.slots[index];
        if (old) { old.used = false; q.slots[index] = null; }
        const tile = q.pool.filter(t => !t.used && t.char.toLowerCase() === target[index].toLowerCase())[0];
        if (tile) {
            tile.used = true;
            tile.locked = true;
            q.slots[index] = tile;
        }
        this.kit.playTone(880, 0.08, 'sine', 0.16, 0);
        this.feedback(this.kit.t('给你「' + target[index] + '」这个字母', 'Here is "' + target[index] + '"'));
        this.refreshSpellBoard();
    }

    spellCheck() {
        const q = this.question;
        if (!q || !q.slots || q.resolved) return;
        const attempt = q.slots.map(t => (t ? t.char : '')).join('');
        const target = q.word.english_word;
        if (attempt.toLowerCase() === target.toLowerCase()) {
            this.onCorrect(q.hintUsed || q.failed);
            return;
        }
        this.kit.playWrong();
        const slotsEl = document.getElementById('adv-slots');
        if (slotsEl) {
            slotsEl.classList.add('adv-shake');
            setTimeout(() => slotsEl.classList.remove('adv-shake'), 420);
        }
        if (!q.failed) {
            q.failed = true;
            this.kit.noteResult(q.word, false);
            this.state.combo = 0;
            this.feedback(this.kit.t('再想想，红色位置不对', 'Try again — the red ones are wrong'));
            // 只把错的字母退回池子，对的留着
            q.slots.forEach((tile, i) => {
                if (!tile) return;
                const el = this.slotEls[i];
                const right = tile.char.toLowerCase() === target[i].toLowerCase();
                if (el) el.classList.add(right ? 'right' : 'wrong');
                if (!right && !tile.locked) {
                    tile.used = false;
                    q.slots[i] = null;
                }
            });
            this.updateLevelHud();
            setTimeout(() => {
                if (this.finished) return;
                this.refreshSpellBoard();
                this.locked = false;
            }, 900);
        } else {
            // 又错：直接告诉她缺什么，绝不卡住
            q.resolved = true;
            this.feedback(this.kit.t('我们一起拼：' + target, 'Together: ' + target));
            q.slots.forEach((tile, i) => {
                if (tile && tile.char.toLowerCase() === target[i].toLowerCase()) return;
                if (tile) { tile.used = false; q.slots[i] = null; }
                const need = this.kit.shuffle(q.pool.filter(t => !t.used && t.char.toLowerCase() === target[i].toLowerCase()))[0];
                if (need) { need.used = true; need.locked = true; q.slots[i] = need; }
            });
            this.refreshSpellBoard();
            setTimeout(() => {
                if (this.finished) return;
                this.advance();
            }, 1400);
        }
    }

    // ==================== 判定与推进 ====================
    onCorrect(assisted) {
        const q = this.question;
        if (!q || q.resolved) return;   // 防止同一题被重复结算（重复计分/重复记成绩）
        q.resolved = true;
        const target = q.word.english_word;
        // 「带过助」= 用过提示、答错过再补答、或被带着拼完
        const aided = !!assisted || !!q.failed;
        this.kit.playCorrect();

        let points;
        if (!aided) {
            this.state.firstTryCorrect++;
            this.state.combo++;
            if (this.state.combo > this.state.maxCombo) this.state.maxCombo = this.state.combo;
            points = 20 + Math.min(this.state.combo, 5) * 2;
        } else {
            points = 8;
        }
        this.state.score += points;
        // 只在「第一次作答」时记成绩：已经记过错的题不再重复记
        if (!q.failed) this.kit.noteResult(q.word, !aided);

        if (this.state.isBoss) {
            const damage = aided ? 1 : 2;
            this.state.bossHp = Math.max(0, this.state.bossHp - damage);
            this.updateBossHud(damage);
        }

        this.feedback(this.kit.t('答对啦！' + target + ' +' + points, 'Correct! ' + target + ' +' + points));
        this.kit.speakWord(target);
        this.locked = true;
        this.updateLevelHud();
        setTimeout(() => {
            if (this.finished || q !== this.question) return;
            this.advance();
        }, 900);
    }

    advance() {
        this.state.index++;
        this.updateLevelHud();
        this.nextQuestion();
    }

    updateLevelHud() {
        const scoreEl = document.getElementById('adv-score');
        if (scoreEl) scoreEl.textContent = this.state.score;
        const fill = document.getElementById('adv-progress-fill');
        if (fill) {
            const done = Math.min(this.state.index, this.state.pattern.length);
            fill.style.width = ((done / this.state.pattern.length) * 100) + '%';
        }
    }

    updateBossHud(damage) {
        const hp = document.getElementById('adv-boss-hp');
        const label = document.getElementById('adv-boss-label');
        const face = document.getElementById('adv-boss-face');
        if (hp) hp.style.width = ((this.state.bossHp / this.state.bossMaxHp) * 100) + '%';
        if (label) {
            label.textContent = this.kit.t(
                '守关怪血量 ' + this.state.bossHp + '/' + this.state.bossMaxHp,
                'Boss HP ' + this.state.bossHp + '/' + this.state.bossMaxHp
            );
        }
        if (face) {
            face.classList.add('adv-boss-hit');
            setTimeout(() => face.classList.remove('adv-boss-hit'), 500);
            if (this.state.bossHp <= 0) face.textContent = '😵';
        }
        if (damage) this.kit.playTone(300, 0.12, 'square', 0.2, 0);
    }

    feedback(text) {
        const el = document.getElementById('adv-feedback');
        if (!el) return;
        el.textContent = text || '';
        el.classList.toggle('show', !!text);
    }

    // ==================== 关卡结算 ====================
    starsFor(firstTryCorrect) {
        if (firstTryCorrect >= 5) return 3;
        if (firstTryCorrect >= 3) return 2;
        return 1;   // 完成就有星，不给 0 星
    }

    async endLevel() {
        if (this.finished) return;
        this.finished = true;
        this.locked = true;
        this.kit.stopSpeaking();

        const state = this.state;
        const island = this.island();
        const total = state.pattern.length;
        const stars = this.starsFor(state.firstTryCorrect);
        const key = this.levelKey(state.level);
        const bestStars = Math.max(this.progress.stars[key] || 0, stars);
        const isNewSticker = this.progress.stickers.indexOf(state.title.sticker) === -1;
        const bossCleared = !state.isBoss || state.bossHp <= 0;

        // 写入进度（跨设备）
        if (bossCleared) {
            this.progress.stars[key] = bestStars;
            if (isNewSticker) this.progress.stickers.push(state.title.sticker);
            if (state.level >= this.progress.unlocked && state.level < island.levels) {
                this.progress.unlocked = state.level + 1;
            }
            if (state.isBoss) {
                this.progress.bossDefeated = true;
                if (this.progress.unlocked <= island.levels) this.progress.unlocked = island.levels + 1;
            }
            await this.kit.saveProgress({
                stars: this.progress.stars,
                stickers: this.progress.stickers,
                unlocked: this.progress.unlocked,
                bossDefeated: this.progress.bossDefeated
            });
        }

        const accuracy = total > 0 ? ((state.firstTryCorrect / total) * 100).toFixed(0) : '0';
        const container = this.kit.container();
        if (!container) return;
        const islandCleared = this.progress.unlocked > island.levels;

        container.innerHTML = this.kit.renderResultPanel({
            titleZh: state.isBoss && bossCleared ? '打退守关怪！' : (bossCleared ? '过关！' : '守关怪还挺得住…'),
            titleEn: state.isBoss && bossCleared ? 'Boss Defeated!' : (bossCleared ? 'Level Clear!' : 'The boss holds on…'),
            stats: [
                { value: state.score, label: '最终得分', id: 'final-score-label' },
                { value: state.firstTryCorrect + '/' + total, label: '答对题数', id: 'correct-count-label' },
                { value: accuracy + '%', label: '正确率', id: 'accuracy-label' },
                { value: state.maxCombo, label: '最高连击', id: 'max-combo-label' }
            ],
            wrongWords: this.kit.wrongWords(),
            extraHtml:
                '<div class="adv-stars-big">' + this.starsHtml(bestStars) + '</div>' +
                '<div class="kit-upgrade-banner">' +
                (bossCleared
                    ? '🏅 ' + this.kit.t('第 ' + state.level + ' 关获得 ' + bestStars + ' 星', 'Level ' + state.level + ': ' + bestStars + ' star(s)') +
                      (isNewSticker ? ' · ' + this.kit.t('新贴纸 ' + state.title.sticker + '！', 'New sticker ' + state.title.sticker + '!') : '')
                    : '🐉 ' + this.kit.t('它还剩 ' + state.bossHp + ' 点血，再来一次一定行！', 'It has ' + state.bossHp + ' HP left — try again!')) +
                (islandCleared ? '<br>🎉 ' + this.kit.t('森林岛全部通关！', 'Forest Island cleared!') : '') +
                '</div>'
        });
        this.app.updateGameLanguage();

        const againBtn = document.getElementById('play-again-btn');
        if (againBtn) againBtn.textContent = this.kit.t('再打一次', 'Play again');
        if (againBtn) againBtn.addEventListener('click', () => this.startLevel(state.level));
        const backBtn = document.getElementById('back-to-discover-btn');
        if (backBtn) {
            backBtn.textContent = this.kit.t('回到地图', 'Back to map');
            backBtn.addEventListener('click', () => {
                this.finished = false;
                this.renderMap();
            });
        }
        // 有下一关时才额外加「下一关」按钮；
        // 全部通关时上面的「回到地图」已经够了，不要再放一个重复的地图按钮
        const actions = container.querySelector('.result-actions');
        const nextLevel = Math.min(state.level + 1, island.levels);
        const canNext = bossCleared && state.level < island.levels;
        if (actions && canNext) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'result-btn';
            nextBtn.textContent = this.kit.t('下一关 →', 'Next level →');
            nextBtn.id = 'adv-next-btn';
            nextBtn.addEventListener('click', () => this.startLevel(nextLevel));
            actions.appendChild(nextBtn);
        }

        const saved = await this.kit.saveGameRecord({
            score: state.score,
            correct_count: state.firstTryCorrect,
            total_questions: total,
            max_combo: state.maxCombo,
            accuracy: accuracy
        });
        if (saved) setTimeout(() => this.app.loadGameMilestones('adventure'), 400);

        const report = await this.kit.reportResults();
        this.kit.results = [];
        this.kit.celebrateUpgrades(report.upgraded);
        this.kit.playComplete();
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
    module.exports = WordAdventureGame;
}
