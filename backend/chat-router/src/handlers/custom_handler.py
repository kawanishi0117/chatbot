"""カスタムUI用Webhookハンドラーモジュール

カスタムUIからのWebhookリクエストを処理し、
AI自動応答機能のトリガーを含む
"""

import json
import hmac
import logging
import time
from typing import Any, Dict, Optional

# Lambda実行環境でのモジュールインポートを確保
try:
    import storage
    from common.message import UnifiedMessage
    from common.utils import generate_time_ordered_uuid
    from handlers.base_handler import BaseWebhookHandler
    from normalizers.custom_normalizer import CustomNormalizer
    from services.sqs_service import SQSService
except ImportError:
    from .. import storage
    from ..common.message import UnifiedMessage
    from ..common.utils import generate_time_ordered_uuid
    from .base_handler import BaseWebhookHandler
    from ..normalizers.custom_normalizer import CustomNormalizer
    from ..services.sqs_service import SQSService

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class CustomWebhookHandler(BaseWebhookHandler):
    """カスタムUI Webhook処理ハンドラー（AI自動応答対応）"""

    def __init__(self, custom_secret: Optional[str] = None):
        super().__init__("custom", custom_secret)
        self.normalizer = CustomNormalizer()
        self.sqs_service = None  # 遅延初期化
        
    def _get_sqs_service(self) -> SQSService:
        """SQSサービスを取得（遅延初期化）"""
        if self.sqs_service is None:
            try:
                self.sqs_service = SQSService()
                logger.info("SQS service initialized")
            except Exception as e:
                logger.error(f"Failed to initialize SQS service: {str(e)}")
                raise
        return self.sqs_service

    def _pre_process(self, body: Any, event: dict) -> Optional[dict]:
        """前処理でチャットルームの存在確認を実行"""
        chat_id = body.get("chatId")
        if chat_id:
            try:
                dynamodb_manager = storage.DynamoDBManager()
                chat_result = dynamodb_manager.get_chat_room(chat_id)
                if not chat_result["found"]:
                    logger.warning("Chat room not found: %s", chat_id)
                    return {
                        "statusCode": 404,
                        "body": json.dumps({
                            "error": "Chat room not found",
                            "message": "チャットルームが見つかりません。まずチャットルームを作成してください。"
                        })
                    }
                
                # チャットルームのアクティブ状態チェック
                chat_data = chat_result["data"]
                if not chat_data.get("isActive", True):
                    logger.warning("Chat room is inactive: %s", chat_id)
                    return {
                        "statusCode": 403,
                        "body": json.dumps({
                            "error": "Chat room inactive",
                            "message": "チャットルームが無効化されています。"
                        })
                    }
                    
            except Exception as e:
                logger.error("Error checking chat room existence: %s", str(e))
                return {
                    "statusCode": 500,
                    "body": json.dumps({"error": "Failed to verify chat room"})
                }
        return None

    def _verify_signature(self, body: Any, event: dict) -> bool:
        """カスタムUI署名の検証

        Args:
            body: リクエストボディ
            event: Lambda event オブジェクト

        Returns:
            bool: 署名が有効な場合はTrue
        """
        if not self.signing_secret:
            return True  # 署名検証無効の場合は常にTrue

        signature = event.get("headers", {}).get("x-custom-signature", "")

        if not signature:
            return False

        # 署名の検証
        my_signature = self._hmac_sha256(self.signing_secret, json.dumps(body))

        return hmac.compare_digest(my_signature, signature)

    def _normalize_message(self, body: Any) -> Optional[UnifiedMessage]:
        """メッセージの正規化

        Args:
            body: リクエストボディ

        Returns:
            正規化されたメッセージ、または有効なメッセージでない場合はNone
        """
        return self.normalizer.normalize(body)

    def _process_binary_data(
        self, message: UnifiedMessage, body: Any
    ) -> UnifiedMessage:
        """バイナリデータの処理

        Args:
            message: 正規化されたメッセージ
            body: リクエストボディ

        Returns:
            バイナリデータ処理済みのメッセージ
        """
        # バイナリデータの処理
        binary_data = body.get("binaryData")
        file_extension = body.get("fileExtension")

        if binary_data:
            message = storage.process_binary_data(message, binary_data, file_extension)

        return message

    def _post_process(self, message: UnifiedMessage, body: Any) -> None:
        """メッセージ保存後の後処理（AI応答トリガー）
        
        Args:
            message: 保存されたメッセージ
            body: リクエストボディ
        """
        try:
            # ユーザーメッセージの場合のみAI処理をトリガー
            if message.role == 'user' and message.text:
                self._trigger_ai_processing(message, body)
        except Exception as e:
            logger.error(f"Error in post processing: {str(e)}")
            # ポスト処理エラーは元のレスポンスに影響させない

    def _trigger_ai_processing(self, message: UnifiedMessage, body: Any) -> None:
        """AI処理をSQS経由でトリガー
        
        Args:
            message: ユーザーメッセージ
            body: リクエストボディ
        """
        try:
            # チャットIDとボットIDを抽出
            chat_id = body.get("chatId")
            if not chat_id:
                logger.warning("No chatId found for AI processing trigger")
                return

            # チャットルーム情報を取得してボットIDを特定
            dynamodb_manager = storage.DynamoDBManager()
            chat_result = dynamodb_manager.get_chat_room(chat_id)
            
            if not chat_result["found"]:
                logger.warning(f"Chat room not found for AI processing: {chat_id}")
                return
            
            chat_data = chat_result["data"]
            bot_id = chat_data.get("botId")
            
            if not bot_id:
                logger.warning(f"No botId found in chat room: {chat_id}")
                return

            # AI処理が必要かチェック（ボット設定確認）
            if not self._should_trigger_ai_processing(bot_id):
                logger.info(f"AI processing skipped for bot: {bot_id}")
                return

            # メッセージIDを生成（タイムスタンプベース）
            message_id = generate_time_ordered_uuid()

            # SQSサービスを取得
            sqs_service = self._get_sqs_service()
            
            # AI処理メッセージをSQSに送信
            result = sqs_service.send_ai_processing_message(
                chat_id=chat_id,
                bot_id=bot_id,
                user_message=message.text,
                user_message_id=message_id,
                additional_data={
                    'platform': 'custom',
                    'userId': body.get('userId', 'unknown'),
                    'roomKey': message.room_key
                }
            )
            
            if result['success']:
                logger.info(
                    f"AI processing triggered: chatId={chat_id}, "
                    f"botId={bot_id}, sqsMessageId={result['messageId']}"
                )
            else:
                logger.error(
                    f"Failed to trigger AI processing: {result.get('error')}"
                )
                
        except Exception as e:
            logger.error(f"Error triggering AI processing: {str(e)}")

    def _should_trigger_ai_processing(self, bot_id: str) -> bool:
        """ボットのAI処理が有効かチェック
        
        Args:
            bot_id: ボットID
            
        Returns:
            bool: AI処理をトリガーすべき場合True
        """
        try:
            # ボット設定を取得
            dynamodb_manager = storage.DynamoDBManager()
            bot_result = dynamodb_manager.get_bot_settings(bot_id)
            
            if not bot_result['found']:
                logger.warning(f"Bot not found: {bot_id}")
                return False
            
            bot_data = bot_result['data']
            
            # ボットがアクティブかチェック
            if not bot_data.get('isActive', False):
                logger.info(f"Bot is inactive: {bot_id}")
                return False
            
            # AI設定が存在するかチェック
            ai_config = bot_data.get('aiConfig')
            if not ai_config:
                logger.info(f"Bot has no AI config: {bot_id}")
                return False
            
            # AI機能が有効かチェック（将来の拡張用）
            # 現在は全てのボットでAI処理を実行
            return True
            
        except Exception as e:
            logger.error(f"Error checking AI processing eligibility: {str(e)}")
            return False
