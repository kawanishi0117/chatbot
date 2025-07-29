"""SQSサービス

AI処理用のSQSキューへのメッセージ送信を管理
"""

import json
import logging
import os
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

# ログ設定
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class SQSService:
    """SQSサービス"""

    def __init__(self):
        """初期化"""
        # 環境変数からSQS設定を取得
        self.sqs_endpoint = os.environ.get("SQS_ENDPOINT_URL", None)
        self.queue_name = os.environ.get("AI_PROCESSING_QUEUE", "ai-processing-queue")
        self.region = os.environ.get("AWS_DEFAULT_REGION", "ap-northeast-1")

        # SQSクライアント初期化
        if self.sqs_endpoint:
            # ローカル開発（LocalStack等）
            self.sqs_client = boto3.client(
                "sqs", endpoint_url=self.sqs_endpoint, region_name=self.region
            )
            self.queue_url = f"{self.sqs_endpoint}/000000000000/{self.queue_name}"
            logger.info(f"SQS initialized for local development: {self.queue_url}")
        else:
            # 本番環境（AWS）
            self.sqs_client = boto3.client("sqs", region_name=self.region)
            # キューURLを取得
            try:
                response = self.sqs_client.get_queue_url(QueueName=self.queue_name)
                self.queue_url = response["QueueUrl"]
                logger.info(f"SQS initialized for AWS: {self.queue_url}")
            except ClientError as e:
                logger.error(f"Failed to get SQS queue URL: {str(e)}")
                raise

    def send_ai_processing_message(
        self,
        chat_id: str,
        bot_id: str,
        user_message: str,
        user_message_id: str,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """AI処理用メッセージをSQSに送信

        Args:
            chat_id: チャットID
            bot_id: ボットID
            user_message: ユーザーメッセージ
            user_message_id: ユーザーメッセージID
            additional_data: 追加データ

        Returns:
            dict: 送信結果
        """
        try:
            # メッセージボディを構築
            message_body = {
                "chatId": chat_id,
                "botId": bot_id,
                "userMessage": user_message,
                "userMessageId": user_message_id,
                "timestamp": int(time.time() * 1000),
                "source": "custom-ui",
            }

            # 追加データがあれば含める
            if additional_data:
                message_body.update(additional_data)

            # SQSにメッセージを送信
            response = self.sqs_client.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(message_body),
                MessageAttributes={
                    "chatId": {"StringValue": chat_id, "DataType": "String"},
                    "botId": {"StringValue": bot_id, "DataType": "String"},
                    "messageType": {
                        "StringValue": "ai-processing-request",
                        "DataType": "String",
                    },
                },
            )

            logger.info(
                f"AI processing message sent to SQS: "
                f"chatId={chat_id}, botId={bot_id}, "
                f"messageId={response.get('MessageId')}"
            )

            return {
                "success": True,
                "messageId": response.get("MessageId"),
                "chatId": chat_id,
            }

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_message = e.response.get("Error", {}).get("Message", str(e))

            logger.error(
                f"SQS ClientError: {error_code} - {error_message}, " f"chatId={chat_id}"
            )

            return {
                "success": False,
                "error": f"SQS error: {error_code} - {error_message}",
            }

        except Exception as e:
            logger.error(f"Unexpected error sending to SQS: {str(e)}")
            return {"success": False, "error": str(e)}

    def send_batch_messages(self, messages: list[Dict[str, Any]]) -> Dict[str, Any]:
        """複数のメッセージを一括送信

        Args:
            messages: 送信するメッセージのリスト

        Returns:
            dict: 送信結果
        """
        try:
            if len(messages) > 10:
                raise ValueError("Batch size cannot exceed 10 messages")

            # バッチエントリーを構築
            entries = []
            for i, msg in enumerate(messages):
                entries.append(
                    {
                        "Id": str(i),
                        "MessageBody": json.dumps(msg),
                        "MessageAttributes": {
                            "messageType": {
                                "StringValue": "ai-processing-request",
                                "DataType": "String",
                            }
                        },
                    }
                )

            # バッチ送信
            response = self.sqs_client.send_message_batch(
                QueueUrl=self.queue_url, Entries=entries
            )

            successful = len(response.get("Successful", []))
            failed = len(response.get("Failed", []))

            logger.info(f"Batch message sent: {successful} successful, {failed} failed")

            return {
                "success": failed == 0,
                "successful": successful,
                "failed": failed,
                "details": response,
            }

        except Exception as e:
            logger.error(f"Error sending batch messages: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_queue_attributes(self) -> Dict[str, Any]:
        """キューの属性情報を取得

        Returns:
            dict: キュー属性
        """
        try:
            response = self.sqs_client.get_queue_attributes(
                QueueUrl=self.queue_url, AttributeNames=["All"]
            )

            attributes = response.get("Attributes", {})

            return {
                "queueUrl": self.queue_url,
                "approximateNumberOfMessages": int(
                    attributes.get("ApproximateNumberOfMessages", 0)
                ),
                "approximateNumberOfMessagesNotVisible": int(
                    attributes.get("ApproximateNumberOfMessagesNotVisible", 0)
                ),
                "visibilityTimeout": int(attributes.get("VisibilityTimeout", 30)),
                "maxReceiveCount": attributes.get("RedrivePolicy", {}).get(
                    "maxReceiveCount"
                ),
                "createdTimestamp": attributes.get("CreatedTimestamp"),
            }

        except Exception as e:
            logger.error(f"Error getting queue attributes: {str(e)}")
            return {"error": str(e)}

    def health_check(self) -> bool:
        """SQSサービスのヘルスチェック

        Returns:
            bool: 正常な場合True
        """
        try:
            # キュー属性を取得してみる
            self.sqs_client.get_queue_attributes(
                QueueUrl=self.queue_url, AttributeNames=["QueueArn"]
            )
            return True
        except Exception as e:
            logger.error(f"SQS health check failed: {str(e)}")
            return False


# タイムインポートを追加
import time
