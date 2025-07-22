"""Microsoft Teams用Webhookハンドラーモジュール

Microsoft TeamsからのWebhookリクエストを処理する
"""

import logging
from typing import Any, Dict, Optional

# Lambda実行環境でのモジュールインポートを確保
try:
    from common.message import UnifiedMessage
    from handlers.base_handler import BaseWebhookHandler
    from normalizers.teams_normalizer import TeamsNormalizer
except ImportError:
    from ..common.message import UnifiedMessage
    from .base_handler import BaseWebhookHandler
    from ..normalizers.teams_normalizer import TeamsNormalizer

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class TeamsWebhookHandler(BaseWebhookHandler):
    """Microsoft Teams Webhook処理ハンドラー"""

    def __init__(self, auth_secret: Optional[str] = None):
        super().__init__("teams", auth_secret)
        self.normalizer = TeamsNormalizer()

    def _verify_signature(self, body: Any, event: dict) -> bool:
        """Teams認証の検証（簡易版）

        Args:
            body: リクエストボディ
            event: Lambda event オブジェクト

        Returns:
            bool: 認証が有効な場合はTrue
        """
        if not self.signing_secret:
            return True  # 認証無効の場合は常にTrue

        auth_header = event.get("headers", {}).get("authorization", "")

        if not auth_header:
            return False

        # 実際の実装ではJWTトークンの検証が必要
        # ここでは簡易的な実装
        return auth_header.startswith("Bearer ")

    def _normalize_message(self, body: Any) -> Optional[UnifiedMessage]:
        """メッセージの正規化

        Args:
            body: リクエストボディ

        Returns:
            正規化されたメッセージ、または有効なメッセージでない場合はNone
        """
        return self.normalizer.normalize(body)
