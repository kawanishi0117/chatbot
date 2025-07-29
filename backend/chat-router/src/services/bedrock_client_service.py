"""Amazon Bedrock API統合サービス

Claude 3.5 Sonnet/Haikuなどのモデルとの通信を管理
"""

import json
import logging
import time
from typing import Dict, List, Any, Optional
import boto3
from botocore.exceptions import ClientError, BotoCoreError

# Lambda実行環境でのモジュールインポートを確保
try:
    from common.utils import convert_decimal_to_int
except ImportError:
    from ..common.utils import convert_decimal_to_int

# ログ設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class BedrockClientService:
    """Amazon Bedrock API統合サービス"""

    def __init__(self, region: str = 'ap-northeast-1'):
        """初期化
        
        Args:
            region: AWSリージョン
        """
        try:
            self.client = boto3.client('bedrock-runtime', region_name=region)
            self.region = region
            logger.info(f"BedrockClientService initialized for region: {region}")
        except Exception as e:
            logger.error(f"Failed to initialize Bedrock client: {str(e)}")
            raise

    def invoke_model(
        self, 
        model_id: str, 
        messages: List[Dict[str, str]], 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Bedrockモデルを呼び出し
        
        Args:
            model_id: モデルID（例: anthropic.claude-3-5-sonnet-20241022-v2:0）
            messages: 会話履歴（[{"role": "user", "content": "..."}]形式）
            config: モデル設定（maxTokens, temperature等）
            
        Returns:
            dict: AI応答結果
                - content: 生成されたテキスト
                - usage: トークン使用量
                - model: 使用モデル
                - responseTime: 応答時間（ms）
        """
        start_time = time.time()
        
        try:
            # Claude用のリクエストボディを構築
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": config.get('maxTokens', 4096),
                "temperature": config.get('temperature', 0.7),
                "top_p": config.get('topP', 0.9),
                "messages": messages
            }
            
            # システムプロンプトがあれば追加
            system_prompt = config.get('systemPrompt')
            if system_prompt:
                body["system"] = system_prompt
            
            logger.info(
                f"Invoking Bedrock model: {model_id}, "
                f"messages: {len(messages)}, "
                f"max_tokens: {body['max_tokens']}"
            )
            
            # Bedrock API呼び出し
            response = self.client.invoke_model(
                modelId=model_id,
                body=json.dumps(body),
                contentType='application/json',
                accept='application/json'
            )
            
            # レスポンス解析
            response_body = json.loads(response['body'].read())
            
            # 応答時間計算
            response_time = int((time.time() - start_time) * 1000)
            
            # 結果を整形
            result = {
                'content': response_body['content'][0]['text'],
                'usage': response_body.get('usage', {}),
                'model': model_id,
                'responseTime': response_time,
                'success': True
            }
            
            # トークン使用量をintに変換（DynamoDB保存用）
            if 'usage' in result and result['usage']:
                result['usage'] = convert_decimal_to_int(result['usage'])
            
            logger.info(
                f"Bedrock response successful: "
                f"response_time={response_time}ms, "
                f"usage={result['usage']}"
            )
            
            return result
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            
            logger.error(
                f"Bedrock ClientError: {error_code} - {error_message}, "
                f"model: {model_id}"
            )
            
            return {
                'content': '',
                'usage': {},
                'model': model_id,
                'responseTime': int((time.time() - start_time) * 1000),
                'success': False,
                'error': f"Bedrock API error: {error_code} - {error_message}"
            }
            
        except BotoCoreError as e:
            logger.error(f"Bedrock BotoCoreError: {str(e)}, model: {model_id}")
            
            return {
                'content': '',
                'usage': {},
                'model': model_id,
                'responseTime': int((time.time() - start_time) * 1000),
                'success': False,
                'error': f"Bedrock connection error: {str(e)}"
            }
            
        except Exception as e:
            logger.error(f"Unexpected error in Bedrock invocation: {str(e)}")
            
            return {
                'content': '',
                'usage': {},
                'model': model_id,
                'responseTime': int((time.time() - start_time) * 1000),
                'success': False,
                'error': f"Unexpected error: {str(e)}"
            }

    def format_chat_history(
        self, 
        messages: List[Dict[str, str]], 
        limit: int = 10
    ) -> List[Dict[str, str]]:
        """チャット履歴をBedrock形式に変換
        
        Args:
            messages: DynamoDBから取得したメッセージリスト
            limit: 含める会話の最大数
            
        Returns:
            list: Bedrock API用の会話履歴
        """
        try:
            # メッセージを時系列順にソート（SKで昇順）
            sorted_messages = sorted(messages, key=lambda x: x.get('SK', ''))
            
            # 最新のN件のみ使用
            recent_messages = sorted_messages[-limit*2:] if len(sorted_messages) > limit*2 else sorted_messages
            
            # Bedrock形式に変換
            formatted_messages = []
            for msg in recent_messages:
                role = msg.get('role', 'user')
                content = msg.get('text', '').strip()
                
                if content and role in ['user', 'assistant']:
                    formatted_messages.append({
                        "role": role,
                        "content": content
                    })
            
            logger.info(f"Formatted {len(formatted_messages)} messages for Bedrock")
            return formatted_messages
            
        except Exception as e:
            logger.error(f"Error formatting chat history: {str(e)}")
            return []

    def validate_model_id(self, model_id: str) -> bool:
        """モデルIDの有効性を検証
        
        Args:
            model_id: 検証するモデルID
            
        Returns:
            bool: 有効な場合True
        """
        # サポートされているモデルIDパターン
        supported_patterns = [
            'anthropic.claude-3-5-sonnet',
            'anthropic.claude-3-5-haiku',
            'anthropic.claude-3-sonnet',
            'anthropic.claude-3-haiku'
        ]
        
        return any(pattern in model_id for pattern in supported_patterns)

    def get_model_info(self, model_id: str) -> Dict[str, Any]:
        """モデル情報を取得
        
        Args:
            model_id: モデルID
            
        Returns:
            dict: モデル情報
        """
        model_info = {
            'id': model_id,
            'provider': 'anthropic',
            'maxTokens': 4096,
            'contextWindow': 200000
        }
        
        if 'sonnet' in model_id.lower():
            model_info.update({
                'name': 'Claude 3.5 Sonnet',
                'description': '高性能な推論・分析・創作タスクに最適',
                'costTier': 'premium'
            })
        elif 'haiku' in model_id.lower():
            model_info.update({
                'name': 'Claude 3.5 Haiku',
                'description': '高速・低コストで軽量タスクに最適',
                'costTier': 'standard'
            })
        
        return model_info