"""Webhook処理専用ハンドラーモジュール（リファクタリング版）

各プラットフォーム（LINE、Slack、Teams、カスタムUI）からのWebhookを受信し、
適切なハンドラーに処理を振り分ける
"""

import logging
import os
from typing import Any, Dict

# Lambda実行環境でのモジュールインポートを確保
try:
    from common.responses import create_error_response
    from handlers.slack_handler import SlackWebhookHandler
    from handlers.teams_handler import TeamsWebhookHandler
    from handlers.line_handler import LineWebhookHandler
    from handlers.custom_handler import CustomWebhookHandler
except ImportError:
    from .common.responses import create_error_response
    from .handlers.slack_handler import SlackWebhookHandler
    from .handlers.teams_handler import TeamsWebhookHandler
    from .handlers.line_handler import LineWebhookHandler
    from .handlers.custom_handler import CustomWebhookHandler

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 環境変数から署名検証用のシークレットを取得
SLACK_SIGNING_SECRET = os.environ.get("SLACK_SIGNING_SECRET", "")
LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET", "")
TEAMS_SECRET = os.environ.get("TEAMS_SECRET", "")
CUSTOM_UI_SECRET = os.environ.get("CUSTOM_UI_SECRET", "")

# ハンドラーインスタンス（シングルトン）
_handler_instances: Dict[str, Any] = {}


def _get_handler(platform: str):
    """プラットフォーム用のハンドラーインスタンスを取得（シングルトン）

    Args:
        platform: プラットフォーム名

    Returns:
        該当するハンドラーインスタンス
    """
    if platform not in _handler_instances:
        if platform == "slack":
            _handler_instances[platform] = SlackWebhookHandler(SLACK_SIGNING_SECRET)
        elif platform == "teams":
            _handler_instances[platform] = TeamsWebhookHandler(TEAMS_SECRET)
        elif platform == "line":
            _handler_instances[platform] = LineWebhookHandler(LINE_CHANNEL_SECRET)
        elif platform == "custom":
            _handler_instances[platform] = CustomWebhookHandler(CUSTOM_UI_SECRET)
        else:
            raise ValueError(f"Unknown platform: {platform}")

    return _handler_instances[platform]


def handle_webhook_request(
    event: dict, context: Any, path: str, method: str, body: Any
) -> dict:
    """Webhookリクエストのメイン処理ハンドラー（リファクタリング版）

    Args:
        event: Lambda event オブジェクト
        context: Lambda context オブジェクト
        path: リクエストパス
        method: HTTPメソッド
        body: リクエストボディ

    Returns:
        dict: レスポンスオブジェクト
    """
    try:
        logger.info("Processing webhook request: path=%s, method=%s", path, method)

        # POSTメソッド以外は405エラー
        if method != "POST":
            return create_error_response(
                405, "Method Not Allowed", f"Only POST method is supported for {path}"
            )

        # パス別の処理振り分け
        platform_map = {
            "/webhook/custom": "custom",
            "/webhook/line": "line",
            "/webhook/slack": "slack",
            "/webhook/teams": "teams",
        }

        platform = platform_map.get(path)
        if not platform:
            return create_error_response(
                404, "Not Found", f"Webhook endpoint not found: {path}"
            )

        # 該当プラットフォームのハンドラーに処理を委譲
        handler = _get_handler(platform)
        return handler.handle(body, event)

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error processing webhook request: %s", str(e))
        return create_error_response(500, "Internal Server Error", str(e))
