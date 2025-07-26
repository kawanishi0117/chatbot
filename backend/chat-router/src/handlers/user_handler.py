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
    )
except ImportError:
    from ..common.auth_utils import (
        extract_bearer_token,
        get_authenticated_session,
        get_authenticated_user,
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
            elif http_method == "GET" and path.startswith("/api/invitations/"):
                invitation_id = path.split("/")[-1]
                return self._handle_get_invitation(invitation_id)
            elif (
                http_method == "POST"
                and path.startswith("/api/invitations/")
                and path.endswith("/accept")
            ):
                invitation_id = path.split("/")[-2]
                return self._handle_accept_invitation(invitation_id, headers)
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

            response_data = {
                "userId": user["userId"],
                "email": user["email"],
                "name": user["name"],
                "role": user.get("role", "user"),
                "createdAt": self._convert_decimal_to_int(user.get("createdAt", 0)),
                "updatedAt": self._convert_decimal_to_int(user.get("updatedAt", 0)),
            }
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
                    users_with_access.append(
                        {
                            "id": item.get("accessId", str(uuid.uuid4())),
                            "chatbotId": bot_id,
                            "userId": user_id,
                            "permission": item.get("permission", "read"),
                            "createdAt": item.get("createdAt", int(time.time() * 1000)),
                            "updatedAt": item.get("updatedAt", int(time.time() * 1000)),
                            "user": {
                                "id": user_id,
                                "email": user_info.get("email", ""),
                                "name": user_info.get("name", ""),
                                "role": user_info.get("role", "user"),
                                "createdAt": user_info.get(
                                    "createdAt", int(time.time() * 1000)
                                ),
                                "updatedAt": user_info.get(
                                    "updatedAt", int(time.time() * 1000)
                                ),
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
        """招待リンク作成

        Args:
            bot_id: ボットID
            body: リクエストボディ
            headers: リクエストヘッダー

        Returns:
            招待リンクのレスポンス
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

            email = data.get("email", "").lower()
            permission = data.get("permission", "read")

            # バリデーション
            if not email or "@" not in email:
                return create_error_response(
                    400, "Bad Request", "有効なメールアドレスが必要です"
                )

            if permission not in ["read", "write", "admin"]:
                return create_error_response(400, "Bad Request", "無効な権限レベルです")

            # 招待IDを生成
            invitation_id = str(uuid.uuid4())
            current_time = int(time.time() * 1000)
            expiry_time = int(time.time()) + (7 * 24 * 60 * 60)  # 7日後

            # 招待情報を保存
            invitation_data = {
                "PK": f"INVITATION#{invitation_id}",
                "SK": "INFO",
                "invitationId": invitation_id,
                "botId": bot_id,
                "email": email,
                "permission": permission,
                "inviterId": current_user["userId"],
                "inviterEmail": current_user["email"],
                "createdAt": current_time,
                "expiresAt": expiry_time,
                "ttl": expiry_time,
                "isUsed": False,
            }

            table.put_item(Item=invitation_data)

            logger.info(f"Invitation created: {invitation_id} for {email}")

            return create_success_response(
                {
                    "invitationId": invitation_id,
                    "invitationUrl": f"/invite/{invitation_id}",
                    "email": email,
                    "permission": permission,
                    "expiresAt": expiry_time * 1000,
                }
            )

        except json.JSONDecodeError:
            return create_error_response(400, "Bad Request", "Invalid JSON format")
        except Exception as e:
            logger.error(f"Error creating invitation: {e}")
            return create_error_response(
                500, "Internal Server Error", "招待リンクの作成に失敗しました"
            )

    def _handle_get_invitation(self, invitation_id: str) -> Dict[str, Any]:
        """招待情報取得

        Args:
            invitation_id: 招待ID

        Returns:
            招待情報のレスポンス
        """
        try:
            # 招待情報を取得
            response = table.get_item(
                Key={"PK": f"INVITATION#{invitation_id}", "SK": "INFO"}
            )

            if "Item" not in response:
                return create_error_response(404, "Not Found", "招待が見つかりません")

            invitation = response["Item"]

            # 有効期限チェック
            current_time = int(time.time())
            if invitation.get("expiresAt", 0) < current_time:
                return create_error_response(
                    410, "Gone", "招待の有効期限が切れています"
                )

            # 使用済みチェック
            if invitation.get("isUsed", False):
                return create_error_response(
                    410, "Gone", "この招待は既に使用されています"
                )

            return create_success_response(
                {
                    "invitationId": invitation["invitationId"],
                    "botId": invitation["botId"],
                    "email": invitation["email"],
                    "permission": invitation["permission"],
                    "inviterEmail": invitation.get("inviterEmail", ""),
                    "createdAt": invitation["createdAt"],
                    "expiresAt": invitation["expiresAt"] * 1000,
                }
            )

        except Exception as e:
            logger.error(f"Error getting invitation: {e}")
            return create_error_response(
                500, "Internal Server Error", "招待情報の取得に失敗しました"
            )

    def _handle_accept_invitation(
        self, invitation_id: str, headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """招待受諾処理

        Args:
            invitation_id: 招待ID
            headers: リクエストヘッダー

        Returns:
            招待受諾結果のレスポンス
        """
        try:
            # ユーザー認証（オプショナル - 未認証でも受諾可能）
            current_user = self._authenticate_user(headers)

            # 招待情報を取得
            response = table.get_item(
                Key={"PK": f"INVITATION#{invitation_id}", "SK": "INFO"}
            )

            if "Item" not in response:
                return create_error_response(404, "Not Found", "招待が見つかりません")

            invitation = response["Item"]

            # 有効期限チェック
            current_time = int(time.time())
            if invitation.get("expiresAt", 0) < current_time:
                return create_error_response(
                    410, "Gone", "招待の有効期限が切れています"
                )

            # 使用済みチェック
            if invitation.get("isUsed", False):
                return create_error_response(
                    410, "Gone", "この招待は既に使用されています"
                )

            # 招待されたメールアドレスのユーザーを取得または作成
            invited_email = invitation["email"]
            user_response = table.get_item(
                Key={"PK": f"USER#{invited_email}", "SK": "PROFILE"}
            )

            if "Item" not in user_response:
                # ユーザーが存在しない場合、仮ユーザーとして作成
                user_id = str(uuid.uuid4())
                current_time_ms = int(time.time() * 1000)

                user_data = {
                    "PK": f"USER#{invited_email}",
                    "SK": "PROFILE",
                    "userId": user_id,
                    "email": invited_email,
                    "name": invited_email.split("@")[0],  # メールアドレスから名前を生成
                    "passwordHash": "",  # パスワード未設定
                    "role": "user",
                    "createdAt": current_time_ms,
                    "updatedAt": current_time_ms,
                    "isActive": True,
                    "isInvited": True,  # 招待経由で作成されたユーザー
                }

                table.put_item(Item=user_data)
                user = user_data
            else:
                user = user_response["Item"]

            # ボットアクセス権限を付与
            access_data = {
                "PK": f"BOT#{invitation['botId']}",
                "SK": f"ACCESS#{user['userId']}",
                "accessId": str(uuid.uuid4()),
                "botId": invitation["botId"],
                "userId": user["userId"],
                "permission": invitation["permission"],
                "createdAt": int(time.time() * 1000),
                "updatedAt": int(time.time() * 1000),
                "invitedBy": invitation.get("inviterId", ""),
            }

            table.put_item(Item=access_data)

            # 招待を使用済みにマーク
            table.update_item(
                Key={"PK": f"INVITATION#{invitation_id}", "SK": "INFO"},
                UpdateExpression="SET isUsed = :used, usedAt = :used_at, usedBy = :used_by",
                ExpressionAttributeValues={
                    ":used": True,
                    ":used_at": int(time.time() * 1000),
                    ":used_by": user["userId"],
                },
            )

            logger.info(f"Invitation accepted: {invitation_id} by {invited_email}")

            return create_success_response(
                {
                    "message": "招待が正常に受諾されました。ボットにアクセスできるようになりました。",
                    "botId": invitation["botId"],
                    "permission": invitation["permission"],
                    "user": {
                        "userId": user["userId"],
                        "email": user["email"],
                        "name": user["name"],
                    },
                }
            )

        except Exception as e:
            logger.error(f"Error accepting invitation: {e}")
            return create_error_response(
                500, "Internal Server Error", "招待の受諾に失敗しました"
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
            if new_permission not in ["read", "write", "admin"]:
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
