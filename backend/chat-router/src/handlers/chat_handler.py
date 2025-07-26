"""チャットルーム管理用のAPIハンドラー

チャットルームの作成、取得、削除などを管理する
"""

import json
import logging
import time
import uuid
from typing import Any, Dict, Optional

try:
    from common.responses import create_error_response, create_success_response
    from common.auth_utils import get_authenticated_user
    from storage import DynamoDBManager
except ImportError:
    from ..common.responses import create_error_response, create_success_response
    from ..common.auth_utils import get_authenticated_user
    from ..storage import DynamoDBManager

logger = logging.getLogger(__name__)


class ChatHandler:
    """チャットルーム管理ハンドラー"""

    def __init__(self):
        """初期化"""
        self.dynamodb = DynamoDBManager()

    def handle_request(
        self, method: str, path: str, body: Any, headers: Dict[str, str]
    ) -> Dict[str, Any]:
        """リクエストのルーティングと処理

        Args:
            method: HTTPメソッド
            path: リクエストパス
            body: リクエストボディ
            headers: リクエストヘッダー

        Returns:
            dict: レスポンス
        """
        try:
            # 認証チェック
            user = get_authenticated_user(headers)
            if not user:
                return create_error_response(
                    401, "Unauthorized", "認証トークンが必要です"
                )

            user_id = user.get("userId")

            # パスに基づくルーティング
            if path == "/api/chats" and method == "POST":
                return self._create_chat_room(body, user_id)
            elif path == "/api/chats" and method == "GET":
                return self._get_user_chats(user_id)
            elif path.startswith("/api/chats/") and method == "GET":
                chat_id = path.split("/")[-1]
                return self._get_chat_room(chat_id, user_id)
            elif path.startswith("/api/chats/") and method == "DELETE":
                chat_id = path.split("/")[-1]
                return self._delete_chat_room(chat_id, user_id)
            else:
                return create_error_response(
                    404, "Not Found", f"Unknown endpoint: {path}"
                )

        except Exception as e:
            logger.error("Error handling chat request: %s", str(e))
            return create_error_response(500, "Internal Server Error", str(e))

    def _create_chat_room(self, body: Any, user_id: str) -> Dict[str, Any]:
        """チャットルームを作成

        Args:
            body: リクエストボディ
            user_id: ユーザーID

        Returns:
            dict: レスポンス
        """
        try:
            # リクエストボディの検証
            if isinstance(body, str):
                body = json.loads(body)

            bot_id = body.get("botId")
            title = body.get("title", "新しいチャット")

            if not bot_id:
                return create_error_response(400, "Bad Request", "botIdは必須です")

            # ボットの存在確認
            bot_result = self.dynamodb.get_bot_settings(bot_id)
            if not bot_result["found"]:
                return create_error_response(
                    404, "Not Found", "指定されたボットが見つかりません"
                )

            bot_data = bot_result["data"]
            if not bot_data.get("isActive", False):
                return create_error_response(
                    400, "Bad Request", "指定されたボットは無効です"
                )

            # チャットルームIDを生成
            chat_id = str(uuid.uuid4())
            current_time = int(time.time())

            # チャットルームデータ
            chat_data = {
                "chatId": chat_id,
                "title": title,
                "userId": user_id,
                "botId": bot_id,
                "botName": bot_data.get("botName", "Unknown Bot"),
                "createdAt": current_time,
                "updatedAt": current_time,
                "messageCount": 0,
                "lastMessage": "",
                "isActive": True,
            }

            # DynamoDBに保存
            result = self.dynamodb.save_chat_room(chat_data)
            if not result["success"]:
                logger.error("Failed to save chat room: %s", result.get("error"))
                return create_error_response(
                    500, "Internal Server Error", "チャットルームの作成に失敗しました"
                )

            # レスポンス
            response_data = {
                "chatId": chat_id,
                "title": title,
                "botId": bot_id,
                "botName": bot_data.get("botName"),
                "createdAt": current_time,
            }

            return create_success_response(response_data)

        except json.JSONDecodeError:
            return create_error_response(400, "Bad Request", "Invalid JSON format")
        except Exception as e:
            logger.error("Error creating chat room: %s", str(e))
            return create_error_response(500, "Internal Server Error", str(e))

    def _get_user_chats(self, user_id: str) -> Dict[str, Any]:
        """ユーザーのチャット一覧を取得

        Args:
            user_id: ユーザーID

        Returns:
            dict: レスポンス
        """
        try:
            # ユーザーのチャット一覧を取得
            result = self.dynamodb.get_user_chats(user_id)
            if not result["success"]:
                logger.error("Failed to get user chats: %s", result.get("error"))
                return create_error_response(
                    500, "Internal Server Error", "チャット一覧の取得に失敗しました"
                )

            chats = result.get("data", [])

            # レスポンスデータの整形
            formatted_chats = []
            for chat in chats:
                formatted_chats.append(
                    {
                        "chatId": chat.get("chatId"),
                        "title": chat.get("title"),
                        "botId": chat.get("botId"),
                        "botName": chat.get("botName"),
                        "createdAt": chat.get("createdAt"),
                        "updatedAt": chat.get("updatedAt"),
                        "messageCount": chat.get("messageCount", 0),
                        "lastMessage": chat.get("lastMessage", ""),
                    }
                )

            response_data = {"chats": formatted_chats, "count": len(formatted_chats)}

            return create_success_response(response_data)

        except Exception as e:
            logger.error("Error getting user chats: %s", str(e))
            return create_error_response(500, "Internal Server Error", str(e))

    def _get_chat_room(self, chat_id: str, user_id: str) -> Dict[str, Any]:
        """チャットルーム詳細を取得

        Args:
            chat_id: チャットID
            user_id: ユーザーID

        Returns:
            dict: レスポンス
        """
        try:
            # チャットルームの取得
            result = self.dynamodb.get_chat_room(chat_id)
            if not result["found"]:
                return create_error_response(
                    404, "Not Found", "チャットルームが見つかりません"
                )

            chat_data = result["data"]

            # 所有者チェック
            if chat_data.get("userId") != user_id:
                return create_error_response(
                    403, "Forbidden", "このチャットルームにアクセスする権限がありません"
                )

            # レスポンス
            response_data = {
                "chatId": chat_data.get("chatId"),
                "title": chat_data.get("title"),
                "botId": chat_data.get("botId"),
                "botName": chat_data.get("botName"),
                "createdAt": chat_data.get("createdAt"),
                "updatedAt": chat_data.get("updatedAt"),
                "messageCount": chat_data.get("messageCount", 0),
                "lastMessage": chat_data.get("lastMessage", ""),
            }

            return create_success_response(response_data)

        except Exception as e:
            logger.error("Error getting chat room: %s", str(e))
            return create_error_response(500, "Internal Server Error", str(e))

    def _delete_chat_room(self, chat_id: str, user_id: str) -> Dict[str, Any]:
        """チャットルームを削除

        Args:
            chat_id: チャットID
            user_id: ユーザーID

        Returns:
            dict: レスポンス
        """
        try:
            # チャットルームの存在確認
            result = self.dynamodb.get_chat_room(chat_id)
            if not result["found"]:
                return create_error_response(
                    404, "Not Found", "チャットルームが見つかりません"
                )

            chat_data = result["data"]

            # 所有者チェック
            if chat_data.get("userId") != user_id:
                return create_error_response(
                    403, "Forbidden", "このチャットルームを削除する権限がありません"
                )

            # チャットルームを削除
            delete_result = self.dynamodb.delete_chat_room(chat_id)
            if not delete_result["success"]:
                logger.error(
                    "Failed to delete chat room: %s", delete_result.get("error")
                )
                return create_error_response(
                    500, "Internal Server Error", "チャットルームの削除に失敗しました"
                )

            return create_success_response(
                {"message": "チャットルームが正常に削除されました"}
            )

        except Exception as e:
            logger.error("Error deleting chat room: %s", str(e))
            return create_error_response(500, "Internal Server Error", str(e))
