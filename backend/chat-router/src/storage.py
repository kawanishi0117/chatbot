"""チャットメッセージのストレージモジュール

DynamoDBでのチャットメッセージの保存とS3でのバイナリデータの処理を行う
"""

import base64
import boto3
import json
import logging
import mimetypes
import os
import time
import uuid
from typing import Any, Dict, Optional, BinaryIO, Union

# normalizerモジュールのインポート
try:
    import normalizer
except ImportError:
    from . import normalizer

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS クライアント
dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")

# 環境変数から設定を取得
CHAT_HISTORY_TABLE = os.environ.get("CHAT_HISTORY_TABLE", "ChatHistory")
CHAT_ASSETS_BUCKET = os.environ.get("CHAT_ASSETS_BUCKET", "chat-assets-prod")
TTL_SECONDS = int(os.environ.get("TTL_SECONDS", 86400))  # 24時間


def save_message(message: normalizer.UnifiedMessage) -> Dict[str, Any]:
    """メッセージをDynamoDBに保存し、バイナリデータがあればS3に保存

    Args:
        message: 保存する正規化されたメッセージ

    Returns:
        保存されたアイテムの詳細を含む辞書
    """
    try:
        # DynamoDBテーブルの取得
        table = dynamodb.Table(CHAT_HISTORY_TABLE)

        # TTLの計算（現在時刻 + 24時間）
        ttl = int(time.time()) + TTL_SECONDS

        # DynamoDBに保存するアイテムの作成
        item = {
            "PK": message.room_key,
            "SK": message.ts,
            "role": message.role,
            "contentType": message.content_type,
            "ttl": ttl,
        }

        # テキストがあれば追加
        if message.text:
            item["text"] = message.text

        # S3 URIがあれば追加
        if message.s3_uri:
            item["s3Uri"] = message.s3_uri

        # DynamoDBに保存
        table.put_item(Item=item)

        logger.info(
            "Message saved to DynamoDB: %s",
            json.dumps(
                {
                    "roomKey": message.room_key,
                    "ts": message.ts,
                    "contentType": message.content_type,
                }
            ),
        )

        return {
            "status": "success",
            "message": "Message saved successfully",
            "item": item,
        }
    except Exception as e:
        logger.error("Error saving message to DynamoDB: %s", str(e))
        raise


def save_binary_to_s3(
    message: normalizer.UnifiedMessage,
    binary_data: Union[bytes, BinaryIO],
    file_extension: Optional[str] = None,
) -> str:
    """バイナリデータをS3に保存

    Args:
        message: 正規化されたメッセージ
        binary_data: 保存するバイナリデータ
        file_extension: オプションのファイル拡張子

    Returns:
        保存されたオブジェクトのS3 URI
    """
    try:
        # ファイル拡張子の決定
        ext = file_extension or _determine_extension(binary_data, message.content_type)

        # S3オブジェクトキーの生成: <platform>/<roomKey>/<ts>.<ext>
        # roomKeyにはプラットフォーム名が含まれているが、S3パスでも明示的に分ける
        platform = message.platform
        room_key_safe = message.room_key.replace(
            ":", "_"
        )  # コロンをアンダースコアに置換
        object_key = f"{platform}/{room_key_safe}/{message.ts}.{ext}"

        # S3にアップロード
        s3_client.put_object(
            Bucket=CHAT_ASSETS_BUCKET,
            Key=object_key,
            Body=binary_data,
            ContentType=_get_content_type(ext),
        )

        # S3 URIを返す
        s3_uri = f"s3://{CHAT_ASSETS_BUCKET}/{object_key}"

        logger.info("Binary data saved to S3: %s", s3_uri)

        return s3_uri
    except Exception as e:
        logger.error("Error saving binary data to S3: %s", str(e))
        raise


def get_recent_messages(room_key: str, limit: int = 6) -> list:
    """ルームの最近のメッセージを取得

    Args:
        room_key: ルームキー
        limit: 取得するメッセージの最大数（デフォルト: 6、3回の会話分）

    Returns:
        時系列順のメッセージリスト
    """
    try:
        # DynamoDBテーブルの取得
        table = dynamodb.Table(CHAT_HISTORY_TABLE)

        # クエリの実行（降順で取得）
        response = table.query(
            KeyConditionExpression="PK = :pk",
            ExpressionAttributeValues={":pk": room_key},
            ScanIndexForward=False,  # 降順（新しい順）
            Limit=limit,
        )

        # 結果を取得
        items = response.get("Items", [])

        # タイムスタンプで昇順にソート（古い順）
        items.sort(key=lambda x: x["SK"])

        logger.info("Retrieved %d messages for room %s", len(items), room_key)

        return items
    except Exception as e:
        logger.error("Error retrieving messages from DynamoDB: %s", str(e))
        raise


def _determine_extension(binary_data: Union[bytes, BinaryIO], content_type: str) -> str:
    """バイナリデータとコンテンツタイプに基づいてファイル拡張子を決定

    Args:
        binary_data: バイナリデータ
        content_type: コンテンツタイプ

    Returns:
        ファイル拡張子
    """
    # コンテンツタイプに基づく拡張子の決定
    if content_type == "image":
        return "jpg"  # デフォルトはJPG
    elif content_type == "video":
        return "mp4"  # デフォルトはMP4
    elif content_type == "audio":
        return "mp3"  # デフォルトはMP3
    else:
        return "bin"  # デフォルトはバイナリ


def _get_content_type(extension: str) -> str:
    """ファイル拡張子のMIMEタイプを取得

    Args:
        extension: ファイル拡張子

    Returns:
        MIMEタイプ
    """
    return mimetypes.guess_type(f"file.{extension}")[0] or "application/octet-stream"


def process_binary_data(
    message: normalizer.UnifiedMessage,
    binary_data: Optional[Union[str, bytes, BinaryIO]] = None,
    file_extension: Optional[str] = None,
) -> normalizer.UnifiedMessage:
    """バイナリデータを処理し、S3 URIでメッセージを更新

    Args:
        message: 正規化されたメッセージ
        binary_data: バイナリデータ（base64文字列、バイト、またはファイルライクオブジェクト）
        file_extension: オプションのファイル拡張子

    Returns:
        S3 URIで更新されたメッセージ
    """
    if not binary_data:
        return message

    try:
        # Base64文字列の場合はデコード
        if isinstance(binary_data, str):
            try:
                binary_data = base64.b64decode(binary_data)
            except Exception as e:
                logger.error("Error decoding base64 data: %s", str(e))
                return message

        # S3に保存
        s3_uri = save_binary_to_s3(message, binary_data, file_extension)

        # メッセージを更新
        message.s3_uri = s3_uri

        return message
    except Exception as e:
        logger.error("Error processing binary data: %s", str(e))
        return message
