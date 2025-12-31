/**
 * 连击奖励游戏
 * 独立的游戏逻辑文件
 * 核心机制：连击数越高，得分倍数越高
 */

class ComboRewardsGame {
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
            console.error('启动连击奖励失败:', error);
            this.app.showNotification('启动游戏失败，请稍后重试', 'error');
        }
    }

    showModeSelection(words) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="combo-rewards-mode-selection">
                <div class="mode-selection-title">
                    <span class="mode-title-zh">选择挑战模式</span>
                    <span class="mode-title-en">Select Challenge Mode</span>
                </div>
                <div class="mode-options">
                    <div class="mode-card" data-mode="classic">
                        <div class="mode-icon">⭐</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">经典模式</span>
                            <span class="mode-name-en">Classic Mode</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">20题挑战</span>
                            <span class="mode-desc-en">20 Questions</span>
                        </div>
                        <div class="mode-hint">
                            <span class="mode-hint-zh">保持连击获得高分</span>
                            <span class="mode-hint-en">Keep combo for high score</span>
                        </div>
                    </div>
                    <div class="mode-card" data-mode="challenge">
                        <div class="mode-icon">🔥</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">挑战模式</span>
                            <span class="mode-name-en">Challenge Mode</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">30题挑战</span>
                            <span class="mode-desc-en">30 Questions</span>
                        </div>
                        <div class="mode-hint">
                            <span class="mode-hint-zh">更高难度更多分数</span>
                            <span class="mode-hint-en">More questions more score</span>
                        </div>
                    </div>
                    <div class="mode-card" data-mode="endless">
                        <div class="mode-icon">♾️</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">无限模式</span>
                            <span class="mode-name-en">Endless Mode</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">答错3次结束</span>
                            <span class="mode-desc-en">3 wrongs = game over</span>
                        </div>
                        <div class="mode-hint">
                            <span class="mode-hint-zh">挑战你的极限</span>
                            <span class="mode-hint-en">Challenge your limit</span>
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

    init(words, gameMode = 'classic') {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        // 根据模式设置题目数量
        const questionCounts = {
            classic: 20,
            challenge: 30,
            endless: Infinity
        };
        
        // 游戏状态
        this.gameState = {
            words: words,
            questions: [],
            currentQuestionIndex: 0,
            currentCombo: 0,
            maxCombo: 0,
            comboMultiplier: 1.0,
            score: 0,
            baseScore: 10,
            bonusScore: 0,
            correctCount: 0,
            totalQuestions: questionCounts[gameMode],
            wrongCount: 0,
            gameMode: gameMode,
            isPlaying: false,
            comboProtection: false, // 连击保护（10连击后第一次答错不重置）
            comboMilestones: new Set() // 已触发的连击里程碑
        };
        
        // 生成题目
        this.generateQuestions();
        
        // 渲染游戏界面
        this.render();
        
        // 延迟0.5秒后开始游戏
        setTimeout(() => {
            this.startGame();
        }, 500);
    }

    generateQuestions() {
        const { words, totalQuestions } = this.gameState;
        const count = totalQuestions === Infinity ? 50 : totalQuestions; // 无限模式先生成50题
        
        // 随机选择单词
        const selectedWords = this.shuffleArray([...words]);
        if (selectedWords.length < count) {
            // 如果单词不够，循环使用
            while (selectedWords.length < count) {
                selectedWords.push(...this.shuffleArray([...words]));
            }
        }
        
        this.gameState.questions = selectedWords.slice(0, count).map(word => {
            // 生成4个选项（1个正确答案 + 3个干扰项）
            const correctAnswer = word.english_word;
            const wrongAnswers = this.shuffleArray([...words])
                .filter(w => w.english_word !== correctAnswer)
                .slice(0, 3)
                .map(w => w.english_word);
            
            const options = this.shuffleArray([correctAnswer, ...wrongAnswers]);
            
            return {
                word: word,
                question: word.chinese_meaning,
                correctAnswer: correctAnswer,
                options: options,
                answered: false,
                isCorrect: false
            };
        });
    }

    startGame() {
        this.gameState.isPlaying = true;
        this.updateComboDisplay();
    }

    render() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { currentQuestionIndex, questions, score, currentCombo, comboMultiplier, totalQuestions, correctCount, gameMode } = this.gameState;
        
        // 无限模式：检查是否需要生成更多题目
        if (gameMode === 'endless' && currentQuestionIndex >= questions.length - 5) {
            this.generateMoreQuestions();
        }
        
        // 检查游戏是否结束
        if (gameMode === 'endless') {
            if (this.gameState.wrongCount >= 3) {
                this.endGame();
                return;
            }
        } else {
            if (currentQuestionIndex >= totalQuestions) {
                this.endGame();
                return;
            }
        }
        
        const question = questions[currentQuestionIndex];
        const progress = gameMode === 'endless' 
            ? `${currentQuestionIndex}` 
            : `${currentQuestionIndex + 1}/${totalQuestions}`;
        
        container.innerHTML = `
            <div class="combo-rewards-game">
                <div class="game-header">
                    <div class="game-title">
                        <span class="game-title-zh">连击奖励</span>
                        <span class="game-title-en">Combo Rewards</span>
                    </div>
                    <div class="game-stats">
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="score-label">得分</span>
                            <span class="game-stat-value">${score}</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="progress-label">进度</span>
                            <span class="game-stat-value">${progress}</span>
                        </div>
                        ${gameMode === 'endless' ? `
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="wrong-label">错误</span>
                            <span class="game-stat-value">${this.gameState.wrongCount}/3</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="combo-display-container">
                    <div class="combo-display" id="combo-display">
                        <div class="combo-number">${currentCombo}</div>
                        <div class="combo-label" id="combo-label">连击</div>
                    </div>
                    <div class="multiplier-display">
                        <span class="multiplier-label" id="multiplier-label">倍数</span>
                        <span class="multiplier-value">×${comboMultiplier.toFixed(1)}</span>
                    </div>
                    <div class="combo-progress-bar">
                        <div class="combo-progress-fill" id="combo-progress-fill" style="width: ${this.getComboProgress()}%"></div>
                    </div>
                </div>
                
                <div class="game-question-area">
                    <div class="question-number">第 ${currentQuestionIndex + 1} 题</div>
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
        
        // 更新连击显示样式
        this.updateComboDisplay();
        
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
        
        // 处理答题结果
        if (isCorrect) {
            this.handleCorrectAnswer();
        } else {
            this.handleWrongAnswer();
        }
        
        this.gameState.currentQuestionIndex++;
        
        // 显示反馈后继续下一题
        setTimeout(() => {
            if (this.gameState.isPlaying) {
                this.render();
            }
        }, 1200);
    }

    handleCorrectAnswer() {
        this.gameState.currentCombo++;
        this.gameState.correctCount++;
        
        // 更新最高连击
        if (this.gameState.currentCombo > this.gameState.maxCombo) {
            this.gameState.maxCombo = this.gameState.currentCombo;
        }
        
        // 计算得分
        const score = this.calculateScore();
        this.gameState.score += score.baseScore;
        this.gameState.bonusScore += score.bonusScore;
        
        // 更新倍数
        this.gameState.comboMultiplier = this.calculateMultiplier(this.gameState.currentCombo);
        
        // 检查连击里程碑奖励
        this.checkComboMilestone();
        
        // 显示得分动画
        this.showScoreAnimation(score.total);
        
        // 更新连击显示
        this.updateComboDisplay();
    }

    handleWrongAnswer() {
        // 连击保护机制：10连击后第一次答错不重置连击
        if (this.gameState.currentCombo >= 10 && !this.gameState.comboProtection) {
            this.gameState.comboProtection = true;
            // 只扣分，不重置连击
            this.showComboProtection();
        } else {
            // 重置连击
            this.gameState.currentCombo = 0;
            this.gameState.comboMultiplier = 1.0;
            this.gameState.comboProtection = false;
            
            // 无限模式：增加错误计数
            if (this.gameState.gameMode === 'endless') {
                this.gameState.wrongCount++;
            }
        }
        
        // 更新连击显示
        this.updateComboDisplay();
    }

    calculateMultiplier(combo) {
        if (combo >= 30) return 5.0;
        if (combo >= 20) return 4.0;
        if (combo >= 10) return 3.0;
        if (combo >= 5) return 2.0;
        if (combo >= 3) return 1.5;
        return 1.0;
    }

    calculateScore() {
        const { baseScore, currentCombo } = this.gameState;
        const multiplier = this.calculateMultiplier(currentCombo);
        const base = Math.floor(baseScore * multiplier);
        const bonus = this.checkComboBonus(currentCombo);
        
        return {
            baseScore: base,
            bonusScore: bonus,
            total: base + bonus
        };
    }

    checkComboBonus(combo) {
        // 检查是否已经触发过这个里程碑
        if (this.gameState.comboMilestones.has(combo)) {
            return 0;
        }
        
        let bonus = 0;
        if (combo === 5) bonus = 50;
        else if (combo === 10) bonus = 100;
        else if (combo === 20) bonus = 200;
        else if (combo === 30) bonus = 500;
        else if (combo === 50) bonus = 1000;
        
        if (bonus > 0) {
            this.gameState.comboMilestones.add(combo);
        }
        
        return bonus;
    }

    checkComboMilestone() {
        const { currentCombo } = this.gameState;
        const bonus = this.checkComboBonus(currentCombo);
        
        if (bonus > 0) {
            this.showComboMilestone(currentCombo, bonus);
        }
    }

    getComboProgress() {
        const { currentCombo } = this.gameState;
        
        // 计算到下一个倍数等级的进度
        if (currentCombo < 3) return (currentCombo / 3) * 100;
        if (currentCombo < 5) return ((currentCombo - 3) / 2) * 100;
        if (currentCombo < 10) return ((currentCombo - 5) / 5) * 100;
        if (currentCombo < 20) return ((currentCombo - 10) / 10) * 100;
        if (currentCombo < 30) return ((currentCombo - 20) / 10) * 100;
        return 100; // 已达到最高倍数
    }

    updateComboDisplay() {
        const comboDisplay = document.getElementById('combo-display');
        const comboNumber = document.querySelector('.combo-number');
        
        if (!comboDisplay || !comboNumber) return;
        
        const { currentCombo } = this.gameState;
        
        // 根据连击数设置颜色和大小
        comboDisplay.classList.remove('combo-low', 'combo-medium', 'combo-high', 'combo-ultra', 'combo-legendary');
        
        if (currentCombo >= 30) {
            comboDisplay.classList.add('combo-legendary');
        } else if (currentCombo >= 20) {
            comboDisplay.classList.add('combo-ultra');
        } else if (currentCombo >= 10) {
            comboDisplay.classList.add('combo-high');
        } else if (currentCombo >= 5) {
            comboDisplay.classList.add('combo-medium');
        } else {
            comboDisplay.classList.add('combo-low');
        }
        
        // 连击数增加时的动画
        if (currentCombo > 0) {
            comboNumber.style.animation = 'none';
            setTimeout(() => {
                comboNumber.style.animation = 'comboPop 0.3s ease';
            }, 10);
        }
    }

    showScoreAnimation(score) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const scoreEl = document.createElement('div');
        scoreEl.className = 'score-animation';
        scoreEl.textContent = `+${score}`;
        container.appendChild(scoreEl);
        
        setTimeout(() => {
            scoreEl.remove();
        }, 1000);
    }

    showComboMilestone(combo, bonus) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const milestoneEl = document.createElement('div');
        milestoneEl.className = 'combo-milestone';
        milestoneEl.innerHTML = `
            <div class="milestone-combo">${combo} 连击！</div>
            <div class="milestone-bonus">+${bonus} 分奖励</div>
        `;
        container.appendChild(milestoneEl);
        
        setTimeout(() => {
            milestoneEl.remove();
        }, 2500);
    }

    showComboProtection() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const protectionEl = document.createElement('div');
        protectionEl.className = 'combo-protection';
        protectionEl.innerHTML = `
            <div class="protection-text">连击保护！</div>
            <div class="protection-desc">连击未重置</div>
        `;
        container.appendChild(protectionEl);
        
        setTimeout(() => {
            protectionEl.remove();
        }, 2000);
    }

    generateMoreQuestions() {
        const { words, questions } = this.gameState;
        const additionalWords = this.shuffleArray([...words]).slice(0, 20);
        
        additionalWords.forEach(word => {
            const correctAnswer = word.english_word;
            const wrongAnswers = this.shuffleArray([...words])
                .filter(w => w.english_word !== correctAnswer)
                .slice(0, 3)
                .map(w => w.english_word);
            
            const options = this.shuffleArray([correctAnswer, ...wrongAnswers]);
            
            questions.push({
                word: word,
                question: word.chinese_meaning,
                correctAnswer: correctAnswer,
                options: options,
                answered: false,
                isCorrect: false
            });
        });
    }

    endGame() {
        this.gameState.isPlaying = false;
        this.showResult();
    }

    showResult() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { score, bonusScore, correctCount, totalQuestions, maxCombo, currentQuestionIndex, gameMode } = this.gameState;
        const totalScore = score + bonusScore;
        const actualQuestions = gameMode === 'endless' ? currentQuestionIndex : totalQuestions;
        const accuracy = actualQuestions > 0 ? ((correctCount / actualQuestions) * 100).toFixed(0) : 0;
        const avgCombo = actualQuestions > 0 ? (maxCombo / actualQuestions).toFixed(1) : 0;
        
        container.innerHTML = `
            <div class="combo-rewards-result">
                <div class="result-title">
                    <span class="result-title-zh">挑战完成！</span>
                    <span class="result-title-en">Challenge Complete!</span>
                </div>
                
                <div class="result-stats">
                    <div class="result-stat-item">
                        <div class="result-stat-value">${totalScore}</div>
                        <div class="result-stat-label" id="final-score-label">最终得分</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${maxCombo}</div>
                        <div class="result-stat-label" id="max-combo-label">最高连击</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${correctCount}/${actualQuestions}</div>
                        <div class="result-stat-label" id="correct-count-label">答对题数</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${accuracy}%</div>
                        <div class="result-stat-label" id="accuracy-label">正确率</div>
                    </div>
                    ${bonusScore > 0 ? `
                    <div class="result-stat-item">
                        <div class="result-stat-value">${bonusScore}</div>
                        <div class="result-stat-label" id="bonus-label">连击奖励</div>
                    </div>
                    ` : ''}
                    <div class="result-stat-item">
                        <div class="result-stat-value">${avgCombo}</div>
                        <div class="result-stat-label" id="avg-combo-label">平均连击</div>
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
            this.app.loadGameMilestones('combo-rewards');
        });
        
        // 保存游戏记录并更新里程碑
        this.saveRecord().then((success) => {
            if (success) {
                // 保存成功后更新里程碑，延迟确保数据库已更新
                setTimeout(() => {
                    this.app.loadGameMilestones('combo-rewards');
                }, 500);
            }
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    async saveRecord() {
        try {
            const { score, bonusScore, correctCount, currentQuestionIndex, totalQuestions, maxCombo, gameMode } = this.gameState;
            const totalScore = score + bonusScore;
            const actualQuestions = gameMode === 'endless' ? currentQuestionIndex : totalQuestions;
            
            const result = await this.api.saveGameRecord({
                username: 'wendy',
                game_type: 'combo-rewards',
                score: totalScore,
                correct_count: correctCount,
                total_questions: actualQuestions,
                max_combo: maxCombo,
                accuracy: actualQuestions > 0 
                    ? ((correctCount / actualQuestions) * 100).toFixed(2)
                    : 0
            });
            
            if (result && result.success) {
                console.log('✅ 游戏记录已保存:', {
                    game_type: 'combo-rewards',
                    score: totalScore,
                    correct_count: correctCount,
                    total_questions: actualQuestions,
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
    module.exports = ComboRewardsGame;
}

