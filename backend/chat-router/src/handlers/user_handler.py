"""ユーザー管理ハンドラー

ユーザーの登録、ログイン、情報取得などを担当するハンドラーモジュール
DynamoDBのChatbotSettingsDB-devテーブルとの連携を行う
"""

import logging
import os
import uuid
import time
import json
import hashlib
import secrets
from typing import Any, Dict, List, Optional, Union

import boto3
from botocore.exceptions import ClientError

# Lambda実行環境でのモジュールインポートを確保
try:
    from common.responses import (
        create_success_response,
        create_error_response,
    )
except ImportError:
    from ..common.responses import (
        create_success_response,
        create_error_response,
    )

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB設定
dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("CHATBOT_SETTINGS_TABLE", "ChatbotSettingsDB-dev")
table = dynamodb.Table(table_name)


class UserHandler:
    """ユーザー管理ハンドラークラス"""

    def __init__(self):
        """ユーザーハンドラーの初期化"""
        # セッショントークンの有効期限（24時間）
        self.token_expiry_seconds = 86400

    def handle_request(
        self,
        http_method: str,
        path: str,
        body: Union[str, Dict],
        headers: Dict[str, str],
    ) -> Dict[str, Any]:
        """ユーザー管理APIリクエストのハンドリング

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

            # HTTPメソッドとパスに基づく処理の振り分け
            if http_method == "POST" and path == "/api/auth/register":
                return self._handle_register(body)
            elif http_method == "POST" and path == "/api/auth/login":
                return self._handle_login(body)
            elif http_method == "GET" and path == "/api/auth/me":
                return self._handle_get_current_user(headers)
            elif http_method == "PUT" and path == "/api/auth/me":
                return self._handle_update_profile(body, headers)
            elif http_method == "POST" and path == "/api/auth/logout":
                return self._handle_logout(headers)
            else:
                return create_error_response(404, "Not Found", "Unknown API endpoint")

        except Exception as e:
            logger.error(f"Error handling user request: {str(e)}")
            return create_error_response(
                500, "Internal Server Error", "ユーザー処理中にエラーが発生しました"
            )

    def _hash_password(self, password: str) -> str:
        """パスワードのハッシュ化

        Args:
            password: プレーンテキストのパスワード

        Returns:
            ハッシュ化されたパスワード
        """
        # SHA-256でハッシュ化（本番環境ではbcryptなどを推奨）
        return hashlib.sha256(password.encode()).hexdigest()

    def _generate_token(self) -> str:
        """セッショントークンの生成

        Returns:
            ランダムなトークン文字列
        """
        return secrets.token_urlsafe(32)

    def _handle_register(self, body: Union[str, Dict]) -> Dict[str, Any]:
        """新規ユーザー登録

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
            existing_user = table.get_item(Key={"PK": f"USER#{email}", "SK": "PROFILE"})
            if "Item" in existing_user:
                return create_error_response(
                    409, "Conflict", "このメールアドレスは既に登録されています"
                )

            # 新しいユーザーデータを生成
            user_id = str(uuid.uuid4())
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

            table.put_item(Item=user_data)

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

    def _handle_login(self, body: Union[str, Dict]) -> Dict[str, Any]:
        """ユーザーログイン

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
            response = table.get_item(Key={"PK": f"USER#{email}", "SK": "PROFILE"})

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

            table.put_item(Item=session_data)

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

    def _handle_get_current_user(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """現在のユーザー情報取得

        Args:
            headers: リクエストヘッダー

        Returns:
            ユーザー情報のレスポンス
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

            # セッション情報を取得
            session_response = table.get_item(
                Key={"PK": f"SESSION#{token}", "SK": "INFO"}
            )

            if "Item" not in session_response:
                return create_error_response(
                    401, "Unauthorized", "無効な認証トークンです"
                )

            session = session_response["Item"]

            # セッションの有効期限チェック
            current_time = int(time.time())
            if session.get("expiresAt", 0) < current_time:
                return create_error_response(
                    401, "Unauthorized", "セッションの有効期限が切れています"
                )

            # ユーザー情報を取得
            user_response = table.get_item(
                Key={"PK": f"USER#{session['email']}", "SK": "PROFILE"}
            )

            if "Item" not in user_response:
                return create_error_response(
                    404, "Not Found", "ユーザー情報が見つかりません"
                )

            user = user_response["Item"]

            # レスポンスデータ（DecimalをintやfloatやstrにJSON serializable化）
            response_data = {
                "userId": user["userId"],
                "email": user["email"],
                "name": user["name"],
                "role": user.get("role", "user"),
                "createdAt": int(user["createdAt"]) if user["createdAt"] else 0,
                "updatedAt": int(user["updatedAt"]) if user["updatedAt"] else 0,
            }

            return create_success_response(response_data)

        except Exception as e:
            logger.error(f"Error getting current user: {e}")
            return create_error_response(
                500, "Internal Server Error", "ユーザー情報の取得に失敗しました"
            )

    def _handle_update_profile(self, body: Union[str, Dict], headers: Dict[str, str]) -> Dict[str, Any]:
        """ユーザープロファイル更新

        Args:
            body: リクエストボディ
            headers: リクエストヘッダー

        Returns:
            更新結果のレスポンス
        """
        try:
            # 認証チェック
            auth_header = headers.get("Authorization", "") or headers.get("authorization", "")
            if not auth_header.startswith("Bearer "):
                return create_error_response(401, "Unauthorized", "認証トークンが必要です")

            token = auth_header.replace("Bearer ", "")

            # セッション情報を取得
            session_response = table.get_item(Key={"PK": f"SESSION#{token}", "SK": "INFO"})
            if "Item" not in session_response:
                return create_error_response(401, "Unauthorized", "無効な認証トークンです")

            session = session_response["Item"]

            # セッションの有効期限チェック
            current_time = int(time.time())
            if session.get("expiresAt", 0) < current_time:
                return create_error_response(401, "Unauthorized", "セッションの有効期限が切れています")

            # 現在のユーザー情報を取得
            current_email = session["email"]
            user_response = table.get_item(Key={"PK": f"USER#{current_email}", "SK": "PROFILE"})
            if "Item" not in user_response:
                return create_error_response(404, "Not Found", "ユーザー情報が見つかりません")

            current_user = user_response["Item"]

            # リクエストボディをパース
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

            # 更新可能なフィールドを取得
            new_email = data.get("email", "").lower() if data.get("email") else current_email
            new_name = data.get("name", current_user["name"])
            new_password = data.get("password")

            # バリデーション
            if new_email != current_email:
                # メールアドレスの形式チェック
                if "@" not in new_email or len(new_email) < 5:
                    return create_error_response(400, "Bad Request", "有効なメールアドレスを入力してください")
                
                # 新しいメールアドレスが既に使用されていないかチェック
                existing_user = table.get_item(Key={"PK": f"USER#{new_email}", "SK": "PROFILE"})
                if "Item" in existing_user:
                    return create_error_response(409, "Conflict", "このメールアドレスは既に登録されています")

            # 名前のバリデーション
            if not new_name or len(new_name.strip()) == 0:
                return create_error_response(400, "Bad Request", "名前は必須です")

            # パスワードのバリデーション（変更する場合のみ）
            if new_password and len(new_password) < 6:
                return create_error_response(400, "Bad Request", "パスワードは6文字以上で入力してください")

            # 更新データを準備
            current_time_ms = int(time.time() * 1000)
            updated_user_data = {
                "PK": f"USER#{new_email}",
                "SK": "PROFILE",
                "userId": current_user["userId"],  # userIdは変更不可
                "email": new_email,
                "name": new_name.strip(),
                "passwordHash": self._hash_password(new_password) if new_password else current_user["passwordHash"],
                "role": current_user.get("role", "user"),
                "createdAt": current_user["createdAt"],
                "updatedAt": current_time_ms,
                "isActive": current_user.get("isActive", True),
            }

            # メールアドレスが変更された場合の処理
            if new_email != current_email:
                # 古いユーザーレコードを削除
                table.delete_item(Key={"PK": f"USER#{current_email}", "SK": "PROFILE"})
                
                # セッション情報も更新
                session_update_data = {
                    "PK": f"SESSION#{token}",
                    "SK": "INFO",
                    "userId": current_user["userId"],
                    "email": new_email,
                    "createdAt": session["createdAt"],
                    "expiresAt": session["expiresAt"],
                    "ttl": session["ttl"],
                }
                table.put_item(Item=session_update_data)

            # 新しいユーザーデータを保存
            table.put_item(Item=updated_user_data)

            logger.info(f"User profile updated successfully: {current_email} -> {new_email}")

            # レスポンスデータ（パスワードハッシュを除く）
            response_data = {}
            for k, v in updated_user_data.items():
                if k != "passwordHash":
                    if k in ["createdAt", "updatedAt"] and v is not None:
                        response_data[k] = int(v)
                    else:
                        response_data[k] = v

            return create_success_response(response_data)

        except json.JSONDecodeError:
            return create_error_response(400, "Bad Request", "Invalid JSON format")
        except ClientError as e:
            logger.error(f"DynamoDB error in update profile: {e}")
            return create_error_response(500, "Internal Server Error", "プロファイル更新に失敗しました")
        except Exception as e:
            logger.error(f"Unexpected error in update profile: {e}")
            return create_error_response(500, "Internal Server Error", "予期しないエラーが発生しました")

    def _handle_logout(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """ログアウト処理

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
            table.delete_item(Key={"PK": f"SESSION#{token}", "SK": "INFO"})

            logger.info("User logged out successfully")

            return create_success_response({"message": "ログアウトしました"})

        except Exception as e:
            logger.error(f"Error in logout: {e}")
            return create_error_response(
                500, "Internal Server Error", "ログアウトに失敗しました"
            )
