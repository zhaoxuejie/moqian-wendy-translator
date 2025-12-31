/**
 * 记忆配对游戏
 * 独立的游戏逻辑文件
 * 核心机制：翻牌配对，找到对应的中英文单词
 */

class WordMatchGame {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.gameState = null;
        this.flipTimer = null;
        this.audioContext = null; // 音频上下文
    }
    
    // 初始化音频上下文（延迟初始化，避免浏览器限制）
    initAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.warn('音频上下文初始化失败:', error);
            }
        }
        return this.audioContext;
    }
    
    // 音效生成器
    createSound(frequency, duration, type = 'sine', volume = 0.3) {
        try {
            const audioContext = this.initAudioContext();
            if (!audioContext) return;
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            // 音量控制（从设置中获取）
            const volumeSlider = document.getElementById('volume-slider');
            const baseVolume = volumeSlider ? volumeSlider.value / 100 : 0.5;
            const finalVolume = baseVolume * volume;
            
            gainNode.gain.setValueAtTime(finalVolume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            // 静默失败，不影响游戏
        }
    }
    
    // 播放翻牌音效
    playFlipSound() {
        this.createSound(800, 0.08, 'sine', 0.2);
    }
    
    // 播放配对成功音效
    playMatchSound() {
        // 上升的音调
        this.createSound(600, 0.1, 'sine', 0.25);
        setTimeout(() => this.createSound(800, 0.1, 'sine', 0.25), 50);
        setTimeout(() => this.createSound(1000, 0.15, 'sine', 0.25), 100);
    }
    
    // 播放配对失败音效
    playMismatchSound() {
        this.createSound(300, 0.15, 'sine', 0.2);
    }
    
    // 播放完美配对音效
    playPerfectSound() {
        // 欢快的音阶 C-E-G-C
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, index) => {
            setTimeout(() => this.createSound(freq, 0.15, 'sine', 0.3), index * 80);
        });
    }
    
    // 播放连击音效
    playComboSound(combo) {
        const baseFreq = 500 + Math.min(combo * 30, 300);
        this.createSound(baseFreq, 0.2, 'sine', 0.3);
    }
    
    // 播放游戏结束音效
    playGameOverSound() {
        const notes = [800, 600, 400];
        notes.forEach((freq, index) => {
            setTimeout(() => this.createSound(freq, 0.25, 'sine', 0.3), index * 120);
        });
    }

    async start() {
        // 检查单词本是否有单词
        try {
            const response = await this.api.getWordbook();
            const words = response.success ? response.words : [];
            if (!words || words.length === 0) {
                this.app.showNotification('单词本为空，请先添加一些单词', 'warning');
                return;
            }
            
            // 打开游戏模态框
            this.app.openGameModal();
            
            // 显示模式选择界面
            this.showModeSelection(words);
        } catch (error) {
            console.error('启动记忆配对失败:', error);
            this.app.showNotification('启动游戏失败，请稍后重试', 'error');
        }
    }

    showModeSelection(words) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="word-match-mode-selection">
                <div class="mode-selection-title">
                    <span class="mode-title-zh">选择游戏模式</span>
                    <span class="mode-title-en">Select Game Mode</span>
                </div>
                <div class="mode-options">
                    <div class="mode-card" data-mode="classic">
                        <div class="mode-icon">⭐</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">经典模式</span>
                            <span class="mode-name-en">Classic Mode</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">无时间限制，慢慢思考</span>
                            <span class="mode-desc-en">No time limit, think carefully</span>
                        </div>
                    </div>
                    <div class="mode-card" data-mode="timed">
                        <div class="mode-icon">⏱️</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">限时模式</span>
                            <span class="mode-name-en">Timed Mode</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">有时间限制，挑战速度</span>
                            <span class="mode-desc-en">Time limit, challenge speed</span>
                        </div>
                    </div>
                    <div class="mode-card" data-mode="theme">
                        <div class="mode-icon">🎨</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">主题模式</span>
                            <span class="mode-name-en">Theme Mode</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">精美主题卡片</span>
                            <span class="mode-desc-en">Beautiful theme cards</span>
                        </div>
                    </div>
                </div>
                <div class="difficulty-selection">
                    <div class="difficulty-title">
                        <span class="difficulty-title-zh">选择难度</span>
                        <span class="difficulty-title-en">Select Difficulty</span>
                    </div>
                    <div class="difficulty-options">
                        <button class="difficulty-btn active" data-difficulty="easy">
                            <span class="difficulty-btn-zh">简单</span>
                            <span class="difficulty-btn-en">Easy</span>
                            <span class="difficulty-desc">4×4</span>
                        </button>
                        <button class="difficulty-btn" data-difficulty="medium">
                            <span class="difficulty-btn-zh">中等</span>
                            <span class="difficulty-btn-en">Medium</span>
                            <span class="difficulty-desc">5×5</span>
                        </button>
                        <button class="difficulty-btn" data-difficulty="hard">
                            <span class="difficulty-btn-zh">困难</span>
                            <span class="difficulty-btn-en">Hard</span>
                            <span class="difficulty-desc">6×6</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        let selectedDifficulty = 'easy';
        
        // 绑定难度选择事件
        container.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedDifficulty = btn.getAttribute('data-difficulty');
            });
        });
        
        // 绑定模式选择事件
        container.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.getAttribute('data-mode');
                this.init(words, mode, selectedDifficulty);
            });
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    init(words, gameMode = 'classic', difficulty = 'easy') {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        // 清理之前的游戏状态和定时器
        this.cleanup();
        
        // 难度设置
        const difficultySettings = {
            easy: {
                gridSize: 4,
                pairCount: 8,
                timeLimit: 0 // 0表示无限制
            },
            medium: {
                gridSize: 5,
                pairCount: 12,
                timeLimit: 0
            },
            hard: {
                gridSize: 6,
                pairCount: 18,
                timeLimit: 0
            }
        };
        
        const settings = { ...difficultySettings[difficulty] }; // 创建新对象，避免引用问题
        
        // 限时模式调整时间限制
        if (gameMode === 'timed') {
            if (difficulty === 'easy') settings.timeLimit = 300; // 5分钟
            else if (difficulty === 'medium') settings.timeLimit = 180; // 3分钟
            else if (difficulty === 'hard') settings.timeLimit = 120; // 2分钟
        }
        
        // 重置保存标记
        this._recordSaved = false;
        
        // 创建全新的游戏状态
        this.gameState = {
            words: words,
            cards: [],
            flippedCards: [],
            matchedPairs: [],
            gameMode: gameMode,
            difficulty: difficulty,
            settings: { ...settings }, // 创建新的settings对象，避免引用问题
            score: 0,
            flipCount: 0,
            matchCount: 0,
            currentCombo: 0,
            maxCombo: 0,
            perfectMatches: 0,
            isPlaying: false,
            timeRemaining: settings.timeLimit,
            gameTimer: null,
            canFlip: true,
            startTime: null
        };
        
        // 生成卡片
        this.generateCards();
        
        // 渲染游戏界面
        this.render();
        
        // 延迟1秒后开始游戏
        setTimeout(() => {
            this.startGame();
        }, 1000);
    }
    
    cleanup() {
        // 停止游戏
        if (this.gameState && this.gameState.isPlaying) {
            this.gameState.isPlaying = false;
        }
        
        // 清理定时器
        if (this.gameState && this.gameState.gameTimer) {
            clearInterval(this.gameState.gameTimer);
            this.gameState.gameTimer = null;
        }
        
        // 清理flipTimer
        if (this.flipTimer) {
            clearTimeout(this.flipTimer);
            this.flipTimer = null;
        }
        
        // 重置游戏状态
        this.gameState = null;
    }

    generateCards() {
        const { words, settings } = this.gameState;
        let { pairCount } = settings;
        
        // 确保 pairCount 有效
        if (!pairCount || pairCount <= 0) {
            console.error('pairCount 无效:', pairCount);
            return;
        }
        
        // 确保有足够的单词，如果不够则使用所有可用单词
        const maxPairs = Math.floor(words.length);
        if (pairCount > maxPairs) {
            console.warn(`单词数量不足，从 ${pairCount} 对调整为 ${maxPairs} 对`);
            pairCount = maxPairs;
            this.gameState.settings.pairCount = pairCount;
        }
        
        // 随机选择单词
        const selectedWords = this.shuffleArray([...words]).slice(0, pairCount);
        
        // 生成卡片对
        const cards = [];
        selectedWords.forEach((word, index) => {
            // 英文卡片
            cards.push({
                id: `card-${index}-en`,
                word: word,
                type: 'english',
                text: word.english_word,
                pairId: index,
                flipped: false,
                matched: false,
                isFirstFlip: true
            });
            
            // 中文卡片
            cards.push({
                id: `card-${index}-zh`,
                word: word,
                type: 'chinese',
                text: word.chinese_meaning,
                pairId: index,
                flipped: false,
                matched: false,
                isFirstFlip: true
            });
        });
        
        // 随机打乱
        this.gameState.cards = this.shuffleArray(cards);
        
        // 确保 pairCount 与实际生成的卡片对数量一致
        const actualPairCount = cards.length / 2;
        this.gameState.settings.pairCount = actualPairCount;
        
        // 重置matchCount（确保从0开始，避免状态污染）
        this.gameState.matchCount = 0;
        
        console.log(`生成卡片: ${actualPairCount} 对，共 ${cards.length} 张卡片，matchCount已重置为0`);
    }

    render() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { score, currentCombo, flipCount, matchCount, settings, timeRemaining } = this.gameState;
        const { gridSize, pairCount } = settings;
        const progress = pairCount > 0 ? ((matchCount / pairCount) * 100).toFixed(0) : 0;
        
        // 格式化时间显示
        const formatTime = (seconds) => {
            if (seconds === 0) return '';
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        container.innerHTML = `
            <div class="word-match-game">
                <div class="game-header">
                    <div class="game-title">
                        <span class="game-title-zh">记忆配对</span>
                        <span class="game-title-en">Word Match</span>
                    </div>
                    <div class="game-stats">
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="score-label">得分</span>
                            <span class="game-stat-value" id="score-value">${score}</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="combo-label">连击</span>
                            <span class="game-stat-value" id="combo-value">${currentCombo}</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="flip-label">翻牌</span>
                            <span class="game-stat-value">${flipCount}</span>
                        </div>
                        ${timeRemaining > 0 ? `
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="time-label">时间</span>
                            <span class="game-stat-value" id="time-value">${formatTime(timeRemaining)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-label">
                        <span class="progress-text-zh">进度</span>
                        <span class="progress-text-en">Progress</span>
                        <span class="progress-value">${matchCount}/${pairCount}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <div class="cards-grid" id="cards-grid" style="grid-template-columns: repeat(${gridSize}, 1fr);">
                    ${this.gameState.cards.map(card => `
                        <div class="card" data-card-id="${card.id}" data-pair-id="${card.pairId}" data-card-type="${card.type}">
                            <div class="card-inner">
                                <div class="card-front">
                                    <div class="card-back-icon">🃏</div>
                                </div>
                                <div class="card-back">
                                    <div class="card-text">${card.text}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // 绑定卡片点击事件
        container.querySelectorAll('.card').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                const cardId = cardEl.getAttribute('data-card-id');
                const card = this.gameState.cards.find(c => c.id === cardId);
                if (card) {
                    this.handleCardClick(card, cardEl);
                }
            });
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    startGame() {
        this.gameState.isPlaying = true;
        this.gameState.startTime = Date.now();
        
        // 如果有限时，启动计时器
        if (this.gameState.timeRemaining > 0) {
            this.startTimer();
        }
    }

    startTimer() {
        // 如果已有定时器，先清理
        if (this.gameState.gameTimer) {
            clearInterval(this.gameState.gameTimer);
            this.gameState.gameTimer = null;
        }
        
        this.gameState.gameTimer = setInterval(() => {
            // 检查游戏是否还在进行
            if (!this.gameState.isPlaying) {
                clearInterval(this.gameState.gameTimer);
                this.gameState.gameTimer = null;
                return;
            }
            
            this.gameState.timeRemaining--;
            
            // 检查时间是否已到
            if (this.gameState.timeRemaining <= 0) {
                clearInterval(this.gameState.gameTimer);
                this.gameState.gameTimer = null;
                this.endGame();
                return;
            }
            
            const timeValue = document.getElementById('time-value');
            if (timeValue) {
                const formatTime = (seconds) => {
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                };
                timeValue.textContent = formatTime(this.gameState.timeRemaining);
            }
            
            // 时间警告
            if (this.gameState.timeRemaining <= 30) {
                const timeValue = document.getElementById('time-value');
                if (timeValue) {
                    timeValue.parentElement.classList.add('time-warning');
                }
            }
        }, 1000);
    }

    handleCardClick(card, cardEl) {
        // 检查是否可以翻牌
        if (!this.gameState.canFlip || card.flipped || card.matched) return;
        
        // 如果已经翻开了两张卡片，不能继续翻
        if (this.gameState.flippedCards.length >= 2) return;
        
        // 翻开卡片
        card.flipped = true;
        cardEl.classList.add('flipped');
        this.gameState.flippedCards.push(card);
        this.gameState.flipCount++;
        
        // 播放翻牌音效
        this.playFlipSound();
        
        // 更新翻牌次数显示
        const flipValue = document.querySelector('.game-stat-item:nth-child(3) .game-stat-value');
        if (flipValue) {
            flipValue.textContent = this.gameState.flipCount;
        }
        
        // 如果翻开了两张卡片，检查是否配对
        if (this.gameState.flippedCards.length === 2) {
            this.gameState.canFlip = false;
            setTimeout(() => {
                this.checkMatch();
            }, 500); // 延迟500ms让玩家看到第二张卡片
        }
    }

    checkMatch() {
        const [card1, card2] = this.gameState.flippedCards;
        const card1El = document.querySelector(`[data-card-id="${card1.id}"]`);
        const card2El = document.querySelector(`[data-card-id="${card2.id}"]`);
        
        // 检查是否配对成功
        if (card1.pairId === card2.pairId && card1.type !== card2.type) {
            // 配对成功
            this.handleMatch(card1, card2, card1El, card2El);
        } else {
            // 配对失败
            this.handleMismatch(card1, card2, card1El, card2El);
        }
    }

    handleMatch(card1, card2, card1El, card2El) {
        // 防止重复处理
        if (card1.matched || card2.matched) {
            return;
        }
        
        // 标记为已配对
        card1.matched = true;
        card2.matched = true;
        this.gameState.matchedPairs.push(card1.pairId);
        this.gameState.matchCount++;
        
        // 检查是否是完美配对（第一次翻就配对成功）
        const isPerfect = card1.isFirstFlip && card2.isFirstFlip;
        if (isPerfect) {
            this.gameState.perfectMatches++;
            // 播放完美配对音效
            this.playPerfectSound();
        } else {
            // 播放普通配对成功音效
            this.playMatchSound();
        }
        
        // 计算得分
        let score = 10;
        if (isPerfect) {
            score = 20; // 完美配对双倍分数
            this.showPerfectMatch(card1El);
        }
        
        // 连击奖励
        this.gameState.currentCombo++;
        if (this.gameState.currentCombo > this.gameState.maxCombo) {
            this.gameState.maxCombo = this.gameState.currentCombo;
        }
        
        // 连击奖励分数
        let comboBonus = 0;
        if (this.gameState.currentCombo >= 20) comboBonus = 100;
        else if (this.gameState.currentCombo >= 10) comboBonus = 50;
        else if (this.gameState.currentCombo >= 5) comboBonus = 25;
        else if (this.gameState.currentCombo >= 3) comboBonus = 10;
        
        if (comboBonus > 0) {
            score += comboBonus;
            this.showComboReward(this.gameState.currentCombo, comboBonus);
            // 播放连击音效
            this.playComboSound(this.gameState.currentCombo);
        }
        
        this.gameState.score += score;
        
        // 显示配对成功动画
        this.showMatchAnimation(card1El, card2El, score);
        
        // 延迟后移除卡片
        setTimeout(() => {
            card1El.classList.add('matched');
            card2El.classList.add('matched');
            setTimeout(() => {
                card1El.style.display = 'none';
                card2El.style.display = 'none';
            }, 300);
        }, 800);
        
        // 清空翻开的卡片
        this.gameState.flippedCards = [];
        this.gameState.canFlip = true;
        
        // 更新UI
        this.updateUI();
        
        // 检查游戏是否完成（确保 pairCount 有效且 matchCount 正确）
        const pairCount = this.gameState.settings.pairCount;
        if (this.gameState.isPlaying && pairCount > 0 && this.gameState.matchCount >= pairCount) {
            setTimeout(() => {
                if (this.gameState.isPlaying) {
                    this.endGame();
                }
            }, 1000);
        }
    }

    handleMismatch(card1, card2, card1El, card2El) {
        // 重置连击
        this.gameState.currentCombo = 0;
        
        // 标记不是第一次翻
        card1.isFirstFlip = false;
        card2.isFirstFlip = false;
        
        // 播放配对失败音效
        this.playMismatchSound();
        
        // 显示配对失败动画
        this.showMismatchAnimation(card1El, card2El);
        
        // 延迟后翻回卡片
        setTimeout(() => {
            card1.flipped = false;
            card2.flipped = false;
            card1El.classList.remove('flipped');
            card2El.classList.remove('flipped');
            
            // 清空翻开的卡片
            this.gameState.flippedCards = [];
            this.gameState.canFlip = true;
        }, 1000);
        
        // 更新连击显示
        const comboValue = document.getElementById('combo-value');
        if (comboValue) {
            comboValue.textContent = 0;
        }
    }

    showMatchAnimation(card1El, card2El, score) {
        // 显示得分动画
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const scoreEl = document.createElement('div');
        scoreEl.className = 'score-popup';
        scoreEl.textContent = `+${score}`;
        scoreEl.style.left = '50%';
        scoreEl.style.top = '50%';
        container.appendChild(scoreEl);
        
        setTimeout(() => {
            scoreEl.remove();
        }, 1000);
        
        // 显示星星特效
        this.showStars(card1El, card2El);
    }

    showMismatchAnimation(card1El, card2El) {
        card1El.classList.add('mismatch');
        card2El.classList.add('mismatch');
        
        setTimeout(() => {
            card1El.classList.remove('mismatch');
            card2El.classList.remove('mismatch');
        }, 1000);
    }

    showStars(card1El, card2El) {
        const stars = ['⭐', '✨', '🌟'];
        const positions = [
            { left: '20%', top: '30%' },
            { left: '50%', top: '20%' },
            { left: '80%', top: '30%' }
        ];
        
        positions.forEach((pos, index) => {
            const star = document.createElement('div');
            star.className = 'star-effect';
            star.textContent = stars[index];
            star.style.left = pos.left;
            star.style.top = pos.top;
            document.getElementById('game-container').appendChild(star);
            
            setTimeout(() => {
                star.remove();
            }, 1500);
        });
    }

    showPerfectMatch(cardEl) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const perfectEl = document.createElement('div');
        perfectEl.className = 'perfect-match';
        perfectEl.innerHTML = `
            <div class="perfect-text">
                <span class="perfect-text-zh">完美配对！</span>
                <span class="perfect-text-en">Perfect Match!</span>
            </div>
        `;
        container.appendChild(perfectEl);
        
        setTimeout(() => {
            perfectEl.remove();
        }, 2000);
    }

    showComboReward(combo, bonus) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const comboEl = document.createElement('div');
        comboEl.className = 'combo-reward';
        comboEl.innerHTML = `
            <div class="combo-reward-text">${combo} 连击！</div>
            <div class="combo-reward-bonus">+${bonus} 分</div>
        `;
        container.appendChild(comboEl);
        
        setTimeout(() => {
            comboEl.remove();
        }, 2000);
    }

    updateUI() {
        const { score, currentCombo, matchCount, settings } = this.gameState;
        const { pairCount } = settings;
        const progress = pairCount > 0 ? ((matchCount / pairCount) * 100).toFixed(0) : 0;
        
        const scoreValue = document.getElementById('score-value');
        const comboValue = document.getElementById('combo-value');
        const progressFill = document.getElementById('progress-fill');
        const progressValue = document.querySelector('.progress-value');
        
        if (scoreValue) scoreValue.textContent = score;
        if (comboValue) comboValue.textContent = currentCombo;
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressValue) progressValue.textContent = `${matchCount}/${pairCount}`;
    }

    endGame() {
        // 防止重复调用
        if (!this.gameState || !this.gameState.isPlaying) {
            return;
        }
        
        this.gameState.isPlaying = false;
        
        // 清理定时器
        if (this.gameState.gameTimer) {
            clearInterval(this.gameState.gameTimer);
            this.gameState.gameTimer = null;
        }
        
        // 清理flipTimer
        if (this.flipTimer) {
            clearTimeout(this.flipTimer);
            this.flipTimer = null;
        }
        
        // 播放游戏结束音效
        this.playGameOverSound();
        
        // 显示结果
        this.showResult();
    }

    showResult() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { score, flipCount, matchCount, maxCombo, perfectMatches, startTime, settings } = this.gameState;
        const { pairCount } = settings;
        const duration = startTime ? ((Date.now() - startTime) / 1000).toFixed(1) : 0;
        const efficiency = flipCount > 0 ? ((matchCount * 2 / flipCount) * 100).toFixed(0) : 0;
        const accuracy = pairCount > 0 ? ((matchCount / pairCount) * 100).toFixed(0) : 0;
        
        container.innerHTML = `
            <div class="word-match-result">
                <div class="result-title">
                    <span class="result-title-zh">游戏完成！</span>
                    <span class="result-title-en">Game Complete!</span>
                </div>
                
                <div class="result-stats">
                    <div class="result-stat-item">
                        <div class="result-stat-value">${score}</div>
                        <div class="result-stat-label" id="final-score-label">最终得分</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${matchCount}</div>
                        <div class="result-stat-label" id="match-count-label">配对成功</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${flipCount}</div>
                        <div class="result-stat-label" id="flip-count-label">翻牌次数</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${maxCombo}</div>
                        <div class="result-stat-label" id="max-combo-label">最高连击</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${perfectMatches}</div>
                        <div class="result-stat-label" id="perfect-label">完美配对</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${efficiency}%</div>
                        <div class="result-stat-label" id="efficiency-label">配对效率</div>
                    </div>
                    ${duration > 0 ? `
                    <div class="result-stat-item">
                        <div class="result-stat-value">${duration}s</div>
                        <div class="result-stat-label" id="duration-label">游戏时长</div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="result-actions">
                    <button class="result-btn" id="play-again-btn">再玩一次</button>
                    <button class="result-btn secondary" id="back-to-discover-btn">返回发现</button>
                </div>
            </div>
        `;
        
        // 绑定按钮事件
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.start();
        });
        
        document.getElementById('back-to-discover-btn').addEventListener('click', () => {
            this.app.closeGameModal();
            // 更新里程碑
            this.app.loadGameMilestones('word-match');
        });
        
        // 保存游戏记录并更新里程碑（只保存一次）
        this.saveRecord().then((success) => {
            if (success) {
                setTimeout(() => {
                    this.app.loadGameMilestones('word-match');
                }, 500);
            }
        }).catch(error => {
            console.error('保存游戏记录失败:', error);
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    async saveRecord() {
        // 防止重复保存
        if (this._recordSaved) {
            return false;
        }
        
        try {
            const { score, matchCount, flipCount, maxCombo, perfectMatches } = this.gameState;
            
            const result = await this.api.saveGameRecord({
                username: 'wendy',
                game_type: 'word-match',
                score: score,
                correct_count: matchCount,
                total_questions: matchCount * 2, // 配对需要两张卡片
                max_combo: maxCombo,
                accuracy: matchCount > 0 ? '100.00' : '0.00' // 配对游戏准确率总是100%或0%
            });
            
            if (result && result.success) {
                this._recordSaved = true; // 标记已保存
                console.log('✅ 游戏记录已保存:', {
                    game_type: 'word-match',
                    score: score,
                    correct_count: matchCount,
                    total_questions: matchCount * 2,
                    max_combo: maxCombo
                });
                return true;
            } else {
                console.error('❌ 保存游戏记录失败:', result ? result.error : '未知错误');
                return false;
            }
        } catch (error) {
            console.error('❌ 保存游戏记录异常:', error);
            return false;
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// 导出游戏类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordMatchGame;
}

