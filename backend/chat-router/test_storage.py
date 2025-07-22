"""Test script for the storage module."""

import json
import unittest
import sys
import os
import base64
from unittest.mock import patch, MagicMock
from datetime import datetime

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

# Import the modules to test
from src.normalizer import UnifiedMessage
from src.storage import save_message, save_binary_to_s3, get_recent_messages, process_binary_data


class TestStorage(unittest.TestCase):
    """Test cases for the storage module."""

    @patch("src.storage.dynamodb")
    def test_save_message(self, mock_dynamodb):
        """Test saving a message to DynamoDB."""
        # Create a mock table
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table

        # Create a message
        message = UnifiedMessage(
            platform="slack",
            room_key="slack:T123:C456",
            sender_id="U789",
            ts=1617235678000,
            text="Hello, world!",
            content_type="text",
        )

        # Save the message
        result = save_message(message)

        # Check that put_item was called
        mock_table.put_item.assert_called_once()
        args, kwargs = mock_table.put_item.call_args
        item = kwargs["Item"]

        # Check the item
        self.assertEqual(item["PK"], "slack:T123:C456")
        self.assertEqual(item["SK"], 1617235678000)
        self.assertEqual(item["role"], "user")
        self.assertEqual(item["text"], "Hello, world!")
        self.assertEqual(item["contentType"], "text")
        self.assertIn("ttl", item)

        # Check the result
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["message"], "Message saved successfully")

    @patch("src.storage.s3_client")
    def test_save_binary_to_s3(self, mock_s3_client):
        """Test saving binary data to S3."""
        # Create a message
        message = UnifiedMessage(
            platform="slack",
            room_key="slack:T123:C456",
            sender_id="U789",
            ts=1617235678000,
            content_type="image",
        )

        # Create binary data
        binary_data = b"test binary data"

        # Save the binary data
        s3_uri = save_binary_to_s3(message, binary_data, "jpg")

        # Check that put_object was called
        mock_s3_client.put_object.assert_called_once()
        args, kwargs = mock_s3_client.put_object.call_args
        self.assertEqual(kwargs["Bucket"], "chat-assets-prod")
        self.assertTrue(kwargs["Key"].startswith("slack/"))
        self.assertTrue(kwargs["Key"].endswith(".jpg"))
        self.assertEqual(kwargs["Body"], binary_data)
        self.assertEqual(kwargs["ContentType"], "image/jpeg")

        # Check the S3 URI
        self.assertTrue(s3_uri.startswith("s3://chat-assets-prod/slack/"))
        self.assertTrue(s3_uri.endswith(".jpg"))

    @patch("src.storage.dynamodb")
    def test_get_recent_messages(self, mock_dynamodb):
        """Test getting recent messages from DynamoDB."""
        # Create a mock table
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table

        # Create a mock response
        mock_response = {
            "Items": [
                {
                    "PK": "slack:T123:C456",
                    "SK": 1617235678000,
                    "role": "user",
                    "text": "Hello, world!",
                    "contentType": "text",
                },
                {
                    "PK": "slack:T123:C456",
                    "SK": 1617235679000,
                    "role": "assistant",
                    "text": "Hi there!",
                    "contentType": "text",
                },
            ]
        }
        mock_table.query.return_value = mock_response

        # Get recent messages
        messages = get_recent_messages("slack:T123:C456", 2)

        # Check that query was called
        mock_table.query.assert_called_once()
        args, kwargs = mock_table.query.call_args
        self.assertEqual(kwargs["ExpressionAttributeValues"][":pk"], "slack:T123:C456")
        self.assertEqual(kwargs["Limit"], 2)

        # Check the messages
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]["PK"], "slack:T123:C456")
        self.assertEqual(messages[0]["SK"], 1617235678000)
        self.assertEqual(messages[0]["role"], "user")
        self.assertEqual(messages[0]["text"], "Hello, world!")
        self.assertEqual(messages[0]["contentType"], "text")

    @patch("src.storage.save_binary_to_s3")
    def test_process_binary_data(self, mock_save_binary_to_s3):
        """Test processing binary data."""
        # Create a message
        message = UnifiedMessage(
            platform="slack",
            room_key="slack:T123:C456",
            sender_id="U789",
            ts=1617235678000,
            content_type="image",
        )

        # Create binary data
        binary_data = base64.b64encode(b"test binary data").decode()

        # Mock the S3 URI
        mock_save_binary_to_s3.return_value = "s3://chat-assets-prod/slack/test.jpg"

        # Process the binary data
        updated_message = process_binary_data(message, binary_data, "jpg")

        # Check that save_binary_to_s3 was called
        mock_save_binary_to_s3.assert_called_once()

        # Check the updated message
        self.assertEqual(updated_message.s3_uri, "s3://chat-assets-prod/slack/test.jpg")


if __name__ == "__main__":
    unittest.main()