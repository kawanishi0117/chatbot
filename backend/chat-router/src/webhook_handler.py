"""Webhook処理専用ハンドラーモジュール.

各プラットフォーム（LINE、Slack、Teams）からのWebhookを受信し、
トーク履歴記録とメッセージ処理を行う。
"""

import json
import logging
from typing import Any, Dict
from datetime import datetime

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# レスポンス用のヘッダー定義
WEBHOOK_HEADERS: Dict[str, str] = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}


def handle_webhook_request(
    event: dict, context: Any, path: str, method: str, body: Any
) -> dict:
    """
    Webhookリクエストのメイン処理ハンドラー

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
            return _create_error_response(
                405, "Method Not Allowed", f"Only POST method is supported for {path}"
            )

        # パス別の処理振り分け
        if path == "/webhook/message-history":
            return _handle_message_history_webhook(body, event)
        elif path == "/webhook/line":
            return _handle_line_webhook(body, event)
        elif path == "/webhook/slack":
            return _handle_slack_webhook(body, event)
        elif path == "/webhook/teams":
            return _handle_teams_webhook(body, event)
        else:
            return _create_error_response(
                404, "Not Found", f"Webhook endpoint not found: {path}"
            )

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error processing webhook request: %s", str(e))
        return _create_error_response(500, "Internal Server Error", str(e))


def _handle_message_history_webhook(body: Any, event: dict) -> dict:
    """
    メッセージ履歴記録用のWebhook処理

    Args:
        body: リクエストボディ
        event: Lambda event オブジェクト

    Returns:
        dict: レスポンスオブジェクト
    """
    logger.info("Processing message history webhook")

    # TODO: メッセージ履歴記録の処理を実装予定
    # - メッセージの正規化
    # - DynamoDB への保存
    # - ベクトル埋め込み生成
    # - セッション管理

    response_data = {
        "status": "received",
        "message": "Message history webhook received successfully",
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": event.get("requestContext", {}).get("requestId", "unknown"),
    }

    return _create_success_response(response_data)


def _handle_line_webhook(body: Any, event: dict) -> dict:
    """
    LINE Bot Webhook処理

    Args:
        body: リクエストボディ
        event: Lambda event オブジェクト

    Returns:
        dict: レスポンスオブジェクト
    """
    logger.info("Processing LINE webhook")

    # TODO: LINE Webhook の処理を実装予定
    # - イベント検証
    # - メッセージタイプ判定
    # - ユーザー情報取得
    # - メッセージ履歴保存

    response_data = {
        "status": "received",
        "platform": "line",
        "message": "LINE webhook received successfully",
        "timestamp": datetime.utcnow().isoformat(),
    }

    return _create_success_response(response_data)


def _handle_slack_webhook(body: Any, event: dict) -> dict:
    """
    Slack Bot Webhook処理

    Args:
        body: リクエストボディ
        event: Lambda event オブジェクト

    Returns:
        dict: レスポンスオブジェクト
    """
    logger.info("Processing Slack webhook")

    # TODO: Slack Webhook の処理を実装予定
    # - チャレンジリクエスト対応
    # - イベント検証
    # - チャンネル・スレッド情報取得
    # - メッセージ履歴保存

    response_data = {
        "status": "received",
        "platform": "slack",
        "message": "Slack webhook received successfully",
        "timestamp": datetime.utcnow().isoformat(),
    }

    return _create_success_response(response_data)


def _handle_teams_webhook(body: Any, event: dict) -> dict:
    """
    Microsoft Teams Webhook処理

    Args:
        body: リクエストボディ
        event: Lambda event オブジェクト

    Returns:
        dict: レスポンスオブジェクト
    """
    logger.info("Processing Teams webhook")

    # TODO: Teams Webhook の処理を実装予定
    # - Bot Framework認証
    # - アクティビティタイプ判定
    # - 会話情報取得
    # - メッセージ履歴保存

    response_data = {
        "status": "received",
        "platform": "teams",
        "message": "Teams webhook received successfully",
        "timestamp": datetime.utcnow().isoformat(),
    }

    return _create_success_response(response_data)


def _create_success_response(data: Dict[str, Any], status_code: int = 200) -> dict:
    """
    成功レスポンスを生成

    Args:
        data: レスポンスデータ
        status_code: HTTPステータスコード

    Returns:
        dict: レスポンスオブジェクト
    """
    return {
        "statusCode": status_code,
        "headers": WEBHOOK_HEADERS,
        "body": json.dumps(data, ensure_ascii=False),
    }


def _create_error_response(status_code: int, error: str, message: str) -> dict:
    """
    エラーレスポンスを生成

    Args:
        status_code: HTTPステータスコード
        error: エラータイプ
        message: エラーメッセージ

    Returns:
        dict: レスポンスオブジェクト
    """
    return {
        "statusCode": status_code,
        "headers": WEBHOOK_HEADERS,
        "body": json.dumps(
            {
                "error": error,
                "message": message,
                "timestamp": datetime.utcnow().isoformat(),
            },
            ensure_ascii=False,
        ),
    }
