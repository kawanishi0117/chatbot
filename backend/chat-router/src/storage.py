"""Storage module for chat messages.

This module handles storing chat messages in DynamoDB and binary data in S3.
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

# Import the normalizer module
try:
    import normalizer
except ImportError:
    from . import normalizer

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS クライアント
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

# 環境変数から設定を取得
CHAT_HISTORY_TABLE = os.environ.get('CHAT_HISTORY_TABLE', 'ChatHistory')
CHAT_ASSETS_BUCKET = os.environ.get('CHAT_ASSETS_BUCKET', 'chat-assets-prod')
TTL_SECONDS = int(os.environ.get('TTL_SECONDS', 86400))  # 24時間


def save_message(message: normalizer.UnifiedMessage) -> Dict[str, Any]:
    """Save a message to DynamoDB and binary data to S3 if applicable.
    
    Args:
        message: The normalized message to save
        
    Returns:
        Dict with the saved item details
    """
    try:
        # DynamoDBテーブルの取得
        table = dynamodb.Table(CHAT_HISTORY_TABLE)
        
        # TTLの計算（現在時刻 + 24時間）
        ttl = int(time.time()) + TTL_SECONDS
        
        # DynamoDBに保存するアイテムの作成
        item = {
            'PK': message.room_key,
            'SK': message.ts,
            'role': message.role,
            'contentType': message.content_type,
            'ttl': ttl
        }
        
        # テキストがあれば追加
        if message.text:
            item['text'] = message.text
            
        # S3 URIがあれば追加
        if message.s3_uri:
            item['s3Uri'] = message.s3_uri
            
        # DynamoDBに保存
        table.put_item(Item=item)
        
        logger.info("Message saved to DynamoDB: %s", json.dumps({
            'roomKey': message.room_key,
            'ts': message.ts,
            'contentType': message.content_type
        }))
        
        return {
            'status': 'success',
            'message': 'Message saved successfully',
            'item': item
        }
    except Exception as e:
        logger.error("Error saving message to DynamoDB: %s", str(e))
        raise


def save_binary_to_s3(
    message: normalizer.UnifiedMessage,
    binary_data: Union[bytes, BinaryIO],
    file_extension: Optional[str] = None
) -> str:
    """Save binary data to S3.
    
    Args:
        message: The normalized message
        binary_data: The binary data to save
        file_extension: Optional file extension
        
    Returns:
        S3 URI of the saved object
    """
    try:
        # ファイル拡張子の決定
        ext = file_extension or _determine_extension(binary_data, message.content_type)
        
        # S3オブジェクトキーの生成: <platform>/<roomKey>/<ts>.<ext>
        # roomKeyにはプラットフォーム名が含まれているが、S3パスでも明示的に分ける
        platform = message.platform
        room_key_safe = message.room_key.replace(':', '_')  # コロンをアンダースコアに置換
        object_key = f"{platform}/{room_key_safe}/{message.ts}.{ext}"
        
        # S3にアップロード
        s3_client.put_object(
            Bucket=CHAT_ASSETS_BUCKET,
            Key=object_key,
            Body=binary_data,
            ContentType=_get_content_type(ext)
        )
        
        # S3 URIを返す
        s3_uri = f"s3://{CHAT_ASSETS_BUCKET}/{object_key}"
        
        logger.info("Binary data saved to S3: %s", s3_uri)
        
        return s3_uri
    except Exception as e:
        logger.error("Error saving binary data to S3: %s", str(e))
        raise


def get_recent_messages(room_key: str, limit: int = 6) -> list:
    """Get recent messages for a room.
    
    Args:
        room_key: The room key
        limit: Maximum number of messages to retrieve (default: 6 for 3 exchanges)
        
    Returns:
        List of messages in chronological order
    """
    try:
        # DynamoDBテーブルの取得
        table = dynamodb.Table(CHAT_HISTORY_TABLE)
        
        # クエリの実行（降順で取得）
        response = table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={
                ':pk': room_key
            },
            ScanIndexForward=False,  # 降順（新しい順）
            Limit=limit
        )
        
        # 結果を取得
        items = response.get('Items', [])
        
        # タイムスタンプで昇順にソート（古い順）
        items.sort(key=lambda x: x['SK'])
        
        logger.info("Retrieved %d messages for room %s", len(items), room_key)
        
        return items
    except Exception as e:
        logger.error("Error retrieving messages from DynamoDB: %s", str(e))
        raise


def _determine_extension(binary_data: Union[bytes, BinaryIO], content_type: str) -> str:
    """Determine the file extension based on binary data and content type.
    
    Args:
        binary_data: The binary data
        content_type: The content type
        
    Returns:
        File extension
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
    """Get the MIME type for a file extension.
    
    Args:
        extension: The file extension
        
    Returns:
        MIME type
    """
    return mimetypes.guess_type(f"file.{extension}")[0] or "application/octet-stream"


def process_binary_data(message: normalizer.UnifiedMessage, binary_data: Optional[Union[str, bytes, BinaryIO]] = None, file_extension: Optional[str] = None) -> normalizer.UnifiedMessage:
    """Process binary data and update the message with S3 URI.
    
    Args:
        message: The normalized message
        binary_data: The binary data (base64 string, bytes, or file-like object)
        file_extension: Optional file extension
        
    Returns:
        Updated message with S3 URI
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