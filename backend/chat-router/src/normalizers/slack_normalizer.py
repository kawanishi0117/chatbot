"""Slack用メッセージ正規化モジュール

Slackからのメッセージを統一フォーマットに正規化する
"""

import json
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


class SlackNormalizer(BaseNormalizer):
    """Slackメッセージの正規化クラス"""

    def __init__(self):
        super().__init__("slack")

    def normalize(self, payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
        """Slackメッセージの正規化

        Args:
            payload: Slack webhook ペイロード

        Returns:
            正規化されたメッセージ、または有効なメッセージイベントでない場合はNone
        """
        try:
            # Slack Events APIのチャレンジリクエストの場合はNoneを返す
            if payload.get("type") == "url_verification":
                return None

            # イベントタイプのチェック
            event = payload.get("event", {})
            if not event or event.get("type") != "message":
                logger.info("Not a message event: %s", json.dumps(event))
                return None

            # 必要なデータを抽出
            team_id = payload.get("team_id")
            channel = event.get("channel")
            user = event.get("user")
            text = event.get("text")
            ts = event.get("ts")

            # タイムスタンプをミリ秒に変換（Slackのtsは秒.マイクロ秒形式）
            try:
                ts_parts = ts.split(".")
                ts_ms = int(ts_parts[0]) * 1000
                if len(ts_parts) > 1:
                    ts_ms += int(ts_parts[1][:3])  # 最初の3桁だけミリ秒として使用
            except (ValueError, AttributeError, IndexError):
                ts_ms = int(time.time() * 1000)

            # スレッド情報の取得
            thread_ts = event.get("thread_ts", ts)

            # roomKeyの生成: slack:{team_id}:{channel}
            room_key = f"slack:{team_id}:{channel}"

            # コンテンツタイプの判定（添付ファイルがあれば）
            content_type = "text"
            s3_uri = None

            # 添付ファイルの処理
            files = event.get("files", [])
            if files:
                file = files[0]  # 最初のファイルのみ処理
                content_type = self._determine_file_type(file)
                # S3への保存はstorage.pyで行うため、ここではURIは設定しない

            return UnifiedMessage(
                platform=self.platform_name,
                room_key=room_key,
                sender_id=user,
                ts=ts_ms,
                text=text,
                content_type=content_type,
                s3_uri=s3_uri,
            )
        except Exception as e:
            logger.error("Error normalizing Slack message: %s", str(e))
            return None

    def _determine_file_type(self, file: Dict[str, Any]) -> str:
        """Slackファイルのコンテンツタイプを判定

        Args:
            file: Slackファイルオブジェクト

        Returns:
            コンテンツタイプ文字列
        """
        mime_type = file.get("mimetype", "")

        if mime_type.startswith("image/"):
            return "image"
        elif mime_type.startswith("video/"):
            return "video"
        elif mime_type.startswith("audio/"):
            return "audio"
        else:
            return "file"
