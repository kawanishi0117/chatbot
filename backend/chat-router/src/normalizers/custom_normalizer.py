"""カスタムUI用メッセージ正規化モジュール

カスタムUIからのメッセージを統一フォーマットに正規化する
"""

import logging
import time
from typing import Any, Dict, Optional

# Lambda実行環境でのモジュールインポートを確保
try:
    from common.message import UnifiedMessage
    from normalizers.base_normalizer import BaseNormalizer
except ImportError:
    from ..common.message import UnifiedMessage
    from .base_normalizer import BaseNormalizer

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class CustomNormalizer(BaseNormalizer):
    """カスタムUIメッセージの正規化クラス"""

    def __init__(self):
        super().__init__("custom")

    def normalize(self, payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
        """カスタムUIメッセージの正規化

        Args:
            payload: カスタムUI webhook ペイロード

        Returns:
            正規化されたメッセージ、または有効なメッセージでない場合はNone
        """
        try:
            # カスタムUIからの必要なデータを抽出
            chat_id = payload.get("chatId")
            room_id = payload.get("roomId") or chat_id  # chatIdをroomIdとして使用
            user_id = payload.get("userId")
            sender_id = payload.get("senderId") or user_id  # userIdをsenderIdとして使用
            text = payload.get("text")
            timestamp = payload.get("timestamp")

            # 必須フィールドの検証
            if not room_id or not sender_id or not text:
                logger.warning("Missing required fields in custom message")
                return None

            # タイムスタンプの処理
            if timestamp:
                ts_ms = int(timestamp)
            else:
                ts_ms = int(time.time() * 1000)

            # roomKeyの生成: custom:{roomId}
            room_key = f"custom:{room_id}"

            # コンテンツタイプの判定
            content_type = payload.get("contentType", "text")
            s3_uri = None

            # バイナリデータの処理
            binary_data = payload.get("binaryData")
            if binary_data:
                content_type = payload.get("contentType", "file")

            return UnifiedMessage(
                platform=self.platform_name,
                room_key=room_key,
                sender_id=sender_id,
                ts=ts_ms,
                text=text,
                content_type=content_type,
                s3_uri=s3_uri,
            )
        except Exception as e:
            logger.error("Error normalizing custom message: %s", str(e))
            return None
