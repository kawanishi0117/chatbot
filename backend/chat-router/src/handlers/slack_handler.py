"""Slack用Webhookハンドラーモジュール

SlackからのWebhookリクエストを処理する
"""

import json
import hmac
import logging
from typing import Any, Dict, Optional

# Lambda実行環境でのモジュールインポートを確保
try:
    from common.message import UnifiedMessage
    from common.responses import create_success_response
    from handlers.base_handler import BaseWebhookHandler
    from normalizers.slack_normalizer import SlackNormalizer
except ImportError:
    from ..common.message import UnifiedMessage
    from ..common.responses import create_success_response
    from .base_handler import BaseWebhookHandler
    from ..normalizers.slack_normalizer import SlackNormalizer

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class SlackWebhookHandler(BaseWebhookHandler):
    """Slack Webhook処理ハンドラー"""

    def __init__(self, signing_secret: Optional[str] = None):
        super().__init__("slack", signing_secret)
        self.normalizer = SlackNormalizer()

    def _verify_signature(self, body: Any, event: dict) -> bool:
        """Slack署名の検証

        Args:
            body: リクエストボディ
            event: Lambda event オブジェクト

        Returns:
            bool: 署名が有効な場合はTrue
        """
        if not self.signing_secret:
            return True  # 署名検証無効の場合は常にTrue

        timestamp = event.get("headers", {}).get("x-slack-request-timestamp", "")
        signature = event.get("headers", {}).get("x-slack-signature", "")
        raw_body = event.get("body", "")  # 署名検証には生のボディが必要

        if not timestamp or not signature:
            return False

        # 署名の検証
        base_string = f"v0:{timestamp}:{raw_body}"
        my_signature = "v0=" + self._hmac_sha256(self.signing_secret, base_string)

        return hmac.compare_digest(my_signature, signature)

    def _normalize_message(self, body: Any) -> Optional[UnifiedMessage]:
        """メッセージの正規化

        Args:
            body: リクエストボディ

        Returns:
            正規化されたメッセージ、または有効なメッセージでない場合はNone
        """
        return self.normalizer.normalize(body)

    def _pre_process(self, body: Any, event: dict) -> Optional[dict]:
        """Slackの前処理（チャレンジリクエスト対応）

        Args:
            body: リクエストボディ
            event: Lambda event オブジェクト

        Returns:
            チャレンジレスポンス、または通常処理の場合はNone
        """
        # Slackのチャレンジリクエスト対応
        if body.get("type") == "url_verification":
            return create_success_response({"challenge": body.get("challenge", "")})
