"""
共通認証ユーティリティ

Bearerトークンの抽出やセッション・ユーザー情報の取得など、
ユーザー認証関連の共通処理をまとめるモジュール
"""

import os
import time
from typing import Any, Dict, Optional

import boto3
from botocore.exceptions import ClientError

# DynamoDB設定
_dynamodb = boto3.resource("dynamodb")
_table_name = os.environ.get("CHATBOT_SETTINGS_TABLE", "ChatbotSettingsDB-dev")
_table = _dynamodb.Table(_table_name)


def extract_bearer_token(headers: Dict[str, str]) -> Optional[str]:
    """Authorizationヘッダーに含まれるBearerトークンを取得する

    Args:
        headers: リクエストヘッダー

    Returns:
        トークン文字列 (無い場合はNone)
    """
    auth_header = headers.get("Authorization", "") or headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.replace("Bearer ", "")


def get_authenticated_session(headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """有効なセッション情報を取得する

    Args:
        headers: リクエストヘッダー

    Returns:
        セッション辞書 (無効な場合はNone)
    """
    token = extract_bearer_token(headers)
    if not token:
        return None

    try:
        resp = _table.get_item(Key={"PK": f"SESSION#{token}", "SK": "INFO"})
        if "Item" not in resp:
            return None

        session = resp["Item"]
        # セッションの有効期限チェック
        if session.get("expiresAt", 0) < int(time.time()):
            return None
        return session
    except ClientError:
        # DynamoDBエラーは未認証として扱う
        return None


def get_authenticated_user(headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """認証済みユーザー情報を取得する

    Args:
        headers: リクエストヘッダー

    Returns:
        ユーザー情報辞書 (未認証の場合はNone)
    """
    session = get_authenticated_session(headers)
    if session is None:
        return None

    try:
        user_resp = _table.get_item(
            Key={"PK": f"USER#{session['email']}", "SK": "PROFILE"}
        )
        if "Item" not in user_resp:
            return None
        return user_resp["Item"]
    except ClientError:
        return None
