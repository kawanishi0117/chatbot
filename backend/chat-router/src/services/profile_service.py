"""プロファイル管理サービス

ユーザープロファイルの更新処理を担当
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
    from common.auth_utils import get_authenticated_user
    from common.utils import convert_decimal_to_int
except ImportError:
    from ..common.responses import create_error_response, create_success_response
    from ..common.auth_utils import get_authenticated_user
    from ..common.utils import convert_decimal_to_int

logger = logging.getLogger(__name__)


class ProfileService:
    """プロファイル管理サービス"""

    def __init__(self):
        """初期化"""
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

    def update_profile(
        self, body: Union[str, Dict], headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """ユーザープロファイル更新処理

        Args:
            body: リクエストボディ
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

            # リクエストボディの解析
            if isinstance(body, str):
                try:
                    parsed_body = json.loads(body)
                except json.JSONDecodeError:
                    return create_error_response(
                        400, "Bad Request", "Invalid JSON format"
                    )
            else:
                parsed_body = body

            # 更新可能なフィールドを取得
            update_data = {}
            current_time = int(time.time() * 1000)

            # 名前の更新
            if "name" in parsed_body:
                name = parsed_body["name"].strip()
                if not name:
                    return create_error_response(
                        400, "Bad Request", "Name cannot be empty"
                    )
                update_data["name"] = name

            # パスワードの更新（元の処理と同じ）
            if "password" in parsed_body:
                new_password = parsed_body["password"]
                if len(new_password) < 6:
                    return create_error_response(
                        400, "Bad Request", "パスワードは6文字以上で入力してください"
                    )

                update_data["passwordHash"] = self._hash_password(new_password)

            # 更新するデータがない場合
            if not update_data:
                return create_error_response(
                    400, "Bad Request", "No valid fields to update"
                )

            # 更新時刻を設定
            update_data["updatedAt"] = current_time

            # DynamoDBを更新

            # 更新式とAttributeValuesを動的に構築
            update_expression_parts = []
            expression_attribute_values = {}

            for key, value in update_data.items():
                update_expression_parts.append(f"{key} = :{key}")
                expression_attribute_values[f":{key}"] = value

            update_expression = "SET " + ", ".join(update_expression_parts)

            try:
                response = self.table.update_item(
                    Key={
                        "PK": f"USER#{user['email']}",
                        "SK": "PROFILE",
                    },
                    UpdateExpression=update_expression,
                    ExpressionAttributeValues=expression_attribute_values,
                    ReturnValues="ALL_NEW",
                )

                updated_item = response["Attributes"]
                logger.info(f"Profile updated successfully for user: {user['email']}")

            except ClientError as e:
                logger.error(f"Failed to update profile: {e}")
                return create_error_response(
                    500, "Internal Server Error", "Failed to update profile"
                )

            # レスポンスデータ
            response_data = {
                "userId": updated_item["userId"],
                "email": updated_item["email"],
                "name": updated_item["name"],
                "role": updated_item.get("role", "user"),
                "createdAt": convert_decimal_to_int(updated_item["createdAt"]),
                "updatedAt": convert_decimal_to_int(updated_item["updatedAt"]),
            }

            return create_success_response(response_data)

        except Exception as e:
            logger.error(f"Error updating profile: {e}")
            return create_error_response(500, "Internal Server Error", str(e))
