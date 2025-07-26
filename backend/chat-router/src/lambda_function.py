"""ChatRouter Lambda function module.

マルチチャネル Webhook を受け取り、コマンドパースやセッション管理を行う。"""

import json
import logging
import os
from typing import Any, Dict

# Lambda実行環境でのモジュールインポートを確保
try:
    import webhook_handler
    from common.responses import create_error_response, create_success_response
    from handlers.bot_settings_handler import BotSettingsHandler
    from handlers.user_handler import UserHandler
    from handlers.chat_handler import ChatHandler
except ImportError:
    from . import webhook_handler
    from .common.responses import create_error_response, create_success_response
    from .handlers.bot_settings_handler import BotSettingsHandler
    from .handlers.user_handler import UserHandler
    from .handlers.chat_handler import ChatHandler

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 環境変数からバージョンを取得（デフォルト値を設定）
VERSION = os.environ.get("VERSION")

# CORS および共通ヘッダ定義
COMMON_HEADERS: Dict[str, str] = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}
CORS_HEADERS: Dict[str, str] = {
    **COMMON_HEADERS,
    "Access-Control-Allow-Headers": (
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
    ),
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """ChatRouter Lambda - ウェブフック経由の処理全般を担当

    主な機能:
    - マルチチャネル（LINE/Slack/Teams）ウェブフック受信
    - コマンドパース（/ask, /質問, /investigate, /調査, /clear, /クリア等）
    - セッション管理とDynamoDB操作
    - Quick ACK応答（<100ms）
    - 回答生成とチャット処理
    - EventBridge連携による非同期処理トリガー

    Args:
        event: Lambda event オブジェクト
        context: Lambda context オブジェクト

    Returns:
        statusCode、headers、bodyを含む辞書
    """
    try:
        # バージョン情報をログ出力
        logger.info("ChatRouter Lambda started - Version: %s", VERSION)
        logger.info("Received event: %s", json.dumps(event))

        # HTTPメソッドとパスを取得
        http_method = event.get("httpMethod", "UNKNOWN")
        path = event.get("path", "/")

        # OPTIONSリクエストの処理（CORS プリフライト）
        if http_method == "OPTIONS":
            return _handle_options_request()

        # クエリパラメータを取得
        query_params = event.get("queryStringParameters", {}) or {}

        # リクエストボディを取得し JSON としてパース（失敗時は元文字列を保持）
        raw_body = event.get("body", "")
        if raw_body:
            try:
                body = json.loads(raw_body)
            except json.JSONDecodeError as e:
                logger.warning("Failed to parse JSON body: %s", str(e))
                body = raw_body
        else:
            body = ""

        # パスに基づくルーティング
        if path.startswith("/webhook/"):
            # Webhook処理を専用ハンドラーに委譲
            logger.info(
                "Webhook request received: path=%s, method=%s", path, http_method
            )
            return webhook_handler.handle_webhook_request(
                event, context, path, http_method, body
            )
        elif path.startswith("/api/auth") or (
            path.startswith("/api/bots/") and ("/users" in path or "/invite" in path)
        ):
            # ユーザー認証・管理API処理
            logger.info(
                "User auth/management API request: path=%s, method=%s",
                path,
                http_method,
            )
            user_handler = UserHandler()
            headers = event.get("headers", {}) or {}
            return user_handler.handle_request(http_method, path, body, headers)
        elif path.startswith("/api/bots"):
            # ボット設定API処理
            logger.info(
                "Bot settings API request: path=%s, method=%s", path, http_method
            )
            bot_handler = BotSettingsHandler()
            headers = event.get("headers", {}) or {}
            return bot_handler.handle_request(
                http_method, path, body, query_params, headers
            )
        elif path.startswith("/api/chats"):
            # チャットルーム管理API処理
            logger.info("Chat API request: path=%s, method=%s", path, http_method)
            chat_handler = ChatHandler()
            headers = event.get("headers", {}) or {}
            return chat_handler.handle_request(http_method, path, body, headers)
        elif path == "/health":
            # ヘルスチェック用エンドポイント
            logger.info("Health check endpoint accessed")
            response_data = {
                "status": "healthy",
                "message": "Service is running properly",
                "version": VERSION or "unknown",
                "service": "ChatRouter",
            }
            return create_success_response(response_data)
        elif path == "/test":
            # テスト用エンドポイント
            response_data = {
                "message": "This is a test endpoint",
                "data": {"test": True, "version": VERSION},
                "method": http_method,
                "path": path,
                "queryParameters": query_params,
                "requestBody": body,
                "timestamp": context.aws_request_id if context else "local-test",
            }
            return create_success_response(response_data)
        elif path == "/" or path == "":
            # 基本レスポンス（バージョン情報）
            return create_success_response(
                {
                    "message": "ChatRouter Lambda is running",
                    "version": VERSION or "unknown",
                }
            )
        else:
            # 不明なエンドポイント
            return create_error_response(404, "Not Found", f"Unknown endpoint: {path}")

    except (KeyError, TypeError, ValueError) as e:
        logger.error("Error processing request: %s", str(e))
        return create_error_response(
            400, "Bad Request", "リクエストの処理中にエラーが発生しました"
        )

    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return create_error_response(
            500, "Internal Server Error", "予期しないエラーが発生しました"
        )


def _handle_options_request() -> Dict[str, Any]:
    """CORS プリフライトリクエストのハンドリング

    Returns:
        dict: CORSレスポンス
    """
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}


def _handle_error(error_message: str, status_code: int = 500) -> Dict[str, Any]:
    """エラーレスポンスの生成（互換性のため残す）

    Args:
        error_message: エラーメッセージ
        status_code: HTTPステータスコード

    Returns:
        dict: エラーレスポンス
    """
    logger.error(error_message)
    return create_error_response(status_code, "Error", error_message)
