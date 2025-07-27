"""認証サービス

ユーザー認証関連の処理を担当
"""

import json
import hashlib
import logging
import os
import secrets
import time
from typing import Any, Dict, Union

import boto3
from botocore.exceptions import ClientError

try:
    from common.responses import create_error_response, create_success_response
    from common.auth_utils import (
        extract_bearer_token,
        get_authenticated_session,
        get_authenticated_user,
    )
    from common.utils import convert_decimal_to_int, generate_time_ordered_uuid
except ImportError:
    from ..common.responses import create_error_response, create_success_response
    from ..common.auth_utils import (
        extract_bearer_token,
        get_authenticated_session,
        get_authenticated_user,
    )
    from ..common.utils import convert_decimal_to_int, generate_time_ordered_uuid

logger = logging.getLogger(__name__)


class AuthService:
    """認証サービス"""

    def __init__(self):
        """初期化"""
        # セッショントークンの有効期限（24時間）
        self.token_expiry_seconds = 86400
        # DynamoDB設定
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = os.environ.get("CHATBOT_SETTINGS_TABLE", "ChatbotSettingsDB-dev")
        self.table = self.dynamodb.Table(self.table_name)

    def _hash_password(self, password: str) -> str:
        """パスワードのハッシュ化（元の処理と同じ）

        Args:
            password: プレーンテキストのパスワード

        Returns:
            ハッシュ化されたパスワード
        """
        # SHA-256でハッシュ化（元の処理と同じ）
        return hashlib.sha256(password.encode()).hexdigest()

    def _generate_token(self) -> str:
        """セッショントークンの生成（元の処理と同じ）

        Returns:
            ランダムなトークン文字列
        """
        return secrets.token_urlsafe(32)

    def register(self, body: Union[str, Dict]) -> Dict[str, Any]:
        """新規ユーザー登録（元の処理と同じ）

        Args:
            body: リクエストボディ

        Returns:
            登録結果のレスポンス
        """
        try:
            # リクエストボディをパース
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

            # 必須フィールドのチェック
            required_fields = ["email", "password", "name"]
            for field in required_fields:
                if field not in data or not data[field]:
                    return create_error_response(
                        400, "Bad Request", f"{field}は必須です"
                    )

            email = data["email"].lower()
            password = data["password"]
            name = data["name"]

            # メールアドレスの形式チェック
            if "@" not in email or len(email) < 5:
                return create_error_response(
                    400, "Bad Request", "有効なメールアドレスを入力してください"
                )

            # パスワードの長さチェック
            if len(password) < 6:
                return create_error_response(
                    400, "Bad Request", "パスワードは6文字以上で入力してください"
                )

            # 既存ユーザーのチェック
            existing_user = self.table.get_item(Key={"PK": f"USER#{email}", "SK": "PROFILE"})
            if "Item" in existing_user:
                return create_error_response(
                    409, "Conflict", "このメールアドレスは既に登録されています"
                )

            # 新しいユーザーデータを生成
            user_id = generate_time_ordered_uuid()
            current_time = int(time.time() * 1000)  # ミリ秒

            # ユーザープロファイルを保存
            user_data = {
                "PK": f"USER#{email}",
                "SK": "PROFILE",
                "userId": user_id,
                "email": email,
                "name": name,
                "passwordHash": self._hash_password(password),
                "role": "user",  # デフォルトロール
                "createdAt": current_time,
                "updatedAt": current_time,
                "isActive": True,
            }

            self.table.put_item(Item=user_data)

            logger.info(f"User registered successfully: {email}")

            # パスワードハッシュを除いてレスポンス（DecimalをintやfloatやstrにJSON serializable化）
            response_data = {}
            for k, v in user_data.items():
                if k != "passwordHash":
                    if k in ["createdAt", "updatedAt"] and v is not None:
                        response_data[k] = int(v)
                    else:
                        response_data[k] = v
            return create_success_response(response_data)

        except json.JSONDecodeError:
            return create_error_response(400, "Bad Request", "Invalid JSON format")
        except ClientError as e:
            logger.error(f"DynamoDB error in register: {e}")
            return create_error_response(
                500, "Internal Server Error", "ユーザー登録に失敗しました"
            )
        except Exception as e:
            logger.error(f"Unexpected error in register: {e}")
            return create_error_response(
                500, "Internal Server Error", "予期しないエラーが発生しました"
            )

    def login(self, body: Union[str, Dict]) -> Dict[str, Any]:
        """ユーザーログイン（元の処理と同じ）

        Args:
            body: リクエストボディ

        Returns:
            ログイン結果のレスポンス
        """
        try:
            # リクエストボディをパース
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

            # 必須フィールドのチェック
            if "email" not in data or "password" not in data:
                return create_error_response(
                    400, "Bad Request", "メールアドレスとパスワードは必須です"
                )

            email = data["email"].lower()
            password = data["password"]

            # ユーザー情報を取得
            response = self.table.get_item(Key={"PK": f"USER#{email}", "SK": "PROFILE"})

            if "Item" not in response:
                return create_error_response(
                    401,
                    "Unauthorized",
                    "メールアドレスまたはパスワードが正しくありません",
                )

            user = response["Item"]

            # パスワードの検証
            if user["passwordHash"] != self._hash_password(password):
                return create_error_response(
                    401,
                    "Unauthorized",
                    "メールアドレスまたはパスワードが正しくありません",
                )

            # アクティブユーザーかチェック
            if not user.get("isActive", True):
                return create_error_response(
                    403, "Forbidden", "このアカウントは無効化されています"
                )

            # セッショントークンを生成
            token = self._generate_token()
            current_time = int(time.time())
            expiry_time = current_time + self.token_expiry_seconds

            # セッション情報を保存
            session_data = {
                "PK": f"SESSION#{token}",
                "SK": "INFO",
                "userId": user["userId"],
                "email": email,
                "createdAt": current_time * 1000,
                "expiresAt": expiry_time,
                "ttl": expiry_time,  # DynamoDBのTTL機能用
            }

            self.table.put_item(Item=session_data)

            logger.info(f"User logged in successfully: {email}")

            # レスポンスデータ（DecimalをintやfloatやstrにJSON serializable化）
            response_data = {
                "token": token,
                "user": {
                    "userId": user["userId"],
                    "email": user["email"],
                    "name": user["name"],
                    "role": user.get("role", "user"),
                },
                "expiresAt": expiry_time * 1000,
            }

            return create_success_response(response_data)

        except json.JSONDecodeError:
            return create_error_response(400, "Bad Request", "Invalid JSON format")
        except ClientError as e:
            logger.error(f"DynamoDB error in login: {e}")
            return create_error_response(
                500, "Internal Server Error", "ログインに失敗しました"
            )
        except Exception as e:
            logger.error(f"Unexpected error in login: {e}")
            return create_error_response(
                500, "Internal Server Error", "予期しないエラーが発生しました"
            )

    def get_current_user(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """現在のユーザー情報を取得

        Args:
            headers: リクエストヘッダー

        Returns:
            dict: レスポンス
        """
        try:
            # 認証されたユーザー情報を取得
            user = get_authenticated_user(headers)

            if not user:
                return create_error_response(
                    401, "Unauthorized", "認証トークンが必要です"
                )

            # レスポンスデータを作成
            response_data = {
                "userId": user["userId"],
                "email": user["email"],
                "name": user["name"],
                "role": user.get("role", "user"),
                "createdAt": convert_decimal_to_int(user.get("createdAt", 0)),
                "updatedAt": convert_decimal_to_int(user.get("updatedAt", 0)),
            }

            # デバッグログ: レスポンスデータを出力
            logger.info(f"Response data: {response_data}")

            return create_success_response(response_data)

        except Exception as e:
            logger.error(f"Error getting current user: {e}")
            return create_error_response(500, "Internal Server Error", str(e))

    def logout(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """ログアウト処理（元の処理と同じ）

        Args:
            headers: リクエストヘッダー

        Returns:
            ログアウト結果のレスポンス
        """
        try:
            # Authorizationヘッダーからトークンを取得
            auth_header = headers.get("Authorization", "") or headers.get(
                "authorization", ""
            )
            if not auth_header.startswith("Bearer "):
                return create_error_response(
                    401, "Unauthorized", "認証トークンが必要です"
                )

            token = auth_header.replace("Bearer ", "")

            # セッション情報を削除
            self.table.delete_item(Key={"PK": f"SESSION#{token}", "SK": "INFO"})

            logger.info("User logged out successfully")

            return create_success_response({"message": "ログアウトしました"})

        except Exception as e:
            logger.error(f"Error in logout: {e}")
            return create_error_response(
                500, "Internal Server Error", "ログアウトに失敗しました"
            )
