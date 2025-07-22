"""統一メッセージクラス

全プラットフォーム共通の統一メッセージフォーマットを定義する
"""

from typing import Any, Dict, Optional


class UnifiedMessage:
    """全プラットフォーム共通の統一メッセージフォーマット"""

    def __init__(
        self,
        platform: str,
        room_key: str,
        sender_id: str,
        ts: int,
        role: str = "user",
        text: Optional[str] = None,
        content_type: str = "text",
        s3_uri: Optional[str] = None,
    ):
        """統一メッセージの初期化

        Args:
            platform: プラットフォーム名（slack、teams、line、custom）
            room_key: 一意のルーム識別子
            sender_id: 送信者のID
            ts: タイムスタンプ（ミリ秒）
            role: メッセージの役割（user または assistant）
            text: メッセージのテキスト内容
            content_type: コンテンツタイプ（text、image、file等）
            s3_uri: S3内のバイナリコンテンツのURI（該当する場合）
        """
        self.platform = platform
        self.room_key = room_key
        self.sender_id = sender_id
        self.ts = ts
        self.role = role
        self.text = text
        self.content_type = content_type
        self.s3_uri = s3_uri

    def to_dict(self) -> Dict[str, Any]:
        """メッセージを辞書に変換

        Returns:
            メッセージの辞書表現
        """
        result = {
            "platform": self.platform,
            "roomKey": self.room_key,
            "senderId": self.sender_id,
            "ts": self.ts,
            "role": self.role,
            "contentType": self.content_type,
        }

        if self.text:
            result["text"] = self.text

        if self.s3_uri:
            result["s3Uri"] = self.s3_uri

        return result
