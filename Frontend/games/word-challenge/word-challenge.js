/**
 * 单词挑战游戏
 * 独立的游戏逻辑文件
 */

class WordChallengeGame {
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
            
            // 初始化单词挑战游戏
            this.init(words);
        } catch (error) {
            console.error('启动单词挑战失败:', error);
            this.app.showNotification('启动游戏失败，请稍后重试', 'error');
        }
    }

    init(words) {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        // 游戏状态
        this.gameState = {
            words: words,
            currentQuestionIndex: 0,
            score: 0,
            correctCount: 0,
            totalQuestions: Math.min(10, words.length), // 最多10题
            currentCombo: 0,
            maxCombo: 0,
            questions: []
        };
        
        // 生成题目
        this.generateQuestions();
        
        // 渲染游戏界面
        this.render();
    }

    generateQuestions() {
        const { words, totalQuestions } = this.gameState;
        const selectedWords = this.shuffleArray([...words]).slice(0, totalQuestions);
        
        this.gameState.questions = selectedWords.map(word => {
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

    render() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { currentQuestionIndex, questions, score, currentCombo, totalQuestions } = this.gameState;
        
        if (currentQuestionIndex >= questions.length) {
            // 游戏结束
            this.showResult();
            return;
        }
        
        const question = questions[currentQuestionIndex];
        const progress = ((currentQuestionIndex + 1) / totalQuestions * 100).toFixed(0);
        
        container.innerHTML = `
            <div class="word-challenge-game">
                <div class="game-header">
                    <div class="game-title">
                        <span class="game-title-zh">单词挑战</span>
                        <span class="game-title-en">Word Challenge</span>
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
                            <span class="game-stat-label" id="progress-label">进度</span>
                            <span class="game-stat-value">${currentQuestionIndex + 1}/${totalQuestions}</span>
                        </div>
                    </div>
                </div>
                
                <div class="game-progress-bar">
                    <div class="game-progress-fill" style="width: ${progress}%"></div>
                </div>
                
                <div class="game-question-area">
                    <div class="question-number">第 ${currentQuestionIndex + 1} 题</div>
                    <div class="question-text">${question.question}</div>
                    <div class="question-hint">请选择对应的英文单词</div>
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
                const selectedAnswer = e.target.getAttribute('data-option');
                this.handleAnswer(selectedAnswer, question);
            });
        });
        
        // 更新语言显示
        this.app.updateGameLanguage();
    }

    handleAnswer(selectedAnswer, question) {
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
            if (this.gameState.currentCombo > this.gameState.maxCombo) {
                this.gameState.maxCombo = this.gameState.currentCombo;
            }
            
            // 连击奖励
            let comboBonus = 0;
            if (this.gameState.currentCombo >= 20) comboBonus = 100;
            else if (this.gameState.currentCombo >= 10) comboBonus = 50;
            else if (this.gameState.currentCombo >= 5) comboBonus = 25;
            else if (this.gameState.currentCombo >= 3) comboBonus = 10;
            
            if (comboBonus > 0) {
                this.gameState.score += comboBonus;
                this.showComboReward(this.gameState.currentCombo, comboBonus);
            }
        } else {
            this.gameState.currentCombo = 0;
        }
        
        // 显示反馈
        setTimeout(() => {
            this.gameState.currentQuestionIndex++;
            this.render();
        }, 1500);
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

    showResult() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const { score, correctCount, totalQuestions, maxCombo } = this.gameState;
        const accuracy = ((correctCount / totalQuestions) * 100).toFixed(0);
        
        container.innerHTML = `
            <div class="word-challenge-result">
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
            this.app.loadGameMilestones('word-challenge');
        });
        
        // 保存游戏记录并更新里程碑
        this.saveRecord().then((success) => {
            if (success) {
                // 保存成功后更新里程碑，延迟确保数据库已更新
                setTimeout(() => {
                    this.app.loadGameMilestones('word-challenge');
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
                game_type: 'word-challenge',
                score: this.gameState.score,
                correct_count: this.gameState.correctCount,
                total_questions: this.gameState.totalQuestions,
                max_combo: this.gameState.maxCombo,
                accuracy: ((this.gameState.correctCount / this.gameState.totalQuestions) * 100).toFixed(2)
            });
            
            if (result && result.success) {
                console.log('✅ 游戏记录已保存:', {
                    game_type: 'word-challenge',
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
    module.exports = WordChallengeGame;
}

