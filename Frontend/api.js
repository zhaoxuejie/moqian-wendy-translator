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

    // ====== AI对话功能 ======
    async chatWithAI(message, context = '') {
        return await this.request('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                username: this.username,
                message: message,
                context: context
            })
        });
    }

    // ====== 鼓励话语 ======
    async getEncouragement() {
        return await this.request('/api/encouragement');
    }

    // ====== 图片服务 ======
    async getWordImage(keyword, lang = 'zh', perPage = 3) {
        return await this.request(`/api/word/image?keyword=${encodeURIComponent(keyword)}&lang=${lang}&per_page=${perPage}`);
    }

    async recognizeOCR(imageFile, language = 'ENG', accurate = false) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('language', language);
        formData.append('accurate', accurate.toString());
        
        const response = await fetch('/api/ocr/recognize', {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    }

    // ====== 游戏服务 ======
    async getGameStats(username = 'wendy', gameType = null) {
        let url = `/api/games/stats?username=${encodeURIComponent(username)}`;
        if (gameType) {
            url += `&game_type=${encodeURIComponent(gameType)}`;
        }
        return await this.request(url);
    }

    async saveGameRecord(recordData) {
        return await this.request('/api/games/record', {
            method: 'POST',
            body: JSON.stringify(recordData)
        });
    }

    // ====== 单词详情服务 ======
    async getWordDetail(word) {
        return await this.request(`/api/word/detail?word=${encodeURIComponent(word)}`);
    }

    async saveWordDetail(detailData) {
        return await this.request('/api/word/detail', {
            method: 'POST',
            body: JSON.stringify(detailData)
        });
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
        this.selectedVoiceName = ''; // 用户选择的语音名称
        this.selectedVoiceLang = ''; // 用户选择的语音语言
        this.availableVoices = []; // 可用的语音列表
        this.currentGamePage = 1; // 游戏卡片当前页码
        this.currentGameType = 'word-challenge'; // 当前选中的游戏类型
        this.wordChallengeGame = null; // 单词挑战游戏实例
        this.timeChallengeGame = null; // 限时挑战游戏实例
        this.comboRewardsGame = null; // 连击奖励游戏实例
        this.aiBattleGame = null; // AI对战游戏实例
        this.wordBlitzGame = null; // 单词速射游戏实例
        this.wordMatchGame = null; // 记忆配对游戏实例
        
        // 语音名称到简短昵称的映射表
        this.voiceNicknames = {
            // 中文语音昵称
            'Microsoft Yaoyao': '小柔',
            'Microsoft Kangkang': '小星',
            'Microsoft Huihui': '小莹',
            'Microsoft Yaoyao - Chinese (Simplified)': '小柔',
            'Microsoft Kangkang - Chinese (Simplified)': '小星',
            'Microsoft Huihui - Chinese (Simplified)': '小莹',
            'Google 普通话（中国大陆）': '小语',
            'Google 普通话（台湾）': '小台',
            // 英文语音昵称
            'Microsoft Zira': '小柔',
            'Microsoft David': '小星',
            'Microsoft Mark': '小莹',
            'Microsoft Zira - English (United States)': '小柔',
            'Microsoft David - English (United States)': '小星',
            'Microsoft Mark - English (United States)': '小莹',
            'Google US English': '小美',
            'Google UK English': '小英',
            'Alex': '小柔',
            'Samantha': '小星',
            'Victoria': '小莹',
            'Daniel': '小星',
            'Karen': '小柔',
            'Moira': '小莹',
            'Tessa': '小柔',
            'Veena': '小星',
            'Fiona': '小莹',
            'Sinji': '小星',
            'Ting-Ting': '小柔',
            'Yuna': '小莹',
            'Yuki': '小星'
        };
        
        // 昵称池（用于随机生成）
        this.nicknamePool = ['小柔', '小星', '小莹', '小语', '小美', '小英', '小台', '小悦', '小乐', '小甜', '小暖', '小晴', '小月', '小阳', '小风', '小云', '小露', '小霜', '小雪', '小梅', '小兰', '小竹', '小菊', '小荷', '小莲', '小桃', '小梨', '小杏', '小樱', '小枫', '小桐', '小柳', '小杨', '小松', '小柏', '小楠', '小桂', '小榕', '小槐', '小榆', '小桦', '小椿', '小楸', '小梓', '小桑', '小槐', '小榆', '小杨', '小柳'];
    }

    // 初始化应用
    async init() {
        try {
            // 先显示默认值（0），避免显示HTML中写死的数字
            this.updateProgressDisplay();
            
            await this.loadUserProfile();
            await this.loadWordbook();
            await this.loadLearningProgress();
            this.setupEventListeners();
            this.applyUserSettings();
            console.log('✅ 温蒂翻译助手初始化完成');
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            this.showNotification('应用初始化失败，请检查网络连接', 'error');
            // 即使初始化失败，也显示默认值
            this.updateProgressDisplay();
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
                console.log('学习进度加载成功:', this.learningProgress);
                console.log('成就数量:', this.learningProgress.achievements_count);
                console.log('本月单词数:', this.learningProgress.words_this_month);
                this.updateProgressDisplay();
            } else {
                // 如果API返回失败，使用默认值
                console.warn('API返回失败，使用默认值');
                this.learningProgress = null;
                this.updateProgressDisplay();
            }
            
            // 加载随机鼓励话语
            await this.loadEncouragement();
        } catch (error) {
            console.error('加载学习进度失败:', error);
            // 加载失败时也显示默认值
            this.learningProgress = null;
            this.updateProgressDisplay();
            // 即使失败也尝试加载鼓励话语
            await this.loadEncouragement();
        }
    }

    // 加载随机鼓励话语
    async loadEncouragement() {
        try {
            const response = await this.api.getEncouragement();
            if (response.success) {
                const encouragementText = document.getElementById('encouragement-text');
                if (encouragementText) {
                    encouragementText.textContent = response.message;
                }
            }
        } catch (error) {
            console.error('加载鼓励话语失败:', error);
            // 失败时使用默认话语
            const encouragementText = document.getElementById('encouragement-text');
            if (encouragementText) {
                encouragementText.textContent = '亲爱的温蒂，你进步真棒！爸爸为你感到骄傲！';
            }
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

        // 主题选择（使用事件委托，支持动态添加的元素）
        const themeOptionsContainer = document.getElementById('theme-options');
        if (themeOptionsContainer) {
            themeOptionsContainer.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                const option = e.target.closest('.theme-option');
                if (option) {
                    const theme = option.getAttribute('data-theme');
                    if (theme) {
                        this.changeTheme(theme);
                    }
                }
            });
        }

        // 头像选择（使用事件委托，支持动态添加的元素）
        const avatarOptionsContainer = document.getElementById('avatar-options');
        if (avatarOptionsContainer) {
            avatarOptionsContainer.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                const option = e.target.closest('.avatar-option');
                if (option) {
                    const avatar = option.getAttribute('data-avatar');
                    if (avatar) {
                        this.changeAvatar(avatar);
                    }
                }
            });
        }

        // 音量控制
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.updateVolume(e.target.value);
            });
        }
        
        // 语音设置按钮
        const voiceSettingBtn = document.getElementById('voice-setting-btn');
        if (voiceSettingBtn) {
            voiceSettingBtn.addEventListener('click', () => {
                this.toggleVoiceOptions();
            });
        }
        
        // 注意：设置按钮的显示/隐藏逻辑在 index.html 中已处理
        // 这里只需要确保选项的点击事件能正确触发
        
        // 初始化语音列表（如果浏览器支持）
        if ('speechSynthesis' in window) {
            this.initVoices();
        }

        // 语音输入（按住说话）
        this.setupVoiceInputButtons();

        // 对话按钮
        const chatBtn = document.getElementById('chat-btn');
        if (chatBtn) {
            chatBtn.addEventListener('click', () => this.handleChat());
        }

        // DeepSeek对话按钮
        const deepseekChatBtn = document.getElementById('deepseek-chat-btn');
        if (deepseekChatBtn) {
            deepseekChatBtn.addEventListener('click', () => this.handleDeepSeekChat());
        }

        // 苹果图标点击事件 - 显示单词图片
        const wordImageBtn = document.querySelector('.word-image');
        if (wordImageBtn) {
            wordImageBtn.style.cursor = 'pointer';
            wordImageBtn.setAttribute('title', '查看单词图片');
            wordImageBtn.addEventListener('click', () => this.handleWordImage());
        }

        // 相机输入（OCR图片识别）- 为所有相机按钮绑定事件
        const cameraInputBtns = document.querySelectorAll('[data-input="camera"]');
        cameraInputBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 找到对应的输入框
                const container = btn.closest('.input-area');
                let inputElement = null;
                if (container) {
                    const textarea = container.querySelector('textarea');
                    if (textarea) {
                        inputElement = textarea;
                    }
                }
                // 如果没找到，尝试根据ID查找
                if (!inputElement) {
                    inputElement = document.getElementById('translate-input') || document.getElementById('chat-input');
                }
                this.startOCRRecognition(inputElement ? inputElement.id : null);
            });
        });

        // 页签切换
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabElement = e.currentTarget;
                const tabName = tabElement.getAttribute('data-tab');
                this.switchToTab(tabName);
            });
        });
        
        // 游戏卡片点击事件
        this.setupGameCards();
        
        // 游戏模态框关闭按钮
        const gameModalClose = document.querySelector('.game-modal-close');
        if (gameModalClose) {
            gameModalClose.addEventListener('click', () => {
                this.closeGameModal();
            });
        }
        
        // 点击模态框外部关闭
        const gameModal = document.getElementById('game-modal');
        if (gameModal) {
            gameModal.addEventListener('click', (e) => {
                if (e.target === gameModal) {
                    this.closeGameModal();
                }
            });
        }
        
        // 加载游戏里程碑数据（默认显示单词挑战）
        this.loadGameMilestones('word-challenge');
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
                
                // 更新标题，去掉"(举例)"
                const resultTitle = document.getElementById('result-title');
                if (resultTitle && resultTitle.textContent.includes('(举例)')) {
                    resultTitle.textContent = '翻译结果';
                }
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
        
        // 构建词性显示（如果有）
        const partOfSpeechHtml = result.part_of_speech 
            ? `<div class="part-of-speech">${result.part_of_speech}</div>` 
            : '';
        
        // 构建音标和发音按钮（如果是句子且没有音标，也显示朗读按钮）
        const pronunciationHtml = result.pronunciation 
            ? `<div class="pronunciation">
                <span class="phonetic-text">${result.pronunciation}</span>
                ${result.audio_url 
                    ? `<div class="speaker-btn" title="播放发音" data-audio-url="${result.audio_url.replace(/"/g, '&quot;')}">
                        <i class="fas fa-volume-up"></i>
                    </div>`
                    : `<div class="speaker-btn" title="朗读" data-word="${(result.original_text || '').replace(/"/g, '&quot;')}">
                        <i class="fas fa-volume-up"></i>
                    </div>`
                }
            </div>` 
            : (result.original_text && result.original_text.trim().split(/\s+/).length > 1 
                ? `<div class="pronunciation">
                    <div class="speaker-btn" title="朗读句子" data-word="${(result.original_text || '').replace(/"/g, '&quot;')}">
                        <i class="fas fa-volume-up"></i>
                    </div>
                </div>`
                : '');
        
        // 构建例句显示（英文例句末端添加小喇叭）
        const exampleHtml = result.example_sentence 
            ? `<div class="example-sentence">
                <div class="example-en">
                    ${result.example_sentence}
                    ${result.example_audio_url 
                        ? `<div class="example-speaker-btn" title="播放例句发音" data-audio-url="${result.example_audio_url.replace(/"/g, '&quot;')}">
                            <i class="fas fa-volume-up"></i>
                        </div>`
                        : `<div class="example-speaker-btn" title="朗读例句" data-text="${(result.example_sentence || '').replace(/"/g, '&quot;')}">
                            <i class="fas fa-volume-up"></i>
                        </div>`
                    }
                </div>
                ${result.example_translation ? `<div class="example-zh">${result.example_translation}</div>` : ''}
            </div>` 
            : '';
        
        resultContent.innerHTML = `
            <div class="translation-item">
                <div class="add-to-wordbook" title="添加到单词本" onclick="wendyApp.handleAddToWordbook()">
                    <i class="fas fa-plus"></i>
                </div>
                <div class="original-text">${result.original_text || ''}</div>
                ${partOfSpeechHtml}
                <div class="translated-text">${result.translated_text || ''}</div>
                ${pronunciationHtml}
                ${exampleHtml}
            </div>
        `;
        
        // 绑定发音按钮事件
        const speakerBtn = resultContent.querySelector('.speaker-btn');
        if (speakerBtn) {
            if (result.audio_url) {
                speakerBtn.addEventListener('click', () => {
                    this.playAudio(result.audio_url);
                });
            } else if (result.original_text) {
                speakerBtn.addEventListener('click', () => {
                    this.speakText(result.original_text);
                });
            }
        }
        
        // 绑定例句发音按钮事件
        const exampleSpeakerBtn = resultContent.querySelector('.example-speaker-btn');
        if (exampleSpeakerBtn) {
            const audioUrl = exampleSpeakerBtn.getAttribute('data-audio-url');
            const text = exampleSpeakerBtn.getAttribute('data-text');
            exampleSpeakerBtn.addEventListener('click', () => {
                if (audioUrl) {
                    this.playAudio(audioUrl);
                } else if (text) {
                    this.speakText(text);
                }
            });
        }
        
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

        // 过滤已掌握的单词（3星）
        const activeWords = this.wordDatabase.filter(word => word.mastery_level < 3);
        
        // 分页设置
        const wordsPerPage = 9;
        this.currentPage = this.currentPage || 1;
        const totalPages = Math.ceil(activeWords.length / wordsPerPage);
        
        // 确保当前页有效
        if (this.currentPage > totalPages) this.currentPage = totalPages || 1;
        
        // 计算当前页的单词
        const startIndex = (this.currentPage - 1) * wordsPerPage;
        const endIndex = startIndex + wordsPerPage;
        const currentWords = activeWords.slice(startIndex, endIndex);

        wordbookContainer.innerHTML = '';

        // 渲染当前页的单词
        currentWords.forEach((word, index) => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.innerHTML = `
                <div class="word-item-speak" data-word="${word.english_word}" title="朗读">
                    <i class="fas fa-volume-up"></i>
                </div>
                <div class="word">${word.english_word}</div>
                <div class="pronunciation">${word.pronunciation || ''}</div>
                <div class="meaning">${word.chinese_meaning}</div>
                <div class="stars" data-word-id="${word.id}">
                    ${this.getStarsHTML(word.mastery_level)}
                </div>
            `;
            wordbookContainer.appendChild(wordItem);
        });

        // 移除旧的分页控件（如果存在）
        const oldPagination = document.getElementById('wordbook-pagination');
        if (oldPagination) {
            oldPagination.remove();
        }

        // 添加分页控件到容器外部
        if (totalPages > 1) {
            const wordbookTab = document.getElementById('wordbook-tab');
            if (wordbookTab) {
                this.addPaginationControls(wordbookTab, totalPages);
            }
        }

        // 添加事件监听器
        this.addWordbookEventListeners();
        
        // 更新"我的单词"显示
        this.updateMasteredWordsDisplay();
    }

    addPaginationControls(container, totalPages) {
        const paginationDiv = document.createElement('div');
        paginationDiv.id = 'wordbook-pagination';
        paginationDiv.className = 'pagination';
        
        // 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.onclick = () => this.goToPage(this.currentPage - 1);
        
        // 页码
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `${this.currentPage} / ${totalPages}`;
        
        // 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.onclick = () => this.goToPage(this.currentPage + 1);
        
        paginationDiv.appendChild(prevBtn);
        paginationDiv.appendChild(pageInfo);
        paginationDiv.appendChild(nextBtn);
        
        // 将分页控件插入到 wordbook-container 之后
        const wordbookContainer = document.getElementById('wordbook-container');
        if (wordbookContainer && wordbookContainer.nextSibling) {
            container.insertBefore(paginationDiv, wordbookContainer.nextSibling);
        } else {
            container.appendChild(paginationDiv);
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderWordbook();
    }

    addWordbookEventListeners() {
        const wordbookContainer = document.getElementById('wordbook-container');
        
        // 星星点击事件
        wordbookContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const starContainer = e.target.parentElement;
                const wordId = parseInt(starContainer.getAttribute('data-word-id'));
                const starIndex = Array.from(starContainer.children).indexOf(e.target);
                this.updateWordMastery(wordId, starIndex + 1);
            }
            
            // 朗读图标点击事件
            if (e.target.closest('.word-item-speak')) {
                const speakBtn = e.target.closest('.word-item-speak');
                const word = speakBtn.getAttribute('data-word');
                this.speakWord(word);
            }
        });
    }

    updateMasteredWordsDisplay() {
        const masteredWords = this.wordDatabase.filter(word => word.mastery_level >= 3);
        const masteredContainer = document.getElementById('mastered-words');
        
        if (!masteredContainer) return;
        
        masteredContainer.innerHTML = '';
        
        if (masteredWords.length === 0) {
            masteredContainer.innerHTML = '<p style="text-align: center; color: #888;">还没有掌握的单词</p>';
            return;
        }
        
        masteredWords.forEach(word => {
            const wordDiv = document.createElement('div');
            wordDiv.className = 'mastered-word-item';
            
            // 构建音标（如果有）
            const pronunciationHtml = word.pronunciation && word.pronunciation.trim() 
                ? `<div class="word-pronunciation">${word.pronunciation}</div>` 
                : '';
            
            wordDiv.innerHTML = `
                <div class="mastered-word-speak" data-word="${word.english_word.replace(/"/g, '&quot;')}" title="朗读">
                    <i class="fas fa-volume-up"></i>
                </div>
                <div class="word-text">${word.english_word}</div>
                ${pronunciationHtml}
                <div class="word-meaning">${word.chinese_meaning}</div>
            `;
            masteredContainer.appendChild(wordDiv);
        });
        
        // 绑定发音按钮事件
        masteredContainer.querySelectorAll('.mastered-word-speak').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const word = btn.getAttribute('data-word');
                this.speakWord(word);
            });
        });
    }

    speakWord(word) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        } else {
            this.showNotification('您的浏览器不支持语音朗读', 'warning');
        }
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

                // 如果达到3星，显示祝贺并延迟刷新
                if (masteryLevel === 3) {
                    this.showCongratulation();
                    // 延迟刷新以显示祝贺动画
                    setTimeout(() => {
                        this.renderWordbook();
                    }, 2000);
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
        // 使用默认值，确保即使数据未加载也显示0
        const progress = this.learningProgress || {
            total_words: 0,
            streak_days: 0,
            achievements_count: 0,
            words_this_month: 0,
            total_mastered_words: 0
        };
        
        console.log('updateProgressDisplay 被调用，progress数据:', progress);
        console.log('achievements_count:', progress.achievements_count, '类型:', typeof progress.achievements_count);
        console.log('words_this_month:', progress.words_this_month, '类型:', typeof progress.words_this_month);

        // 更新里程碑显示
        const milestoneText = document.getElementById('milestone-text');
        if (milestoneText) {
            const totalWords = progress.total_words || 0;
            milestoneText.innerHTML = `已学会 <strong>${totalWords}</strong> 个单词，继续加油！`;
        }

        // 更新进度条
        const progressBar = document.querySelector('.progress');
        if (progressBar) {
            const totalWords = progress.total_words || 0;
            const progressPercent = Math.min((totalWords / 50) * 100, 100);
            progressBar.style.width = `${progressPercent}%`;
        }

        // 更新成长记录
        const streakText = document.getElementById('streak-text');
        if (streakText) {
            const streakDays = progress.streak_days || 0;
            streakText.textContent = `连续学习 ${streakDays} 天`;
        }

        const badgesText = document.getElementById('badges-text');
        if (badgesText) {
            // 确保正确处理 null、undefined、NaN 等情况
            const achievementsCount = (progress.achievements_count !== null && progress.achievements_count !== undefined) 
                ? Number(progress.achievements_count) 
                : 0;
            const newText = `已获得 ${achievementsCount} 枚成就徽章`;
            // 使用 innerHTML 确保完全替换内容
            badgesText.innerHTML = newText;
            console.log('更新成就徽章显示:', achievementsCount, '元素:', badgesText, '新文本:', newText);
            console.log('更新后元素内容:', badgesText.innerHTML);
            // 强制触发重绘
            badgesText.offsetHeight;
        } else {
            console.error('未找到 badges-text 元素');
        }

        const monthlyText = document.getElementById('monthly-text');
        if (monthlyText) {
            // 确保正确处理 null、undefined、NaN 等情况
            const wordsThisMonth = (progress.words_this_month !== null && progress.words_this_month !== undefined) 
                ? Number(progress.words_this_month) 
                : 0;
            const newText = `本月掌握了 ${wordsThisMonth} 个新单词`;
            // 使用 innerHTML 确保完全替换内容
            monthlyText.innerHTML = newText;
            console.log('更新本月单词数显示:', wordsThisMonth, '元素:', monthlyText, '新文本:', newText);
            console.log('更新后元素内容:', monthlyText.innerHTML);
            // 强制触发重绘
            monthlyText.offsetHeight;
        } else {
            console.error('未找到 monthly-text 元素');
        }

        const totalMasteredText = document.getElementById('total-mastered-text');
        if (totalMasteredText) {
            // 确保正确处理 null、undefined、NaN 等情况
            const totalMasteredWords = (progress.total_mastered_words !== null && progress.total_mastered_words !== undefined) 
                ? Number(progress.total_mastered_words) 
                : 0;
            const newText = `总计掌握了 ${totalMasteredWords} 个新单词`;
            // 使用 innerHTML 确保完全替换内容
            totalMasteredText.innerHTML = newText;
            console.log('更新总计掌握单词数显示:', totalMasteredWords, '元素:', totalMasteredText, '新文本:', newText);
            // 强制触发重绘
            totalMasteredText.offsetHeight;
        } else {
            console.error('未找到 total-mastered-text 元素');
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
        
        // 保存语音设置
        if (this.userProfile.voice_name) {
            this.selectedVoiceName = this.userProfile.voice_name;
            this.selectedVoiceLang = this.userProfile.voice_lang || '';
        }
        
        // 保存语音设置
        if (this.userProfile.voice_name) {
            this.selectedVoiceName = this.userProfile.voice_name;
            this.selectedVoiceLang = this.userProfile.voice_lang || '';
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
        
        // 更新语音设置相关的文本
        this.updateVoiceSettingsText(lang);

        // 保存到服务器
        try {
            await this.api.updateUserProfile({ language: lang });
        } catch (error) {
            console.error('保存语言设置失败:', error);
        }
    }
    
    // 更新语音设置相关的文本
    updateVoiceSettingsText(lang) {
        const voiceText = document.getElementById('voice-text');
        const chineseVoiceTitle = document.getElementById('chinese-voice-title');
        const englishVoiceTitle = document.getElementById('english-voice-title');
        
        if (typeof translations !== 'undefined' && translations[lang]) {
            if (voiceText) {
                voiceText.textContent = translations[lang].voiceText || (lang === 'zh' ? '语音设置' : 'Voice Settings');
            }
            if (chineseVoiceTitle) {
                chineseVoiceTitle.textContent = translations[lang].chineseVoiceTitle || (lang === 'zh' ? '中文语音' : 'Chinese Voices');
            }
            if (englishVoiceTitle) {
                englishVoiceTitle.textContent = translations[lang].englishVoiceTitle || (lang === 'zh' ? '英文语音' : 'English Voices');
            }
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

    // 播放音频（优先使用金山词霸的MP3）
    playAudio(audioUrl) {
        if (!audioUrl) {
            this.showNotification('没有可用的音频', 'warning');
            return;
        }
        
        try {
            const audio = new Audio(audioUrl);
            const volumeSlider = document.getElementById('volume-slider');
            audio.volume = volumeSlider ? volumeSlider.value / 100 : 0.5;
            
            audio.onerror = () => {
                console.error('音频加载失败:', audioUrl);
                this.showNotification('音频播放失败，尝试使用语音合成', 'warning');
                // 如果MP3播放失败，尝试使用语音合成
                if (this.currentTranslation && this.currentTranslation.original_text) {
                    this.speakText(this.currentTranslation.original_text);
                }
            };
            
            audio.play().catch(error => {
                console.error('音频播放失败:', error);
                this.showNotification('无法播放音频', 'warning');
            });
        } catch (error) {
            console.error('创建音频对象失败:', error);
            this.showNotification('音频播放失败', 'warning');
        }
    }
    
    // 语音朗读（使用Web Speech API）
    speakText(text) {
        if (!text) {
            this.showNotification('没有可朗读的文本', 'warning');
            return;
        }
        
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            const volumeSlider = document.getElementById('volume-slider');
            utterance.volume = volumeSlider ? volumeSlider.value / 100 : 0.5;
            speechSynthesis.speak(utterance);
        } else {
            this.showNotification('您的浏览器不支持语音朗读', 'warning');
        }
    }
    
    // 从HTML中提取纯文本（用于语音朗读）
    extractTextFromHTML(html) {
        // 创建临时DOM元素
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 移除代码块（通常不需要朗读代码）
        const codeBlocks = tempDiv.querySelectorAll('code');
        codeBlocks.forEach(code => {
            code.remove();
        });
        
        // 获取纯文本
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // 清理多余的空白字符
        text = text.replace(/\s+/g, ' ').trim();
        
        // 处理一些特殊字符，让朗读更自然
        text = text.replace(/\./g, '。');
        text = text.replace(/,/g, '，');
        text = text.replace(/\?/g, '？');
        text = text.replace(/!/g, '！');
        
        return text;
    }
    
    // 停止当前语音播放
    stopSpeaking() {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
    }
    
    // 朗读聊天消息（支持中英文混合）
    speakChatMessage(content) {
        if (!content) {
            this.showNotification('没有可朗读的内容', 'warning');
            return;
        }
        
        // 停止之前的播放
        this.stopSpeaking();
        
        // 如果内容是HTML格式（Markdown转换后的），提取纯文本
        let textToSpeak = content;
        if (content.includes('<')) {
            textToSpeak = this.extractTextFromHTML(content);
        }
        
        if (!textToSpeak || textToSpeak.trim().length === 0) {
            this.showNotification('没有可朗读的内容', 'warning');
            return;
        }
        
        // 检测语言（简单判断：如果包含中文字符，使用中文语音；否则使用英文）
        const hasChinese = /[\u4e00-\u9fa5]/.test(textToSpeak);
        const hasEnglish = /[a-zA-Z]/.test(textToSpeak);
        
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            
            // 根据内容设置语言
            if (hasChinese && hasEnglish) {
                // 中英文混合，优先使用中文语音
                utterance.lang = 'zh-CN';
            } else if (hasChinese) {
                utterance.lang = 'zh-CN';
            } else {
                utterance.lang = 'en-US';
            }
            
            // 设置语音参数
            const volumeSlider = document.getElementById('volume-slider');
            utterance.volume = volumeSlider ? volumeSlider.value / 100 : 0.5;
            utterance.rate = 0.9; // 稍微慢一点，适合学习
            utterance.pitch = 1.0;
            
            // 选择语音（优先使用用户选择的语音）
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                let selectedVoice = null;
                
                // 如果用户选择了语音，优先使用
                if (this.selectedVoiceName) {
                    selectedVoice = voices.find(voice => 
                        voice.name === this.selectedVoiceName && 
                        (!this.selectedVoiceLang || voice.lang.startsWith(this.selectedVoiceLang))
                    );
                }
                
                // 如果用户选择的语音不可用，根据内容自动选择
                if (!selectedVoice) {
                    selectedVoice = voices.find(voice => {
                        if (hasChinese) {
                            return voice.lang.startsWith('zh');
                        } else {
                            return voice.lang.startsWith('en');
                        }
                    });
                }
                
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }
            
            utterance.onerror = (event) => {
                console.error('语音朗读错误:', event);
                this.showNotification('语音朗读失败', 'warning');
            };
            
            utterance.onend = () => {
                console.log('语音朗读完成');
            };
            
            speechSynthesis.speak(utterance);
        } else {
            this.showNotification('您的浏览器不支持语音朗读', 'warning');
        }
    }

    setupVoiceInputButtons() {
        // 为所有语音输入按钮设置按住说话功能
        const voiceInputBtns = document.querySelectorAll('[data-input="voice"]');
        
        voiceInputBtns.forEach(btn => {
            // 找到对应的输入框（翻译或对话）
            const container = btn.closest('.input-area');
            let inputElement = null;
            if (container) {
                const textarea = container.querySelector('textarea');
                if (textarea) {
                    inputElement = textarea;
                }
            }
            
            if (!inputElement) return;
            
            // 按住开始录音
            const startRecording = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.startVoiceRecognition(inputElement.id);
                btn.classList.add('recording');
            };
            
            // 松开结束录音
            const stopRecording = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.stopVoiceRecognition();
                btn.classList.remove('recording');
            };
            
            // 鼠标事件
            btn.addEventListener('mousedown', startRecording);
            btn.addEventListener('mouseup', stopRecording);
            btn.addEventListener('mouseleave', stopRecording); // 鼠标移出也停止
            
            // 触摸事件（移动端）
            btn.addEventListener('touchstart', startRecording, { passive: false });
            btn.addEventListener('touchend', stopRecording, { passive: false });
            btn.addEventListener('touchcancel', stopRecording, { passive: false });
        });
    }

    async startVoiceRecognition(inputElementId = 'translate-input') {
        const textarea = document.getElementById(inputElementId);
        if (!textarea) return;
        
        // 检查浏览器支持
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showNotification('您的浏览器不支持录音功能，请使用现代浏览器', 'warning');
            return;
        }
        
        try {
            // 请求麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,  // 单声道
                    sampleRate: 16000, // 16kHz采样率（百度API推荐）
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            // 创建MediaRecorder
            const options = {
                mimeType: 'audio/webm;codecs=opus'  // 使用webm格式
            };
            
            // 如果浏览器不支持webm，尝试其他格式
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                if (MediaRecorder.isTypeSupported('audio/webm')) {
                    options.mimeType = 'audio/webm';
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    options.mimeType = 'audio/mp4';
                } else {
                    options.mimeType = ''; // 使用默认格式
                }
            }
            
            const mediaRecorder = new MediaRecorder(stream, options);
            const audioChunks = [];
            
            // 开始录音
            mediaRecorder.start();
            this.showNotification('正在录音...', 'info');
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                // 停止所有音频轨道
                stream.getTracks().forEach(track => track.stop());
                
                if (audioChunks.length === 0) {
                    this.showNotification('录音失败，请重试', 'error');
                    return;
                }
                
                // 合并音频数据
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
                
                // 转换为WAV格式（百度API需要）
                try {
                    const wavBlob = await this.convertToWav(audioBlob);
                    
                    // 发送到后端识别
                    const formData = new FormData();
                    formData.append('audio', wavBlob, 'recording.wav');
                    formData.append('language', 'en'); // 识别英语
                    formData.append('format', 'wav');
                    formData.append('rate', '16000');
                    
                    this.showNotification('正在识别...', 'info');
                    
                    const response = await fetch('/api/speech/recognize', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        textarea.value = result.text;
                        this.showNotification('语音识别成功', 'success');
                    } else {
                        this.showNotification(result.error || '识别失败', 'error');
                    }
                } catch (error) {
                    console.error('音频转换或识别失败:', error);
                    this.showNotification('识别失败，请重试', 'error');
                }
            };
            
            // 保存 mediaRecorder 以便停止
            this.currentMediaRecorder = mediaRecorder;
            this.currentStream = stream;
            
        } catch (error) {
            console.error('启动录音失败:', error);
            let errorMsg = '无法访问麦克风';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMsg = '请允许使用麦克风权限';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMsg = '未找到麦克风设备';
            }
            this.showNotification(errorMsg, 'error');
            
            // 清理按钮状态
            const voiceInputBtns = document.querySelectorAll('[data-input="voice"]');
            voiceInputBtns.forEach(btn => btn.classList.remove('recording'));
        }
    }

    stopVoiceRecognition() {
        if (this.currentMediaRecorder && this.currentMediaRecorder.state !== 'inactive') {
            this.currentMediaRecorder.stop();
        }
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        this.currentMediaRecorder = null;
    }

    async convertToWav(audioBlob) {
        // 使用Web Audio API转换为WAV格式
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // 转换为16kHz单声道
        const sampleRate = 16000;
        const numberOfChannels = 1;
        const length = audioBuffer.length * sampleRate / audioBuffer.sampleRate;
        const newAudioBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);
        
        // 重采样
        const sourceData = audioBuffer.getChannelData(0);
        const targetData = newAudioBuffer.getChannelData(0);
        const ratio = audioBuffer.sampleRate / sampleRate;
        
        for (let i = 0; i < length; i++) {
            const index = Math.floor(i * ratio);
            targetData[i] = sourceData[index];
        }
        
        // 转换为WAV格式
        const wav = this.audioBufferToWav(newAudioBuffer);
        return new Blob([wav], { type: 'audio/wav' });
    }

    audioBufferToWav(buffer) {
        const length = buffer.length;
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const bytesPerSample = 2;
        const blockAlign = numberOfChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = length * blockAlign;
        const bufferSize = 44 + dataSize;
        
        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);
        
        // WAV文件头
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, bufferSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // audio format (PCM)
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bytesPerSample * 8, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);
        
        // 写入PCM数据
        let offset = 44;
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
        
        return arrayBuffer;
    }

    startOCRRecognition(inputElementId = null) {
        // 创建隐藏的文件输入框
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        // 添加change事件监听
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) {
                // 用户取消了选择，清理input元素
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
                return;
            }
            
            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                this.showNotification('请选择图片文件', 'warning');
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
                return;
            }
            
            // 检查文件大小（限制10MB）
            if (file.size > 10 * 1024 * 1024) {
                this.showNotification('图片文件过大，请选择小于10MB的图片', 'warning');
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
                return;
            }
            
            // 找到对应的输入框
            let textarea = null;
            
            // 如果指定了输入框ID，直接使用
            if (inputElementId) {
                textarea = document.getElementById(inputElementId);
            }
            
            // 如果没找到，尝试从当前活动的输入区域查找
            if (!textarea) {
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab) {
                    textarea = activeTab.querySelector('textarea');
                }
            }
            
            // 如果还是没找到，尝试根据ID查找
            if (!textarea) {
                textarea = document.getElementById('translate-input') || document.getElementById('chat-input');
            }
            
            if (!textarea) {
                this.showNotification('未找到输入框', 'error');
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
                return;
            }
            
            // 显示识别中提示
            this.showNotification('正在识别图片文字...', 'info');
            
            try {
                // 创建FormData
                const formData = new FormData();
                formData.append('image', file);
                formData.append('language', 'ENG'); // 识别英文
                formData.append('accurate', 'false'); // 使用标准版（免费额度更多）
                
                // 发送到后端识别
                const response = await fetch('/api/ocr/recognize', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // 识别成功，填入输入框
                    textarea.value = result.text;
                    this.showNotification('图片文字识别成功', 'success');
                } else {
                    this.showNotification(result.error || '识别失败', 'error');
                }
            } catch (error) {
                console.error('OCR识别失败:', error);
                this.showNotification('识别请求失败，请稍后重试', 'error');
            } finally {
                // 清理input元素
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
            }
        });
        
        // 添加到页面并触发点击
        document.body.appendChild(input);
        input.click();
    }
    
    // 获取语音的简短昵称
    getVoiceNickname(voiceName, voiceIndex = 0) {
        // 优先使用映射表中的昵称
        if (this.voiceNicknames[voiceName]) {
            return this.voiceNicknames[voiceName];
        }
        
        // 如果没有映射，从昵称池中按索引选择（确保同一语音总是显示相同昵称）
        const index = voiceIndex % this.nicknamePool.length;
        return this.nicknamePool[index];
    }
    
    // 初始化语音列表
    initVoices() {
        if (!('speechSynthesis' in window)) {
            return;
        }
        
        // 等待语音列表加载完成
        const loadVoices = () => {
            this.availableVoices = speechSynthesis.getVoices();
            this.renderVoiceOptions();
        };
        
        // 某些浏览器需要等待voiceschanged事件
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        // 立即尝试加载
        loadVoices();
    }
    
    // 渲染语音选择选项
    renderVoiceOptions() {
        const chineseVoicesContainer = document.getElementById('chinese-voices');
        const englishVoicesContainer = document.getElementById('english-voices');
        
        if (!chineseVoicesContainer || !englishVoicesContainer) return;
        
        // 清空现有选项
        chineseVoicesContainer.innerHTML = '';
        englishVoicesContainer.innerHTML = '';
        
        // 分类语音
        const chineseVoices = this.availableVoices.filter(v => v.lang.startsWith('zh'));
        const englishVoices = this.availableVoices.filter(v => v.lang.startsWith('en'));
        
        // 渲染中文语音
        chineseVoices.forEach((voice, index) => {
            const option = document.createElement('div');
            option.className = 'voice-option';
            if (this.selectedVoiceName === voice.name) {
                option.classList.add('active');
            }
            // 使用简短昵称显示
            const nickname = this.getVoiceNickname(voice.name, index);
            option.textContent = nickname;
            option.title = voice.name; // 鼠标悬停时显示完整名称
            option.setAttribute('data-voice-name', voice.name);
            option.setAttribute('data-voice-lang', 'zh');
            option.addEventListener('click', () => {
                this.selectVoice(voice.name, 'zh');
            });
            chineseVoicesContainer.appendChild(option);
        });
        
        // 渲染英文语音
        englishVoices.forEach((voice, index) => {
            const option = document.createElement('div');
            option.className = 'voice-option';
            if (this.selectedVoiceName === voice.name) {
                option.classList.add('active');
            }
            // 使用简短昵称显示
            const nickname = this.getVoiceNickname(voice.name, chineseVoices.length + index);
            option.textContent = nickname;
            option.title = voice.name; // 鼠标悬停时显示完整名称
            option.setAttribute('data-voice-name', voice.name);
            option.setAttribute('data-voice-lang', 'en');
            option.addEventListener('click', () => {
                this.selectVoice(voice.name, 'en');
            });
            englishVoicesContainer.appendChild(option);
        });
        
        // 如果没有语音，显示提示
        if (chineseVoices.length === 0) {
            chineseVoicesContainer.innerHTML = '<div class="voice-empty">暂无中文语音</div>';
        }
        if (englishVoices.length === 0) {
            englishVoicesContainer.innerHTML = '<div class="voice-empty">暂无英文语音</div>';
        }
    }
    
    // 切换语音选项显示
    toggleVoiceOptions() {
        const voiceOptions = document.getElementById('voice-options');
        if (voiceOptions) {
            const isDisplayed = voiceOptions.style.display !== 'none';
            voiceOptions.style.display = isDisplayed ? 'none' : 'block';
            
            // 如果显示，刷新语音列表
            if (!isDisplayed) {
                this.initVoices();
            }
        }
    }
    
    // 选择语音
    async selectVoice(voiceName, voiceLang) {
        this.selectedVoiceName = voiceName;
        this.selectedVoiceLang = voiceLang;
        
        // 更新UI
        document.querySelectorAll('.voice-option').forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-voice-name') === voiceName) {
                option.classList.add('active');
            }
        });
        
        // 保存到后端
        try {
            await this.api.updateUserProfile({
                voice_name: voiceName,
                voice_lang: voiceLang
            });
            this.showNotification('语音设置已保存', 'success');
        } catch (error) {
            console.error('保存语音设置失败:', error);
            this.showNotification('保存语音设置失败', 'error');
        }
    }

    // 显示通知
    // ====== 对话功能方法 ======
    async handleChat() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        console.log('🤖 开始AI对话处理');
        console.log('📝 用户消息:', message);
        
        if (!message) {
            console.log('❌ 消息为空');
            this.showNotification('请输入要问的问题', 'warning');
            return;
        }

        // 显示用户消息
        console.log('💬 添加用户消息到界面');
        this.addChatMessage(message, 'user');
        
        // 清空输入框
        chatInput.value = '';
        
        try {
            console.log('📡 发送API请求...');
            // 显示加载状态
            this.addChatMessage('正在思考中...', 'assistant', true);
            
            const response = await this.api.chatWithAI(message);
            
            console.log('📥 收到API响应:', response);
            
            // 移除加载消息
            this.removeLoadingMessage();
            
            if (response.success) {
                console.log('✅ API调用成功');
                console.log('💬 AI回复长度:', response.response ? response.response.length : 0);
                this.addChatMessage(response.response, 'assistant');
            } else {
                console.log('❌ API调用失败:', response.error);
                this.addChatMessage('抱歉，我现在无法回答这个问题。请稍后再试。', 'assistant');
            }
        } catch (error) {
            this.removeLoadingMessage();
            console.error('💥 AI对话异常:', error);
            this.addChatMessage('抱歉，网络连接出现问题。请检查网络后重试。', 'assistant');
        }
    }

    async handleDeepSeekChat() {
        // 获取当前翻译结果
        const translatedText = document.querySelector('.translated-text')?.textContent;
        const originalText = document.querySelector('.original-text')?.textContent;
        
        if (!translatedText || !originalText) {
            this.showNotification('请先进行翻译再使用AI助手', 'warning');
            return;
        }

        // 切换到对话页面
        this.switchToTab('chat');
        
        // 发送关于翻译的问题
        const question = `请帮我详细解释单词"${originalText}"（${translatedText}）的用法、例句和相关知识点，适合小学生学习。`;
        
        setTimeout(() => {
            this.addChatMessage(question, 'user');
            this.handleChatWithMessage(question);
        }, 500);
    }

    // ====== 图片功能 ======
    async handleWordImage() {
        // 获取当前翻译的单词
        let originalText = document.querySelector('.original-text')?.textContent?.trim();
        let translatedText = document.querySelector('.translated-text')?.textContent?.trim();
        
        if (!originalText) {
            this.showNotification('请先翻译一个单词', 'warning');
            return;
        }

        // 清理关键词：移除特殊字符前缀（如 [翻译]、[英] 等）
        originalText = originalText.replace(/^\[.*?\]\s*/, '').trim();
        translatedText = translatedText ? translatedText.replace(/^\[.*?\]\s*/, '').trim() : '';
        
        // 显示加载状态
        const wordImageBtn = document.querySelector('.word-image');
        if (wordImageBtn) {
            const originalHTML = wordImageBtn.innerHTML;
            wordImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            wordImageBtn.style.pointerEvents = 'none';
            
            try {
                // 直接显示详情卡片，不再获取单词图片
                await this.showWordImage();
            } catch (error) {
                console.error('显示单词详情失败:', error);
                this.showNotification('显示单词详情失败，请稍后重试', 'error');
            } finally {
                // 恢复按钮状态
                wordImageBtn.innerHTML = originalHTML;
                wordImageBtn.style.pointerEvents = 'auto';
            }
        }
    }

    async showWordImage() {
        // 获取当前翻译的详细信息
        const originalText = document.querySelector('.original-text')?.textContent?.trim().replace(/^\[.*?\]\s*/, '').toLowerCase();
        const translatedText = document.querySelector('.translated-text')?.textContent?.trim();
        const partOfSpeech = document.querySelector('.part-of-speech')?.textContent?.trim() || '';
        const pronunciation = document.querySelector('.phonetic-text')?.textContent?.trim() || '';
        
        // 获取例句（需要清理可能的HTML标签）
        let currentExample = '';
        let currentExampleZh = '';
        const exampleEnEl = document.querySelector('.example-sentence .example-en');
        if (exampleEnEl) {
            const clone = exampleEnEl.cloneNode(true);
            const speakerBtn = clone.querySelector('.example-speaker-btn');
            if (speakerBtn) speakerBtn.remove();
            currentExample = clone.textContent?.trim() || '';
        }
        const exampleZhEl = document.querySelector('.example-sentence .example-zh');
        if (exampleZhEl) {
            currentExampleZh = exampleZhEl.textContent?.trim() || '';
        }

        // 先从数据库获取单词详情
        let wordDetails = null;
        let fromCache = false;
        let cachedMemoryImageUrl = null;
        let memoryImageKeyword = ''; // 提前声明，避免覆盖
        try {
            const cachedDetail = await this.api.getWordDetail(originalText);
            if (cachedDetail.success) {
                wordDetails = cachedDetail;
                cachedMemoryImageUrl = cachedDetail.memory_image_url;
                memoryImageKeyword = cachedDetail.memory_image_keyword || '';
                fromCache = true;
                console.log('✅ 从数据库加载单词详情', {
                    word: cachedDetail.word,
                    hasMemoryKeyword: !!memoryImageKeyword,
                    hasMemoryUrl: !!cachedMemoryImageUrl
                });
                
                // 如果数据库中的同义词/反义词是字符串数组，转换为对象数组
                if (Array.isArray(wordDetails.synonyms) && wordDetails.synonyms.length > 0) {
                    if (typeof wordDetails.synonyms[0] === 'string') {
                        wordDetails.synonyms = wordDetails.synonyms.map(syn => ({ word: syn, meaning: '' }));
                    }
                }
                if (Array.isArray(wordDetails.antonyms) && wordDetails.antonyms.length > 0) {
                    if (typeof wordDetails.antonyms[0] === 'string') {
                        wordDetails.antonyms = wordDetails.antonyms.map(ant => ({ word: ant, meaning: '' }));
                    }
                }
            }
        } catch (error) {
            console.log('数据库中没有该单词详情，将获取新数据', error);
        }

        // 如果没有缓存，获取新数据
        if (!wordDetails || !fromCache) {
            try {
                const aiDetails = await this.getWordDetails(originalText);
                wordDetails = {
                    word_forms: aiDetails?.word_forms || [],
                    synonyms: aiDetails?.synonyms || [],
                    antonyms: aiDetails?.antonyms || [],
                    more_examples: aiDetails?.more_examples || []
                };
                // 保存记忆图片关键词
                memoryImageKeyword = aiDetails?.memory_image_keyword || '';
            } catch (error) {
                console.error('获取单词详情失败:', error);
                wordDetails = {
                    word_forms: [],
                    synonyms: [],
                    antonyms: [],
                    more_examples: []
                };
            }
        }

        // 构建详情卡片内容
        // 优先使用数据库中的数据，如果数据库没有则使用DOM中的数据
        const finalPartOfSpeech = fromCache && wordDetails?.part_of_speech ? wordDetails.part_of_speech : partOfSpeech;
        const finalPronunciation = fromCache && wordDetails?.pronunciation ? wordDetails.pronunciation : pronunciation;
        const finalTranslatedText = fromCache && wordDetails?.chinese_meaning ? wordDetails.chinese_meaning : translatedText;
        
        const wordForms = wordDetails?.word_forms || [];
        
        // 处理同义词和反义词（支持字符串数组和对象数组）
        let synonyms = [];
        if (wordDetails?.synonyms) {
            if (Array.isArray(wordDetails.synonyms)) {
                synonyms = wordDetails.synonyms.map(syn => {
                    if (typeof syn === 'string') {
                        return { word: syn, meaning: '' };
                    }
                    return { word: syn.word || syn, meaning: syn.meaning || '' };
                });
            } else if (typeof wordDetails.synonyms === 'string') {
                synonyms = [{ word: wordDetails.synonyms, meaning: '' }];
            }
        }
        
        let antonyms = [];
        if (wordDetails?.antonyms) {
            if (Array.isArray(wordDetails.antonyms)) {
                antonyms = wordDetails.antonyms.map(ant => {
                    if (typeof ant === 'string') {
                        return { word: ant, meaning: '' };
                    }
                    return { word: ant.word || ant, meaning: ant.meaning || '' };
                });
            } else if (typeof wordDetails.antonyms === 'string') {
                antonyms = [{ word: wordDetails.antonyms, meaning: '' }];
            }
        }
        
        const moreExamples = wordDetails?.more_examples || [];

        // 如果有当前例句，添加到更多例句中（如果还没有）
        if (currentExample && !moreExamples.some(e => e.en === currentExample)) {
            moreExamples.unshift({
                en: currentExample,
                zh: currentExampleZh
            });
        }
        // 限制最多3个例句
        const examplesToShow = moreExamples.slice(0, 3);

        // 创建或获取详情卡片容器
        let detailModal = document.getElementById('word-detail-modal');
        if (!detailModal) {
            detailModal = document.createElement('div');
            detailModal.id = 'word-detail-modal';
            detailModal.className = 'word-detail-modal';
            document.body.appendChild(detailModal);
            
            detailModal.addEventListener('click', (e) => {
                if (e.target === detailModal) {
                    detailModal.classList.remove('show');
                }
            });
        }

        // 构建HTML（记忆图片占位符，异步加载）
        detailModal.innerHTML = `
            <div class="word-detail-content">
                <span class="word-detail-close">&times;</span>
                
                <!-- 单词基本信息 -->
                <div class="word-detail-header">
                    <h2 class="word-detail-word">${originalText}</h2>
                    ${finalPronunciation ? `<div class="word-detail-pronunciation">${finalPronunciation}</div>` : ''}
                    ${finalPartOfSpeech ? `<div class="word-detail-pos">${finalPartOfSpeech}</div>` : ''}
                    <div class="word-detail-meaning">${finalTranslatedText}</div>
                </div>
                
                <!-- 词态变化（包含记忆图片） -->
                <div class="word-detail-section">
                    <h3 class="word-detail-section-title">词态变化</h3>
                    ${wordForms.length > 0 ? `
                    <div class="word-detail-forms">
                        ${wordForms.map(form => `
                            <div class="word-form-item">
                                <span class="word-form-label">${form.label}:</span>
                                <span class="word-form-value">${form.value}</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                    <!-- 记忆图片 -->
                    <div class="memory-image-container" id="memory-image-container">
                        <div class="memory-image-loading">正在生成记忆图片...</div>
                    </div>
                </div>
                
                <!-- 同义词（带释义） -->
                ${synonyms.length > 0 ? `
                <div class="word-detail-section">
                    <h3 class="word-detail-section-title">同义词</h3>
                    <div class="word-detail-synonyms">
                        ${synonyms.map(syn => {
                            const word = typeof syn === 'string' ? syn : (syn.word || syn);
                            const meaning = typeof syn === 'object' && syn.meaning ? syn.meaning : '';
                            return `<div class="synonym-item">
                                <span class="synonym-tag">${word}</span>
                                ${meaning ? `<span class="synonym-meaning">${meaning}</span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- 反义词（带释义） -->
                ${antonyms.length > 0 ? `
                <div class="word-detail-section">
                    <h3 class="word-detail-section-title">反义词</h3>
                    <div class="word-detail-antonyms">
                        ${antonyms.map(ant => {
                            const word = typeof ant === 'string' ? ant : (ant.word || ant);
                            const meaning = typeof ant === 'object' && ant.meaning ? ant.meaning : '';
                            return `<div class="antonym-item">
                                <span class="antonym-tag">${word}</span>
                                ${meaning ? `<span class="antonym-meaning">${meaning}</span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- 更多例句（带播放按钮） -->
                ${examplesToShow.length > 0 ? `
                <div class="word-detail-section">
                    <h3 class="word-detail-section-title">更多例句</h3>
                    <div class="word-detail-examples">
                        ${examplesToShow.map((ex, idx) => `
                            <div class="word-example-item">
                                <div class="word-example-en">
                                    ${idx + 1}. ${ex.en}
                                    <div class="word-example-speaker" data-text="${(ex.en || '').replace(/"/g, '&quot;')}" title="朗读">
                                        <i class="fas fa-volume-up"></i>
                                    </div>
                                </div>
                                ${ex.zh ? `<div class="word-example-zh">${ex.zh}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // 关闭按钮事件
        detailModal.querySelector('.word-detail-close').addEventListener('click', () => {
            detailModal.classList.remove('show');
        });

        // 绑定例句播放按钮
        detailModal.querySelectorAll('.word-example-speaker').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = btn.getAttribute('data-text');
                if (text) {
                    this.speakText(text);
                }
            });
        });

        // 直接显示详情卡片
        detailModal.classList.add('show');

        // 异步加载记忆图片（传入记忆图片关键词，避免重复调用AI）
        this.loadMemoryImage(originalText, cachedMemoryImageUrl || wordDetails?.memory_image_url, memoryImageKeyword);

        // 保存到数据库（异步，不阻塞显示）- 只有从AI获取新数据时才保存
        if (!fromCache) {
            this.saveWordDetailToDB(originalText, {
                chinese_meaning: finalTranslatedText,
                part_of_speech: finalPartOfSpeech,
                pronunciation: finalPronunciation,
                memory_image_keyword: memoryImageKeyword,
                word_forms: wordForms,
                synonyms: synonyms,
                antonyms: antonyms,
                more_examples: examplesToShow
            });
        }
    }

    async loadMemoryImage(word, existingUrl = null, memoryImageKeyword = '') {
        const container = document.getElementById('memory-image-container');
        if (!container) return;

        // 如果已有URL，直接显示（添加点击事件）
        if (existingUrl) {
            this.renderMemoryImage(container, existingUrl, word, memoryImageKeyword);
            return;
        }

        // 如果有记忆图片关键词（从getWordDetails获取），直接使用
        if (memoryImageKeyword) {
            try {
                // 获取记忆图片
                const imageResult = await this.api.getWordImage(memoryImageKeyword, 'en');
                if (imageResult.success && imageResult.image_url) {
                    this.renderMemoryImage(container, imageResult.image_url, word, memoryImageKeyword);
                    
                    // 保存记忆图片URL到数据库
                    await this.saveMemoryImageUrl(word, imageResult.image_url);
                } else {
                    container.innerHTML = '<div class="memory-image-error">记忆图片生成失败</div>';
                }
            } catch (error) {
                console.error('获取记忆图片失败:', error);
                container.innerHTML = '<div class="memory-image-error">记忆图片生成失败</div>';
            }
            return;
        }

        // 如果没有关键词（理论上不会到这里，因为getWordDetails已经包含了），作为备用方案
        // 这种情况不应该发生，但保留作为容错
        container.innerHTML = '<div class="memory-image-error">记忆图片关键词缺失</div>';
    }

    renderMemoryImage(container, imageUrl, word, memoryImageKeyword) {
        // 创建图片元素，添加点击事件
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '记忆图片（点击切换）';
        img.className = 'memory-image memory-image-clickable';
        img.title = '点击切换其他图片';
        img.onerror = function() {
            container.innerHTML = '<div class="memory-image-error">图片加载失败</div>';
        };
        
        // 添加点击事件：随机切换图片
        img.addEventListener('click', () => {
            this.refreshMemoryImage(word, memoryImageKeyword, imageUrl);
        });
        
        container.innerHTML = '';
        container.appendChild(img);
    }

    async refreshMemoryImage(word, memoryImageKeyword = '', currentImageUrl = '') {
        const container = document.getElementById('memory-image-container');
        if (!container) return;

        // 如果没有关键词，尝试从数据库获取
        if (!memoryImageKeyword) {
            try {
                const detail = await this.api.getWordDetail(word);
                if (detail.success && detail.memory_image_keyword) {
                    memoryImageKeyword = detail.memory_image_keyword;
                } else {
                    this.showNotification('无法获取图片关键词', 'warning');
                    return;
                }
            } catch (error) {
                console.error('获取关键词失败:', error);
                this.showNotification('无法获取图片关键词', 'warning');
                return;
            }
        }

        // 显示加载状态
        const currentImg = container.querySelector('.memory-image');
        if (currentImg) {
            currentImg.style.opacity = '0.5';
            currentImg.style.pointerEvents = 'none';
        } else {
            container.innerHTML = '<div class="memory-image-loading">正在加载新图片...</div>';
        }

        try {
            // 获取多张图片（10张），然后随机选择一张
            const imageResult = await this.api.getWordImage(memoryImageKeyword, 'en', 10);
            
            if (imageResult.success && imageResult.images && imageResult.images.length > 0) {
                // 过滤掉当前显示的图片
                const availableImages = imageResult.images.filter(img => 
                    img.webformat !== currentImageUrl && 
                    img.large !== currentImageUrl &&
                    img.preview !== currentImageUrl
                );
                
                // 如果没有其他图片，使用所有图片
                const imagesToChoose = availableImages.length > 0 ? availableImages : imageResult.images;
                
                // 随机选择一张
                const randomIndex = Math.floor(Math.random() * imagesToChoose.length);
                const selectedImage = imagesToChoose[randomIndex];
                // 优先 large：与后端保持一致，避免把仅有 24 小时有效期的 webformatURL 存入数据库
                const newImageUrl = selectedImage.large || selectedImage.webformat || selectedImage.preview;
                
                if (newImageUrl) {
                    // 更新显示的图片
                    this.renderMemoryImage(container, newImageUrl, word, memoryImageKeyword);
                    
                    // 保存新的图片URL到数据库
                    await this.saveMemoryImageUrl(word, newImageUrl);
                    
                    this.showNotification('已切换到新图片', 'success');
                } else {
                    throw new Error('未找到可用的图片URL');
                }
            } else {
                throw new Error(imageResult.error || '未找到相关图片');
            }
        } catch (error) {
            console.error('刷新记忆图片失败:', error);
            // 恢复原图片显示
            if (currentImg) {
                currentImg.style.opacity = '1';
                currentImg.style.pointerEvents = 'auto';
            } else {
                container.innerHTML = '<div class="memory-image-error">切换图片失败</div>';
            }
            this.showNotification('切换图片失败，请稍后重试', 'error');
        }
    }

    async saveMemoryImageUrl(word, imageUrl) {
        try {
            // 获取现有详情
            const detail = await this.api.getWordDetail(word);
            if (detail.success) {
                // 更新记忆图片URL
                await this.api.saveWordDetail({
                    word: word,
                    chinese_meaning: detail.chinese_meaning || '',
                    part_of_speech: detail.part_of_speech || '',
                    pronunciation: detail.pronunciation || '',
                    word_image_url: detail.word_image_url || '',
                    memory_image_url: imageUrl,
                    memory_image_keyword: detail.memory_image_keyword || '',
                    word_forms: detail.word_forms || [],
                    synonyms: detail.synonyms || [],
                    antonyms: detail.antonyms || [],
                    more_examples: detail.more_examples || []
                });
            } else {
                // 如果不存在，创建新记录
                await this.api.saveWordDetail({
                    word: word,
                    memory_image_url: imageUrl
                });
            }
        } catch (error) {
            console.error('保存记忆图片URL失败:', error);
        }
    }

    async saveWordDetailToDB(word, detailData) {
        try {
            // 确保同义词和反义词格式正确，保存完整的对象数组（包含word和meaning）
            const synonyms = detailData.synonyms || [];
            const antonyms = detailData.antonyms || [];
            
            // 确保同义词/反义词是对象数组格式（包含word和meaning）
            const synonymsForDB = synonyms.map(syn => {
                if (typeof syn === 'object' && syn.word) {
                    return { word: syn.word, meaning: syn.meaning || '' };
                }
                return { word: typeof syn === 'string' ? syn : '', meaning: '' };
            }).filter(s => s.word);
            
            const antonymsForDB = antonyms.map(ant => {
                if (typeof ant === 'object' && ant.word) {
                    return { word: ant.word, meaning: ant.meaning || '' };
                }
                return { word: typeof ant === 'string' ? ant : '', meaning: '' };
            }).filter(a => a.word);
            
            await this.api.saveWordDetail({
                word: word,
                ...detailData,
                synonyms: synonymsForDB,
                antonyms: antonymsForDB
            });
            console.log('✅ 单词详情已保存到数据库');
        } catch (error) {
            console.error('保存单词详情失败:', error);
        }
    }

    async getWordDetails(word) {
        // 使用AI获取单词详细信息（包含记忆图片关键词）
        try {
            const prompt = `请为单词"${word}"提供以下信息，用JSON格式返回：
1. 词态变化（word_forms）：过去式、过去分词、现在分词、第三人称单数、比较级、最高级等（如果有）
2. 同义词（synonyms）：3-5个常用同义词，每个包含word（单词）和meaning（中文释义）
3. 反义词（antonyms）：1-3个常用反义词，每个包含word（单词）和meaning（中文释义）
4. 更多例句（more_examples）：3个例句，每个包含英文（en）和中文翻译（zh）
5. 记忆图片关键词（memory_image_keyword）：一个简短的英文关键词，卡通的更好，用于搜索能帮助小学生记忆这个单词的图片

请严格按照以下JSON格式返回，不要添加任何其他文字说明：
{
  "word_forms": [{"label": "过去式", "value": "xxx"}, {"label": "过去分词", "value": "xxx"}],
  "synonyms": [{"word": "同义词1", "meaning": "中文释义1"}, {"word": "同义词2", "meaning": "中文释义2"}],
  "antonyms": [{"word": "反义词1", "meaning": "中文释义1"}, {"word": "反义词2", "meaning": "中文释义2"}],
  "more_examples": [{"en": "英文例句1", "zh": "中文翻译1"}, {"en": "英文例句2", "zh": "中文翻译2"}, {"en": "英文例句3", "zh": "中文翻译3"}],
  "memory_image_keyword": "记忆图片搜索关键词"
}`;

            const response = await this.api.chatWithAI(prompt);
            if (response.success && response.response) {
                // 尝试从AI回复中提取JSON
                let jsonText = response.response;
                
                // 移除可能的markdown代码块标记
                jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
                
                // 查找JSON对象
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const details = JSON.parse(jsonMatch[0]);
                        // 验证数据结构
                        if (details && typeof details === 'object') {
                            return {
                                word_forms: Array.isArray(details.word_forms) ? details.word_forms : [],
                                synonyms: Array.isArray(details.synonyms) ? details.synonyms : [],
                                antonyms: Array.isArray(details.antonyms) ? details.antonyms : [],
                                more_examples: Array.isArray(details.more_examples) ? details.more_examples : [],
                                memory_image_keyword: details.memory_image_keyword || ''
                            };
                        }
                    } catch (parseError) {
                        console.error('JSON解析失败:', parseError);
                    }
                }
            }
        } catch (error) {
            console.error('获取单词详情失败:', error);
        }
        // 返回空结构，确保前端不会报错
        return {
            word_forms: [],
            synonyms: [],
            antonyms: [],
            more_examples: [],
            memory_image_keyword: ''
        };
    }

    async handleChatWithMessage(message) {
        try {
            this.addChatMessage('正在思考中...', 'assistant', true);
            
            const response = await this.api.chatWithAI(message);
            
            this.removeLoadingMessage();
            
            if (response.success) {
                this.addChatMessage(response.response, 'assistant');
            } else {
                this.addChatMessage('抱歉，我现在无法回答这个问题。请稍后再试。', 'assistant');
            }
        } catch (error) {
            this.removeLoadingMessage();
            console.error('AI对话失败:', error);
            this.addChatMessage('抱歉，网络连接出现问题。请检查网络后重试。', 'assistant');
        }
    }

    // 将 markdown 格式转换为适合小屏幕的结构化 HTML
    formatMarkdownForSmallScreen(text) {
        if (!text) return '';
        
        let html = text;
        
        // 先处理代码块（避免代码块内的内容被其他规则处理）
        // 移除多行代码块（小屏幕不适合显示）
        html = html.replace(/```[\s\S]*?```/g, '');
        
        // 转义 HTML 特殊字符
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // 处理行内代码（在转义后处理）
        html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
        
        // 按行分割处理
        const lines = html.split('\n');
        const result = [];
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (!line) {
                if (inList) {
                    inList = false;
                }
                result.push('<div class="md-paragraph"><br></div>');
                continue;
            }
            
            // 处理标题
            if (line.startsWith('### ')) {
                if (inList) {
                    inList = false;
                    result.push('</div>');
                }
                result.push(`<div class="md-h3"><strong>${line.substring(4)}</strong></div>`);
            } else if (line.startsWith('## ')) {
                if (inList) {
                    inList = false;
                    result.push('</div>');
                }
                result.push(`<div class="md-h2"><strong>${line.substring(3)}</strong></div>`);
            } else if (line.startsWith('# ')) {
                if (inList) {
                    inList = false;
                    result.push('</div>');
                }
                result.push(`<div class="md-h1"><strong>${line.substring(2)}</strong></div>`);
            }
            // 处理列表
            else if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
                if (!inList) {
                    inList = true;
                    result.push('<div class="md-list">');
                }
                const listContent = line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
                result.push(`<div class="md-list-item">• ${listContent}</div>`);
            }
            // 处理普通段落
            else {
                if (inList) {
                    inList = false;
                    result.push('</div>');
                }
                // 处理粗体和斜体
                let processedLine = line
                    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>');
                
                result.push(`<div class="md-paragraph">${processedLine}</div>`);
            }
        }
        
        // 关闭未关闭的列表
        if (inList) {
            result.push('</div>');
        }
        
        html = result.join('');
        
        // 清理连续的空白段落
        html = html.replace(/(<div class="md-paragraph"><br><\/div>\s*)+/g, '<div class="md-paragraph"><br></div>');
        
        return html;
    }

    addChatMessage(content, sender, isLoading = false) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        if (isLoading) {
            messageDiv.className += ' loading';
        }
        
        // 添加头像（适配CSS的flex布局）
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        if (sender === 'user') {
            avatar.innerHTML = '<i class="fas fa-user"></i>';
        } else {
            avatar.innerHTML = '<i class="fas fa-robot"></i>';
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // 如果是助手消息，格式化 markdown；用户消息保持纯文本
        if (sender === 'assistant' && !isLoading) {
            messageContent.innerHTML = this.formatMarkdownForSmallScreen(content);
            
            // 为助手消息添加语音播放按钮
            const speakerBtn = document.createElement('div');
            speakerBtn.className = 'chat-speaker-btn';
            speakerBtn.title = '朗读这条消息';
            speakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            speakerBtn.setAttribute('data-text', content); // 保存原始文本内容
            
            // 将按钮添加到消息内容中
            messageContent.appendChild(speakerBtn);
            
            // 绑定点击事件
            speakerBtn.addEventListener('click', () => {
                this.speakChatMessage(content);
            });
        } else {
            messageContent.textContent = content;
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // 强制重新渲染后滚动到底部
        messageDiv.offsetHeight;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    removeLoadingMessage() {
        const loadingMessage = document.querySelector('.chat-message.loading');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }

    switchToTab(tabName) {
        // 移除所有活跃状态
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // 激活指定页签
        const tabElement = document.querySelector(`[data-tab="${tabName}"]`);
        const contentElement = document.getElementById(`${tabName}-tab`);
        
        if (tabElement) tabElement.classList.add('active');
        if (contentElement) contentElement.classList.add('active');
        
        // 如果是发现页，加载游戏里程碑和渲染游戏卡片
        if (tabName === 'discover') {
            this.loadGameMilestones('word-challenge'); // 默认显示单词挑战的里程碑
            // 延迟渲染，确保DOM已加载
            setTimeout(() => {
                this.renderGameCards();
            }, 100);
        }
    }

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

    // ====== 游戏功能方法 ======
    setupGameCards() {
        // 初始化游戏卡片分页
        this.currentGamePage = this.currentGamePage || 1;
        this.renderGameCards();
    }

    renderGameCards() {
        const container = document.getElementById('game-cards-container');
        if (!container) return;

        // 获取所有游戏卡片
        const allCards = Array.from(container.querySelectorAll('.game-card'));
        if (allCards.length === 0) return;

        // 分页设置：每页8个卡片
        const cardsPerPage = 8;
        const totalPages = Math.ceil(allCards.length / cardsPerPage);
        
        // 确保当前页有效
        if (this.currentGamePage > totalPages) this.currentGamePage = totalPages || 1;
        
        // 隐藏所有卡片
        allCards.forEach(card => {
            card.style.display = 'none';
        });
        
        // 显示当前页的卡片
        const startIndex = (this.currentGamePage - 1) * cardsPerPage;
        const endIndex = startIndex + cardsPerPage;
        const currentCards = allCards.slice(startIndex, endIndex);
        
        currentCards.forEach(card => {
            card.style.display = 'flex';
        });

        // 移除旧的分页控件
        const oldPagination = document.getElementById('game-cards-pagination');
        if (oldPagination) {
            oldPagination.remove();
        }

        // 如果超过8个卡片，添加分页控件
        if (totalPages > 1) {
            this.createGameCardsPagination(totalPages);
        }

        // 重新绑定事件监听器（只对可见的卡片）
        this.bindGameCardEvents();
    }

    createGameCardsPagination(totalPages) {
        const container = document.querySelector('.discover-container');
        if (!container) return;

        const paginationDiv = document.createElement('div');
        paginationDiv.id = 'game-cards-pagination';
        paginationDiv.className = 'pagination';
        
        // 上一页按钮
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = this.currentGamePage === 1;
        prevBtn.onclick = () => {
            this.currentGamePage = Math.max(1, this.currentGamePage - 1);
            this.renderGameCards();
        };
        
        // 页码
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `${this.currentGamePage} / ${totalPages}`;
        
        // 下一页按钮
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = this.currentGamePage === totalPages;
        nextBtn.onclick = () => {
            this.currentGamePage = Math.min(totalPages, this.currentGamePage + 1);
            this.renderGameCards();
        };
        
        paginationDiv.appendChild(prevBtn);
        paginationDiv.appendChild(pageInfo);
        paginationDiv.appendChild(nextBtn);
        
        // 将分页控件插入到 game-cards-container 之后
        const gameCardsContainer = document.getElementById('game-cards-container');
        if (gameCardsContainer && gameCardsContainer.nextSibling) {
            container.insertBefore(paginationDiv, gameCardsContainer.nextSibling);
        } else {
            container.appendChild(paginationDiv);
        }
    }

    bindGameCardEvents() {
        const gameCards = document.querySelectorAll('.game-card');
        gameCards.forEach(card => {
            // 移除旧的事件监听器（如果存在）
            if (card.hasAttribute('data-event-bound')) {
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
                card = newCard;
            }
            
            // 绑定新的事件监听器
            card.setAttribute('data-event-bound', 'true');
            card.addEventListener('click', () => {
                const gameType = card.getAttribute('data-game');
                if (card.classList.contains('disabled')) {
                    this.showNotification('该游戏即将推出，敬请期待！', 'info');
                    // 即使游戏未启用，也切换里程碑显示
                    this.loadGameMilestones(gameType);
                    return;
                }
                
                // 切换里程碑显示
                this.loadGameMilestones(gameType);
                
                if (gameType === 'word-challenge') {
                    this.startWordChallenge();
                } else if (gameType === 'time-challenge') {
                    this.startTimeChallenge();
                } else if (gameType === 'combo-rewards') {
                    this.startComboRewards();
                } else if (gameType === 'ai-battle') {
                    this.startAIBattle();
                    } else if (gameType === 'word-blitz') {
                        this.startWordBlitz();
                    } else if (gameType === 'word-match') {
                        this.startWordMatch();
                    }
                });
        });
    }

    async loadGameMilestones(gameType = 'word-challenge') {
        try {
            this.currentGameType = gameType; // 更新当前游戏类型
            const stats = await this.api.getGameStats('wendy', gameType); // 默认用户名，按游戏类型查询
            if (stats.success) {
                document.getElementById('total-games-played').textContent = stats.total_games || 0;
                document.getElementById('total-questions-answered').textContent = stats.total_questions || 0;
                document.getElementById('highest-score').textContent = stats.highest_score || 0;
                document.getElementById('max-combo').textContent = stats.max_combo || 0;
            }
        } catch (error) {
            console.error('加载游戏里程碑失败:', error);
        }
    }

    async startWordChallenge() {
        // 如果游戏实例不存在，创建它
        if (!this.wordChallengeGame) {
            if (typeof WordChallengeGame !== 'undefined') {
                this.wordChallengeGame = new WordChallengeGame(this.api, this);
            } else {
                console.error('WordChallengeGame类未加载');
                this.showNotification('游戏加载失败，请刷新页面重试', 'error');
                return;
            }
        }
        
        // 启动游戏
        await this.wordChallengeGame.start();
    }

    async startTimeChallenge() {
        // 如果游戏实例不存在，创建它
        if (!this.timeChallengeGame) {
            if (typeof TimeChallengeGame !== 'undefined') {
                this.timeChallengeGame = new TimeChallengeGame(this.api, this);
            } else {
                console.error('TimeChallengeGame类未加载');
                this.showNotification('游戏加载失败，请刷新页面重试', 'error');
                return;
            }
        }
        
        // 启动游戏
        await this.timeChallengeGame.start();
    }

    async startComboRewards() {
        // 如果游戏实例不存在，创建它
        if (!this.comboRewardsGame) {
            if (typeof ComboRewardsGame !== 'undefined') {
                this.comboRewardsGame = new ComboRewardsGame(this.api, this);
            } else {
                console.error('ComboRewardsGame类未加载');
                this.showNotification('游戏加载失败，请刷新页面重试', 'error');
                return;
            }
        }
        
        // 启动游戏
        await this.comboRewardsGame.start();
    }

    async startAIBattle() {
        // 如果游戏实例不存在，创建它
        if (!this.aiBattleGame) {
            if (typeof AIBattleGame !== 'undefined') {
                this.aiBattleGame = new AIBattleGame(this.api, this);
            } else {
                console.error('AIBattleGame类未加载');
                this.showNotification('游戏加载失败，请刷新页面重试', 'error');
                return;
            }
        }
        
        // 启动游戏
        await this.aiBattleGame.start();
    }

    async startWordBlitz() {
        // 如果游戏实例不存在，创建它
        if (!this.wordBlitzGame) {
            if (typeof WordBlitzGame !== 'undefined') {
                this.wordBlitzGame = new WordBlitzGame(this.api, this);
            } else {
                console.error('WordBlitzGame类未加载');
                this.showNotification('游戏加载失败，请刷新页面重试', 'error');
                return;
            }
        }
        
        // 启动游戏
        await this.wordBlitzGame.start();
    }

    async startWordMatch() {
        // 如果游戏实例不存在，创建它
        if (!this.wordMatchGame) {
            if (typeof WordMatchGame !== 'undefined') {
                this.wordMatchGame = new WordMatchGame(this.api, this);
            } else {
                console.error('WordMatchGame类未加载');
                this.showNotification('游戏加载失败，请刷新页面重试', 'error');
                return;
            }
        }
        
        // 启动游戏
        await this.wordMatchGame.start();
    }

    openGameModal() {
        const modal = document.getElementById('game-modal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // 禁止背景滚动
        }
    }

    closeGameModal() {
        const modal = document.getElementById('game-modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // 恢复滚动
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

    updateGameLanguage() {
        const lang = this.currentLanguage;
        const gameTitleZh = document.querySelector('.game-title-zh');
        const gameTitleEn = document.querySelector('.game-title-en');
        const resultTitleZh = document.querySelector('.result-title-zh');
        const resultTitleEn = document.querySelector('.result-title-en');
        
        if (gameTitleZh && gameTitleEn) {
            gameTitleZh.style.display = lang === 'zh' ? 'block' : 'none';
            gameTitleEn.style.display = lang === 'zh' ? 'none' : 'block';
        }
        
        if (resultTitleZh && resultTitleEn) {
            resultTitleZh.style.display = lang === 'zh' ? 'block' : 'none';
            resultTitleEn.style.display = lang === 'zh' ? 'none' : 'block';
        }
        
        // 更新其他游戏文本
        const translations = {
            zh: {
                scoreLabel: '得分',
                comboLabel: '连击',
                progressLabel: '进度',
                questionsLabel: '答题',
                timerLabel: '剩余时间',
                questionHint: '请选择对应的英文单词',
                finalScoreLabel: '最终得分',
                correctCountLabel: '答对题数',
                accuracyLabel: '正确率',
                maxComboLabel: '最高连击',
                speedLabel: '题/分钟',
                wrongLabel: '错误',
                multiplierLabel: '倍数',
                bonusLabel: '连击奖励',
                avgComboLabel: '平均连击',
                roundLabel: '回合',
                targetLabel: '目标',
                playerHealthLabel: '生命值',
                aiHealthLabel: '生命值',
                playerScoreLabel: '得分',
                aiScoreLabel: '得分',
                playerCorrectLabel: '答对',
                aiCorrectLabel: '答对',
                playerComboLabel: '连击',
                aiComboLabel: '连击',
                totalRoundsLabel: '总回合数',
                totalQuestionsLabel: '总答题数',
                healthLabel: '生命值',
                correctLabel: '答对',
                durationLabel: '游戏时长',
                flipLabel: '翻牌',
                timeLabel: '时间',
                matchCountLabel: '配对成功',
                flipCountLabel: '翻牌次数',
                perfectLabel: '完美配对',
                efficiencyLabel: '配对效率',
                playAgainBtn: '再玩一次',
                backToDiscoverBtn: '返回发现',
                // 限时挑战模式选择
                modeTitle: '选择挑战模式',
                easyMode: '简单模式',
                mediumMode: '中等模式',
                hardMode: '困难模式',
                timeBonus: '答对+2秒',
                timeBonusMedium: '答对+1秒',
                noTimeBonus: '无时间奖励',
                // 连击奖励模式选择
                classicMode: '经典模式',
                challengeMode: '挑战模式',
                endlessMode: '无限模式'
            },
            en: {
                scoreLabel: 'Score',
                comboLabel: 'Combo',
                progressLabel: 'Progress',
                questionsLabel: 'Questions',
                timerLabel: 'Time Remaining',
                questionHint: 'Choose the correct English word',
                finalScoreLabel: 'Final Score',
                correctCountLabel: 'Correct',
                accuracyLabel: 'Accuracy',
                maxComboLabel: 'Max Combo',
                speedLabel: 'Q/Min',
                wrongLabel: 'Wrong',
                multiplierLabel: 'Multiplier',
                bonusLabel: 'Combo Bonus',
                avgComboLabel: 'Avg Combo',
                roundLabel: 'Round',
                targetLabel: 'Target',
                healthLabel: 'Health',
                playerHealthLabel: 'Health',
                aiHealthLabel: 'Health',
                playerScoreLabel: 'Score',
                aiScoreLabel: 'Score',
                playerCorrectLabel: 'Correct',
                aiCorrectLabel: 'Correct',
                playerComboLabel: 'Combo',
                aiComboLabel: 'Combo',
                totalRoundsLabel: 'Total Rounds',
                totalQuestionsLabel: 'Total Questions',
                healthLabel: 'Health',
                correctLabel: 'Correct',
                durationLabel: 'Duration',
                flipLabel: 'Flips',
                timeLabel: 'Time',
                matchCountLabel: 'Matches',
                flipCountLabel: 'Flip Count',
                perfectLabel: 'Perfect',
                efficiencyLabel: 'Efficiency',
                playAgainBtn: 'Play Again',
                backToDiscoverBtn: 'Back to Discover',
                // 限时挑战模式选择
                modeTitle: 'Select Challenge Mode',
                easyMode: 'Easy Mode',
                mediumMode: 'Medium Mode',
                hardMode: 'Hard Mode',
                timeBonus: '+2s per correct',
                timeBonusMedium: '+1s per correct',
                noTimeBonus: 'No time bonus',
                // 连击奖励模式选择
                classicMode: 'Classic Mode',
                challengeMode: 'Challenge Mode',
                endlessMode: 'Endless Mode'
            }
        };
        
        const t = translations[lang];
        const scoreLabel = document.getElementById('score-label');
        const comboLabel = document.getElementById('combo-label');
        const progressLabel = document.getElementById('progress-label');
        const questionsLabel = document.getElementById('questions-label');
        const timerLabel = document.getElementById('timer-label');
        const questionHint = document.getElementById('question-hint');
        const finalScoreLabel = document.getElementById('final-score-label');
        const correctCountLabel = document.getElementById('correct-count-label');
        const accuracyLabel = document.getElementById('accuracy-label');
        const maxComboLabel = document.getElementById('max-combo-label');
        const speedLabel = document.getElementById('speed-label');
        const wrongLabel = document.getElementById('wrong-label');
        const multiplierLabel = document.getElementById('multiplier-label');
        const bonusLabel = document.getElementById('bonus-label');
        const avgComboLabel = document.getElementById('avg-combo-label');
        const roundLabel = document.getElementById('round-label');
        const targetLabel = document.getElementById('target-label');
        const playerHealthLabel = document.getElementById('player-health-label');
        const aiHealthLabel = document.getElementById('ai-health-label');
        const playerScoreLabel = document.getElementById('player-score-label');
        const aiScoreLabel = document.getElementById('ai-score-label');
        const playerCorrectLabel = document.getElementById('player-correct-label');
        const aiCorrectLabel = document.getElementById('ai-correct-label');
        const playerComboLabel = document.getElementById('player-combo-label');
        const aiComboLabel = document.getElementById('ai-combo-label');
        const totalRoundsLabel = document.getElementById('total-rounds-label');
        const totalQuestionsLabel = document.getElementById('total-questions-label');
        const healthLabel = document.getElementById('health-label');
        const correctLabel = document.getElementById('correct-label');
        const durationLabel = document.getElementById('duration-label');
        const flipLabel = document.getElementById('flip-label');
        const timeLabel = document.getElementById('time-label');
        const matchCountLabel = document.getElementById('match-count-label');
        const flipCountLabel = document.getElementById('flip-count-label');
        const perfectLabel = document.getElementById('perfect-label');
        const efficiencyLabel = document.getElementById('efficiency-label');
        const playAgainBtn = document.getElementById('play-again-btn');
        const backToDiscoverBtn = document.getElementById('back-to-discover-btn');
        
        // 模式选择界面
        const modeTitleZh = document.querySelector('.mode-title-zh');
        const modeTitleEn = document.querySelector('.mode-title-en');
        const modeNameZh = document.querySelectorAll('.mode-name-zh');
        const modeNameEn = document.querySelectorAll('.mode-name-en');
        const modeTimeZh = document.querySelectorAll('.mode-time-zh');
        const modeTimeEn = document.querySelectorAll('.mode-time-en');
        const modeBonusZh = document.querySelectorAll('.mode-bonus-zh');
        const modeBonusEn = document.querySelectorAll('.mode-bonus-en');
        
        if (scoreLabel && t.scoreLabel) scoreLabel.textContent = t.scoreLabel;
        if (comboLabel && t.comboLabel) comboLabel.textContent = t.comboLabel;
        if (progressLabel && t.progressLabel) progressLabel.textContent = t.progressLabel;
        if (questionsLabel && t.questionsLabel) questionsLabel.textContent = t.questionsLabel;
        if (timerLabel && t.timerLabel) timerLabel.textContent = t.timerLabel;
        if (questionHint && t.questionHint) questionHint.textContent = t.questionHint;
        if (finalScoreLabel && t.finalScoreLabel) finalScoreLabel.textContent = t.finalScoreLabel;
        if (correctCountLabel && t.correctCountLabel) correctCountLabel.textContent = t.correctCountLabel;
        if (accuracyLabel && t.accuracyLabel) accuracyLabel.textContent = t.accuracyLabel;
        if (maxComboLabel && t.maxComboLabel) maxComboLabel.textContent = t.maxComboLabel;
        if (speedLabel && t.speedLabel) speedLabel.textContent = t.speedLabel;
        if (wrongLabel && t.wrongLabel) wrongLabel.textContent = t.wrongLabel;
        if (multiplierLabel && t.multiplierLabel) multiplierLabel.textContent = t.multiplierLabel;
        if (bonusLabel && t.bonusLabel) bonusLabel.textContent = t.bonusLabel;
        if (avgComboLabel && t.avgComboLabel) avgComboLabel.textContent = t.avgComboLabel;
        if (roundLabel && t.roundLabel) roundLabel.textContent = t.roundLabel;
        if (targetLabel && t.targetLabel) targetLabel.textContent = t.targetLabel;
        if (playerHealthLabel && t.playerHealthLabel) playerHealthLabel.textContent = t.playerHealthLabel;
        if (aiHealthLabel && t.aiHealthLabel) aiHealthLabel.textContent = t.aiHealthLabel;
        if (playerScoreLabel && t.playerScoreLabel) playerScoreLabel.textContent = t.playerScoreLabel;
        if (aiScoreLabel && t.aiScoreLabel) aiScoreLabel.textContent = t.aiScoreLabel;
        if (playerCorrectLabel && t.playerCorrectLabel) playerCorrectLabel.textContent = t.playerCorrectLabel;
        if (aiCorrectLabel && t.aiCorrectLabel) aiCorrectLabel.textContent = t.aiCorrectLabel;
        if (playerComboLabel && t.playerComboLabel) playerComboLabel.textContent = t.playerComboLabel;
        if (aiComboLabel && t.aiComboLabel) aiComboLabel.textContent = t.aiComboLabel;
        if (totalRoundsLabel && t.totalRoundsLabel) totalRoundsLabel.textContent = t.totalRoundsLabel;
        if (totalQuestionsLabel && t.totalQuestionsLabel) totalQuestionsLabel.textContent = t.totalQuestionsLabel;
        if (healthLabel && t.healthLabel) healthLabel.textContent = t.healthLabel;
        if (correctLabel && t.correctLabel) correctLabel.textContent = t.correctLabel;
        if (durationLabel && t.durationLabel) durationLabel.textContent = t.durationLabel;
        if (flipLabel && t.flipLabel) flipLabel.textContent = t.flipLabel;
        if (timeLabel && t.timeLabel) timeLabel.textContent = t.timeLabel;
        if (matchCountLabel && t.matchCountLabel) matchCountLabel.textContent = t.matchCountLabel;
        if (flipCountLabel && t.flipCountLabel) flipCountLabel.textContent = t.flipCountLabel;
        if (perfectLabel && t.perfectLabel) perfectLabel.textContent = t.perfectLabel;
        if (efficiencyLabel && t.efficiencyLabel) efficiencyLabel.textContent = t.efficiencyLabel;
        if (playAgainBtn && t.playAgainBtn) playAgainBtn.textContent = t.playAgainBtn;
        if (backToDiscoverBtn && t.backToDiscoverBtn) backToDiscoverBtn.textContent = t.backToDiscoverBtn;
        
        // 更新模式选择界面语言
        if (modeTitleZh && modeTitleEn) {
            modeTitleZh.style.display = lang === 'zh' ? 'block' : 'none';
            modeTitleEn.style.display = lang === 'zh' ? 'none' : 'block';
            if (t.modeTitle) {
                modeTitleZh.textContent = t.modeTitle;
                modeTitleEn.textContent = t.modeTitle;
            }
        }
        
        modeNameZh.forEach((el, index) => {
            if (el && modeNameEn[index]) {
                el.style.display = lang === 'zh' ? 'block' : 'none';
                modeNameEn[index].style.display = lang === 'zh' ? 'none' : 'block';
            }
        });
        
        modeTimeZh.forEach((el, index) => {
            if (el && modeTimeEn[index]) {
                el.style.display = lang === 'zh' ? 'block' : 'none';
                modeTimeEn[index].style.display = lang === 'zh' ? 'none' : 'block';
            }
        });
        
        modeBonusZh.forEach((el, index) => {
            if (el && modeBonusEn[index]) {
                el.style.display = lang === 'zh' ? 'block' : 'none';
                modeBonusEn[index].style.display = lang === 'zh' ? 'none' : 'block';
            }
        });
    }

    switchToTab(tabName) {
        // 移除所有活跃状态
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // 激活指定页签
        const tabElement = document.querySelector(`[data-tab="${tabName}"]`);
        const contentElement = document.getElementById(`${tabName}-tab`);
        
        if (tabElement) tabElement.classList.add('active');
        if (contentElement) contentElement.classList.add('active');
        
        // 如果是发现页，加载游戏里程碑和渲染游戏卡片
        if (tabName === 'discover') {
            this.loadGameMilestones('word-challenge'); // 默认显示单词挑战的里程碑
            // 延迟渲染，确保DOM已加载
            setTimeout(() => {
                this.renderGameCards();
            }, 100);
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