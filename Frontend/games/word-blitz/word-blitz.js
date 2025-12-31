/**
 * 单词速射游戏
 * 独立的游戏逻辑文件
 * 核心机制：单词从屏幕上方快速下落，玩家需要快速点击正确答案
 */

class WordBlitzGame {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.gameState = null;
        this.animationFrame = null;
        this.gameArea = null;
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
            console.error('启动单词速射失败:', error);
            this.app.showNotification('启动游戏失败，请稍后重试', 'error');
        }
    }

    showModeSelection(words) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="word-blitz-mode-selection">
                <div class="mode-selection-title">
                    <span class="mode-title-zh">选择游戏模式</span>
                    <span class="mode-title-en">Select Game Mode</span>
                </div>
                <div class="mode-options">
                    <div class="mode-card" data-mode="classic">
                        <div class="mode-icon">🌊</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">经典模式</span>
                            <span class="mode-name-en">Classic Mode</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">单词从上方流下</span>
                            <span class="mode-desc-en">Words fall from top</span>
                        </div>
                    </div>
                    <div class="mode-card" data-mode="barrage">
                        <div class="mode-icon">💥</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">弹幕模式</span>
                            <span class="mode-name-en">Barrage Mode</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">单词从四周飞入</span>
                            <span class="mode-desc-en">Words fly from sides</span>
                        </div>
                    </div>
                    <div class="mode-card" data-mode="mixed">
                        <div class="mode-icon">🔥</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">混合模式</span>
                            <span class="mode-name-en">Mixed Mode</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">最高难度挑战</span>
                            <span class="mode-desc-en">Ultimate challenge</span>
                        </div>
                    </div>
                </div>
                <div class="difficulty-selection">
                    <div class="difficulty-title">
                        <span class="difficulty-title-zh">选择难度</span>
                        <span class="difficulty-title-en">Select Difficulty</span>
                    </div>
                    <div class="difficulty-options">
                        <button class="difficulty-btn" data-difficulty="easy">
                            <span class="difficulty-btn-zh">简单</span>
                            <span class="difficulty-btn-en">Easy</span>
                        </button>
                        <button class="difficulty-btn active" data-difficulty="medium">
                            <span class="difficulty-btn-zh">中等</span>
                            <span class="difficulty-btn-en">Medium</span>
                        </button>
                        <button class="difficulty-btn" data-difficulty="hard">
                            <span class="difficulty-btn-zh">困难</span>
                            <span class="difficulty-btn-en">Hard</span>
                        </button>
                        <button class="difficulty-btn" data-difficulty="expert">
                            <span class="difficulty-btn-zh">专家</span>
                            <span class="difficulty-btn-en">Expert</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        let selectedDifficulty = 'medium';
        
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

    init(words, gameMode = 'classic', difficulty = 'medium') {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        // 难度设置
        const difficultySettings = {
            easy: {
                speed: { min: 1, max: 2 },
                maxWords: 4,
                spawnRate: 3000,
                health: 100,
                wrongPenalty: 5,
                missedPenalty: 3
            },
            medium: {
                speed: { min: 2, max: 4 },
                maxWords: 6,
                spawnRate: 2000,
                health: 80,
                wrongPenalty: 8,
                missedPenalty: 5
            },
            hard: {
                speed: { min: 4, max: 6 },
                maxWords: 8,
                spawnRate: 1500,
                health: 60,
                wrongPenalty: 10,
                missedPenalty: 8
            },
            expert: {
                speed: { min: 6, max: 10 },
                maxWords: 10,
                spawnRate: 1000,
                health: 50,
                wrongPenalty: 15,
                missedPenalty: 10
            }
        };
        
        const settings = difficultySettings[difficulty];
        
        // 游戏状态
        this.gameState = {
            words: words,
            activeWords: [],
            wordQueue: [],
            gameMode: gameMode,
            difficulty: difficulty,
            settings: settings,
            score: 0,
            correctCount: 0,
            wrongCount: 0,
            missedCount: 0,
            currentCombo: 0,
            maxCombo: 0,
            health: settings.health,
            maxHealth: settings.health,
            isPlaying: false,
            gameTimer: null,
            wordSpawnTimer: null,
            perfectMode: false,
            perfectCount: 0,
            startTime: null
        };
        
        // 渲染游戏界面
        this.render();
        
        // 延迟1秒后开始游戏
        setTimeout(() => {
            this.startGame();
        }, 1000);
    }

    render() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { score, currentCombo, health, maxHealth, correctCount, wrongCount, missedCount } = this.gameState;
        const healthPercent = (health / maxHealth) * 100;
        
        container.innerHTML = `
            <div class="word-blitz-game">
                <div class="game-header">
                    <div class="game-title">
                        <span class="game-title-zh">单词速射</span>
                        <span class="game-title-en">Word Blitz</span>
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
                            <span class="game-stat-label" id="correct-label">答对</span>
                            <span class="game-stat-value">${correctCount}</span>
                        </div>
                    </div>
                </div>
                
                <div class="health-bar-container">
                    <div class="health-label" id="health-label">生命值</div>
                    <div class="health-bar">
                        <div class="health-fill" id="health-fill" style="width: ${healthPercent}%"></div>
                        <div class="health-text">${health}/${maxHealth}</div>
                    </div>
                </div>
                
                <div class="game-area" id="game-area">
                    <div class="game-hint" id="game-hint">
                        <span class="hint-text-zh">快速点击正确的单词！</span>
                        <span class="hint-text-en">Click the correct words quickly!</span>
                    </div>
                </div>
            </div>
        `;
        
        this.gameArea = document.getElementById('game-area');
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    startGame() {
        this.gameState.isPlaying = true;
        this.gameState.startTime = Date.now();
        
        // 开始生成单词
        this.startWordSpawning();
        
        // 开始游戏循环
        this.gameLoop();
        
        // 更新提示
        const hint = document.getElementById('game-hint');
        if (hint) {
            hint.style.display = 'none';
        }
    }

    startWordSpawning() {
        const { settings, gameMode } = this.gameState;
        
        const spawnWord = () => {
            if (!this.gameState.isPlaying) return;
            
            if (this.gameState.activeWords.length < settings.maxWords) {
                this.spawnWord();
            }
            
            // 根据模式调整生成间隔
            let spawnRate = settings.spawnRate;
            if (gameMode === 'barrage' || gameMode === 'mixed') {
                spawnRate = spawnRate * 0.7; // 弹幕模式生成更快
            }
            
            this.gameState.wordSpawnTimer = setTimeout(spawnWord, spawnRate);
        };
        
        spawnWord();
    }

    spawnWord() {
        const { words, gameMode, settings } = this.gameState;
        if (!this.gameArea || words.length === 0) return;
        
        // 随机选择单词
        const word = words[Math.floor(Math.random() * words.length)];
        
        // 生成3个干扰项
        const wrongWords = this.shuffleArray([...words])
            .filter(w => w.english_word !== word.english_word)
            .slice(0, 3)
            .map(w => w.english_word);
        
        // 随机选择显示方式（中文或英文）
        const showChinese = Math.random() > 0.5;
        
        // 根据模式决定生成位置和方向
        let x, y, direction;
        const areaWidth = this.gameArea.offsetWidth;
        const areaHeight = this.gameArea.offsetHeight;
        
        if (gameMode === 'classic') {
            // 瀑布流：从顶部随机位置
            x = Math.random() * (areaWidth - 200) + 100;
            y = -100;
            direction = 'down';
        } else if (gameMode === 'barrage') {
            // 弹幕：从四周飞入
            const side = Math.floor(Math.random() * 4);
            if (side === 0) { // 上
                x = Math.random() * areaWidth;
                y = -100;
                direction = 'down';
            } else if (side === 1) { // 右
                x = areaWidth + 100;
                y = Math.random() * areaHeight;
                direction = 'left';
            } else if (side === 2) { // 下
                x = Math.random() * areaWidth;
                y = areaHeight + 100;
                direction = 'up';
            } else { // 左
                x = -100;
                y = Math.random() * areaHeight;
                direction = 'right';
            }
        } else { // mixed
            // 混合模式：随机选择瀑布流或弹幕
            if (Math.random() > 0.5) {
                x = Math.random() * (areaWidth - 200) + 100;
                y = -100;
                direction = 'down';
            } else {
                const side = Math.floor(Math.random() * 4);
                if (side === 0) {
                    x = Math.random() * areaWidth;
                    y = -100;
                    direction = 'down';
                } else if (side === 1) {
                    x = areaWidth + 100;
                    y = Math.random() * areaHeight;
                    direction = 'left';
                } else if (side === 2) {
                    x = Math.random() * areaWidth;
                    y = areaHeight + 100;
                    direction = 'up';
                } else {
                    x = -100;
                    y = Math.random() * areaHeight;
                    direction = 'right';
                }
            }
        }
        
        // 随机速度
        const speed = settings.speed.min + Math.random() * (settings.speed.max - settings.speed.min);
        
        // 随机大小（增加难度）
        const size = 0.9 + Math.random() * 0.2; // 0.9-1.1倍
        
        // 创建单词元素
        const wordId = `word-${Date.now()}-${Math.random()}`;
        const wordEl = document.createElement('div');
        wordEl.className = 'falling-word';
        wordEl.id = wordId;
        wordEl.style.left = `${x}px`;
        wordEl.style.top = `${y}px`;
        wordEl.style.transform = `scale(${size})`;
        wordEl.setAttribute('data-word-id', wordId);
        wordEl.setAttribute('data-correct', word.english_word);
        
        // 生成选项（1个正确答案 + 3个干扰项）
        const options = this.shuffleArray([word.english_word, ...wrongWords]);
        
        // 生成中文选项（当显示英文时）
        let chineseOptions = [];
        if (!showChinese) {
            const wrongChineseWords = wrongWords.map(w => {
                const wrongWord = this.gameState.words.find(ww => ww.english_word === w);
                return wrongWord ? wrongWord.chinese_meaning : w;
            });
            chineseOptions = this.shuffleArray([word.chinese_meaning, ...wrongChineseWords]);
        }
        
        wordEl.innerHTML = `
            <div class="word-display">
                ${showChinese ? `
                    <div class="word-question">${word.chinese_meaning}</div>
                    <div class="word-options">
                        ${options.map(opt => `
                            <button class="word-option-btn" data-option="${opt}" data-is-english="true">${opt}</button>
                        `).join('')}
                    </div>
                ` : `
                    <div class="word-question">${word.english_word}</div>
                    <div class="word-options">
                        ${chineseOptions.map(opt => `
                            <button class="word-option-btn" data-option="${opt}" data-is-english="false">${opt}</button>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
        
        // 绑定点击事件
        wordEl.querySelectorAll('.word-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const selectedOption = btn.getAttribute('data-option');
                const isEnglish = btn.getAttribute('data-is-english') === 'true';
                
                // 判断是否正确
                let isCorrect = false;
                if (showChinese && isEnglish) {
                    // 显示中文，选择英文
                    isCorrect = selectedOption === word.english_word;
                } else if (!showChinese && !isEnglish) {
                    // 显示英文，选择中文
                    isCorrect = selectedOption === word.chinese_meaning;
                }
                
                this.handleWordClick(wordId, isCorrect, wordEl);
            });
        });
        
        this.gameArea.appendChild(wordEl);
        
        // 添加到活动单词列表
        this.gameState.activeWords.push({
            id: wordId,
            element: wordEl,
            word: word,
            x: x,
            y: y,
            speed: speed,
            direction: direction,
            size: size,
            showChinese: showChinese,
            answered: false,
            spawnTime: Date.now()
        });
    }

    gameLoop() {
        if (!this.gameState.isPlaying) return;
        
        this.updateWords();
        this.checkGameOver();
        
        this.animationFrame = requestAnimationFrame(() => this.gameLoop());
    }

    updateWords() {
        if (!this.gameArea) return;
        
        const areaWidth = this.gameArea.offsetWidth;
        const areaHeight = this.gameArea.offsetHeight;
        
        this.gameState.activeWords.forEach(wordObj => {
            if (wordObj.answered) return;
            
            const { x, y, speed, direction } = wordObj;
            let newX = x;
            let newY = y;
            
            // 根据方向更新位置
            switch (direction) {
                case 'down':
                    newY = y + speed;
                    break;
                case 'up':
                    newY = y - speed;
                    break;
                case 'left':
                    newX = x - speed;
                    break;
                case 'right':
                    newX = x + speed;
                    break;
            }
            
            wordObj.x = newX;
            wordObj.y = newY;
            
            // 更新DOM位置
            if (wordObj.element) {
                wordObj.element.style.left = `${newX}px`;
                wordObj.element.style.top = `${newY}px`;
            }
            
            // 检查是否超出屏幕
            const isOutOfBounds = 
                (direction === 'down' && newY > areaHeight + 100) ||
                (direction === 'up' && newY < -100) ||
                (direction === 'left' && newX < -100) ||
                (direction === 'right' && newX > areaWidth + 100);
            
            if (isOutOfBounds && !wordObj.answered) {
                this.handleMissedWord(wordObj);
            }
        });
    }

    handleWordClick(wordId, isCorrect, wordEl) {
        const wordObj = this.gameState.activeWords.find(w => w.id === wordId);
        if (!wordObj || wordObj.answered) return;
        
        wordObj.answered = true;
        
        if (isCorrect) {
            this.handleCorrectAnswer(wordObj);
        } else {
            this.handleWrongAnswer(wordObj);
        }
        
        // 移除单词
        this.removeWord(wordId);
    }

    handleCorrectAnswer(wordObj) {
        const { speed, spawnTime } = wordObj;
        const timeElapsed = Date.now() - spawnTime;
        
        // 基础得分
        let score = 10;
        
        // 速度奖励（速度越快，得分越高）
        const speedBonus = Math.floor(speed * 2);
        score += speedBonus;
        
        // 时间奖励（答得越快，奖励越高）
        const timeBonus = Math.max(0, Math.floor((2000 - timeElapsed) / 100));
        score += timeBonus;
        
        // 完美模式奖励
        if (this.gameState.perfectMode) {
            score = Math.floor(score * 1.5);
        }
        
        this.gameState.score += score;
        this.gameState.correctCount++;
        this.gameState.currentCombo++;
        
        if (this.gameState.currentCombo > this.gameState.maxCombo) {
            this.gameState.maxCombo = this.gameState.currentCombo;
        }
        
        // 完美模式检查
        this.gameState.perfectCount++;
        if (this.gameState.perfectCount >= 10 && !this.gameState.perfectMode) {
            this.gameState.perfectMode = true;
            this.showPerfectMode();
        }
        
        // 连击奖励
        this.checkComboReward();
        
        // 显示得分动画
        this.showScoreAnimation(wordObj.element, score);
        
        // 更新UI
        this.updateUI();
    }

    handleWrongAnswer(wordObj) {
        this.gameState.wrongCount++;
        this.gameState.currentCombo = 0;
        this.gameState.perfectCount = 0;
        this.gameState.perfectMode = false;
        
        this.gameState.health = Math.max(0, this.gameState.health - this.gameState.settings.wrongPenalty);
        
        // 显示错误动画
        this.showErrorAnimation(wordObj.element);
        
        // 更新UI
        this.updateUI();
    }

    handleMissedWord(wordObj) {
        wordObj.answered = true;
        this.gameState.missedCount++;
        this.gameState.currentCombo = 0;
        this.gameState.perfectCount = 0;
        this.gameState.perfectMode = false;
        
        this.gameState.health = Math.max(0, this.gameState.health - this.gameState.settings.missedPenalty);
        
        // 显示漏掉动画
        this.showMissedAnimation(wordObj.element);
        
        // 移除单词
        this.removeWord(wordObj.id);
        
        // 更新UI
        this.updateUI();
    }

    checkComboReward() {
        const { currentCombo } = this.gameState;
        let comboBonus = 0;
        
        if (currentCombo >= 20) comboBonus = 100;
        else if (currentCombo >= 10) comboBonus = 50;
        else if (currentCombo >= 5) comboBonus = 25;
        else if (currentCombo >= 3) comboBonus = 10;
        
        if (comboBonus > 0) {
            this.gameState.score += comboBonus;
            this.showComboReward(currentCombo, comboBonus);
        }
    }

    showScoreAnimation(element, score) {
        if (!element) return;
        
        const scoreEl = document.createElement('div');
        scoreEl.className = 'score-popup';
        scoreEl.textContent = `+${score}`;
        scoreEl.style.left = element.style.left;
        scoreEl.style.top = element.style.top;
        this.gameArea.appendChild(scoreEl);
        
        setTimeout(() => {
            scoreEl.remove();
        }, 1000);
    }

    showErrorAnimation(element) {
        if (!element) return;
        
        element.classList.add('word-error');
        setTimeout(() => {
            element.classList.remove('word-error');
        }, 500);
    }

    showMissedAnimation(element) {
        if (!element) return;
        
        element.classList.add('word-missed');
        setTimeout(() => {
            element.classList.remove('word-missed');
        }, 500);
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

    showPerfectMode() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const perfectEl = document.createElement('div');
        perfectEl.className = 'perfect-mode';
        perfectEl.innerHTML = `
            <div class="perfect-text">
                <span class="perfect-text-zh">完美模式！得分翻倍！</span>
                <span class="perfect-text-en">Perfect Mode! Double Score!</span>
            </div>
        `;
        container.appendChild(perfectEl);
        
        setTimeout(() => {
            perfectEl.remove();
        }, 3000);
    }

    removeWord(wordId) {
        const wordObj = this.gameState.activeWords.find(w => w.id === wordId);
        if (wordObj && wordObj.element) {
            wordObj.element.classList.add('word-removing');
            setTimeout(() => {
                if (wordObj.element && wordObj.element.parentNode) {
                    wordObj.element.remove();
                }
            }, 300);
        }
        
        this.gameState.activeWords = this.gameState.activeWords.filter(w => w.id !== wordId);
    }

    updateUI() {
        const { score, currentCombo, health, maxHealth, correctCount } = this.gameState;
        const healthPercent = (health / maxHealth) * 100;
        
        const scoreValue = document.getElementById('score-value');
        const comboValue = document.getElementById('combo-value');
        const healthFill = document.getElementById('health-fill');
        const healthText = document.querySelector('.health-text');
        
        if (scoreValue) scoreValue.textContent = score;
        if (comboValue) comboValue.textContent = currentCombo;
        if (healthFill) healthFill.style.width = `${healthPercent}%`;
        if (healthText) healthText.textContent = `${health}/${maxHealth}`;
        
        // 生命值警告
        if (healthPercent <= 30) {
            this.gameArea?.classList.add('health-warning');
        } else {
            this.gameArea?.classList.remove('health-warning');
        }
    }

    checkGameOver() {
        if (this.gameState.health <= 0) {
            this.endGame();
        }
    }

    endGame() {
        this.gameState.isPlaying = false;
        
        // 清理定时器
        if (this.gameState.wordSpawnTimer) {
            clearTimeout(this.gameState.wordSpawnTimer);
        }
        
        // 停止动画
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // 清理所有单词
        this.gameState.activeWords.forEach(wordObj => {
            if (wordObj.element) {
                wordObj.element.remove();
            }
        });
        
        // 显示结果
        this.showResult();
    }

    showResult() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { score, correctCount, wrongCount, missedCount, maxCombo, startTime } = this.gameState;
        const duration = startTime ? ((Date.now() - startTime) / 1000).toFixed(1) : 0;
        const totalQuestions = correctCount + wrongCount + missedCount;
        const accuracy = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(0) : 0;
        const wordsPerMinute = duration > 0 ? ((totalQuestions / duration) * 60).toFixed(1) : 0;
        
        container.innerHTML = `
            <div class="word-blitz-result">
                <div class="result-title">
                    <span class="result-title-zh">游戏结束！</span>
                    <span class="result-title-en">Game Over!</span>
                </div>
                
                <div class="result-stats">
                    <div class="result-stat-item">
                        <div class="result-stat-value">${score}</div>
                        <div class="result-stat-label" id="final-score-label">最终得分</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${correctCount}</div>
                        <div class="result-stat-label" id="correct-count-label">答对题数</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${accuracy}%</div>
                        <div class="result-stat-label" id="accuracy-label">正确率</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${maxCombo}</div>
                        <div class="result-stat-label" id="max-combo-label">最高连击</div>
                    </div>
                    ${wordsPerMinute > 0 ? `
                    <div class="result-stat-item">
                        <div class="result-stat-value">${wordsPerMinute}</div>
                        <div class="result-stat-label" id="speed-label">题/分钟</div>
                    </div>
                    ` : ''}
                    <div class="result-stat-item">
                        <div class="result-stat-value">${duration}s</div>
                        <div class="result-stat-label" id="duration-label">游戏时长</div>
                    </div>
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
            this.app.loadGameMilestones('word-blitz');
        });
        
        // 保存游戏记录并更新里程碑
        this.saveRecord().then((success) => {
            if (success) {
                setTimeout(() => {
                    this.app.loadGameMilestones('word-blitz');
                }, 500);
            }
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    async saveRecord() {
        try {
            const { score, correctCount, wrongCount, missedCount, maxCombo, startTime } = this.gameState;
            const totalQuestions = correctCount + wrongCount + missedCount;
            const duration = startTime ? ((Date.now() - startTime) / 1000) : 0;
            
            const result = await this.api.saveGameRecord({
                username: 'wendy',
                game_type: 'word-blitz',
                score: score,
                correct_count: correctCount,
                total_questions: totalQuestions,
                max_combo: maxCombo,
                accuracy: totalQuestions > 0 
                    ? ((correctCount / totalQuestions) * 100).toFixed(2)
                    : 0
            });
            
            if (result && result.success) {
                console.log('✅ 游戏记录已保存:', {
                    game_type: 'word-blitz',
                    score: score,
                    correct_count: correctCount,
                    total_questions: totalQuestions,
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
    module.exports = WordBlitzGame;
}

