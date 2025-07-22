"""Test script for the normalizer module."""

import json
import unittest
import sys
import os
from datetime import datetime

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

# Import the modules to test
from src.normalizer import (
    UnifiedMessage,
    normalize_slack_message,
    normalize_teams_message,
    normalize_line_message,
    normalize_custom_message,
)


class TestNormalizer(unittest.TestCase):
    """Test cases for the normalizer module."""

    def test_unified_message(self):
        """Test the UnifiedMessage class."""
        # Create a message
        message = UnifiedMessage(
            platform="slack",
            room_key="slack:T123:C456",
            sender_id="U789",
            ts=1617235678000,
            text="Hello, world!",
            content_type="text",
        )

        # Convert to dict
        message_dict = message.to_dict()

        # Check the dict
        self.assertEqual(message_dict["platform"], "slack")
        self.assertEqual(message_dict["roomKey"], "slack:T123:C456")
        self.assertEqual(message_dict["senderId"], "U789")
        self.assertEqual(message_dict["ts"], 1617235678000)
        self.assertEqual(message_dict["text"], "Hello, world!")
        self.assertEqual(message_dict["contentType"], "text")
        self.assertNotIn("s3Uri", message_dict)

        # Create a message with s3_uri
        message = UnifiedMessage(
            platform="slack",
            room_key="slack:T123:C456",
            sender_id="U789",
            ts=1617235678000,
            text="Hello, world!",
            content_type="image",
            s3_uri="s3://bucket/key",
        )

        # Convert to dict
        message_dict = message.to_dict()

        # Check the dict
        self.assertEqual(message_dict["s3Uri"], "s3://bucket/key")

    def test_normalize_slack_message(self):
        """Test normalizing a Slack message."""
        # Create a Slack message payload
        payload = {
            "team_id": "T123",
            "event": {
                "type": "message",
                "channel": "C456",
                "user": "U789",
                "text": "Hello, world!",
                "ts": "1617235678.123456",
            },
        }

        # Normalize the message
        message = normalize_slack_message(payload)

        # Check the message
        self.assertIsNotNone(message)
        self.assertEqual(message.platform, "slack")
        self.assertEqual(message.room_key, "slack:T123:C456")
        self.assertEqual(message.sender_id, "U789")
        self.assertEqual(message.text, "Hello, world!")
        self.assertEqual(message.content_type, "text")

    def test_normalize_teams_message(self):
        """Test normalizing a Teams message."""
        # Create a Teams message payload
        payload = {
            "type": "message",
            "from": {"id": "29:1bSnHZ7Js2STWrgk6ScEErLk1Lel6F7-mik_cu"},
            "conversation": {"id": "19:ja0l70qzgkyq5s1aobl8xj0co@thread.tacv2"},
            "channelData": {"tenant": {"id": "72f988bf-86f1-41af-91ab-2d7cd011db47"}},
            "text": "Hello, world!",
            "timestamp": "2021-03-31T12:34:56.123Z",
        }

        # Normalize the message
        message = normalize_teams_message(payload)

        # Check the message
        self.assertIsNotNone(message)
        self.assertEqual(message.platform, "teams")
        self.assertEqual(
            message.room_key,
            "teams:72f988bf-86f1-41af-91ab-2d7cd011db47:19:ja0l70qzgkyq5s1aobl8xj0co@thread.tacv2",
        )
        self.assertEqual(message.sender_id, "29:1bSnHZ7Js2STWrgk6ScEErLk1Lel6F7-mik_cu")
        self.assertEqual(message.text, "Hello, world!")
        self.assertEqual(message.content_type, "text")

    def test_normalize_line_message(self):
        """Test normalizing a LINE message."""
        # Create a LINE message payload
        payload = {
            "events": [
                {
                    "type": "message",
                    "source": {"type": "user", "userId": "U123456789abcdef"},
                    "message": {"type": "text", "text": "Hello, world!"},
                    "timestamp": 1617235678000,
                }
            ]
        }

        # Normalize the message
        message = normalize_line_message(payload)

        # Check the message
        self.assertIsNotNone(message)
        self.assertEqual(message.platform, "line")
        self.assertEqual(message.room_key, "line:user:U123456789abcdef")
        self.assertEqual(message.sender_id, "U123456789abcdef")
        self.assertEqual(message.text, "Hello, world!")
        self.assertEqual(message.content_type, "text")
        self.assertEqual(message.ts, 1617235678000)

    def test_normalize_custom_message(self):
        """Test normalizing a custom UI message."""
        # Create a custom UI message payload
        payload = {
            "roomId": "room123",
            "senderId": "user456",
            "text": "Hello, world!",
            "timestamp": 1617235678000,
            "contentType": "text",
        }

        # Normalize the message
        message = normalize_custom_message(payload)

        # Check the message
        self.assertIsNotNone(message)
        self.assertEqual(message.platform, "custom")
        self.assertEqual(message.room_key, "custom:room123")
        self.assertEqual(message.sender_id, "user456")
        self.assertEqual(message.text, "Hello, world!")
        self.assertEqual(message.content_type, "text")
        self.assertEqual(message.ts, 1617235678000)


if __name__ == "__main__":
    unittest.main()