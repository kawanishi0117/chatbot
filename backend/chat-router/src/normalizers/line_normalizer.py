"""LINE用メッセージ正規化モジュール

LINEからのメッセージを統一フォーマットに正規化する
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


class LineNormalizer(BaseNormalizer):
    """LINEメッセージの正規化クラス"""

    def __init__(self):
        super().__init__("line")

    def normalize(self, payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
        """LINEメッセージの正規化

        Args:
            payload: LINE webhook ペイロード

        Returns:
            正規化されたメッセージ、または有効なメッセージイベントでない場合はNone
        """
        try:
            # LINEのWebhookイベントを取得
            events = payload.get("events", [])
            if not events or len(events) == 0:
                logger.info("No events in LINE payload")
                return None

            # 最初のイベントのみ処理
            event = events[0]

            # メッセージイベントかチェック
            if event.get("type") != "message":
                logger.info("Not a message event: %s", event.get("type"))
                return None

            # 必要なデータを抽出
            source = event.get("source", {})
            source_type = source.get("type")  # user, group, room
            source_id = (
                source.get("userId") or source.get("groupId") or source.get("roomId")
            )

            message = event.get("message", {})
            message_type = message.get("type")
            text = message.get("text") if message_type == "text" else None

            # タイムスタンプをミリ秒に変換
            timestamp = event.get("timestamp")
            ts_ms = timestamp if timestamp else int(time.time() * 1000)

            # roomKeyの生成: line:{source.type}:{id}
            room_key = f"line:{source_type}:{source_id}"

            # コンテンツタイプの判定
            content_type = message_type or "text"
            s3_uri = None

            # 添付ファイルの処理（画像、動画、音声、ファイル）
            if message_type in ["image", "video", "audio", "file"]:
                # S3への保存はstorage.pyで行うため、ここではURIは設定しない
                pass

            return UnifiedMessage(
                platform=self.platform_name,
                room_key=room_key,
                sender_id=source.get("userId", "unknown"),
                ts=ts_ms,
                text=text,
                content_type=content_type,
                s3_uri=s3_uri,
            )
        except Exception as e:
            logger.error("Error normalizing LINE message: %s", str(e))
            return None
