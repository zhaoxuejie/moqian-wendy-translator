/**
 * 温蒂翻译助手 API 客户端
 * 处理与后端API的所有通信
 */

class WendyAPI {
    constructor(baseURL = 'http://localhost:5000') {
        this.baseURL = baseURL;
        this.username = 'wendy'; // 默认用户名
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    // ====== 用户管理 ======
    async getUserProfile() {
        return await this.request(`/api/user/profile?username=${this.username}`);
    }

    async updateUserProfile(profileData) {
        return await this.request('/api/user/profile', {
            method: 'POST',
            body: JSON.stringify({
                username: this.username,
                ...profileData
            })
        });
    }

    // ====== 翻译功能 ======
    async translateText(text, options = {}) {
        return await this.request('/api/translate', {
            method: 'POST',
            body: JSON.stringify({
                text: text,
                username: this.username,
                source_language: options.sourceLanguage || 'auto',
                target_language: options.targetLanguage || 'zh',
                input_method: options.inputMethod || 'text'
            })
        });
    }

    // ====== 单词本管理 ======
    async getWordbook() {
        return await this.request(`/api/wordbook?username=${this.username}`);
    }

    async addToWordbook(wordData) {
        return await this.request('/api/wordbook', {
            method: 'POST',
            body: JSON.stringify({
                username: this.username,
                ...wordData
            })
        });
    }

    async updateWordMastery(wordId, masteryLevel) {
        return await this.request(`/api/wordbook/${wordId}`, {
            method: 'PUT',
            body: JSON.stringify({
                username: this.username,
                mastery_level: masteryLevel
            })
        });
    }

    async deleteWord(wordId) {
        return await this.request(`/api/wordbook/${wordId}?username=${this.username}`, {
            method: 'DELETE'
        });
    }

    // ====== 学习进度 ======
    async getLearningProgress() {
        return await this.request(`/api/progress?username=${this.username}`);
    }

    async getAchievements() {
        return await this.request(`/api/achievements?username=${this.username}`);
    }
}

// 创建全局API实例
const wendyAPI = new WendyAPI();

// 前端应用管理器
class WendyApp {
    constructor() {
        this.api = wendyAPI;
        this.currentLanguage = 'zh';
        this.wordDatabase = [];
        this.userProfile = null;
        this.learningProgress = null;
    }

    // 初始化应用
    async init() {
        try {
            await this.loadUserProfile();
            await this.loadWordbook();
            await this.loadLearningProgress();
            this.setupEventListeners();
            this.applyUserSettings();
            console.log('✅ 温蒂翻译助手初始化完成');
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            this.showNotification('应用初始化失败，请检查网络连接', 'error');
        }
    }

    // 加载用户资料
    async loadUserProfile() {
        try {
            const response = await this.api.getUserProfile();
            if (response.success) {
                this.userProfile = response.user;
                console.log('用户资料加载成功:', this.userProfile);
            }
        } catch (error) {
            console.error('加载用户资料失败:', error);
        }
    }

    // 加载单词本
    async loadWordbook() {
        try {
            const response = await this.api.getWordbook();
            if (response.success) {
                this.wordDatabase = response.words;
                this.renderWordbook();
                console.log(`加载了 ${response.total} 个单词`);
            }
        } catch (error) {
            console.error('加载单词本失败:', error);
        }
    }

    // 加载学习进度
    async loadLearningProgress() {
        try {
            const response = await this.api.getLearningProgress();
            if (response.success) {
                this.learningProgress = response.progress;
                this.updateProgressDisplay();
                console.log('学习进度加载成功:', this.learningProgress);
            }
        } catch (error) {
            console.error('加载学习进度失败:', error);
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 翻译按钮
        const translateBtn = document.getElementById('translate-btn');
        if (translateBtn) {
            translateBtn.addEventListener('click', () => this.handleTranslation());
        }

        // 添加到单词本按钮
        const addToWordbookBtn = document.getElementById('add-to-wordbook-btn');
        if (addToWordbookBtn) {
            addToWordbookBtn.addEventListener('click', () => this.handleAddToWordbook());
        }

        // 语言选择
        document.querySelectorAll('.language-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const lang = e.target.getAttribute('data-lang');
                this.changeLanguage(lang);
            });
        });

