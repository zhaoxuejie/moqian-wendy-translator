#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepSeek AI API配置文件
用于集成DeepSeek大模型服务
"""

import os
import requests
import json
from typing import Dict, Optional

class DeepSeekConfig:
    """DeepSeek API配置类"""
    
    def __init__(self):
        self.api_key = None
        self.base_url = "https://api.deepseek.com/v1"
        self.model = "deepseek-chat"
        self.max_tokens = 2000
        self.temperature = 0.7
        self.load_config()
    
    def load_config(self):
        """加载DeepSeek API配置"""
        # 从环境变量加载
        self.api_key = os.getenv('DEEPSEEK_API_KEY')
        
        # 如果环境变量没有，尝试从配置文件加载
        if not self.api_key:
            try:
                config_file = os.path.join(os.path.dirname(__file__), 'deepseek_config.json')
                if os.path.exists(config_file):
                    with open(config_file, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                        self.api_key = config.get('api_key')
                        self.base_url = config.get('base_url', self.base_url)
                        self.model = config.get('model', self.model)
                        self.max_tokens = config.get('max_tokens', self.max_tokens)
                        self.temperature = config.get('temperature', self.temperature)
            except Exception as e:
                print(f"⚠️ DeepSeek配置文件加载失败: {e}")
        
        # 验证配置
        if self.api_key:
            print(f"✅ DeepSeek API配置已加载 (模型: {self.model})")
        else:
            print("ℹ️ DeepSeek API未配置，请设置DEEPSEEK_API_KEY环境变量或创建配置文件")
    
    def is_configured(self) -> bool:
        """检查是否已配置API Key"""
        return bool(self.api_key)
    
    def get_headers(self) -> Dict[str, str]:
        """获取API请求头"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

class DeepSeekService:
    """DeepSeek AI服务类"""
    
    def __init__(self):
        self.config = DeepSeekConfig()
    
    def chat(self, message: str, context: str = "") -> Dict:
        """
        调用DeepSeek API进行对话
        
        Args:
            message: 用户消息
            context: 上下文信息
            
        Returns:
            包含回复结果的字典
        """
        print(f"🤖 DeepSeek API调用开始")
        print(f"📝 用户消息: {message}")
        print(f"📚 上下文: {context}")
        
        if not self.config.is_configured():
            print("❌ DeepSeek API未配置")
            return {
                'success': False,
                'error': 'DeepSeek API未配置',
                'response': '抱歉，AI服务暂时不可用。请联系管理员配置API密钥。'
            }
        
        try:
            print(f"🔧 配置信息: 模型={self.config.model}, base_url={self.config.base_url}")
            
            # 构建系统提示词
            system_prompt = self._build_system_prompt(context)
            print(f"💭 系统提示词长度: {len(system_prompt)} 字符")
            
            # 构建请求数据
            payload = {
                "model": self.config.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                "max_tokens": self.config.max_tokens,
                "temperature": self.config.temperature
            }
            
            print(f"📤 发送请求到: {self.config.base_url}/chat/completions")
            print(f"📋 请求参数: model={self.config.model}, max_tokens={self.config.max_tokens}, temperature={self.config.temperature}")
            
            # 发送请求
            response = requests.post(
                f"{self.config.base_url}/chat/completions",
                headers=self.config.get_headers(),
                json=payload,
                timeout=30
            )
            
            print(f"📥 响应状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                ai_response = data['choices'][0]['message']['content']
                usage = data.get('usage', {})
                
                print(f"✅ API调用成功")
                print(f"💬 AI回复长度: {len(ai_response)} 字符")
                print(f"📊 Token使用: {usage}")
                print(f"🎯 回复预览: {ai_response[:100]}...")
                
                return {
                    'success': True,
                    'response': ai_response,
                    'model': self.config.model,
                    'usage': usage
                }
            else:
                error_msg = f"API请求失败: {response.status_code}"
                print(f"❌ API错误响应: {response.text}")
                
                try:
                    error_data = response.json()
                    error_detail = error_data.get('error', {}).get('message', '未知错误')
                    error_msg += f" - {error_detail}"
                    print(f"❌ 错误详情: {error_detail}")
                except:
                    error_msg += " - 响应解析失败"
                    print("❌ 无法解析错误响应")
                
                return {
                    'success': False,
                    'error': error_msg,
                    'response': '抱歉，AI服务暂时出现问题，请稍后再试。'
                }
                
        except requests.Timeout as e:
            print(f"⏰ 请求超时异常: {e}")
            return {
                'success': False,
                'error': '请求超时',
                'response': '抱歉，AI响应超时，请稍后再试。'
            }
        except Exception as e:
            print(f"💥 未预期的异常: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'服务异常: {str(e)}',
                'response': '抱歉，AI服务出现异常，请稍后再试。'
            }
    
    def _build_system_prompt(self, context: str = "") -> str:
        """构建系统提示词"""
        base_prompt = """你是温蒂的AI学习助手，专门帮助小学生学习英语。你的特点是：
1. 语言简单易懂，适合小学生理解
2. 回答生动有趣，充满鼓励
3. 善于用比喻和例子解释概念
4. 对学习问题有耐心和爱心
5. 回答要简洁明了，不要太长

请用温暖、友好的语调回答问题。"""
        
        if context:
            base_prompt += f"\n\n当前学习上下文：{context}"
        
        return base_prompt

# 创建全局服务实例
deepseek_service = DeepSeekService()

# 导出配置
DEEPSEEK_API_KEY = deepseek_service.config.api_key if deepseek_service.config.is_configured() else None