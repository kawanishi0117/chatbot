"""ボット設定バリデーター

ボット設定データのバリデーション処理を担当するモジュール
"""

import re
import uuid
import logging
from typing import Any, Dict, Optional

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class BotValidator:
    """ボット設定データのバリデータークラス"""

    # バリデーション制約定数
    BOT_NAME_MIN_LENGTH = 1
    BOT_NAME_MAX_LENGTH = 100
    DESCRIPTION_MAX_LENGTH = 500

    # 許可される文字パターン（日本語、英数字、一般的な記号）
    BOT_NAME_PATTERN = re.compile(
        r"^[a-zA-Z0-9あ-んア-ヶ一-龯\s\-_.,!?()（）「」【】]*$"
    )
    USER_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]+$")

    def validate_bot_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """新規ボット作成データのバリデーション

        Args:
            data: ボット作成データ

        Returns:
            バリデーション結果 {'valid': bool, 'message': str}
        """
        try:
            # 必須フィールドのチェック
            required_fields = ["botName", "creatorId"]
            for field in required_fields:
                if field not in data or not data[field]:
                    return {
                        "valid": False,
                        "message": f'必須フィールド "{field}" が不足しています',
                    }

            # ボット名のバリデーション
            bot_name_result = self.validate_bot_name(data["botName"])
            if not bot_name_result["valid"]:
                return bot_name_result

            # 作成者IDのバリデーション
            creator_id_result = self.validate_creator_id(data["creatorId"])
            if not creator_id_result["valid"]:
                return creator_id_result

            # 説明のバリデーション（任意フィールド）
            if "description" in data:
                description_result = self.validate_description(data["description"])
                if not description_result["valid"]:
                    return description_result

            # isActiveのバリデーション（任意フィールド）
            if "isActive" in data:
                is_active_result = self.validate_is_active(data["isActive"])
                if not is_active_result["valid"]:
                    return is_active_result

            return {"valid": True, "message": "バリデーション成功"}

        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return {
                "valid": False,
                "message": "バリデーション処理中にエラーが発生しました",
            }

    def validate_update_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """ボット更新データのバリデーション

        Args:
            data: ボット更新データ

        Returns:
            バリデーション結果 {'valid': bool, 'message': str}
        """
        try:
            # 更新可能なフィールドのみを許可
            allowed_fields = ["botName", "description", "isActive"]

            # 少なくとも1つのフィールドが含まれているかチェック
            if not any(field in data for field in allowed_fields):
                return {
                    "valid": False,
                    "message": "更新可能なフィールド（botName, description, isActive）のいずれかが必要です",
                }

            # 許可されていないフィールドのチェック
            for field in data.keys():
                if field not in allowed_fields:
                    return {
                        "valid": False,
                        "message": f'フィールド "{field}" は更新できません',
                    }

            # 各フィールドのバリデーション
            if "botName" in data:
                bot_name_result = self.validate_bot_name(data["botName"])
                if not bot_name_result["valid"]:
                    return bot_name_result

            if "description" in data:
                description_result = self.validate_description(data["description"])
                if not description_result["valid"]:
                    return description_result

            if "isActive" in data:
                is_active_result = self.validate_is_active(data["isActive"])
                if not is_active_result["valid"]:
                    return is_active_result

            return {"valid": True, "message": "バリデーション成功"}

        except Exception as e:
            logger.error(f"Update validation error: {str(e)}")
            return {
                "valid": False,
                "message": "バリデーション処理中にエラーが発生しました",
            }

    def validate_bot_name(self, bot_name: Any) -> Dict[str, Any]:
        """ボット名のバリデーション

        Args:
            bot_name: ボット名

        Returns:
            バリデーション結果 {'valid': bool, 'message': str}
        """
        if not isinstance(bot_name, str):
            return {"valid": False, "message": "ボット名は文字列である必要があります"}

        # 文字数チェック
        if len(bot_name) < self.BOT_NAME_MIN_LENGTH:
            return {
                "valid": False,
                "message": f"ボット名は{self.BOT_NAME_MIN_LENGTH}文字以上である必要があります",
            }

        if len(bot_name) > self.BOT_NAME_MAX_LENGTH:
            return {
                "valid": False,
                "message": f"ボット名は{self.BOT_NAME_MAX_LENGTH}文字以内である必要があります",
            }

        # 文字パターンチェック
        if not self.BOT_NAME_PATTERN.match(bot_name):
            return {
                "valid": False,
                "message": "ボット名に使用できない文字が含まれています（英数字、日本語、一般的な記号のみ使用可能）",
            }

        # 空白のみでないかチェック
        if bot_name.strip() == "":
            return {"valid": False, "message": "ボット名は空白のみにはできません"}

        return {"valid": True, "message": "ボット名は有効です"}

    def validate_description(self, description: Any) -> Dict[str, Any]:
        """説明のバリデーション

        Args:
            description: 説明文

        Returns:
            バリデーション結果 {'valid': bool, 'message': str}
        """
        if description is None:
            return {"valid": True, "message": "説明は有効です（null許可）"}

        if not isinstance(description, str):
            return {"valid": False, "message": "説明は文字列である必要があります"}

        # 文字数チェック
        if len(description) > self.DESCRIPTION_MAX_LENGTH:
            return {
                "valid": False,
                "message": f"説明は{self.DESCRIPTION_MAX_LENGTH}文字以内である必要があります",
            }

        return {"valid": True, "message": "説明は有効です"}

    def validate_creator_id(self, creator_id: Any) -> Dict[str, Any]:
        """作成者IDのバリデーション

        Args:
            creator_id: 作成者ID

        Returns:
            バリデーション結果 {'valid': bool, 'message': str}
        """
        if not isinstance(creator_id, str):
            return {"valid": False, "message": "作成者IDは文字列である必要があります"}

        if not creator_id or creator_id.strip() == "":
            return {"valid": False, "message": "作成者IDは必須です"}

        # 文字数チェック（最大255文字）
        if len(creator_id) > 255:
            return {
                "valid": False,
                "message": "作成者IDは255文字以内である必要があります",
            }

        # パターンチェック（英数字、ハイフン、アンダースコアのみ）
        if not self.USER_ID_PATTERN.match(creator_id):
            return {
                "valid": False,
                "message": "作成者IDには英数字、ハイフン（-）、アンダースコア（_）のみ使用できます",
            }

        return {"valid": True, "message": "作成者IDは有効です"}

    def validate_is_active(self, is_active: Any) -> Dict[str, Any]:
        """アクティブ状態のバリデーション

        Args:
            is_active: アクティブ状態

        Returns:
            バリデーション結果 {'valid': bool, 'message': str}
        """
        if not isinstance(is_active, bool):
            return {
                "valid": False,
                "message": "isActiveはブール値（true/false）である必要があります",
            }

        return {"valid": True, "message": "isActiveは有効です"}

    def validate_bot_id(self, bot_id: Any) -> bool:
        """ボットIDのバリデーション（UUID形式チェック）

        Args:
            bot_id: ボットID

        Returns:
            bool: バリデーション結果
        """
        if not isinstance(bot_id, str):
            return False

        try:
            # UUID形式であることを確認
            uuid_obj = uuid.UUID(bot_id)
            # 文字列表現が一致することを確認（正規化）
            return str(uuid_obj) == bot_id.lower()
        except (ValueError, AttributeError):
            return False

    def get_validation_rules(self) -> Dict[str, Any]:
        """バリデーションルールの取得（デバッグ・参照用）

        Returns:
            バリデーションルール情報
        """
        return {
            "botName": {
                "minLength": self.BOT_NAME_MIN_LENGTH,
                "maxLength": self.BOT_NAME_MAX_LENGTH,
                "pattern": self.BOT_NAME_PATTERN.pattern,
                "required": True,
            },
            "description": {
                "maxLength": self.DESCRIPTION_MAX_LENGTH,
                "required": False,
            },
            "creatorId": {
                "maxLength": 255,
                "pattern": self.USER_ID_PATTERN.pattern,
                "required": True,
            },
            "isActive": {"type": "boolean", "required": False, "default": True},
            "botId": {"format": "UUID v4", "required": True},
        }