        // 主题选择
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.getAttribute('data-theme');
                this.changeTheme(theme);
            });
        });

        // 头像选择
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const avatar = e.currentTarget.getAttribute('data-avatar');
                this.changeAvatar(avatar);
            });
        });

        // 音量控制
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.updateVolume(e.target.value);
            });
        }

        // 语音输入
        document.querySelector('[data-input="voice"]').addEventListener('click', () => {
            this.simulateVoiceInput();
        });

        // 相机输入
        document.querySelector('[data-input="camera"]').addEventListener('click', () => {
            this.simulateCameraInput();
        });
    }

    // 处理翻译
    async handleTranslation() {
        const inputElement = document.getElementById('translate-input');
        const text = inputElement.value.trim();
        
        if (!text) {
            this.showNotification('请输入要翻译的文本', 'warning');
            return;
        }

        // 显示加载状态
        const translateBtn = document.getElementById('translate-btn');
        const originalText = translateBtn.innerHTML;
        translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 翻译中...';
        translateBtn.disabled = true;

        try {
            const result = await this.api.translateText(text);
            
            if (result.success) {
                this.displayTranslationResult(result);
                
                // 显示结果区域
                const resultSection = document.getElementById('translation-result');
                resultSection.classList.add('active');
                
                this.showNotification('翻译完成！', 'success');
            }
        } catch (error) {
            this.showNotification('翻译失败: ' + error.message, 'error');
        } finally {
            // 恢复按钮状态
            translateBtn.innerHTML = originalText;
            translateBtn.disabled = false;
        }
    }

    // 显示翻译结果
    displayTranslationResult(result) {
        const resultContent = document.querySelector('.result-content');
        resultContent.innerHTML = `
            <div class="translation-item">
                <div class="add-to-wordbook" title="添加到单词本" onclick="wendyApp.handleAddToWordbook()">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="original-text">${result.original_text}</div>
                <div class="translated-text">${result.translated_text}</div>
                <div class="pronunciation">
                    ${result.pronunciation || ''}
                    <div class="speaker-btn" title="朗读" onclick="wendyApp.speakText('${result.original_text}')">
                        <i class="fas fa-volume-up"></i>
                    </div>
                </div>
                ${result.example_sentence ? `
                <div class="example-sentence">${result.example_sentence}${result.example_translation ? ' ' + result.example_translation : ''}</div>
                ` : ''}
            </div>
        `;
        
        // 保存当前翻译结果到实例
        this.currentTranslation = result;
    }

    // 处理添加到单词本
    async handleAddToWordbook() {
        if (!this.currentTranslation) {
            this.showNotification('没有可添加的翻译结果', 'warning');
            return;
        }

        const wordData = {
            english_word: this.currentTranslation.original_text,
            chinese_meaning: this.currentTranslation.translated_text,
            pronunciation: this.currentTranslation.pronunciation || '',
            example_sentence: this.currentTranslation.example_sentence || '',
            example_translation: this.currentTranslation.example_translation || ''
        };

        try {
            const result = await this.api.addToWordbook(wordData);
            if (result.success) {
                this.showNotification('单词已添加到单词本！', 'success');
                // 重新加载单词本
                await this.loadWordbook();
            }
        } catch (error) {
            if (error.message.includes('已在单词本中')) {
                this.showNotification('单词已在单词本中', 'info');
            } else {
                this.showNotification('添加失败: ' + error.message, 'error');
            }
        }
    }

    // 渲染单词本
    renderWordbook() {
        const wordbookContainer = document.getElementById('wordbook-container');
        if (!wordbookContainer) return;

        wordbookContainer.innerHTML = '';

        this.wordDatabase.forEach((word, index) => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.innerHTML = `
                <div class="word">${word.english_word}</div>
                <div class="meaning">${word.chinese_meaning}</div>
                <div class="stars" data-word-id="${word.id}">
                    ${this.getStarsHTML(word.mastery_level)}
                </div>
            `;
            wordbookContainer.appendChild(wordItem);
        });

        // 添加星星点击事件
        wordbookContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const starContainer = e.target.parentElement;
                const wordId = parseInt(starContainer.getAttribute('data-word-id'));
                const starIndex = Array.from(starContainer.children).indexOf(e.target);
                this.updateWordMastery(wordId, starIndex + 1);
            }
        });
    }

    // 更新单词掌握程度
    async updateWordMastery(wordId, masteryLevel) {
        try {
            const result = await this.api.updateWordMastery(wordId, masteryLevel);
            if (result.success) {
                // 更新本地数据
                const word = this.wordDatabase.find(w => w.id === wordId);
                if (word) {
                    word.mastery_level = masteryLevel;
                    // 更新星星显示
                    const starsContainer = document.querySelector(`[data-word-id="${wordId}"]`);
                    if (starsContainer) {
                        starsContainer.innerHTML = this.getStarsHTML(masteryLevel);
                    }
                }

                // 如果达到3星，显示祝贺
                if (masteryLevel === 3) {
                    this.showCongratulation();
                }
            }
        } catch (error) {
            this.showNotification('更新失败: ' + error.message, 'error');
        }
    }

    // 生成星星HTML
    getStarsHTML(mastery) {
        let starsHTML = '';
        for (let i = 0; i < 3; i++) {
            if (i < mastery) {
                starsHTML += '<i class="fas fa-star star active"></i>';
            } else {
                starsHTML += '<i class="far fa-star star"></i>';
            }
        }
        return starsHTML;
    }

    // 更新进度显示
    updateProgressDisplay() {
        if (!this.learningProgress) return;

        // 更新里程碑显示
        const milestoneText = document.getElementById('milestone-text');
        if (milestoneText) {
            milestoneText.innerHTML = `已学会 <strong>${this.learningProgress.total_words}</strong> 个单词，继续加油！`;
        }

        // 更新进度条
        const progressBar = document.querySelector('.progress');
        if (progressBar) {
            const progress = Math.min((this.learningProgress.total_words / 50) * 100, 100);
            progressBar.style.width = `${progress}%`;
        }

        // 更新成长记录
        const streakText = document.getElementById('streak-text');
        if (streakText) {
            streakText.textContent = `连续学习 ${this.learningProgress.streak_days} 天`;
        }

        const badgesText = document.getElementById('badges-text');
        if (badgesText) {
            badgesText.textContent = `已获得 ${this.learningProgress.achievements_count} 枚成就徽章`;
        }

        const monthlyText = document.getElementById('monthly-text');
        if (monthlyText) {
            monthlyText.textContent = `本月学习 ${this.learningProgress.words_this_month} 个新单词`;
        }
    }

    // 应用用户设置
    applyUserSettings() {
        if (!this.userProfile) return;

        // 应用主题
        if (this.userProfile.theme) {
            this.changeTheme(this.userProfile.theme);
        }

        // 应用头像
        if (this.userProfile.avatar) {
            const avatarImg = document.getElementById('assistant-avatar');
            if (avatarImg) {
                avatarImg.src = this.userProfile.avatar;
            }
        }

        // 应用语言
        if (this.userProfile.language) {
            this.changeLanguage(this.userProfile.language);
        }

        // 应用音量
        if (this.userProfile.volume !== undefined) {
            const volumeSlider = document.getElementById('volume-slider');
            if (volumeSlider) {
                volumeSlider.value = this.userProfile.volume;
            }
        }
    }

    // 改变语言
    async changeLanguage(lang) {
        this.currentLanguage = lang;
        
        // 更新界面语言（使用原有的多语言系统）
        if (typeof updateLanguage === 'function') {
            updateLanguage(lang);
        }

        // 更新选中状态
        document.querySelectorAll('.language-option').forEach(option => {
            if (option.getAttribute('data-lang') === lang) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        // 保存到服务器
        try {
            await this.api.updateUserProfile({ language: lang });
        } catch (error) {
            console.error('保存语言设置失败:', error);
        }
    }

    // 改变主题
    async changeTheme(theme) {
        document.body.className = `theme-${theme}`;
        
        // 更新选中状态
        document.querySelectorAll('.theme-option').forEach(option => {
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        // 保存到服务器
        try {
            await this.api.updateUserProfile({ theme: theme });
        } catch (error) {
            console.error('保存主题设置失败:', error);
        }
    }

    // 改变头像
    async changeAvatar(avatar) {
        const avatarImg = document.getElementById('assistant-avatar');
        if (avatarImg) {
            avatarImg.src = avatar;
        }

        // 更新选中状态
        document.querySelectorAll('.avatar-option').forEach(option => {
            if (option.getAttribute('data-avatar') === avatar) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        // 保存到服务器
        try {
            await this.api.updateUserProfile({ avatar: avatar });
        } catch (error) {
            console.error('保存头像设置失败:', error);
        }
    }

    // 更新音量
    async updateVolume(volume) {
        // 保存到服务器
        try {
            await this.api.updateUserProfile({ volume: parseInt(volume) });
        } catch (error) {
            console.error('保存音量设置失败:', error);
        }
    }

    // 语音朗读
    speakText(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        const volumeSlider = document.getElementById('volume-slider');
        utterance.volume = volumeSlider ? volumeSlider.value / 100 : 0.5;
        speechSynthesis.speak(utterance);
    }

    // 模拟语音输入
    simulateVoiceInput() {
        const textarea = document.getElementById('translate-input');
        const sampleTexts = [
            'Hello, how are you?',
            'I like apples',
            'The weather is nice today',
            'What is your name?'
        ];
        const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        textarea.value = randomText;
        this.showNotification('语音输入已识别', 'info');
    }

    // 模拟相机输入
    simulateCameraInput() {
        const textarea = document.getElementById('translate-input');
        const sampleWords = ['apple', 'cat', 'sun', 'book', 'flower'];
        const randomWord = sampleWords[Math.floor(Math.random() * sampleWords.length)];
        textarea.value = randomWord;
        this.showNotification('图片文字已识别', 'info');
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        const notificationIcon = notification.querySelector('i');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            
            // 设置图标和颜色
            notificationIcon.className = 'fas ';
            switch (type) {
                case 'success':
                    notificationIcon.className += 'fa-check-circle';
                    notificationIcon.style.color = '#4CAF50';
                    break;
                case 'error':
                    notificationIcon.className += 'fa-exclamation-circle';
                    notificationIcon.style.color = '#f44336';
                    break;
                case 'warning':
                    notificationIcon.className += 'fa-exclamation-triangle';
                    notificationIcon.style.color = '#ff9800';
                    break;
                default:
                    notificationIcon.className += 'fa-bell';
                    notificationIcon.style.color = '#2196F3';
            }
            
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }

    // 显示祝贺消息
    showCongratulation() {
        const congratulation = document.getElementById('congratulation');
        if (congratulation) {
            congratulation.classList.add('show');
            
            setTimeout(() => {
                congratulation.classList.remove('show');
            }, 3000);
        }
    }
}

// 创建全局应用实例
let wendyApp;

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    wendyApp = new WendyApp();
    wendyApp.init();
});