"""ユーザー管理ハンドラー（リファクタリング版）

ユーザーの登録、ログイン、情報取得などを担当するハンドラーモジュール
サービス層に処理を委譲し、ルーティングのみを担当
"""

import logging
from typing import Any, Dict

try:
    from common.responses import create_error_response
    from services.auth_service import AuthService
    from services.profile_service import ProfileService
except ImportError:
    from ..common.responses import create_error_response
    from ..services.auth_service import AuthService
    from ..services.profile_service import ProfileService

logger = logging.getLogger(__name__)


class UserHandler:
    """ユーザー管理ハンドラークラス（リファクタリング版）"""

    def __init__(self):
        """ユーザーハンドラーの初期化"""
        self.auth_service = AuthService()
        self.profile_service = ProfileService()

    def handle_request(
        self,
        http_method: str,
        path: str,
        body: Any,
        headers: Dict[str, str],
    ) -> Dict[str, Any]:
        """リクエストのルーティングと処理

        Args:
            http_method: HTTPメソッド
            path: リクエストパス
            body: リクエストボディ
            headers: リクエストヘッダー

        Returns:
            APIレスポンス
        """
        try:
            logger.info(f"User API Request: {http_method} {path}")

            # 認証関連のルーティング
            if http_method == "POST" and path == "/api/auth/register":
                return self.auth_service.register(body)
            elif http_method == "POST" and path == "/api/auth/login":
                return self.auth_service.login(body)
            elif http_method == "GET" and path == "/api/auth/me":
                return self.auth_service.get_current_user(headers)
            elif http_method == "PUT" and path == "/api/auth/me":
                return self.profile_service.update_profile(body, headers)
            elif http_method == "POST" and path == "/api/auth/logout":
                return self.auth_service.logout(headers)
            
            # TODO: ユーザー管理機能（ボットユーザー、招待など）は別途実装
            # 現在は認証とプロファイル機能のみをリファクタリング
            else:
                return create_error_response(
                    404, "Not Found", f"Endpoint not found: {http_method} {path}"
                )

        except Exception as e:
            logger.error(f"Error in user handler: {e}")
            return create_error_response(500, "Internal Server Error", str(e))