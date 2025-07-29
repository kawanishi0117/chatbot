"""基底Webhookハンドラークラスと共通ロジック

全プラットフォーム共通のWebhook処理ロジックと基底クラスを提供する
"""

import logging
import hmac
import hashlib
import base64
from typing import Any, Dict, Optional
from abc import ABC, abstractmethod

# Lambda実行環境でのモジュールインポートを確保
try:
    import storage
    from common.message import UnifiedMessage
    from common.responses import (
        create_success_response,
        create_error_response,
        create_platform_success_response,
        create_ignored_response,
    )
except ImportError:
    from .. import storage
    from ..common.message import UnifiedMessage
    from ..common.responses import (
        create_success_response,
        create_error_response,
        create_platform_success_response,
        create_ignored_response,
    )

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class BaseWebhookHandler(ABC):
    """Webhook処理の基底クラス"""

    def __init__(self, platform_name: str, signing_secret: Optional[str] = None):
        """基底Webhookハンドラーの初期化

        Args:
            platform_name: プラットフォーム名
            signing_secret: 署名検証用シークレット
        """
        self.platform_name = platform_name
        self.signing_secret = signing_secret

    def handle(self, body: Any, event: dict) -> dict:
        """Webhookの処理メインメソッド

        Args:
            body: リクエストボディ
            event: Lambda event オブジェクト

        Returns:
            dict: レスポンスオブジェクト
        """
        try:
            logger.info(f"Processing {self.platform_name} webhook")

            # 署名検証
            if not self._verify_signature(body, event):
                return create_error_response(
                    401, "Unauthorized", f"Invalid {self.platform_name} signature"
                )

            # プラットフォーム固有の前処理
            if (pre_result := self._pre_process(body, event)) is not None:
                return pre_result

            # メッセージの正規化
            message = self._normalize_message(body)
            if not message:
                # メッセージイベント以外の場合は正常処理として扱う
                return create_success_response(
                    create_ignored_response(
                        self.platform_name,
                        f"Non-message {self.platform_name} event ignored",
                    )
                )

            # バイナリデータの処理
            message = self._process_binary_data(message, body)

            # メッセージの保存
            storage.save_message(message)

            # プラットフォーム固有の後処理（AI処理トリガー等）
            self._post_process(message, body)

            # 成功レスポンス
            response_data = create_platform_success_response(
                self.platform_name, message.room_key, message.ts
            )

            return create_success_response(response_data)

        except Exception as e:
            logger.error(f"Error processing {self.platform_name} webhook: %s", str(e))
            return create_error_response(500, "Internal Server Error", str(e))

    @abstractmethod
    def _verify_signature(self, body: Any, event: dict) -> bool:
        """署名検証（抽象メソッド）

        Args:
            body: リクエストボディ
            event: Lambda event オブジェクト

        Returns:
            bool: 署名が有効な場合はTrue
        """
        pass

    @abstractmethod
    def _normalize_message(self, body: Any) -> Optional[UnifiedMessage]:
        """メッセージ正規化（抽象メソッド）

        Args:
            body: リクエストボディ

        Returns:
            正規化されたメッセージ、または有効なメッセージでない場合はNone
        """
        pass

    def _pre_process(self, body: Any, event: dict) -> Optional[dict]:
        """前処理（オプション）

        Args:
            body: リクエストボディ
            event: Lambda event オブジェクト

        Returns:
            早期リターンが必要な場合はレスポンス、そうでなければNone
        """
        return None

    def _process_binary_data(
        self, message: UnifiedMessage, body: Any
    ) -> UnifiedMessage:
        """バイナリデータの処理（オプション）

        Args:
            message: 正規化されたメッセージ
            body: リクエストボディ

        Returns:
            バイナリデータ処理済みのメッセージ
        """
        return message

    def _post_process(self, message: UnifiedMessage, body: Any) -> None:
        """メッセージ保存後の後処理（デフォルト実装は何もしない）
        
        Args:
            message: 保存されたメッセージ
            body: リクエストボディ
        """
        pass  # デフォルトでは何もしない（サブクラスでオーバーライド）

    def _hmac_sha256(self, key: str, data: str) -> str:
        """HMAC-SHA256ハッシュの生成

        Args:
            key: シークレットキー
            data: ハッシュ対象データ

        Returns:
            ハッシュ値（16進数）
        """
        return hmac.new(key.encode(), data.encode(), hashlib.sha256).hexdigest()

    def _hmac_sha256_b64(self, key: str, data: str) -> str:
        """HMAC-SHA256ハッシュの生成（Base64エンコード）

        Args:
            key: シークレットキー
            data: ハッシュ対象データ

        Returns:
            Base64エンコードされたハッシュ値
        """
        hash_value = hmac.new(key.encode(), data.encode(), hashlib.sha256).digest()
        return base64.b64encode(hash_value).decode()
