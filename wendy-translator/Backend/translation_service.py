"""
翻译服务模块
支持多种翻译API接口
"""

import requests
import hashlib
import random
import time
import json
from typing import Dict, Optional, List

class TranslationService:
    """翻译服务类"""
    
    def __init__(self):
        # 百度翻译API配置 (需要在环境变量或配置文件中设置)
        self.baidu_appid = None  # 百度翻译APP ID
        self.baidu_secret = None # 百度翻译密钥
        self.baidu_url = "https://fanyi-api.baidu.com/api/trans/vip/translate"
        
        # 有道翻译API配置
        self.youdao_app_key = None
        self.youdao_app_secret = None
        self.youdao_url = "https://openapi.youdao.com/api"
        
        # 腾讯翻译API配置
        self.tencent_secretid = None
        self.tencent_secretkey = None
        
        # 当前使用的翻译服务
        self.current_service = "mock"  # mock, baidu, youdao, tencent
        
    def set_baidu_config(self, appid: str, secret: str):
        """设置百度翻译配置"""
        self.baidu_appid = appid
        self.baidu_secret = secret
        self.current_service = "baidu"
        print("✅ 已配置百度翻译API")
        
    def set_youdao_config(self, app_key: str, app_secret: str):
        """设置有道翻译配置"""
        self.youdao_app_key = app_key
        self.youdao_app_secret = app_secret
        self.current_service = "youdao"
        print("✅ 已配置有道翻译API")
        
    def translate(self, text: str, from_lang: str = "auto", to_lang: str = "zh") -> Dict:
        """
        翻译文本
        Args:
            text: 待翻译文本
            from_lang: 源语言 (auto, en, zh等)
            to_lang: 目标语言 (zh, en等)
        Returns:
            翻译结果字典
        """
        if self.current_service == "baidu":
            return self._translate_baidu(text, from_lang, to_lang)
        elif self.current_service == "youdao":
            return self._translate_youdao(text, from_lang, to_lang)
        elif self.current_service == "tencent":
            return self._translate_tencent(text, from_lang, to_lang)
        else:
            return self._translate_mock(text, from_lang, to_lang)
    
    def _translate_baidu(self, text: str, from_lang: str, to_lang: str) -> Dict:
        """百度翻译API"""
        if not self.baidu_appid or not self.baidu_secret:
            return self._get_fallback_result(text)
        
        # 构建请求参数
        salt = str(random.randint(32768, 65536))
        sign_str = self.baidu_appid + text + salt + self.baidu_secret
        sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
        
        params = {
            'appid': self.baidu_appid,
            'q': text,
            'from': from_lang,
            'to': to_lang,
            'salt': salt,
            'sign': sign
        }
        
        try:
            # 打印请求日志
            print(f"🔍 [百度翻译] 请求翻译: '{text}' ({from_lang} -> {to_lang})")
            print(f"   APP ID: {self.baidu_appid[:8]}...")
            print(f"   签名: {sign[:16]}...")
            
            response = requests.get(self.baidu_url, params=params, timeout=5)
            result = response.json()
            
            print(f"📥 [百度翻译] 响应状态: {response.status_code}")
            print(f"   响应内容: {str(result)[:200]}...")
            
            if 'error_code' in result:
                error_code = result.get('error_code')
                error_msg = result.get('error_msg', '未知错误')
                print(f"❌ [百度翻译] 翻译失败!")
                print(f"   错误代码: {error_code}")
                print(f"   错误信息: {error_msg}")
                return self._get_fallback_result(text)
            
            # 解析百度翻译结果
            translation_result = result['trans_result'][0]['dst']
            
            # 打印成功日志
            print(f"✅ [百度翻译] 翻译成功!")
            print(f"   原文: '{text}'")
            print(f"   译文: '{translation_result}'")
            print(f"   方向: {from_lang} -> {to_lang}")
            
            # 尝试获取更多词汇信息（这里简化处理）
            return {
                'translated_text': translation_result,
                'pronunciation': '',  # 百度API不直接提供音标
                'example_sentence': '',
                'example_translation': '',
                'source': 'baidu'
            }
            
        except Exception as e:
            print(f"❌ [百度翻译] 请求异常: {e}")
            return self._get_fallback_result(text)
    
    def _translate_youdao(self, text: str, from_lang: str, to_lang: str) -> Dict:
        """有道翻译API"""
        if not self.youdao_app_key or not self.youdao_app_secret:
            print("❌ [有道翻译] 未配置API密钥，使用回退翻译")
            return self._get_fallback_result(text)
        
        import time
        import uuid
        import base64
        import hashlib
        
        try:
            # 打印请求日志
            print(f"🔍 [有道翻译] 请求翻译: '{text}' ({from_lang} -> {to_lang})")
            print(f"   APP Key: {self.youdao_app_key[:8]}...")
            
            # 构建请求参数
            curtime = str(int(time.time()))
            salt = str(uuid.uuid1())
            
            # 计算input参数（根据有道API规范）
            text_length = len(text)
            if text_length <= 20:
                input_str = text
            else:
                input_str = text[:10] + str(text_length) + text[-10:]
            
            # 有道翻译签名算法 (v3): sha256(appKey + input + salt + curtime + appSecret)
            sign_str = self.youdao_app_key + input_str + salt + curtime + self.youdao_app_secret
            sign = hashlib.sha256(sign_str.encode('utf-8')).hexdigest()
            
            # 语言代码转换
            lang_map = {
                'en': 'en', 'zh': 'zh-CHS', 'auto': 'auto'
            }
            from_lang = lang_map.get(from_lang, from_lang)
            to_lang = lang_map.get(to_lang, to_lang)
            
            params = {
                'q': text,
                'from': from_lang,
                'to': to_lang,
                'appKey': self.youdao_app_key,
                'salt': salt,
                'sign': sign,
                'signType': 'v3',
                'curtime': curtime
            }
            
            print(f"   签名: {sign[:16]}...")
            print(f"   时间戳: {curtime}")
            
            url = "https://openapi.youdao.com/api"
            response = requests.get(url, params=params, timeout=10)
            result = response.json()
            
            print(f"📥 [有道翻译] 响应状态: {response.status_code}")
            print(f"   响应内容: {str(result)[:200]}...")
            
            # 检查错误
            if result.get('errorCode') != '0':
                error_codes = {
                    '108': 'appKey无效',
                    '109': 'batchLog格式不正确',
                    '110': '查询次数不足',
                    '111': '访问IP受限',
                    '201': '缺少必填的参数',
                    '202': '语言不支持',
                    '203': '文本过长',
                    '301': '账户已欠费',
                    '302': '账户未开通',
                    '303': '访问频率受限'
                }
                
                error_code = result.get('errorCode', 'unknown')
                error_msg = result.get('error_msg', '未知错误')
                meaning = error_codes.get(error_code, '未知错误代码')
                
                print(f"❌ [有道翻译] 翻译失败!")
                print(f"   错误代码: {error_code}")
                print(f"   错误信息: {error_msg}")
                print(f"   错误含义: {meaning}")
                return self._get_fallback_result(text)
            
            # 解析翻译结果
            if 'translation' in result and result['translation']:
                translation_result = result['translation'][0]
                
                # 打印成功日志
                print(f"✅ [有道翻译] 翻译成功!")
                print(f"   原文: '{text}'")
                print(f"   译文: '{translation_result}'")
                print(f"   方向: {from_lang} -> {to_lang}")
                
                return {
                    'translated_text': translation_result,
                    'pronunciation': '',  # 有道API在响应中包含音标信息
                    'example_sentence': '',
                    'example_translation': '',
                    'source': 'youdao'
                }
            else:
                print(f"❌ [有道翻译] 响应格式异常")
                return self._get_fallback_result(text)
                
        except Exception as e:
            print(f"❌ [有道翻译] 请求异常: {e}")
            return self._get_fallback_result(text)
    
    def _translate_tencent(self, text: str, from_lang: str, to_lang: str) -> Dict:
        """腾讯翻译API"""
        # 腾讯翻译实现（这里提供框架）
        return self._get_fallback_result(text)
    
    def _translate_mock(self, text: str, from_lang: str, to_lang: str) -> Dict:
        """模拟翻译（当前使用）"""
        # 打印模拟翻译日志
        print(f"📖 [模拟翻译] 请求翻译: '{text}' ({from_lang} -> {to_lang})")
        
        # 保持原有的模拟词典逻辑
        translation_dict = {
            'apple': {'translated': '苹果', 'pronunciation': '/ˈæp.əl/', 'example': 'I like to eat red apples.', 'example_translation': '我喜欢吃红苹果。', 'emoji': '🍎'},
            'cat': {'translated': '猫', 'pronunciation': '/kæt/', 'example': 'The cat is sleeping on the sofa.', 'example_translation': '猫正在沙发上睡觉。', 'emoji': '🐱'},
            'sun': {'translated': '太阳', 'pronunciation': '/sʌn/', 'example': 'The sun is shining brightly today.', 'example_translation': '今天阳光明媚。', 'emoji': '☀️'},
            'book': {'translated': '书', 'pronunciation': '/bʊk/', 'example': 'I am reading an interesting book.', 'example_translation': '我正在读一本有趣的书。', 'emoji': '📚'},
            'flower': {'translated': '花', 'pronunciation': '/ˈflaʊ.ər/', 'example': 'The flowers in the garden are beautiful.', 'example_translation': '花园里的花很美。', 'emoji': '🌸'},
            'house': {'translated': '房子', 'pronunciation': '/haʊs/', 'example': 'They live in a big house.', 'example_translation': '他们住在一所大房子里。', 'emoji': '🏠'},
            'dog': {'translated': '狗', 'pronunciation': '/dɔːɡ/', 'example': 'The dog is playing in the park.', 'example_translation': '狗在公园里玩耍。', 'emoji': '🐕'},
            'tree': {'translated': '树', 'pronunciation': '/triː/', 'example': 'Birds are singing in the tree.', 'example_translation': '鸟儿在树上唱歌。', 'emoji': '🌳'},
            'water': {'translated': '水', 'pronunciation': '/ˈwɔː.tər/', 'example': 'Drink more water every day.', 'example_translation': '每天多喝水。', 'emoji': '💧'},
            'moon': {'translated': '月亮', 'pronunciation': '/muːn/', 'example': 'The moon is very bright tonight.', 'example_translation': '今晚的月亮很亮。', 'emoji': '🌙'}
        }
        
        text_lower = text.lower().strip()
        
        if text_lower in translation_dict:
            result = translation_dict[text_lower]
            return {
                'translated_text': result['translated'],
                'pronunciation': result['pronunciation'],
                'example_sentence': result['example'],
                'example_translation': result['example_translation'],
                'source': 'mock'
            }
        else:
            # 对于未知词汇，返回简单翻译
            return {
                'translated_text': f"[翻译]{text}",
                'pronunciation': '',
                'example_sentence': '',
                'example_translation': '',
                'source': 'mock_fallback'
            }
    
    def _get_fallback_result(self, text: str) -> Dict:
        """当API调用失败时的回退结果"""
        return {
            'translated_text': f"[翻译]{text}",
            'pronunciation': '',
            'example_sentence': '',
            'example_translation': '',
            'source': 'fallback'
        }
    
    def enhance_with_word_info(self, word: str, translation_result: Dict) -> Dict:
        """
        为翻译结果增强词汇信息（音标、例句等）
        可以使用词典API或本地词汇数据库
        """
        # 这里可以集成词典API来获取音标和例句
        # 简化实现：如果是单个英文单词，尝试添加基本信息
        
        if word.strip().count(' ') == 0 and word.isalpha():
            # 单个单词，可以尝试获取更多信息
            try:
                # 这里可以调用词典API
                # 例如：欧路词典API、金山词霸API等
                pass
            except:
                pass
        
        return translation_result
    
    def get_supported_languages(self) -> List[str]:
        """获取支持的语言列表"""
        return ["zh", "en", "ja", "ko", "fr", "de", "es", "ru"]
    
    def get_service_status(self) -> Dict:
        """获取翻译服务状态"""
        return {
            'current_service': self.current_service,
            'baidu_configured': bool(self.baidu_appid and self.baidu_secret),
            'supported_languages': self.get_supported_languages()
        }


# 全局翻译服务实例
translation_service = TranslationService()