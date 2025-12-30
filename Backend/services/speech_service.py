"""
语音识别服务模块
使用百度语音识别API进行语音转文字
"""

import requests
import base64
import json
import time
from typing import Dict, Optional

class SpeechService:
    """百度语音识别服务类"""
    
    def __init__(self):
        # 百度语音识别API配置
        self.app_id = None
        self.api_key = None
        self.secret_key = None
        self.token_url = "https://openapi.baidu.com/oauth/2.0/token"
        self.asr_url = "https://vop.baidu.com/server_api"
        self.access_token = None
        self.token_expire_time = 0
        
    def set_config(self, app_id: str, api_key: str, secret_key: str):
        """设置百度语音识别API配置"""
        self.app_id = app_id
        self.api_key = api_key
        self.secret_key = secret_key
        print("✅ 已配置百度语音识别API")
    
    def get_access_token(self) -> Optional[str]:
        """获取访问令牌（带缓存，有效期30天）"""
        # 如果token还有效，直接返回
        if self.access_token and time.time() < self.token_expire_time:
            return self.access_token
        
        if not self.api_key or not self.secret_key:
            print("❌ 百度语音识别API未配置")
            return None
        
        try:
            params = {
                'grant_type': 'client_credentials',
                'client_id': self.api_key,
                'client_secret': self.secret_key
            }
            
            print(f"🔑 [百度语音] 获取访问令牌...")
            response = requests.post(self.token_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get('access_token')
                expires_in = data.get('expires_in', 2592000)  # 默认30天
                self.token_expire_time = time.time() + expires_in - 300  # 提前5分钟刷新
                print(f"✅ [百度语音] 访问令牌获取成功，有效期: {expires_in}秒")
                return self.access_token
            else:
                print(f"❌ [百度语音] 获取访问令牌失败: {response.status_code}, {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ [百度语音] 获取访问令牌异常: {e}")
            return None
    
    def recognize_audio(self, audio_data: bytes, format: str = 'wav', rate: int = 16000, 
                        language: str = 'en') -> Dict:
        """
        识别音频文件
        
        Args:
            audio_data: 音频文件的二进制数据
            format: 音频格式 (wav, pcm, amr, m4a等)
            rate: 采样率 (8000, 16000等)
            language: 语言类型 ('en'英文, 'zh'中文)
        
        Returns:
            包含识别结果的字典
        """
        if not audio_data:
            return {
                'success': False,
                'error': '音频数据为空'
            }
        
        # 获取访问令牌
        token = self.get_access_token()
        if not token:
            return {
                'success': False,
                'error': '无法获取访问令牌，请检查API配置'
            }
        
        try:
            # 将音频数据编码为base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            # 语言代码映射
            lang_map = {
                'en': 'en',
                'zh': 'zh',
                'zh-CN': 'zh'
            }
            lang_code = lang_map.get(language, 'en')
            
            # 构建请求数据
            data = {
                'format': format,
                'rate': rate,
                'channel': 1,  # 单声道
                'cuid': 'wendy-translator',
                'len': len(audio_data),
                'speech': audio_base64,
                'token': token,
                'dev_pid': 1737 if lang_code == 'en' else 1537  # 1737=英文, 1537=中文
            }
            
            print(f"🎤 [百度语音] 识别音频 (格式: {format}, 采样率: {rate}, 语言: {lang_code})")
            print(f"📊 [百度语音] 音频大小: {len(audio_data)} 字节")
            
            response = requests.post(self.asr_url, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                err_no = result.get('err_no', -1)
                
                if err_no == 0:
                    # 识别成功
                    result_text = result.get('result', [])
                    if result_text and len(result_text) > 0:
                        text = result_text[0].strip()
                        print(f"✅ [百度语音] 识别成功: {text}")
                        return {
                            'success': True,
                            'text': text,
                            'raw_result': result
                        }
                    else:
                        print(f"⚠️  [百度语音] 识别结果为空")
                        return {
                            'success': False,
                            'error': '未识别到内容，请重试'
                        }
                else:
                    error_msg = result.get('err_msg', '未知错误')
                    print(f"❌ [百度语音] 识别失败: err_no={err_no}, {error_msg}")
                    
                    # 根据错误码提供更友好的错误提示
                    user_friendly_error = error_msg
                    if err_no == 3305:
                        user_friendly_error = '请求量过多，可能是免费额度已用完或请求频率过高。请检查：1) 账户是否已实名认证 2) 是否超出免费额度 3) 是否请求过于频繁'
                    elif err_no == 3301:
                        user_friendly_error = '音频格式错误，请检查音频格式和采样率'
                    elif err_no == 3302:
                        user_friendly_error = '音频数据为空'
                    elif err_no == 3303:
                        user_friendly_error = '音频解码失败'
                    elif err_no == 3304:
                        user_friendly_error = '音频时长过长，请控制在60秒以内'
                    elif err_no == 3307:
                        user_friendly_error = '音频数据不完整'
                    elif err_no == 3308:
                        user_friendly_error = '音频采样率错误'
                    elif err_no == 3309:
                        user_friendly_error = '音频格式不支持'
                    elif err_no == 3310:
                        user_friendly_error = '音频时长过短'
                    elif err_no == 3311:
                        user_friendly_error = '音频数据损坏'
                    elif err_no == 3312:
                        user_friendly_error = '音频格式转换失败'
                    elif err_no == 3313:
                        user_friendly_error = '音频采样率转换失败'
                    elif err_no == 3314:
                        user_friendly_error = '音频声道数错误'
                    elif err_no == 3315:
                        user_friendly_error = '音频比特率错误'
                    elif err_no == 3316:
                        user_friendly_error = '音频编码格式错误'
                    elif err_no == 3317:
                        user_friendly_error = '音频文件过大'
                    elif err_no == 3318:
                        user_friendly_error = '音频文件过小'
                    elif err_no == 3319:
                        user_friendly_error = '音频文件损坏'
                    elif err_no == 3320:
                        user_friendly_error = '音频文件格式不支持'
                    
                    return {
                        'success': False,
                        'error': user_friendly_error,
                        'err_no': err_no,
                        'err_msg': error_msg
                    }
            else:
                print(f"❌ [百度语音] API请求失败: {response.status_code}, {response.text}")
                return {
                    'success': False,
                    'error': f'API请求失败: {response.status_code}'
                }
                
        except requests.exceptions.Timeout:
            print(f"⏱️  [百度语音] 请求超时")
            return {
                'success': False,
                'error': '请求超时，请稍后重试'
            }
        except Exception as e:
            print(f"💥 [百度语音] 识别异常: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'服务异常: {str(e)}'
            }
    
    def get_service_status(self) -> Dict:
        """获取服务状态"""
        return {
            'service': 'baidu_speech',
            'configured': bool(self.api_key and self.secret_key),
            'has_token': bool(self.access_token)
        }

# 创建全局实例
speech_service = SpeechService()

