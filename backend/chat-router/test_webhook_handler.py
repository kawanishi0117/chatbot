"""Test script for the webhook handler module."""

import json
import unittest
import sys
import os
from unittest.mock import patch, MagicMock
from datetime import datetime

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

# Import the modules to test
from src.webhook_handler import (
    handle_webhook_request,
    _handle_slack_webhook,
    _handle_line_webhook,
    _handle_teams_webhook,
    _handle_custom_webhook,
)


class TestWebhookHandler(unittest.TestCase):
    """Test cases for the webhook handler module."""

    def test_handle_webhook_request_method_not_allowed(self):
        """Test handling a webhook request with a method other than POST."""
        # Create a mock event
        event = {}
        context = {}
        path = "/webhook/slack"
        method = "GET"
        body = {}

        # Handle the request
        response = handle_webhook_request(event, context, path, method, body)

        # Check the response
        self.assertEqual(response["statusCode"], 405)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["error"], "Method Not Allowed")

    def test_handle_webhook_request_not_found(self):
        """Test handling a webhook request with an unknown path."""
        # Create a mock event
        event = {}
        context = {}
        path = "/webhook/unknown"
        method = "POST"
        body = {}

        # Handle the request
        response = handle_webhook_request(event, context, path, method, body)

        # Check the response
        self.assertEqual(response["statusCode"], 404)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["error"], "Not Found")

    @patch("src.webhook_handler._handle_slack_webhook")
    def test_handle_webhook_request_slack(self, mock_handle_slack_webhook):
        """Test handling a Slack webhook request."""
        # Create a mock event
        event = {}
        context = {}
        path = "/webhook/slack"
        method = "POST"
        body = {}

        # Mock the handler
        mock_handle_slack_webhook.return_value = {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"status": "success"}),
        }

        # Handle the request
        response = handle_webhook_request(event, context, path, method, body)

        # Check that the handler was called
        mock_handle_slack_webhook.assert_called_once_with(body, event)

        # Check the response
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["status"], "success")

    @patch("src.webhook_handler._handle_line_webhook")
    def test_handle_webhook_request_line(self, mock_handle_line_webhook):
        """Test handling a LINE webhook request."""
        # Create a mock event
        event = {}
        context = {}
        path = "/webhook/line"
        method = "POST"
        body = {}

        # Mock the handler
        mock_handle_line_webhook.return_value = {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"status": "success"}),
        }

        # Handle the request
        response = handle_webhook_request(event, context, path, method, body)

        # Check that the handler was called
        mock_handle_line_webhook.assert_called_once_with(body, event)

        # Check the response
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["status"], "success")

    @patch("src.webhook_handler._handle_teams_webhook")
    def test_handle_webhook_request_teams(self, mock_handle_teams_webhook):
        """Test handling a Teams webhook request."""
        # Create a mock event
        event = {}
        context = {}
        path = "/webhook/teams"
        method = "POST"
        body = {}

        # Mock the handler
        mock_handle_teams_webhook.return_value = {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"status": "success"}),
        }

        # Handle the request
        response = handle_webhook_request(event, context, path, method, body)

        # Check that the handler was called
        mock_handle_teams_webhook.assert_called_once_with(body, event)

        # Check the response
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["status"], "success")

    @patch("src.webhook_handler._handle_custom_webhook")
    def test_handle_webhook_request_custom(self, mock_handle_custom_webhook):
        """Test handling a custom UI webhook request."""
        # Create a mock event
        event = {}
        context = {}
        path = "/webhook/custom"
        method = "POST"
        body = {}

        # Mock the handler
        mock_handle_custom_webhook.return_value = {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"status": "success"}),
        }

        # Handle the request
        response = handle_webhook_request(event, context, path, method, body)

        # Check that the handler was called
        mock_handle_custom_webhook.assert_called_once_with(body, event)

        # Check the response
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["status"], "success")

    @patch("src.webhook_handler.normalizer.normalize_slack_message")
    @patch("src.webhook_handler.storage.save_message")
    def test_handle_slack_webhook(self, mock_save_message, mock_normalize_slack_message):
        """Test handling a Slack webhook."""
        # Create a mock event
        event = {
            "headers": {
                "x-slack-request-timestamp": "1617235678",
                "x-slack-signature": "v0=abcdef",
            },
            "body": '{"type":"event_callback","event":{"type":"message"}}',
        }
        body = {"type": "event_callback", "event": {"type": "message"}}

        # Mock the normalizer
        mock_message = MagicMock()
        mock_message.room_key = "slack:T123:C456"
        mock_message.ts = 1617235678000
        mock_normalize_slack_message.return_value = mock_message

        # Mock the storage
        mock_save_message.return_value = {"status": "success"}

        # Handle the webhook
        with patch("src.webhook_handler.SLACK_SIGNING_SECRET", ""):
            response = _handle_slack_webhook(body, event)

        # Check that the normalizer was called
        mock_normalize_slack_message.assert_called_once_with(body)

        # Check that the storage was called
        mock_save_message.assert_called_once_with(mock_message)

        # Check the response
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["status"], "success")
        self.assertEqual(response_body["platform"], "slack")

    @patch("src.webhook_handler.normalizer.normalize_line_message")
    @patch("src.webhook_handler.storage.save_message")
    def test_handle_line_webhook(self, mock_save_message, mock_normalize_line_message):
        """Test handling a LINE webhook."""
        # Create a mock event
        event = {
            "headers": {
                "x-line-signature": "abcdef",
            },
            "body": '{"events":[{"type":"message"}]}',
        }
        body = {"events": [{"type": "message"}]}

        # Mock the normalizer
        mock_message = MagicMock()
        mock_message.room_key = "line:user:U123"
        mock_message.ts = 1617235678000
        mock_normalize_line_message.return_value = mock_message

        # Mock the storage
        mock_save_message.return_value = {"status": "success"}

        # Handle the webhook
        with patch("src.webhook_handler.LINE_CHANNEL_SECRET", ""):
            response = _handle_line_webhook(body, event)

        # Check that the normalizer was called
        mock_normalize_line_message.assert_called_once_with(body)

        # Check that the storage was called
        mock_save_message.assert_called_once_with(mock_message)

        # Check the response
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["status"], "success")
        self.assertEqual(response_body["platform"], "line")

    @patch("src.webhook_handler.normalizer.normalize_teams_message")
    @patch("src.webhook_handler.storage.save_message")
    def test_handle_teams_webhook(self, mock_save_message, mock_normalize_teams_message):
        """Test handling a Teams webhook."""
        # Create a mock event
        event = {
            "headers": {
                "authorization": "Bearer abcdef",
            },
        }
        body = {"type": "message"}

        # Mock the normalizer
        mock_message = MagicMock()
        mock_message.room_key = "teams:tenant:conversation"
        mock_message.ts = 1617235678000
        mock_normalize_teams_message.return_value = mock_message

        # Mock the storage
        mock_save_message.return_value = {"status": "success"}

        # Handle the webhook
        with patch("src.webhook_handler.TEAMS_SECRET", ""):
            response = _handle_teams_webhook(body, event)

        # Check that the normalizer was called
        mock_normalize_teams_message.assert_called_once_with(body)

        # Check that the storage was called
        mock_save_message.assert_called_once_with(mock_message)

        # Check the response
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["status"], "success")
        self.assertEqual(response_body["platform"], "teams")

    @patch("src.webhook_handler.normalizer.normalize_custom_message")
    @patch("src.webhook_handler.storage.process_binary_data")
    @patch("src.webhook_handler.storage.save_message")
    def test_handle_custom_webhook(
        self, mock_save_message, mock_process_binary_data, mock_normalize_custom_message
    ):
        """Test handling a custom UI webhook."""
        # Create a mock event
        event = {
            "headers": {
                "x-custom-signature": "abcdef",
            },
        }
        body = {
            "roomId": "room123",
            "senderId": "user456",
            "text": "Hello, world!",
            "timestamp": 1617235678000,
            "contentType": "text",
            "binaryData": "base64data",
            "fileExtension": "jpg",
        }

        # Mock the normalizer
        mock_message = MagicMock()
        mock_message.room_key = "custom:room123"
        mock_message.ts = 1617235678000
        mock_normalize_custom_message.return_value = mock_message

        # Mock the binary data processing
        mock_process_binary_data.return_value = mock_message

        # Mock the storage
        mock_save_message.return_value = {"status": "success"}

        # Handle the webhook
        with patch("src.webhook_handler.CUSTOM_UI_SECRET", ""):
            response = _handle_custom_webhook(body, event)

        # Check that the normalizer was called
        mock_normalize_custom_message.assert_called_once_with(body)

        # Check that the binary data was processed
        mock_process_binary_data.assert_called_once_with(
            mock_message, "base64data", "jpg"
        )

        # Check that the storage was called
        mock_save_message.assert_called_once_with(mock_message)

        # Check the response
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["status"], "success")
        self.assertEqual(response_body["platform"], "custom")


if __name__ == "__main__":
    unittest.main()