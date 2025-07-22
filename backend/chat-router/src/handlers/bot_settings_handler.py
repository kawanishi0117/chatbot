"""ボット設定ハンドラー

ボット設定のCRUD操作を担当するハンドラーモジュール
DynamoDBのChatbotSettingsDB-devテーブルとの連携を行う
"""

import logging
import os
import uuid
import time
import json
from typing import Any, Dict, List, Optional, Union

import boto3
from botocore.exceptions import ClientError

# Lambda実行環境でのモジュールインポートを確保
try:
    from common.responses import (
        create_success_response,
        create_error_response,
    )
    from handlers.bot_validator import BotValidator
except ImportError:
    from ..common.responses import (
        create_success_response,
        create_error_response,
    )
    from .bot_validator import BotValidator

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB設定
dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("CHATBOT_SETTINGS_TABLE", "ChatbotSettingsDB-dev")
table = dynamodb.Table(table_name)


class BotSettingsHandler:
    """ボット設定ハンドラークラス"""

    def __init__(self):
        """ボット設定ハンドラーの初期化"""
        self.validator = BotValidator()

    def handle_request(
        self,
        http_method: str,
        path: str,
        body: Union[str, Dict],
        query_params: Dict[str, str],
    ) -> Dict[str, Any]:
        """ボット設定APIリクエストのハンドリング

        Args:
            http_method: HTTPメソッド
            path: リクエストパス
            body: リクエストボディ
            query_params: クエリパラメータ

        Returns:
            APIレスポンス
        """
        try:
            logger.info(f"BotSettings API Request: {http_method} {path}")

            # パスからbot_idを抽出
            bot_id = None
            if path.startswith("/api/bots/") and len(path) > len("/api/bots/"):
                bot_id = path[len("/api/bots/") :]

            # HTTPメソッドとパスに基づく処理の振り分け
            if http_method == "POST" and path == "/api/bots":
                return self._handle_create_bot(body)
            elif http_method == "GET" and path == "/api/bots":
                return self._handle_list_bots(query_params)
            elif http_method == "GET" and bot_id:
                return self._handle_get_bot(bot_id)
            elif http_method == "PUT" and bot_id:
                return self._handle_update_bot(bot_id, body)
            elif http_method == "DELETE" and bot_id:
                return self._handle_delete_bot(bot_id)
            else:
                return create_error_response(404, "Not Found", "Unknown API endpoint")

        except Exception as e:
            logger.error(f"Error handling bot settings request: {str(e)}")
            return create_error_response(
                500, "Internal Server Error", "ボット設定の処理中にエラーが発生しました"
            )

    def _handle_create_bot(self, body: Union[str, Dict]) -> Dict[str, Any]:
        """新しいボットの作成

        Args:
            body: リクエストボディ

        Returns:
            作成結果のレスポンス
        """
        try:
            # リクエストボディをパース
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

            # バリデーション
            validation_result = self.validator.validate_bot_data(data)
            if not validation_result["valid"]:
                return create_error_response(
                    400, "Bad Request", validation_result["message"]
                )

            # 新しいボットデータを生成
            bot_id = str(uuid.uuid4())
            current_time = int(time.time() * 1000)  # ミリ秒

            bot_data = {
                "PK": bot_id,
                "SK": "CONFIG",
                "botName": data["botName"],
                "description": data.get("description", ""),
                "creatorId": data["creatorId"],
                "createdAt": current_time,
                "updatedAt": current_time,
                "isActive": data.get("isActive", True),
            }

            # DynamoDBに保存
            table.put_item(Item=bot_data)

            logger.info(f"Bot created successfully: {bot_id}")
            return create_success_response(bot_data)

        except json.JSONDecodeError:
            return create_error_response(400, "Bad Request", "Invalid JSON format")
        except ClientError as e:
            logger.error(f"DynamoDB error in create_bot: {e}")
            return create_error_response(
                500, "Internal Server Error", "ボットの作成に失敗しました"
            )
        except Exception as e:
            logger.error(f"Unexpected error in create_bot: {e}")
            return create_error_response(
                500, "Internal Server Error", "予期しないエラーが発生しました"
            )

    def _handle_list_bots(self, query_params: Dict[str, str]) -> Dict[str, Any]:
        """ボット一覧の取得

        Args:
            query_params: クエリパラメータ

        Returns:
            ボット一覧のレスポンス
        """
        try:
            creator_id = query_params.get("creatorId")

            if creator_id:
                # 特定の作成者のボットを取得
                response = table.query(
                    IndexName="creatorId-createdAt-index",
                    KeyConditionExpression="creatorId = :creator_id",
                    ExpressionAttributeValues={":creator_id": creator_id},
                    ScanIndexForward=False,  # createdAtで降順ソート
                )
            else:
                # 全てのボットを取得（Scan操作）
                response = table.scan(
                    FilterExpression="SK = :sk",
                    ExpressionAttributeValues={":sk": "CONFIG"},
                )

            items = response.get("Items", [])

            # レスポンス形式を調整
            bot_list = []
            for item in items:
                bot_data = {
                    "botId": item["PK"],
                    "botName": item["botName"],
                    "description": item.get("description", ""),
                    "creatorId": item["creatorId"],
                    "createdAt": item["createdAt"],
                    "updatedAt": item["updatedAt"],
                    "isActive": item.get("isActive", True),
                }
                bot_list.append(bot_data)

            return create_success_response({"bots": bot_list, "count": len(bot_list)})

        except ClientError as e:
            logger.error(f"DynamoDB error in list_bots: {e}")
            return create_error_response(
                500, "Internal Server Error", "ボット一覧の取得に失敗しました"
            )
        except Exception as e:
            logger.error(f"Unexpected error in list_bots: {e}")
            return create_error_response(
                500, "Internal Server Error", "予期しないエラーが発生しました"
            )

    def _handle_get_bot(self, bot_id: str) -> Dict[str, Any]:
        """特定のボットの詳細取得

        Args:
            bot_id: ボットID

        Returns:
            ボット詳細のレスポンス
        """
        try:
            # バリデーション
            if not self.validator.validate_bot_id(bot_id):
                return create_error_response(
                    400, "Bad Request", "Invalid bot ID format"
                )

            # DynamoDBから取得
            response = table.get_item(Key={"PK": bot_id, "SK": "CONFIG"})

            if "Item" not in response:
                return create_error_response(404, "Not Found", "ボットが見つかりません")

            item = response["Item"]
            bot_data = {
                "botId": item["PK"],
                "botName": item["botName"],
                "description": item.get("description", ""),
                "creatorId": item["creatorId"],
                "createdAt": item["createdAt"],
                "updatedAt": item["updatedAt"],
                "isActive": item.get("isActive", True),
            }

            return create_success_response(bot_data)

        except ClientError as e:
            logger.error(f"DynamoDB error in get_bot: {e}")
            return create_error_response(
                500, "Internal Server Error", "ボット詳細の取得に失敗しました"
            )
        except Exception as e:
            logger.error(f"Unexpected error in get_bot: {e}")
            return create_error_response(
                500, "Internal Server Error", "予期しないエラーが発生しました"
            )

    def _handle_update_bot(self, bot_id: str, body: Union[str, Dict]) -> Dict[str, Any]:
        """ボット設定の更新

        Args:
            bot_id: ボットID
            body: 更新データ

        Returns:
            更新結果のレスポンス
        """
        try:
            # バリデーション
            if not self.validator.validate_bot_id(bot_id):
                return create_error_response(
                    400, "Bad Request", "Invalid bot ID format"
                )

            # リクエストボディをパース
            if isinstance(body, str):
                update_data = json.loads(body)
            else:
                update_data = body

            # 更新データのバリデーション
            validation_result = self.validator.validate_update_data(update_data)
            if not validation_result["valid"]:
                return create_error_response(
                    400, "Bad Request", validation_result["message"]
                )

            # 現在のアイテムの存在確認
            current_response = table.get_item(Key={"PK": bot_id, "SK": "CONFIG"})
            if "Item" not in current_response:
                return create_error_response(404, "Not Found", "ボットが見つかりません")

            # 更新式を構築
            update_expression = "SET updatedAt = :updated_at"
            expression_values = {":updated_at": int(time.time() * 1000)}

            if "botName" in update_data:
                update_expression += ", botName = :bot_name"
                expression_values[":bot_name"] = update_data["botName"]

            if "description" in update_data:
                update_expression += ", description = :description"
                expression_values[":description"] = update_data["description"]

            if "isActive" in update_data:
                update_expression += ", isActive = :is_active"
                expression_values[":is_active"] = update_data["isActive"]

            # DynamoDBのアップデート実行
            response = table.update_item(
                Key={"PK": bot_id, "SK": "CONFIG"},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values,
                ReturnValues="ALL_NEW",
            )

            # レスポンス形式を調整
            updated_item = response["Attributes"]
            bot_data = {
                "botId": updated_item["PK"],
                "botName": updated_item["botName"],
                "description": updated_item.get("description", ""),
                "creatorId": updated_item["creatorId"],
                "createdAt": updated_item["createdAt"],
                "updatedAt": updated_item["updatedAt"],
                "isActive": updated_item.get("isActive", True),
            }

            logger.info(f"Bot updated successfully: {bot_id}")
            return create_success_response(bot_data)

        except json.JSONDecodeError:
            return create_error_response(400, "Bad Request", "Invalid JSON format")
        except ClientError as e:
            logger.error(f"DynamoDB error in update_bot: {e}")
            return create_error_response(
                500, "Internal Server Error", "ボットの更新に失敗しました"
            )
        except Exception as e:
            logger.error(f"Unexpected error in update_bot: {e}")
            return create_error_response(
                500, "Internal Server Error", "予期しないエラーが発生しました"
            )

    def _handle_delete_bot(self, bot_id: str) -> Dict[str, Any]:
        """ボットの削除

        Args:
            bot_id: ボットID

        Returns:
            削除結果のレスポンス
        """
        try:
            # バリデーション
            if not self.validator.validate_bot_id(bot_id):
                return create_error_response(
                    400, "Bad Request", "Invalid bot ID format"
                )

            # 削除前に存在確認
            response = table.get_item(Key={"PK": bot_id, "SK": "CONFIG"})
            if "Item" not in response:
                return create_error_response(404, "Not Found", "ボットが見つかりません")

            # DynamoDBから削除
            table.delete_item(Key={"PK": bot_id, "SK": "CONFIG"})

            logger.info(f"Bot deleted successfully: {bot_id}")
            return create_success_response(
                {"message": "ボットが正常に削除されました", "botId": bot_id}
            )

        except ClientError as e:
            logger.error(f"DynamoDB error in delete_bot: {e}")
            return create_error_response(
                500, "Internal Server Error", "ボットの削除に失敗しました"
            )
        except Exception as e:
            logger.error(f"Unexpected error in delete_bot: {e}")
            return create_error_response(
                500, "Internal Server Error", "予期しないエラーが発生しました"
            )
