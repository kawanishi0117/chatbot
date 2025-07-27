"""カスタムUI用Webhookハンドラーモジュール

カスタムUIからのWebhookリクエストを処理する
"""

import json
import hmac
import logging
from typing import Any, Dict, Optional

# Lambda実行環境でのモジュールインポートを確保
try:
    import storage
    from common.message import UnifiedMessage
    from handlers.base_handler import BaseWebhookHandler
    from normalizers.custom_normalizer import CustomNormalizer
except ImportError:
    from .. import storage
    from ..common.message import UnifiedMessage
    from .base_handler import BaseWebhookHandler
    from ..normalizers.custom_normalizer import CustomNormalizer

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class CustomWebhookHandler(BaseWebhookHandler):
    """カスタムUI Webhook処理ハンドラー"""

    def __init__(self, custom_secret: Optional[str] = None):
        super().__init__("custom", custom_secret)
        self.normalizer = CustomNormalizer()

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
