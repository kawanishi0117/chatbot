"""LINE用Webhookハンドラーモジュール

LINEからのWebhookリクエストを処理する
"""

import json
import hmac
import logging
from typing import Any, Dict, Optional

# Lambda実行環境でのモジュールインポートを確保
try:
    from common.message import UnifiedMessage
    from handlers.base_handler import BaseWebhookHandler
    from normalizers.line_normalizer import LineNormalizer
except ImportError:
    from ..common.message import UnifiedMessage
    from .base_handler import BaseWebhookHandler
    from ..normalizers.line_normalizer import LineNormalizer

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class LineWebhookHandler(BaseWebhookHandler):
    """LINE Bot Webhook処理ハンドラー"""

    def __init__(self, channel_secret: Optional[str] = None):
        super().__init__("line", channel_secret)
        self.normalizer = LineNormalizer()

    def _verify_signature(self, body: Any, event: dict) -> bool:
        """LINE署名の検証

        Args:
            body: リクエストボディ
            event: Lambda event オブジェクト

        Returns:
            bool: 署名が有効な場合はTrue
        """
        if not self.signing_secret:
            return True  # 署名検証無効の場合は常にTrue

        signature = event.get("headers", {}).get("x-line-signature", "")

        if not signature:
            return False

        # 署名の検証
        my_signature = self._hmac_sha256_b64(self.signing_secret, json.dumps(body))

        return hmac.compare_digest(my_signature, signature)

    def _normalize_message(self, body: Any) -> Optional[UnifiedMessage]:
        """メッセージの正規化

        Args:
            body: リクエストボディ

        Returns:
            正規化されたメッセージ、または有効なメッセージでない場合はNone
        """
        return self.normalizer.normalize(body)
