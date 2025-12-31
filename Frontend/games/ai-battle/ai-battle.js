/**
 * 小语AI对战游戏
 * 独立的游戏逻辑文件
 * 核心机制：玩家与AI（小语）进行答题对战
 */

class AIBattleGame {
    constructor(api, app) {
        this.api = api;
        this.app = app;
        this.gameState = null;
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
    
    // 播放玩家答对音效
    playPlayerCorrectSound() {
        // 上升的音调
        this.createSound(600, 0.1, 'sine', 0.25);
        setTimeout(() => this.createSound(800, 0.1, 'sine', 0.25), 50);
    }
    
    // 播放玩家答错音效
    playPlayerWrongSound() {
        // 低沉的错误音
        this.createSound(300, 0.2, 'sine', 0.2);
    }
    
    // 播放AI答对音效
    playAICorrectSound() {
        // AI答对：稍有不同的音调
        this.createSound(500, 0.1, 'sine', 0.2);
        setTimeout(() => this.createSound(700, 0.1, 'sine', 0.2), 50);
    }
    
    // 播放AI答错音效
    playAIWrongSound() {
        // AI答错：更低的音调
        this.createSound(250, 0.2, 'sine', 0.15);
    }
    
    // 播放玩家获胜音效
    playPlayerWinSound() {
        // 胜利的音阶
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((freq, index) => {
            setTimeout(() => this.createSound(freq, 0.15, 'sine', 0.35), index * 80);
        });
    }
    
    // 播放AI获胜音效
    playAIWinSound() {
        // 失败的下降音调
        const notes = [600, 500, 400, 300];
        notes.forEach((freq, index) => {
            setTimeout(() => this.createSound(freq, 0.2, 'sine', 0.25), index * 100);
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
            console.error('启动AI对战失败:', error);
            this.app.showNotification('启动游戏失败，请稍后重试', 'error');
        }
    }

    showModeSelection(words) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="ai-battle-mode-selection">
                <div class="mode-selection-title">
                    <span class="mode-title-zh">选择对战难度</span>
                    <span class="mode-title-en">Select Battle Difficulty</span>
                </div>
                <div class="mode-options">
                    <div class="mode-card" data-difficulty="easy">
                        <div class="mode-icon">😊</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">简单</span>
                            <span class="mode-name-en">Easy</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">AI准确率: 60-70%</span>
                            <span class="mode-desc-en">AI Accuracy: 60-70%</span>
                        </div>
                        <div class="mode-target">
                            <span class="mode-target-zh">目标: 50分</span>
                            <span class="mode-target-en">Target: 50 points</span>
                        </div>
                    </div>
                    <div class="mode-card" data-difficulty="medium">
                        <div class="mode-icon">😎</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">中等</span>
                            <span class="mode-name-en">Medium</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">AI准确率: 70-80%</span>
                            <span class="mode-desc-en">AI Accuracy: 70-80%</span>
                        </div>
                        <div class="mode-target">
                            <span class="mode-target-zh">目标: 80分</span>
                            <span class="mode-target-en">Target: 80 points</span>
                        </div>
                    </div>
                    <div class="mode-card" data-difficulty="hard">
                        <div class="mode-icon">🔥</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">困难</span>
                            <span class="mode-name-en">Hard</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">AI准确率: 80-90%</span>
                            <span class="mode-desc-en">AI Accuracy: 80-90%</span>
                        </div>
                        <div class="mode-target">
                            <span class="mode-target-zh">目标: 100分</span>
                            <span class="mode-target-en">Target: 100 points</span>
                        </div>
                    </div>
                    <div class="mode-card" data-difficulty="expert">
                        <div class="mode-icon">💎</div>
                        <div class="mode-name">
                            <span class="mode-name-zh">专家</span>
                            <span class="mode-name-en">Expert</span>
                        </div>
                        <div class="mode-desc">
                            <span class="mode-desc-zh">AI准确率: 90-95%</span>
                            <span class="mode-desc-en">AI Accuracy: 90-95%</span>
                        </div>
                        <div class="mode-target">
                            <span class="mode-target-zh">目标: 120分</span>
                            <span class="mode-target-en">Target: 120 points</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 绑定模式选择事件
        container.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const difficulty = card.getAttribute('data-difficulty');
                this.init(words, difficulty);
            });
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    init(words, difficulty = 'medium') {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        // 根据难度设置AI准确率和目标分数
        const difficultySettings = {
            easy: { accuracy: 0.65, targetScore: 50 },
            medium: { accuracy: 0.75, targetScore: 80 },
            hard: { accuracy: 0.85, targetScore: 100 },
            expert: { accuracy: 0.92, targetScore: 120 }
        };
        
        const settings = difficultySettings[difficulty];
        
        // 游戏状态
        this.gameState = {
            words: words,
            questions: [],
            currentQuestionIndex: 0,
            player: {
                score: 0,
                health: 100,
                correctCount: 0,
                totalQuestions: 0,
                currentCombo: 0,
                maxCombo: 0
            },
            ai: {
                score: 0,
                health: 100,
                correctCount: 0,
                totalQuestions: 0,
                accuracy: settings.accuracy,
                currentCombo: 0,
                maxCombo: 0
            },
            difficulty: difficulty,
            targetScore: settings.targetScore,
            currentTurn: 'player', // player 或 ai
            isPlaying: false,
            round: 1,
            gameMode: 'turn-based' // 回合制
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
        const { words } = this.gameState;
        // 生成足够多的题目（至少50题）
        const questionCount = Math.max(50, words.length * 2);
        const selectedWords = this.shuffleArray([...words]);
        
        // 如果单词不够，循环使用
        while (selectedWords.length < questionCount) {
            selectedWords.push(...this.shuffleArray([...words]));
        }
        
        this.gameState.questions = selectedWords.slice(0, questionCount).map(word => {
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
        this.render();
    }

    render() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { player, ai, currentQuestionIndex, questions, currentTurn, round, targetScore, difficulty } = this.gameState;
        
        // 检查游戏是否结束
        if (this.checkGameOver()) {
            return;
        }
        
        const question = questions[currentQuestionIndex];
        const playerHealthPercent = (player.health / 100) * 100;
        const aiHealthPercent = (ai.health / 100) * 100;
        
        container.innerHTML = `
            <div class="ai-battle-game">
                <div class="game-header">
                    <div class="game-title">
                        <span class="game-title-zh">小语AI对战</span>
                        <span class="game-title-en">AI Battle</span>
                    </div>
                    <div class="game-stats">
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="round-label">回合</span>
                            <span class="game-stat-value">${round}</span>
                        </div>
                        <div class="game-stat-item">
                            <span class="game-stat-label" id="target-label">目标</span>
                            <span class="game-stat-value">${targetScore}</span>
                        </div>
                    </div>
                </div>
                
                <div class="battle-area">
                    <div class="battle-player ${currentTurn === 'player' ? 'active' : ''}" id="player-area">
                        <div class="player-header">
                            <div class="player-avatar">👤</div>
                            <div class="player-name">
                                <span class="player-name-zh">温蒂</span>
                                <span class="player-name-en">Wendy</span>
                            </div>
                        </div>
                        <div class="player-health">
                            <div class="health-label" id="player-health-label">生命值</div>
                            <div class="health-bar">
                                <div class="health-fill player-health-fill" style="width: ${playerHealthPercent}%"></div>
                                <div class="health-text">${player.health}/100</div>
                            </div>
                        </div>
                        <div class="player-score">
                            <div class="score-label" id="player-score-label">得分</div>
                            <div class="score-value">${player.score}</div>
                        </div>
                        <div class="player-stats">
                            <div class="stat-item">
                                <span class="stat-label" id="player-correct-label">答对</span>
                                <span class="stat-value">${player.correctCount}/${player.totalQuestions}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label" id="player-combo-label">连击</span>
                                <span class="stat-value">${player.currentCombo}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="battle-vs">VS</div>
                    
                    <div class="battle-ai ${currentTurn === 'ai' ? 'active' : ''}" id="ai-area">
                        <div class="player-header">
                            <div class="player-avatar">🤖</div>
                            <div class="player-name">
                                <span class="player-name-zh">小语</span>
                                <span class="player-name-en">Xiao Yu</span>
                            </div>
                        </div>
                        <div class="player-health">
                            <div class="health-label" id="ai-health-label">生命值</div>
                            <div class="health-bar">
                                <div class="health-fill ai-health-fill" style="width: ${aiHealthPercent}%"></div>
                                <div class="health-text">${ai.health}/100</div>
                            </div>
                        </div>
                        <div class="player-score">
                            <div class="score-label" id="ai-score-label">得分</div>
                            <div class="score-value">${ai.score}</div>
                        </div>
                        <div class="player-stats">
                            <div class="stat-item">
                                <span class="stat-label" id="ai-correct-label">答对</span>
                                <span class="stat-value">${ai.correctCount}/${ai.totalQuestions}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label" id="ai-combo-label">连击</span>
                                <span class="stat-value">${ai.currentCombo}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="question-area">
                    <div class="question-header">
                        <div class="question-number">第 ${currentQuestionIndex + 1} 题</div>
                        <div class="current-turn" id="current-turn-display">
                            ${currentTurn === 'player' ? 
                                '<span class="turn-text-zh">你的回合</span><span class="turn-text-en">Your Turn</span>' : 
                                '<span class="turn-text-zh">小语的回合</span><span class="turn-text-en">AI Turn</span>'}
                        </div>
                    </div>
                    <div class="question-text">${question.question}</div>
                    <div class="question-hint" id="question-hint">请选择对应的英文单词</div>
                </div>
                
                ${currentTurn === 'player' ? `
                <div class="game-options">
                    ${question.options.map((option, index) => `
                        <button class="game-option-btn" data-option="${option}" data-index="${index}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
                ` : `
                <div class="ai-thinking" id="ai-thinking">
                    <div class="thinking-text">
                        <span class="thinking-text-zh">小语正在思考...</span>
                        <span class="thinking-text-en">AI is thinking...</span>
                    </div>
                    <div class="thinking-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                `}
            </div>
        `;
        
        // 如果是玩家回合，绑定选项点击事件
        if (currentTurn === 'player') {
            container.querySelectorAll('.game-option-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (!this.gameState.isPlaying) return;
                    const selectedAnswer = e.target.getAttribute('data-option');
                    this.handlePlayerAnswer(selectedAnswer, question);
                });
            });
        } else {
            // AI回合，自动答题
            this.handleAITurn(question);
        }
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    handlePlayerAnswer(selectedAnswer, question) {
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
        
        // 处理玩家答题结果
        this.processPlayerAnswer(isCorrect);
        
        // 显示反馈后切换到AI回合
        setTimeout(() => {
            this.gameState.currentQuestionIndex++;
            this.gameState.currentTurn = 'ai';
            this.gameState.round++;
            this.render();
        }, 1500);
    }

    processPlayerAnswer(isCorrect) {
        const { player } = this.gameState;
        player.totalQuestions++;
        
        if (isCorrect) {
            player.score += 10;
            player.correctCount++;
            player.currentCombo++;
            if (player.currentCombo > player.maxCombo) {
                player.maxCombo = player.currentCombo;
            }
            
            // 播放玩家答对音效
            this.playPlayerCorrectSound();
            
            // 播放玩家答对音效
            this.playPlayerCorrectSound();
            
            // 连击奖励
            this.checkComboReward('player');
            
            // 显示得分动画
            this.showScoreAnimation('player', 10);
        } else {
            player.currentCombo = 0;
            player.health = Math.max(0, player.health - 10);
            // 播放玩家答错音效
            this.playPlayerWrongSound();
            this.showHealthChange('player', -10);
        }
    }

    async handleAITurn(question) {
        // 显示AI思考中
        this.showAIThinking();
        
        // 模拟AI思考时间（1-3秒）
        const thinkTime = 1000 + Math.random() * 2000;
        await this.sleep(thinkTime);
        
        // AI答题
        const result = await this.aiAnswer(question);
        
        // 隐藏思考提示
        this.hideAIThinking();
        
        // 处理AI答题结果
        this.processAIAnswer(result, question);
        
        // 显示反馈后切换到玩家回合
        setTimeout(() => {
            this.gameState.currentQuestionIndex++;
            this.gameState.currentTurn = 'player';
            this.gameState.round++;
            this.render();
        }, 2000);
    }

    async aiAnswer(question) {
        const { ai } = this.gameState;
        
        // 根据AI准确率决定是否答对
        const shouldAnswerCorrectly = Math.random() < ai.accuracy;
        
        if (shouldAnswerCorrectly) {
            // AI答对
            return {
                answer: question.correctAnswer,
                isCorrect: true
            };
        } else {
            // AI答错，随机选择一个错误答案
            const wrongAnswers = question.options.filter(opt => opt !== question.correctAnswer);
            return {
                answer: wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)],
                isCorrect: false
            };
        }
    }

    processAIAnswer(result, question) {
        const { ai } = this.gameState;
        ai.totalQuestions++;
        
        // 显示AI的选择
        this.showAIAnswer(question, result.answer);
        
        if (result.isCorrect) {
            ai.score += 10;
            ai.correctCount++;
            ai.currentCombo++;
            if (ai.currentCombo > ai.maxCombo) {
                ai.maxCombo = ai.currentCombo;
            }
            
            // 播放AI答对音效
            this.playAICorrectSound();
            
            // 连击奖励
            this.checkComboReward('ai');
            
            // 显示得分动画
            this.showScoreAnimation('ai', 10);
        } else {
            ai.currentCombo = 0;
            ai.health = Math.max(0, ai.health - 10);
            // 播放AI答错音效
            this.playAIWrongSound();
            this.showHealthChange('ai', -10);
        }
    }

    showAIAnswer(question, answer) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const answerEl = document.createElement('div');
        answerEl.className = 'ai-answer-display';
        answerEl.innerHTML = `
            <div class="ai-answer-text">
                <span class="ai-answer-text-zh">小语选择了: ${answer}</span>
                <span class="ai-answer-text-en">AI chose: ${answer}</span>
            </div>
        `;
        container.appendChild(answerEl);
        
        setTimeout(() => {
            answerEl.remove();
        }, 2000);
    }

    checkComboReward(side) {
        const entity = this.gameState[side];
        const { currentCombo } = entity;
        
        let comboBonus = 0;
        if (currentCombo >= 10) comboBonus = 20;
        else if (currentCombo >= 5) comboBonus = 10;
        else if (currentCombo >= 3) comboBonus = 5;
        
        if (comboBonus > 0) {
            entity.score += comboBonus;
            this.showComboReward(side, currentCombo, comboBonus);
        }
    }

    showComboReward(side, combo, bonus) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const rewardEl = document.createElement('div');
        rewardEl.className = `combo-reward ${side}-combo-reward`;
        rewardEl.innerHTML = `
            <div class="combo-reward-text">${combo} 连击！</div>
            <div class="combo-reward-bonus">+${bonus} 分</div>
        `;
        container.appendChild(rewardEl);
        
        setTimeout(() => {
            rewardEl.remove();
        }, 2000);
    }

    showScoreAnimation(side, score) {
        const area = document.getElementById(`${side}-area`);
        if (!area) return;
        
        const scoreEl = document.createElement('div');
        scoreEl.className = `score-animation ${side}-score-animation`;
        scoreEl.textContent = `+${score}`;
        area.appendChild(scoreEl);
        
        setTimeout(() => {
            scoreEl.remove();
        }, 1000);
    }

    showHealthChange(side, change) {
        const area = document.getElementById(`${side}-area`);
        if (!area) return;
        
        const healthEl = document.createElement('div');
        healthEl.className = `health-change ${side}-health-change`;
        healthEl.textContent = change < 0 ? `${change}` : `+${change}`;
        area.appendChild(healthEl);
        
        setTimeout(() => {
            healthEl.remove();
        }, 1000);
    }

    showAIThinking() {
        const thinkingEl = document.getElementById('ai-thinking');
        if (thinkingEl) {
            thinkingEl.style.display = 'block';
        }
    }

    hideAIThinking() {
        const thinkingEl = document.getElementById('ai-thinking');
        if (thinkingEl) {
            thinkingEl.style.display = 'none';
        }
    }

    checkGameOver() {
        const { player, ai, targetScore } = this.gameState;
        
        // 检查分数
        if (player.score >= targetScore) {
            this.endGame('player');
            return true;
        }
        if (ai.score >= targetScore) {
            this.endGame('ai');
            return true;
        }
        
        // 检查生命值
        if (player.health <= 0) {
            this.endGame('ai');
            return true;
        }
        if (ai.health <= 0) {
            this.endGame('player');
            return true;
        }
        
        return false;
    }

    endGame(winner) {
        this.gameState.isPlaying = false;
        // 播放游戏结束音效
        if (winner === 'player') {
            this.playPlayerWinSound();
        } else {
            this.playAIWinSound();
        }
        this.showResult(winner);
    }

    showResult(winner) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { player, ai, round, targetScore } = this.gameState;
        const playerAccuracy = player.totalQuestions > 0 ? ((player.correctCount / player.totalQuestions) * 100).toFixed(0) : 0;
        const aiAccuracy = ai.totalQuestions > 0 ? ((ai.correctCount / ai.totalQuestions) * 100).toFixed(0) : 0;
        const isPlayerWin = winner === 'player';
        
        container.innerHTML = `
            <div class="ai-battle-result">
                <div class="result-title">
                    ${isPlayerWin ? 
                        '<span class="result-title-zh">恭喜获胜！</span><span class="result-title-en">Congratulations!</span>' : 
                        '<span class="result-title-zh">小语获胜</span><span class="result-title-en">AI Wins</span>'}
                </div>
                
                <div class="result-comparison">
                    <div class="comparison-item player-result">
                        <div class="comparison-avatar">👤</div>
                        <div class="comparison-name">
                            <span class="comparison-name-zh">温蒂</span>
                            <span class="comparison-name-en">Wendy</span>
                        </div>
                        <div class="comparison-score">${player.score} 分</div>
                        <div class="comparison-accuracy">${playerAccuracy}% 正确率</div>
                        <div class="comparison-combo">最高连击: ${player.maxCombo}</div>
                    </div>
                    
                    <div class="comparison-vs">VS</div>
                    
                    <div class="comparison-item ai-result">
                        <div class="comparison-avatar">🤖</div>
                        <div class="comparison-name">
                            <span class="comparison-name-zh">小语</span>
                            <span class="comparison-name-en">Xiao Yu</span>
                        </div>
                        <div class="comparison-score">${ai.score} 分</div>
                        <div class="comparison-accuracy">${aiAccuracy}% 正确率</div>
                        <div class="comparison-combo">最高连击: ${ai.maxCombo}</div>
                    </div>
                </div>
                
                <div class="result-stats">
                    <div class="result-stat-item">
                        <div class="result-stat-value">${round}</div>
                        <div class="result-stat-label" id="total-rounds-label">总回合数</div>
                    </div>
                    <div class="result-stat-item">
                        <div class="result-stat-value">${player.totalQuestions + ai.totalQuestions}</div>
                        <div class="result-stat-label" id="total-questions-label">总答题数</div>
                    </div>
                </div>
                
                <div class="result-actions">
                    <button class="result-btn" id="play-again-btn">再战一局</button>
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
            this.app.loadGameMilestones('ai-battle');
        });
        
        // 保存游戏记录并更新里程碑
        this.saveRecord(winner).then((success) => {
            if (success) {
                setTimeout(() => {
                    this.app.loadGameMilestones('ai-battle');
                }, 500);
            }
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    async saveRecord(winner) {
        try {
            const { player, ai, round } = this.gameState;
            const isPlayerWin = winner === 'player';
            
            const result = await this.api.saveGameRecord({
                username: 'wendy',
                game_type: 'ai-battle',
                score: isPlayerWin ? player.score : ai.score,
                correct_count: isPlayerWin ? player.correctCount : ai.correctCount,
                total_questions: player.totalQuestions + ai.totalQuestions,
                max_combo: Math.max(player.maxCombo, ai.maxCombo),
                accuracy: player.totalQuestions > 0 
                    ? ((player.correctCount / player.totalQuestions) * 100).toFixed(2)
                    : 0
            });
            
            if (result && result.success) {
                console.log('✅ 游戏记录已保存:', {
                    game_type: 'ai-battle',
                    winner: winner,
                    player_score: player.score,
                    ai_score: ai.score
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

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
    module.exports = AIBattleGame;
}

