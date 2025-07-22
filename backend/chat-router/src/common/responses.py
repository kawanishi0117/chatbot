"""共通レスポンス生成モジュール

Lambda関数で使用する共通のレスポンス生成ロジックを提供する
"""

import json
from datetime import datetime
from typing import Any, Dict

# レスポンス用のヘッダー定義
WEBHOOK_HEADERS: Dict[str, str] = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}


def create_success_response(data: Dict[str, Any], status_code: int = 200) -> dict:
    """成功レスポンスを生成

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


def create_error_response(status_code: int, error: str, message: str) -> dict:
    """エラーレスポンスを生成

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


def create_platform_success_response(
    platform: str, room_key: str, message_ts: int
) -> Dict[str, Any]:
    """プラットフォーム用成功レスポンスデータを生成

    Args:
        platform: プラットフォーム名
        room_key: ルームキー
        message_ts: メッセージタイムスタンプ

    Returns:
        dict: レスポンスデータ
    """
    return {
        "status": "success",
        "platform": platform,
        "message": f"{platform.capitalize()} webhook processed successfully",
        "timestamp": datetime.utcnow().isoformat(),
        "roomKey": room_key,
        "messageTs": message_ts,
    }


def create_ignored_response(platform: str, reason: str) -> Dict[str, Any]:
    """無視されたイベント用のレスポンスデータを生成

    Args:
        platform: プラットフォーム名
        reason: 無視された理由

    Returns:
        dict: レスポンスデータ
    """
    return {
        "status": "ignored",
        "platform": platform,
        "message": reason,
        "timestamp": datetime.utcnow().isoformat(),
    } 