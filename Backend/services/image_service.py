"""
图片服务模块
使用Pixabay API获取单词相关图片
"""

import requests
from typing import Dict, Optional, List

class ImageService:
    """图片服务类"""
    
    def __init__(self):
        # Pixabay API配置
        # 注意：Pixabay API可以不用key，但建议申请key以获得更高限额
        # 免费额度：5000次/小时（无key），更高额度需要key
        self.api_key = "53961882-70cea595a55e0219583084276"  # 可选，申请后填入
        self.base_url = "https://pixabay.com/api/"
        
    def set_api_key(self, api_key: str):
        """设置Pixabay API Key（可选）"""
        self.api_key = api_key
        print("✅ 已配置Pixabay API Key")
    
    def search_image(self, keyword: str, lang: str = 'zh', per_page: int = 3) -> Dict:
        """
        搜索图片
        Args:
            keyword: 搜索关键词（可以是英文单词或中文）
            lang: 语言代码 ('zh'中文, 'en'英文等)
            per_page: 返回图片数量（最多200）
        Returns:
            包含图片信息的字典
        """
        # 清理关键词：移除特殊字符和前缀
        import re
        keyword = keyword.strip()
        # 移除 [翻译]、[英] 等前缀
        keyword = re.sub(r'^\[.*?\]\s*', '', keyword)
        # 移除其他特殊字符（保留字母、数字、中文、空格、连字符）
        if lang == 'zh':
            keyword = re.sub(r'[^\w\s\u4e00-\u9fff-]', '', keyword)
        else:
            keyword = re.sub(r'[^\w\s-]', '', keyword)
        keyword = keyword.strip()
        
        if not keyword:
            return {
                'success': False,
                'error': '关键词为空或无效',
                'keyword': keyword
            }
        
        print(f"\n{'='*60}")
        print(f"🖼️  [图片服务] 搜索图片: '{keyword}' (语言: {lang})")
        print(f"{'='*60}")
        
        try:
            # 构建请求参数
            # 注意：Pixabay API需要key，但可以使用demo key进行测试
            # 建议申请自己的API key：https://pixabay.com/api/docs/
            params = {
                'key': self.api_key if self.api_key else '9656065-a4094594c34c9ac8c7df4e39b',  # demo key，建议替换
                'q': keyword,
                'image_type': 'photo',  # photo, illustration, vector
                'orientation': 'horizontal',  # horizontal, vertical, all
                'category': '',  # 可选：backgrounds, fashion, nature, science, education等
                'min_width': 200,
                'min_height': 200,
                'safesearch': 'true',  # 安全搜索，适合教育场景
                'per_page': per_page,
                'lang': lang if lang == 'zh' else 'en'  # 支持中文搜索
            }
            
            print(f"📡 [Pixabay] 发送请求...")
            response = requests.get(self.base_url, params=params, timeout=10)
            
            print(f"📥 [Pixabay] 响应状态: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                total = data.get('total', 0)
                hits = data.get('hits', [])
                
                print(f"✅ [Pixabay] 找到 {total} 张图片，返回 {len(hits)} 张")
                
                if hits:
                    # 返回第一张图片（质量最好）
                    first_image = hits[0]
                    image_url = first_image.get('webformatURL', '')  # 中等尺寸
                    large_image_url = first_image.get('largeImageURL', '')  # 大尺寸
                    preview_url = first_image.get('previewURL', '')  # 预览图
                    
                    # 返回所有找到的图片（供前端选择）
                    image_list = []
                    for hit in hits[:per_page]:
                        image_list.append({
                            'id': hit.get('id'),
                            'preview': hit.get('previewURL', ''),
                            'webformat': hit.get('webformatURL', ''),
                            'large': hit.get('largeImageURL', ''),
                            'tags': hit.get('tags', ''),
                            'user': hit.get('user', ''),
                            'likes': hit.get('likes', 0),
                            'views': hit.get('views', 0)
                        })
                    
                    return {
                        'success': True,
                        'keyword': keyword,
                        'total': total,
                        'image_url': image_url,
                        'large_image_url': large_image_url,
                        'preview_url': preview_url,
                        'images': image_list,
                        'source': 'pixabay'
                    }
                else:
                    print(f"⚠️  [Pixabay] 未找到相关图片")
                    return {
                        'success': False,
                        'error': '未找到相关图片',
                        'keyword': keyword
                    }
            else:
                # 尝试解析错误信息
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', f'HTTP {response.status_code}')
                    print(f"❌ [Pixabay] 请求失败: {response.status_code}, 错误: {error_msg}")
                except:
                    error_msg = response.text[:200] if response.text else f'HTTP {response.status_code}'
                    print(f"❌ [Pixabay] 请求失败: {response.status_code}, 响应: {error_msg}")
                
                return {
                    'success': False,
                    'error': f'API请求失败: {response.status_code}',
                    'keyword': keyword,
                    'details': error_msg if 'error_msg' in locals() else None
                }
                
        except requests.exceptions.Timeout:
            print(f"⏱️  [Pixabay] 请求超时")
            return {
                'success': False,
                'error': '请求超时，请稍后重试',
                'keyword': keyword
            }
        except requests.exceptions.RequestException as e:
            print(f"❌ [Pixabay] 请求异常: {e}")
            return {
                'success': False,
                'error': f'网络错误: {str(e)}',
                'keyword': keyword
            }
        except Exception as e:
            print(f"💥 [Pixabay] 未知错误: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'服务异常: {str(e)}',
                'keyword': keyword
            }
    
    def get_service_status(self) -> Dict:
        """获取服务状态"""
        return {
            'service': 'pixabay',
            'configured': bool(self.api_key),
            'has_key': bool(self.api_key)
        }

# 创建全局实例
image_service = ImageService()

