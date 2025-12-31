/**
 * 限时挑战游戏
 * 独立的游戏逻辑文件
 */

class TimeChallengeGame {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.gameState = null;
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
            console.error('启动限时挑战失败:', error);
            this.app.showNotification('启动游戏失败，请稍后重试', 'error');
        }
    }

    showModeSelection(words) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="time-challenge-mode-selection">
                <div class="mode-selection-title">
                    <span class="mode-title-zh">选择挑战模式</span>
                    <span class="mode-title-en">Select Challenge Mode</span>
                </div>
                <div class="mode-options">
                    <div class="mode-card" data-mode="easy">
                        <div class="mode-icon">😊</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">简单模式</span>
                            <span class="mode-name-en">Easy Mode</span>
                        </div>
                        <div class="mode-time">
                            <span class="mode-time-zh">60秒</span>
                            <span class="mode-time-en">60s</span>
                        </div>
                        <div class="mode-bonus">
                            <span class="mode-bonus-zh">答对+2秒</span>
                            <span class="mode-bonus-en">+2s per correct</span>
                        </div>
                    </div>
                    <div class="mode-card" data-mode="medium">
                        <div class="mode-icon">😎</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">中等模式</span>
                            <span class="mode-name-en">Medium Mode</span>
                        </div>
                        <div class="mode-time">
                            <span class="mode-time-zh">45秒</span>
                            <span class="mode-time-en">45s</span>
                        </div>
                        <div class="mode-bonus">
                            <span class="mode-bonus-zh">答对+1秒</span>
                            <span class="mode-bonus-en">+1s per correct</span>
                        </div>
                    </div>
                    <div class="mode-card" data-mode="hard">
                        <div class="mode-icon">🔥</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">困难模式</span>
                            <span class="mode-name-en">Hard Mode</span>
                        </div>
                        <div class="mode-time">
                            <span class="mode-time-zh">30秒</span>
                            <span class="mode-time-en">30s</span>
                        </div>
                        <div class="mode-bonus">
                            <span class="mode-bonus-zh">无时间奖励</span>
                            <span class="mode-bonus-en">No time bonus</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 绑定模式选择事件
        container.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.getAttribute('data-mode');
                this.init(words, mode);
            });
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    init(words, gameMode = 'easy') {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        // 根据模式设置时间限制
        const timeLimits = {
            easy: 60,
            medium: 45,
            hard: 30
        };
        
        // 游戏状态
        this.gameState = {
            words: words,
            timeLimit: timeLimits[gameMode],
            timeRemaining: timeLimits[gameMode],
            timerInterval: null,
            score: 0,
            correctCount: 0,
            totalQuestions: 0,
            currentCombo: 0,
            maxCombo: 0,
            currentQuestion: null,
            isPlaying: false,
            gameMode: gameMode,
            startTime: null,
            endTime: null
        };
        
        // 生成第一题
        this.generateNextQuestion();
        
        // 渲染游戏界面
        this.render();
        
        // 延迟1秒后开始游戏（给用户准备时间）
        setTimeout(() => {
            this.startGame();
        }, 1000);
    }

    generateNextQuestion() {
        const { words } = this.gameState;
        if (!words || words.length < 4) return;
        
        // 随机选择一个单词
        const randomWord = words[Math.floor(Math.random() * words.length)];
        
        // 生成3个干扰项
        const wrongAnswers = this.shuffleArray([...words])
            .filter(w => w.english_word !== randomWord.english_word)
            .slice(0, 3)
            .map(w => w.english_word);
        
        // 打乱选项顺序
        const options = this.shuffleArray([randomWord.english_word, ...wrongAnswers]);
        
        this.gameState.currentQuestion = {
            word: randomWord,
            question: randomWord.chinese_meaning,
            correctAnswer: randomWord.english_word,
            options: options,
            answered: false,
            isCorrect: false
        };
    }

    startGame() {
        this.gameState.isPlaying = true;
        this.gameState.startTime = Date.now();
        
        // 启动倒计时
        this.startTimer();
        
        // 更新界面显示"开始"
        const timerDisplay = document.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.textContent = this.gameState.timeRemaining;
        }
    }

    startTimer() {
        this.gameState.timerInterval = setInterval(() => {
            this.gameState.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.gameState.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    clearTimer() {
        if (this.gameState.timerInterval) {
            clearInterval(this.gameState.timerInterval);
            this.gameState.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const timerDisplay = document.querySelector('.timer-display');
        const timerContainer = document.querySelector('.timer-container');
        
        if (!timerDisplay || !timerContainer) return;
        
        timerDisplay.textContent = this.gameState.timeRemaining;
        
        // 根据剩余时间改变颜色
        timerContainer.classList.remove('timer-warning', 'timer-danger');
        if (this.gameState.timeRemaining <= 5) {
            timerContainer.classList.add('timer-danger');
        } else if (this.gameState.timeRemaining <= 10) {
            timerContainer.classList.add('timer-warning');
        }
    }

    render() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { score, currentCombo, timeRemaining, currentQuestion, isPlaying } = this.gameState;
        
        if (!currentQuestion) {
            this.generateNextQuestion();
        }
        
        const question = currentQuestion;
        const timerClass = timeRemaining <= 5 ? 'timer-danger' : (timeRemaining <= 10 ? 'timer-warning' : '');
        
        container.innerHTML = `
            <div class="time-challenge-game">
                <div class="game-header">
                    <div class="game-title">
                        <span class="game-title-zh">限时挑战</span>
                        <span class="game-title-en">Time Challenge</span>
                    </div>
                    <div class="game-stats">
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="score-label">得分</span>
                            <span class="game-stat-value">${score}</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="combo-label">连击</span>
                            <span class="game-stat-value">${currentCombo}</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="questions-label">答题</span>
                            <span class="game-stat-value">${this.gameState.totalQuestions}</span>
                        </div>
                    </div>
                </div>
                
                <div class="timer-container ${timerClass}">
                    <div class="timer-label" id="timer-label">剩余时间</div>
                    <div class="timer-display">${isPlaying ? timeRemaining : '准备中...'}</div>
                </div>
                
                <div class="game-question-area">
                    <div class="question-number">第 ${this.gameState.totalQuestions + 1} 题</div>
                    <div class="question-text">${question.question}</div>
                    <div class="question-hint" id="question-hint">请选择对应的英文单词</div>
                </div>
                
                <div class="game-options">
                    ${question.options.map((option, index) => `
                        <button class="game-option-btn" data-option="${option}" data-index="${index}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        // 绑定选项点击事件
        container.querySelectorAll('.game-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.gameState.isPlaying) return;
                const selectedAnswer = e.target.getAttribute('data-option');
                this.handleAnswer(selectedAnswer, question);
            });
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    handleAnswer(selectedAnswer, question) {
        if (question.answered) return;
        
        const isCorrect = selectedAnswer === question.correctAnswer;
        question.answered = true;
        question.isCorrect = isCorrect;
        
        // 禁用所有按钮
        const buttons = document.querySelectorAll('.game-option-btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            const option = btn.getAttribute('data-option');
            if (option === question.correctAnswer) {
                btn.classList.add('correct');
            } else if (option === selectedAnswer && !isCorrect) {
                btn.classList.add('wrong');
            }
        });
        
        // 更新得分和连击
        if (isCorrect) {
            this.gameState.score += 10;
            this.gameState.correctCount++;
            this.gameState.currentCombo++;
            
            // 更新最高连击
            if (this.gameState.currentCombo > this.gameState.maxCombo) {
                this.gameState.maxCombo = this.gameState.currentCombo;
            }
            
            // 时间奖励（仅简单和中等模式）
            let timeBonus = 0;
            if (this.gameState.gameMode === 'easy') {
                timeBonus = 2;
            } else if (this.gameState.gameMode === 'medium') {
                timeBonus = 1;
            }
            
            if (timeBonus > 0) {
                this.gameState.timeRemaining += timeBonus;
                this.showTimeBonus(timeBonus);
            }
            
            // 连击奖励
            this.checkComboReward();
        } else {
            this.gameState.currentCombo = 0;
        }
        
        this.gameState.totalQuestions++;
        
        // 显示反馈后继续下一题
        setTimeout(() => {
            if (this.gameState.timeRemaining > 0) {
                this.generateNextQuestion();
                this.render();
            }
        }, 800);
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

    showTimeBonus(bonus) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const bonusEl = document.createElement('div');
        bonusEl.className = 'time-bonus';
        bonusEl.innerHTML = `+${bonus}秒`;
        container.appendChild(bonusEl);
        
        setTimeout(() => {
            bonusEl.remove();
        }, 1500);
    }

    endGame() {
        this.clearTimer();
        this.gameState.isPlaying = false;
        this.gameState.endTime = Date.now();
        
        // 显示结果
        this.showResult();
    }

    showResult() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { score, correctCount, totalQuestions, maxCombo, startTime, endTime } = this.gameState;
        const accuracy = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(0) : 0;
        const duration = endTime && startTime ? ((endTime - startTime) / 1000).toFixed(1) : 0;
        const questionsPerMinute = duration > 0 ? ((totalQuestions / duration) * 60).toFixed(1) : 0;
        
        container.innerHTML = `
            <div class="time-challenge-result">
                <div class="result-title">
                    <span class="result-title-zh">挑战完成！</span>
                    <span class="result-title-en">Challenge Complete!</span>
                </div>
                
                <div class="result-stats">
                    <div class="result-stat-item">
                        <div class="result-stat-value">${score}</div>
                        <div class="result-stat-label" id="final-score-label">最终得分</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${correctCount}/${totalQuestions}</div>
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
                    ${questionsPerMinute > 0 ? `
                    <div class="result-stat-item">
                        <div class="result-stat-value">${questionsPerMinute}</div>
                        <div class="result-stat-label" id="speed-label">题/分钟</div>
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
            this.app.loadGameMilestones('time-challenge');
        });
        
        // 保存游戏记录并更新里程碑
        this.saveRecord().then((success) => {
            if (success) {
                // 保存成功后更新里程碑，延迟确保数据库已更新
                setTimeout(() => {
                    this.app.loadGameMilestones('time-challenge');
                }, 500);
            }
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    async saveRecord() {
        try {
            const result = await this.api.saveGameRecord({
                username: 'wendy', // 默认用户名
                game_type: 'time-challenge',
                score: this.gameState.score,
                correct_count: this.gameState.correctCount,
                total_questions: this.gameState.totalQuestions,
                max_combo: this.gameState.maxCombo,
                accuracy: this.gameState.totalQuestions > 0 
                    ? ((this.gameState.correctCount / this.gameState.totalQuestions) * 100).toFixed(2)
                    : 0
            });
            
            if (result && result.success) {
                console.log('✅ 游戏记录已保存:', {
                    game_type: 'time-challenge',
                    score: this.gameState.score,
                    correct_count: this.gameState.correctCount,
                    total_questions: this.gameState.totalQuestions,
                    max_combo: this.gameState.maxCombo
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
    module.exports = TimeChallengeGame;
}

