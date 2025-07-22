"""Webhook処理専用ハンドラーモジュール.

各プラットフォーム（LINE、Slack、Teams、カスタムUI）からのWebhookを受信し、
トーク履歴記録とメッセージ処理を行う。
"""

import json
import logging
import os
import hmac
import hashlib
import base64
from typing import Any, Dict, Optional
from datetime import datetime

# Lambda実行環境でのモジュールインポートを確保
try:
    import normalizer
    import storage
except ImportError:
    from . import normalizer
    from . import storage

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# レスポンス用のヘッダー定義
WEBHOOK_HEADERS: Dict[str, str] = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}

# 環境変数から署名検証用のシークレットを取得
SLACK_SIGNING_SECRET = os.environ.get("SLACK_SIGNING_SECRET", "")
LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET", "")
TEAMS_SECRET = os.environ.get("TEAMS_SECRET", "")
CUSTOM_UI_SECRET = os.environ.get("CUSTOM_UI_SECRET", "")


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
        if path == "/webhook/custom":
            return _handle_custom_webhook(body, event)
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


def _handle_custom_webhook(body: Any, event: dict) -> dict:
    """
    カスタムUI Webhook処理

    Args:
        body: リクエストボディ
        event: Lambda event オブジェクト

    Returns:
        dict: レスポンスオブジェクト
    """
    logger.info("Processing custom UI webhook")

    try:
        # 署名検証（カスタムUIの場合）
        if CUSTOM_UI_SECRET:
            signature = event.get("headers", {}).get("x-custom-signature", "")
            if not _verify_custom_signature(json.dumps(body), signature):
                return _create_error_response(401, "Unauthorized", "Invalid signature")

        # メッセージの正規化
        message = normalizer.normalize_custom_message(body)
        if not message:
            return _create_error_response(400, "Bad Request", "Invalid message format")

        # バイナリデータの処理
        binary_data = body.get("binaryData")
        file_extension = body.get("fileExtension")
        if binary_data:
            message = storage.process_binary_data(message, binary_data, file_extension)

        # メッセージの保存
        result = storage.save_message(message)

        response_data = {
            "status": "success",
            "platform": "custom",
            "message": "Custom UI webhook processed successfully",
            "timestamp": datetime.utcnow().isoformat(),
            "roomKey": message.room_key,
            "messageTs": message.ts,
        }

        return _create_success_response(response_data)

    except Exception as e:
        logger.error("Error processing custom UI webhook: %s", str(e))
        return _create_error_response(500, "Internal Server Error", str(e))


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

    try:
        # LINE署名検証
        if LINE_CHANNEL_SECRET:
            signature = event.get("headers", {}).get("x-line-signature", "")
            if not _verify_line_signature(json.dumps(body), signature):
                return _create_error_response(
                    401, "Unauthorized", "Invalid LINE signature"
                )

        # メッセージの正規化
        message = normalizer.normalize_line_message(body)
        if not message:
            # LINEの場合、メッセージイベント以外も正常に処理する必要がある
            return _create_success_response(
                {
                    "status": "ignored",
                    "platform": "line",
                    "message": "Non-message LINE event ignored",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

        # メッセージの保存
        result = storage.save_message(message)

        # LINEの場合、バイナリデータは別途取得する必要がある
        # ここでは実装を省略（実際にはLINE Messaging APIを使用して取得）

        response_data = {
            "status": "success",
            "platform": "line",
            "message": "LINE webhook processed successfully",
            "timestamp": datetime.utcnow().isoformat(),
            "roomKey": message.room_key,
            "messageTs": message.ts,
        }

        return _create_success_response(response_data)

    except Exception as e:
        logger.error("Error processing LINE webhook: %s", str(e))
        return _create_error_response(500, "Internal Server Error", str(e))


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

    try:
        # Slack署名検証
        if SLACK_SIGNING_SECRET:
            timestamp = event.get("headers", {}).get("x-slack-request-timestamp", "")
            signature = event.get("headers", {}).get("x-slack-signature", "")
            raw_body = event.get("body", "")  # 署名検証には生のボディが必要
            if not _verify_slack_signature(raw_body, timestamp, signature):
                return _create_error_response(
                    401, "Unauthorized", "Invalid Slack signature"
                )

        # Slackのチャレンジリクエスト対応
        if body.get("type") == "url_verification":
            return _create_success_response({"challenge": body.get("challenge", "")})

        # メッセージの正規化
        message = normalizer.normalize_slack_message(body)
        if not message:
            # Slackの場合、メッセージイベント以外も正常に処理する必要がある
            return _create_success_response(
                {
                    "status": "ignored",
                    "platform": "slack",
                    "message": "Non-message Slack event ignored",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

        # メッセージの保存
        result = storage.save_message(message)

        # Slackの場合、ファイルは別途取得する必要がある
        # ここでは実装を省略（実際にはSlack APIを使用して取得）

        response_data = {
            "status": "success",
            "platform": "slack",
            "message": "Slack webhook processed successfully",
            "timestamp": datetime.utcnow().isoformat(),
            "roomKey": message.room_key,
            "messageTs": message.ts,
        }

        return _create_success_response(response_data)

    except Exception as e:
        logger.error("Error processing Slack webhook: %s", str(e))
        return _create_error_response(500, "Internal Server Error", str(e))


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

    try:
        # Teams署名検証
        if TEAMS_SECRET:
            auth_header = event.get("headers", {}).get("authorization", "")
            if not _verify_teams_auth(auth_header):
                return _create_error_response(
                    401, "Unauthorized", "Invalid Teams authentication"
                )

        # メッセージの正規化
        message = normalizer.normalize_teams_message(body)
        if not message:
            # Teamsの場合、メッセージアクティビティ以外も正常に処理する必要がある
            return _create_success_response(
                {
                    "status": "ignored",
                    "platform": "teams",
                    "message": "Non-message Teams activity ignored",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

        # メッセージの保存
        result = storage.save_message(message)

        # Teamsの場合、添付ファイルは別途取得する必要がある
        # ここでは実装を省略（実際にはTeams Bot Frameworkを使用して取得）

        response_data = {
            "status": "success",
            "platform": "teams",
            "message": "Teams webhook processed successfully",
            "timestamp": datetime.utcnow().isoformat(),
            "roomKey": message.room_key,
            "messageTs": message.ts,
        }

        return _create_success_response(response_data)

    except Exception as e:
        logger.error("Error processing Teams webhook: %s", str(e))
        return _create_error_response(500, "Internal Server Error", str(e))


def _verify_slack_signature(body: str, timestamp: str, signature: str) -> bool:
    """
    Slack署名の検証

    Args:
        body: リクエストボディ（生文字列）
        timestamp: Slackリクエストタイムスタンプ
        signature: Slack署名

    Returns:
        bool: 署名が有効な場合はTrue
    """
    if not SLACK_SIGNING_SECRET or not timestamp or not signature:
        return False

    # 署名の検証
    base_string = f"v0:{timestamp}:{body}"
    my_signature = (
        "v0="
        + hmac.new(
            SLACK_SIGNING_SECRET.encode(), base_string.encode(), hashlib.sha256
        ).hexdigest()
    )

    return hmac.compare_digest(my_signature, signature)


def _verify_line_signature(body: str, signature: str) -> bool:
    """
    LINE署名の検証

    Args:
        body: リクエストボディ（JSON文字列）
        signature: LINE署名

    Returns:
        bool: 署名が有効な場合はTrue
    """
    if not LINE_CHANNEL_SECRET or not signature:
        return False

    # 署名の検証
    hash_value = hmac.new(
        LINE_CHANNEL_SECRET.encode(), body.encode(), hashlib.sha256
    ).digest()
    my_signature = base64.b64encode(hash_value).decode()

    return hmac.compare_digest(my_signature, signature)


def _verify_teams_auth(auth_header: str) -> bool:
    """
    Teams認証の検証（簡易版）

    Args:
        auth_header: Authorization ヘッダー

    Returns:
        bool: 認証が有効な場合はTrue
    """
    if not TEAMS_SECRET or not auth_header:
        return False

    # 実際の実装ではJWTトークンの検証が必要
    # ここでは簡易的な実装
    return auth_header.startswith("Bearer ")


def _verify_custom_signature(body: str, signature: str) -> bool:
    """
    カスタムUI署名の検証

    Args:
        body: リクエストボディ（JSON文字列）
        signature: カスタム署名

    Returns:
        bool: 署名が有効な場合はTrue
    """
    if not CUSTOM_UI_SECRET or not signature:
        return False

    # 署名の検証
    my_signature = hmac.new(
        CUSTOM_UI_SECRET.encode(), body.encode(), hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(my_signature, signature)


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
