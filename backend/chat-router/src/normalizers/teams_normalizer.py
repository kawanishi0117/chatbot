"""Microsoft Teams用メッセージ正規化モジュール

Microsoft Teamsからのメッセージを統一フォーマットに正規化する
"""

import logging
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


class TeamsNormalizer(BaseNormalizer):
    """Microsoft Teamsメッセージの正規化クラス"""

    def __init__(self):
        super().__init__("teams")

    def normalize(self, payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
        """Microsoft Teamsメッセージの正規化

        Args:
            payload: Teams webhook ペイロード

        Returns:
            正規化されたメッセージ、または有効なメッセージイベントでない場合はNone
        """
        try:
            # Teams Botフレームワークのアクティビティタイプをチェック
            if payload.get("type") != "message":
                logger.info("Not a message activity: %s", payload.get("type"))
                return None

            # 必要なデータを抽出
            tenant_id = payload.get("channelData", {}).get("tenant", {}).get("id")
            conversation_id = payload.get("conversation", {}).get("id")
            sender_id = payload.get("from", {}).get("id")
            text = payload.get("text")

            # タイムスタンプをミリ秒に変換（より堅牢なエラーハンドリング）
            timestamp = payload.get("timestamp")
            ts_ms = self._parse_timestamp_to_ms(timestamp)

            # roomKeyの生成: teams:{tenantId}:{conversationId}
            room_key = f"teams:{tenant_id}:{conversation_id}"

            # コンテンツタイプの判定
            content_type = "text"
            s3_uri = None

            # 添付ファイルの処理
            attachments = payload.get("attachments", [])
            if attachments:
                attachment = attachments[0]  # 最初の添付ファイルのみ処理
                content_type = self._determine_attachment_type(attachment)
                # S3への保存はstorage.pyで行うため、ここではURIは設定しない

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
            logger.error("Error normalizing Teams message: %s", str(e))
            return None

    def _determine_attachment_type(self, attachment: Dict[str, Any]) -> str:
        """Teams添付ファイルのコンテンツタイプを判定

        Args:
            attachment: Teams添付ファイルオブジェクト

        Returns:
            コンテンツタイプ文字列
        """
        content_type = attachment.get("contentType", "")

        if "image" in content_type:
            return "image"
        elif "video" in content_type:
            return "video"
        elif "audio" in content_type:
            return "audio"
        else:
            return "file"
