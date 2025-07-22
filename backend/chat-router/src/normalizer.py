"""Message normalizer module.

This module handles the normalization of messages from different platforms
(Slack, Microsoft Teams, LINE, Custom UI) into a common format.
"""

import json
import logging
import time
from typing import Any, Dict, Optional, Union

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 共通メッセージ型定義
class UnifiedMessage:
    """Unified message format across all platforms."""
    
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
        """Initialize a unified message.
        
        Args:
            platform: The platform name (slack, teams, line, custom)
            room_key: The unique room identifier
            sender_id: The sender's ID
            ts: Timestamp in milliseconds
            role: Message role (user or assistant)
            text: Message text content
            content_type: Content type (text, image, file, etc.)
            s3_uri: URI to binary content in S3 (if applicable)
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
        """Convert the message to a dictionary.
        
        Returns:
            Dict representation of the message
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


def normalize_slack_message(payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
    """Normalize a Slack message.
    
    Args:
        payload: The Slack webhook payload
        
    Returns:
        Normalized message or None if not a valid message event
    """
    try:
        # Slack Events APIのチャレンジリクエストの場合はNoneを返す
        if payload.get("type") == "url_verification":
            return None
            
        # イベントタイプのチェック
        event = payload.get("event", {})
        if not event or event.get("type") != "message":
            logger.info("Not a message event: %s", json.dumps(event))
            return None
            
        # 必要なデータを抽出
        team_id = payload.get("team_id")
        channel = event.get("channel")
        user = event.get("user")
        text = event.get("text")
        ts = event.get("ts")
        
        # タイムスタンプをミリ秒に変換（Slackのtsは秒.マイクロ秒形式）
        try:
            ts_parts = ts.split(".")
            ts_ms = int(ts_parts[0]) * 1000
            if len(ts_parts) > 1:
                ts_ms += int(ts_parts[1][:3])  # 最初の3桁だけミリ秒として使用
        except (ValueError, AttributeError, IndexError):
            ts_ms = int(time.time() * 1000)
            
        # スレッド情報の取得
        thread_ts = event.get("thread_ts", ts)
        
        # roomKeyの生成: slack:{team_id}:{channel}
        room_key = f"slack:{team_id}:{channel}"
        
        # コンテンツタイプの判定（添付ファイルがあれば）
        content_type = "text"
        s3_uri = None
        
        # 添付ファイルの処理
        files = event.get("files", [])
        if files:
            file = files[0]  # 最初のファイルのみ処理
            content_type = _determine_slack_file_type(file)
            # S3への保存はstorage.pyで行うため、ここではURIは設定しない
        
        return UnifiedMessage(
            platform="slack",
            room_key=room_key,
            sender_id=user,
            ts=ts_ms,
            text=text,
            content_type=content_type,
            s3_uri=s3_uri
        )
    except Exception as e:
        logger.error("Error normalizing Slack message: %s", str(e))
        return None


def normalize_teams_message(payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
    """Normalize a Microsoft Teams message.
    
    Args:
        payload: The Teams webhook payload
        
    Returns:
        Normalized message or None if not a valid message event
    """
    try:
        # Teams Botフレームワークのアクティビティタイプをチェック
        if payload.get("type") != "message":
            logger.info("Not a message activity: %s", payload.get("type"))
            return None
            
        # 必要なデータを抽出
        tenant_id = payload.get("channelData", {}).get("tenant", {}).get("id")
        conversation_id = payload.get("conversation", {}).get("id")
        sender_id = payload.get("from", {}).get("id")
        text = payload.get("text")
        
        # タイムスタンプをミリ秒に変換
        timestamp = payload.get("timestamp")
        try:
            from datetime import datetime
            ts_ms = int(datetime.fromisoformat(timestamp.replace("Z", "+00:00")).timestamp() * 1000)
        except (ValueError, AttributeError):
            ts_ms = int(time.time() * 1000)
            
        # roomKeyの生成: teams:{tenantId}:{conversationId}
        room_key = f"teams:{tenant_id}:{conversation_id}"
        
        # コンテンツタイプの判定
        content_type = "text"
        s3_uri = None
        
        # 添付ファイルの処理
        attachments = payload.get("attachments", [])
        if attachments:
            attachment = attachments[0]  # 最初の添付ファイルのみ処理
            content_type = _determine_teams_attachment_type(attachment)
            # S3への保存はstorage.pyで行うため、ここではURIは設定しない
        
        return UnifiedMessage(
            platform="teams",
            room_key=room_key,
            sender_id=sender_id,
            ts=ts_ms,
            text=text,
            content_type=content_type,
            s3_uri=s3_uri
        )
    except Exception as e:
        logger.error("Error normalizing Teams message: %s", str(e))
        return None


def normalize_line_message(payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
    """Normalize a LINE message.
    
    Args:
        payload: The LINE webhook payload
        
    Returns:
        Normalized message or None if not a valid message event
    """
    try:
        # LINEのWebhookイベントを取得
        events = payload.get("events", [])
        if not events or len(events) == 0:
            logger.info("No events in LINE payload")
            return None
            
        # 最初のイベントのみ処理
        event = events[0]
        
        # メッセージイベントかチェック
        if event.get("type") != "message":
            logger.info("Not a message event: %s", event.get("type"))
            return None
            
        # 必要なデータを抽出
        source = event.get("source", {})
        source_type = source.get("type")  # user, group, room
        source_id = source.get("userId") or source.get("groupId") or source.get("roomId")
        
        message = event.get("message", {})
        message_type = message.get("type")
        text = message.get("text") if message_type == "text" else None
        
        # タイムスタンプをミリ秒に変換
        timestamp = event.get("timestamp")
        ts_ms = timestamp if timestamp else int(time.time() * 1000)
            
        # roomKeyの生成: line:{source.type}:{id}
        room_key = f"line:{source_type}:{source_id}"
        
        # コンテンツタイプの判定
        content_type = message_type or "text"
        s3_uri = None
        
        # 添付ファイルの処理（画像、動画、音声、ファイル）
        if message_type in ["image", "video", "audio", "file"]:
            # S3への保存はstorage.pyで行うため、ここではURIは設定しない
            pass
        
        return UnifiedMessage(
            platform="line",
            room_key=room_key,
            sender_id=source.get("userId", "unknown"),
            ts=ts_ms,
            text=text,
            content_type=content_type,
            s3_uri=s3_uri
        )
    except Exception as e:
        logger.error("Error normalizing LINE message: %s", str(e))
        return None


def normalize_custom_message(payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
    """Normalize a custom UI message.
    
    Args:
        payload: The custom UI webhook payload
        
    Returns:
        Normalized message or None if not a valid message
    """
    try:
        # カスタムUIからの必要なデータを抽出
        room_id = payload.get("roomId")
        sender_id = payload.get("senderId")
        text = payload.get("text")
        timestamp = payload.get("timestamp")
        
        # タイムスタンプの処理
        if timestamp:
            ts_ms = int(timestamp)
        else:
            ts_ms = int(time.time() * 1000)
            
        # roomKeyの生成: custom:{roomId}
        room_key = f"custom:{room_id}"
        
        # コンテンツタイプの判定
        content_type = payload.get("contentType", "text")
        s3_uri = None
        
        # バイナリデータの処理
        binary_data = payload.get("binaryData")
        if binary_data:
            # S3への保存はstorage.pyで行うため、ここではURIは設定しない
            pass
        
        return UnifiedMessage(
            platform="custom",
            room_key=room_key,
            sender_id=sender_id,
            ts=ts_ms,
            text=text,
            content_type=content_type,
            s3_uri=s3_uri
        )
    except Exception as e:
        logger.error("Error normalizing custom message: %s", str(e))
        return None


def _determine_slack_file_type(file: Dict[str, Any]) -> str:
    """Determine the content type of a Slack file.
    
    Args:
        file: Slack file object
        
    Returns:
        Content type string
    """
    mime_type = file.get("mimetype", "")
    
    if mime_type.startswith("image/"):
        return "image"
    elif mime_type.startswith("video/"):
        return "video"
    elif mime_type.startswith("audio/"):
        return "audio"
    else:
        return "file"


def _determine_teams_attachment_type(attachment: Dict[str, Any]) -> str:
    """Determine the content type of a Teams attachment.
    
    Args:
        attachment: Teams attachment object
        
    Returns:
        Content type string
    """
    content_type = attachment.get("contentType", "")
    
    if "image" in content_type:
        return "image"
    elif "video" in content_type:
        return "video"
    elif "audio" in content_type:
        return "audio"
    else:
        return "file"