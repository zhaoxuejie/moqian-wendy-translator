"""
OCR文字识别服务模块
使用百度OCR API进行图片文字识别
"""

import requests
import base64
import json
import time
from typing import Dict, Optional

class OCRService:
    """百度OCR文字识别服务类"""
    
    def __init__(self):
        # 百度OCR API配置
        self.api_key = None
        self.secret_key = None
        self.token_url = "https://aip.baidubce.com/oauth/2.0/token"
        self.general_ocr_url = "https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic"  # 通用文字识别
        self.accurate_ocr_url = "https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic"  # 高精度版
        self.access_token = None
        self.token_expire_time = 0
        
    def set_config(self, api_key: str, secret_key: str):
        """设置百度OCR API配置"""
        self.api_key = api_key
        self.secret_key = secret_key
        print("✅ 已配置百度OCR API")
    
    def get_access_token(self) -> Optional[str]:
        """获取访问令牌（带缓存，有效期30天）"""
        # 如果token还有效，直接返回
        if self.access_token and time.time() < self.token_expire_time:
            return self.access_token
        
        if not self.api_key or not self.secret_key:
            print("❌ 百度OCR API未配置")
            return None
        
        try:
            params = {
                'grant_type': 'client_credentials',
                'client_id': self.api_key,
                'client_secret': self.secret_key
            }
            
            print(f"🔑 [百度OCR] 获取访问令牌...")
            response = requests.post(self.token_url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get('access_token')
                expires_in = data.get('expires_in', 2592000)  # 默认30天
                self.token_expire_time = time.time() + expires_in - 300  # 提前5分钟刷新
                print(f"✅ [百度OCR] 访问令牌获取成功，有效期: {expires_in}秒")
                return self.access_token
            else:
                print(f"❌ [百度OCR] 获取访问令牌失败: {response.status_code}, {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ [百度OCR] 获取访问令牌异常: {e}")
            return None
    
    def recognize_text(self, image_data: bytes, accurate: bool = False, 
                      language_type: str = 'ENG') -> Dict:
        """
        识别图片中的文字
        
        Args:
            image_data: 图片文件的二进制数据
            accurate: 是否使用高精度版（True=高精度，False=标准版）
            language_type: 语言类型 ('ENG'英文, 'CHN_ENG'中英文混合, 'JAP'日文等)
        
        Returns:
            包含识别结果的字典
        """
        if not image_data:
            return {
                'success': False,
                'error': '图片数据为空'
            }
        
        # 获取访问令牌
        token = self.get_access_token()
        if not token:
            return {
                'success': False,
                'error': '无法获取访问令牌，请检查API配置'
            }
        
        try:
            # 将图片数据编码为base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # 选择API地址
            ocr_url = self.accurate_ocr_url if accurate else self.general_ocr_url
            
            # 构建请求参数
            params = {
                'access_token': token
            }
            
            data = {
                'image': image_base64,
                'language_type': language_type,
                'detect_direction': 'true',  # 检测图片方向
                'detect_language': 'true',   # 检测语言类型
                'paragraph': 'false',        # 不输出段落信息
                'probability': 'false'       # 不输出置信度
            }
            
            print(f"📷 [百度OCR] 识别图片 (高精度: {accurate}, 语言: {language_type})")
            print(f"📊 [百度OCR] 图片大小: {len(image_data)} 字节")
            
            response = requests.post(ocr_url, params=params, data=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                
                # 检查是否有错误
                if 'error_code' in result:
                    error_code = result.get('error_code')
                    error_msg = result.get('error_msg', '未知错误')
                    print(f"❌ [百度OCR] 识别失败: error_code={error_code}, {error_msg}")
                    
                    # 根据错误码提供友好提示
                    user_friendly_error = error_msg
                    if error_code == 18:
                        user_friendly_error = 'QPS超限额，请求过于频繁，请稍后重试'
                    elif error_code == 19:
                        user_friendly_error = '请求总量超限额，免费额度已用完'
                    elif error_code == 100:
                        user_friendly_error = '无效的access_token参数'
                    elif error_code == 110:
                        user_friendly_error = 'access_token无效或已过期'
                    elif error_code == 111:
                        user_friendly_error = 'access_token过期'
                    
                    return {
                        'success': False,
                        'error': user_friendly_error,
                        'error_code': error_code,
                        'error_msg': error_msg
                    }
                
                # 解析识别结果
                words_result = result.get('words_result', [])
                if words_result and len(words_result) > 0:
                    # 提取所有文字
                    texts = [item.get('words', '') for item in words_result]
                    full_text = ' '.join(texts).strip()
                    
                    print(f"✅ [百度OCR] 识别成功: {full_text}")
                    return {
                        'success': True,
                        'text': full_text,
                        'words': texts,  # 逐行文字列表
                        'raw_result': result
                    }
                else:
                    print(f"⚠️  [百度OCR] 未识别到文字")
                    return {
                        'success': False,
                        'error': '未识别到文字，请确保图片清晰且包含文字'
                    }
            else:
                print(f"❌ [百度OCR] API请求失败: {response.status_code}, {response.text}")
                return {
                    'success': False,
                    'error': f'API请求失败: {response.status_code}'
                }
                
        except requests.exceptions.Timeout:
            print(f"⏱️  [百度OCR] 请求超时")
            return {
                'success': False,
                'error': '请求超时，请稍后重试'
            }
        except Exception as e:
            print(f"💥 [百度OCR] 识别异常: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'服务异常: {str(e)}'
            }
    
    def get_service_status(self) -> Dict:
        """获取服务状态"""
        return {
            'service': 'baidu_ocr',
            'configured': bool(self.api_key and self.secret_key),
            'has_token': bool(self.access_token)
        }

# 创建全局实例
ocr_service = OCRService()

