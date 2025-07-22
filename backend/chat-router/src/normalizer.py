"""メッセージ正規化モジュール

異なるプラットフォーム（Slack、Microsoft Teams、LINE、カスタムUI）からの
メッセージを共通フォーマットに正規化する処理を行う
"""

import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, Optional, Union

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)


# 共通メッセージ型定義
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


def normalize_slack_message(payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
    """Slackメッセージの正規化

    Args:
        payload: Slack webhook ペイロード

    Returns:
        正規化されたメッセージ、または有効なメッセージイベントでない場合はNone
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
            s3_uri=s3_uri,
        )
    except Exception as e:
        logger.error("Error normalizing Slack message: %s", str(e))
        return None


def normalize_teams_message(payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
    """Microsoft Teamsメッセージの正規化

    Args:
        payload: Teams webhook ペイロード

    Returns:
        正規化されたメッセージ、または有効なメッセージイベントでない場合はNone
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

        # タイムスタンプをミリ秒に変換（より堅牢なエラーハンドリング）
        timestamp = payload.get("timestamp")
        ts_ms = _parse_timestamp_to_ms(timestamp)

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
            s3_uri=s3_uri,
        )
    except Exception as e:
        logger.error("Error normalizing Teams message: %s", str(e))
        return None


def normalize_line_message(payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
    """LINEメッセージの正規化

    Args:
        payload: LINE webhook ペイロード

    Returns:
        正規化されたメッセージ、または有効なメッセージイベントでない場合はNone
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
        source_id = (
            source.get("userId") or source.get("groupId") or source.get("roomId")
        )

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
            s3_uri=s3_uri,
        )
    except Exception as e:
        logger.error("Error normalizing LINE message: %s", str(e))
        return None


def normalize_custom_message(payload: Dict[str, Any]) -> Optional[UnifiedMessage]:
    """カスタムUIメッセージの正規化

    Args:
        payload: カスタムUI webhook ペイロード

    Returns:
        正規化されたメッセージ、または有効なメッセージでない場合はNone
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
            s3_uri=s3_uri,
        )
    except Exception as e:
        logger.error("Error normalizing custom message: %s", str(e))
        return None


def _determine_slack_file_type(file: Dict[str, Any]) -> str:
    """Slackファイルのコンテンツタイプを判定

    Args:
        file: Slackファイルオブジェクト

    Returns:
        コンテンツタイプ文字列
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
    """Teams添付ファイルのコンテンツタイプを判定

    Args:
        attachment: Teams添付ファイルオブジェクト

    Returns:
        コンテンツタイプ文字列
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


def _parse_timestamp_to_ms(timestamp: Optional[Union[str, int, float]]) -> int:
    """様々な形式のタイムスタンプをミリ秒にパース

    Args:
        timestamp: 様々な形式のタイムスタンプ

    Returns:
        ミリ秒単位のタイムスタンプ
    """
    if not timestamp:
        return int(time.time() * 1000)

    try:
        # 数値の場合（既にUNIXタイムスタンプの可能性）
        if isinstance(timestamp, (int, float)):
            # 秒かミリ秒かを判定（10桁なら秒、13桁ならミリ秒）
            if len(str(int(timestamp))) <= 10:
                return int(timestamp * 1000)
            else:
                return int(timestamp)

        # 文字列の場合
        if isinstance(timestamp, str):
            # ISO8601形式の処理
            if "T" in timestamp or "Z" in timestamp:
                # Zを+00:00に置換してISO形式をサポート
                normalized_ts = timestamp.replace("Z", "+00:00")
                dt = datetime.fromisoformat(normalized_ts)
                return int(dt.timestamp() * 1000)

            # 数値文字列の場合
            try:
                ts_float = float(timestamp)
                if len(timestamp.split(".")[0]) <= 10:
                    return int(ts_float * 1000)
                else:
                    return int(ts_float)
            except ValueError:
                pass

        # パースできない場合は現在時刻を返す
        logger.warning("Unable to parse timestamp: %s, using current time", timestamp)
        return int(time.time() * 1000)

    except Exception as e:
        logger.error("Error parsing timestamp %s: %s", timestamp, str(e))
        return int(time.time() * 1000)
