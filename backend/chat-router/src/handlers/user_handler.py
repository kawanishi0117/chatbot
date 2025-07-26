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
from decimal import Decimal
from typing import Any, Dict, List, Optional, Union

import boto3
from botocore.exceptions import ClientError

# 追加: 共通認証ユーティリティ
try:
    from common.auth_utils import (
        extract_bearer_token,
        get_authenticated_session,
        get_authenticated_user,
        get_authenticated_admin,
    )
except ImportError:
    from ..common.auth_utils import (
        extract_bearer_token,
        get_authenticated_session,
        get_authenticated_user,
        get_authenticated_admin,
    )

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

    def _convert_decimal_to_int(self, value: Any) -> Union[int, Any]:
        """Decimal型の値をintに変換する

        Args:
            value: 変換対象の値

        Returns:
            int型に変換された値、またはそのままの値
        """
        if isinstance(value, Decimal):
            return int(value)
        return value

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
            # ユーザー管理機能
            elif (
                http_method == "GET"
                and path.startswith("/api/bots/")
                and path.endswith("/users")
            ):
                bot_id = path.split("/")[-2]
                return self._handle_get_bot_users(bot_id, headers)
            elif (
                http_method == "POST"
                and path.startswith("/api/bots/")
                and path.endswith("/invite")
            ):
                bot_id = path.split("/")[-2]
                return self._handle_create_invitation(bot_id, body, headers)

            elif (
                http_method == "PUT"
                and path.startswith("/api/bots/")
                and "/users/" in path
            ):
                path_parts = path.split("/")
                bot_id = path_parts[3]
                user_id = path_parts[5]
                return self._handle_update_user_permission(
                    bot_id, user_id, body, headers
                )
            elif (
                http_method == "DELETE"
                and path.startswith("/api/bots/")
                and "/users/" in path
            ):
                path_parts = path.split("/")
                bot_id = path_parts[3]
                user_id = path_parts[5]
                return self._handle_remove_user_from_bot(bot_id, user_id, headers)
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
        """現在のユーザー情報取得（共通ユーティリティを利用）"""
        try:
            user = get_authenticated_user(headers)
            if not user:
                return create_error_response(
                    401, "Unauthorized", "認証トークンが必要です"
                )

            # デバッグログ: 取得したユーザー情報を出力
            logger.info(f"Retrieved user data: {user}")
            logger.info(
                f"User role field: {user.get('role')} (type: {type(user.get('role'))})"
            )

            response_data = {
                "userId": user["userId"],
                "email": user["email"],
                "name": user["name"],
                "role": user.get("role", "user"),
                "createdAt": self._convert_decimal_to_int(user.get("createdAt", 0)),
                "updatedAt": self._convert_decimal_to_int(user.get("updatedAt", 0)),
            }

            # デバッグログ: レスポンスデータを出力
            logger.info(f"Response data: {response_data}")

            return create_success_response(response_data)
        except Exception as e:
            logger.error(f"Error getting current user: {e}")
            return create_error_response(
                500, "Internal Server Error", "ユーザー情報の取得に失敗しました"
            )

    def _handle_update_profile(
        self, body: Union[str, Dict], headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """ユーザープロファイル更新

        Args:
            body: リクエストボディ
            headers: リクエストヘッダー

        Returns:
            更新結果のレスポンス
        """
        try:
            # 認証チェック
            token = extract_bearer_token(headers)
            session = get_authenticated_session(headers)
            if not token or session is None:
                return create_error_response(
                    401, "Unauthorized", "認証トークンが必要です"
                )

            # 共通ユーティリティで取得した session をそのまま使用
            current_email = session["email"]
            user_response = table.get_item(
                Key={"PK": f"USER#{current_email}", "SK": "PROFILE"}
            )
            if "Item" not in user_response:
                return create_error_response(
                    404, "Not Found", "ユーザー情報が見つかりません"
                )

            current_user = user_response["Item"]

            # リクエストボディをパース
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

            # 更新可能なフィールドを取得
            new_email = (
                data.get("email", "").lower() if data.get("email") else current_email
            )
            new_name = data.get("name", current_user["name"])
            new_password = data.get("password")

            # バリデーション
            if new_email != current_email:
                # メールアドレスの形式チェック
                if "@" not in new_email or len(new_email) < 5:
                    return create_error_response(
                        400, "Bad Request", "有効なメールアドレスを入力してください"
                    )

                # 新しいメールアドレスが既に使用されていないかチェック
                existing_user = table.get_item(
                    Key={"PK": f"USER#{new_email}", "SK": "PROFILE"}
                )
                if "Item" in existing_user:
                    return create_error_response(
                        409, "Conflict", "このメールアドレスは既に登録されています"
                    )

            # 名前のバリデーション
            if not new_name or len(new_name.strip()) == 0:
                return create_error_response(400, "Bad Request", "名前は必須です")

            # パスワードのバリデーション（変更する場合のみ）
            if new_password and len(new_password) < 6:
                return create_error_response(
                    400, "Bad Request", "パスワードは6文字以上で入力してください"
                )

            # 更新データを準備
            current_time_ms = int(time.time() * 1000)
            updated_user_data = {
                "PK": f"USER#{new_email}",
                "SK": "PROFILE",
                "userId": current_user["userId"],  # userIdは変更不可
                "email": new_email,
                "name": new_name.strip(),
                "passwordHash": (
                    self._hash_password(new_password)
                    if new_password
                    else current_user["passwordHash"]
                ),
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

            logger.info(
                f"User profile updated successfully: {current_email} -> {new_email}"
            )

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
            return create_error_response(
                500, "Internal Server Error", "プロファイル更新に失敗しました"
            )
        except Exception as e:
            logger.error(f"Unexpected error in update profile: {e}")
            return create_error_response(
                500, "Internal Server Error", "予期しないエラーが発生しました"
            )

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

    def _authenticate_user(self, headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """ユーザー認証チェック（共通ユーティリティへ委譲）"""
        return get_authenticated_user(headers)

    def _handle_get_bot_users(
        self, bot_id: str, headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """ボットのユーザー一覧取得

        Args:
            bot_id: ボットID
            headers: リクエストヘッダー

        Returns:
            ユーザー一覧のレスポンス
        """
        try:
            # 認証チェック
            current_user = self._authenticate_user(headers)
            if not current_user:
                return create_error_response(401, "Unauthorized", "認証が必要です")

            # userIdフィールドの存在確認
            if "userId" not in current_user:
                logger.error(f"userId field not found in current_user: {current_user}")
                return create_error_response(
                    500, "Internal Server Error", "ユーザー情報が不正です"
                )

            # 現在のユーザーがこのボットへのアクセス権限を持っているかチェック
            user_id = current_user["userId"]

            access_check = table.get_item(
                Key={"PK": f"BOT#{bot_id}", "SK": f"ACCESS#{user_id}"}
            )

            if "Item" not in access_check:
                return create_error_response(
                    403, "Forbidden", "このボットへのアクセス権限がありません"
                )

            # ボットのユーザー一覧を取得
            response = table.query(
                KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues={":pk": f"BOT#{bot_id}", ":sk": "ACCESS#"},
            )

            users_with_access = []
            for item in response.get("Items", []):
                user_id = item["SK"].replace("ACCESS#", "")

                # ユーザー情報を取得するために、userIdからemailを特定し、PK="USER#{email}", SK="PROFILE"で取得
                # まず、全てのユーザーから該当するuserIdを検索
                user_info = None
                try:
                    # userIdから対応するユーザー情報を取得するため、スキャン操作を実行
                    scan_response = table.scan(
                        FilterExpression="SK = :sk AND userId = :user_id",
                        ExpressionAttributeValues={
                            ":sk": "PROFILE",
                            ":user_id": user_id,
                        },
                    )

                    if scan_response.get("Items"):
                        user_info = scan_response["Items"][0]
                except Exception as e:
                    logger.warning(f"Failed to get user info for {user_id}: {e}")
                    continue

                if user_info:
                    # Decimal型をint型に変換
                    access_created_at = item.get("createdAt", int(time.time() * 1000))
                    access_updated_at = item.get("updatedAt", int(time.time() * 1000))
                    user_created_at = user_info.get(
                        "createdAt", int(time.time() * 1000)
                    )
                    user_updated_at = user_info.get(
                        "updatedAt", int(time.time() * 1000)
                    )

                    # Decimal型の場合はint型に変換
                    if hasattr(access_created_at, "__float__"):
                        access_created_at = int(access_created_at)
                    if hasattr(access_updated_at, "__float__"):
                        access_updated_at = int(access_updated_at)
                    if hasattr(user_created_at, "__float__"):
                        user_created_at = int(user_created_at)
                    if hasattr(user_updated_at, "__float__"):
                        user_updated_at = int(user_updated_at)

                    users_with_access.append(
                        {
                            "id": item.get("accessId", str(uuid.uuid4())),
                            "chatbotId": bot_id,
                            "userId": user_id,
                            "permission": item.get("permission", "read"),
                            "createdAt": access_created_at,
                            "updatedAt": access_updated_at,
                            "user": {
                                "id": user_id,
                                "email": user_info.get("email", ""),
                                "name": user_info.get("name", ""),
                                "role": user_info.get("role", "user"),
                                "createdAt": user_created_at,
                                "updatedAt": user_updated_at,
                            },
                        }
                    )

            logger.info(f"Retrieved {len(users_with_access)} users for bot {bot_id}")
            return create_success_response(users_with_access)

        except Exception as e:
            logger.error(f"Error getting bot users: {e}")
            return create_error_response(
                500, "Internal Server Error", "ユーザー一覧の取得に失敗しました"
            )

    def _handle_create_invitation(
        self, bot_id: str, body: Union[str, Dict], headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """ユーザー招待（メールアドレス指定）

        Args:
            bot_id: ボットID
            body: リクエストボディ
            headers: リクエストヘッダー

        Returns:
            招待結果のレスポンス
        """
        try:
            # 管理者権限チェック（ユーザー招待は管理者のみ）
            current_admin = get_authenticated_admin(headers)
            if not current_admin:
                return create_error_response(403, "Forbidden", "管理者権限が必要です")

            # リクエストボディをパース
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

            # 必須フィールドの確認
            email = data.get("email", "").lower().strip()
            permission = data.get("permission", "general")

            if not email:
                return create_error_response(
                    400, "Bad Request", "メールアドレスは必須です"
                )

            # バリデーション
            if permission not in ["general", "admin"]:
                return create_error_response(400, "Bad Request", "無効な権限レベルです")

            # メールアドレスの形式チェック
            if "@" not in email or len(email) < 5:
                return create_error_response(
                    400, "Bad Request", "有効なメールアドレスを入力してください"
                )

            # 招待対象ユーザーの存在確認
            user_response = table.get_item(Key={"PK": f"USER#{email}", "SK": "PROFILE"})

            if "Item" not in user_response:
                return create_error_response(
                    404,
                    "Not Found",
                    "指定されたメールアドレスのユーザーが見つかりません",
                )

            invited_user = user_response["Item"]
            invited_user_id = invited_user["userId"]

            # 既にアクセス権限があるかチェック
            existing_access = table.get_item(
                Key={"PK": f"BOT#{bot_id}", "SK": f"ACCESS#{invited_user_id}"}
            )

            if "Item" in existing_access:
                return create_error_response(
                    409, "Conflict", "このユーザーは既にボットにアクセス権限があります"
                )

            # アクセス権限を付与
            current_time = int(time.time() * 1000)
            access_data = {
                "PK": f"BOT#{bot_id}",
                "SK": f"ACCESS#{invited_user_id}",
                "accessId": str(uuid.uuid4()),
                "botId": bot_id,
                "userId": invited_user_id,
                "permission": permission,
                "createdAt": current_time,
                "updatedAt": current_time,
                "invitedBy": current_admin["userId"],
            }

            table.put_item(Item=access_data)

            logger.info(
                f"User {email} granted {permission} access to bot {bot_id} by {current_admin['email']}"
            )

            return create_success_response(
                {
                    "message": f"{email} にボットへのアクセス権限を付与しました",
                    "userEmail": email,
                    "userName": invited_user.get("name", ""),
                    "permission": permission,
                    "botId": bot_id,
                }
            )

        except json.JSONDecodeError:
            return create_error_response(400, "Bad Request", "Invalid JSON format")
        except Exception as e:
            logger.error(f"Error inviting user: {e}")
            return create_error_response(
                500, "Internal Server Error", "ユーザーの招待に失敗しました"
            )

    def _handle_update_user_permission(
        self, bot_id: str, user_id: str, body: Union[str, Dict], headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """ユーザー権限変更

        Args:
            bot_id: ボットID
            user_id: ユーザーID
            body: リクエストボディ
            headers: リクエストヘッダー

        Returns:
            権限変更結果のレスポンス
        """
        try:
            # 認証チェック
            current_user = self._authenticate_user(headers)
            if not current_user:
                return create_error_response(401, "Unauthorized", "認証が必要です")

            # リクエストボディをパース
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

            new_permission = data.get("permission")

            # バリデーション
            if new_permission not in ["general", "admin"]:
                return create_error_response(400, "Bad Request", "無効な権限レベルです")

            # 対象ユーザーのアクセス権限を更新
            table.update_item(
                Key={"PK": f"BOT#{bot_id}", "SK": f"ACCESS#{user_id}"},
                UpdateExpression="SET permission = :permission, updatedAt = :updated_at",
                ExpressionAttributeValues={
                    ":permission": new_permission,
                    ":updated_at": int(time.time() * 1000),
                },
            )

            logger.info(
                f"User permission updated: {user_id} -> {new_permission} for bot {bot_id}"
            )

            return create_success_response(
                {
                    "message": "ユーザー権限が更新されました",
                    "userId": user_id,
                    "botId": bot_id,
                    "permission": new_permission,
                }
            )

        except json.JSONDecodeError:
            return create_error_response(400, "Bad Request", "Invalid JSON format")
        except Exception as e:
            logger.error(f"Error updating user permission: {e}")
            return create_error_response(
                500, "Internal Server Error", "権限変更に失敗しました"
            )

    def _handle_remove_user_from_bot(
        self, bot_id: str, user_id: str, headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """ボットからユーザーを削除

        Args:
            bot_id: ボットID
            user_id: ユーザーID
            headers: リクエストヘッダー

        Returns:
            削除結果のレスポンス
        """
        try:
            # 認証チェック
            current_user = self._authenticate_user(headers)
            if not current_user:
                return create_error_response(401, "Unauthorized", "認証が必要です")

            # アクセス権限を削除
            table.delete_item(Key={"PK": f"BOT#{bot_id}", "SK": f"ACCESS#{user_id}"})

            logger.info(f"User removed from bot: {user_id} from bot {bot_id}")

            return create_success_response(
                {
                    "message": "ユーザーがボットから削除されました",
                    "userId": user_id,
                    "botId": bot_id,
                }
            )

        except Exception as e:
            logger.error(f"Error removing user from bot: {e}")
            return create_error_response(
                500, "Internal Server Error", "ユーザー削除に失敗しました"
            )
