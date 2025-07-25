"""ユーザーハンドラーのテスト

ユーザー登録、ログイン、プロファイル更新などの機能をテストする
"""

import json
import os
import time
import unittest
from unittest.mock import MagicMock, patch

import boto3
from moto import mock_dynamodb

# テスト用の環境変数を設定
os.environ["CHATBOT_SETTINGS_TABLE"] = "ChatbotSettingsDB-test"

from src.handlers.user_handler import UserHandler


class TestUserHandler(unittest.TestCase):
    """ユーザーハンドラーのテストクラス"""

    def setUp(self):
        """テストの前準備"""
        self.mock_dynamodb = mock_dynamodb()
        self.mock_dynamodb.start()
        
        # DynamoDBテーブルを作成
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        self.table = dynamodb.create_table(
            TableName="ChatbotSettingsDB-test",
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "PK", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        
        self.user_handler = UserHandler()
        
        # テスト用ユーザーデータ
        self.test_user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "name": "Test User"
        }

    def tearDown(self):
        """テストの後処理"""
        self.mock_dynamodb.stop()

    def test_register_user_success(self):
        """ユーザー登録の成功テスト"""
        response = self.user_handler._handle_register(self.test_user_data)
        
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["email"], self.test_user_data["email"])
        self.assertEqual(response_body["name"], self.test_user_data["name"])
        self.assertIn("userId", response_body)
        self.assertNotIn("passwordHash", response_body)

    def test_register_user_duplicate_email(self):
        """重複メールアドレスでの登録テスト"""
        # 最初のユーザーを登録
        self.user_handler._handle_register(self.test_user_data)
        
        # 同じメールアドレスで再度登録を試行
        response = self.user_handler._handle_register(self.test_user_data)
        
        self.assertEqual(response["statusCode"], 409)
        response_body = json.loads(response["body"])
        self.assertIn("既に登録されています", response_body["message"])

    def test_login_success(self):
        """ログインの成功テスト"""
        # ユーザーを登録
        self.user_handler._handle_register(self.test_user_data)
        
        # ログインを試行
        login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        response = self.user_handler._handle_login(login_data)
        
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertIn("token", response_body)
        self.assertIn("user", response_body)
        self.assertEqual(response_body["user"]["email"], self.test_user_data["email"])

    def test_update_profile_name_only(self):
        """名前のみの更新テスト"""
        # ユーザーを登録してログイン
        self.user_handler._handle_register(self.test_user_data)
        login_response = self.user_handler._handle_login({
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        })
        
        login_body = json.loads(login_response["body"])
        token = login_body["token"]
        
        # プロファイル更新
        update_data = {"name": "Updated Name"}
        headers = {"Authorization": f"Bearer {token}"}
        response = self.user_handler._handle_update_profile(update_data, headers)
        
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["name"], "Updated Name")
        self.assertEqual(response_body["email"], self.test_user_data["email"])

    def test_update_profile_email_change(self):
        """メールアドレス変更テスト"""
        # ユーザーを登録してログイン
        self.user_handler._handle_register(self.test_user_data)
        login_response = self.user_handler._handle_login({
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        })
        
        login_body = json.loads(login_response["body"])
        token = login_body["token"]
        
        # メールアドレス変更
        new_email = "newemail@example.com"
        update_data = {"email": new_email}
        headers = {"Authorization": f"Bearer {token}"}
        response = self.user_handler._handle_update_profile(update_data, headers)
        
        self.assertEqual(response["statusCode"], 200)
        response_body = json.loads(response["body"])
        self.assertEqual(response_body["email"], new_email)
        
        # 古いメールアドレスでのユーザーレコードが削除されていることを確認
        old_user_response = self.table.get_item(
            Key={"PK": f"USER#{self.test_user_data['email']}", "SK": "PROFILE"}
        )
        self.assertNotIn("Item", old_user_response)
        
        # 新しいメールアドレスでのユーザーレコードが存在することを確認
        new_user_response = self.table.get_item(
            Key={"PK": f"USER#{new_email}", "SK": "PROFILE"}
        )
        self.assertIn("Item", new_user_response)

    def test_update_profile_password_change(self):
        """パスワード変更テスト"""
        # ユーザーを登録してログイン
        self.user_handler._handle_register(self.test_user_data)
        login_response = self.user_handler._handle_login({
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        })
        
        login_body = json.loads(login_response["body"])
        token = login_body["token"]
        
        # パスワード変更
        new_password = "newpassword123"
        update_data = {"password": new_password}
        headers = {"Authorization": f"Bearer {token}"}
        response = self.user_handler._handle_update_profile(update_data, headers)
        
        self.assertEqual(response["statusCode"], 200)
        
        # 新しいパスワードでログインできることを確認
        new_login_response = self.user_handler._handle_login({
            "email": self.test_user_data["email"],
            "password": new_password
        })
        self.assertEqual(new_login_response["statusCode"], 200)
        
        # 古いパスワードではログインできないことを確認
        old_login_response = self.user_handler._handle_login({
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        })
        self.assertEqual(old_login_response["statusCode"], 401)

    def test_update_profile_email_conflict(self):
        """メールアドレス変更時の競合テスト"""
        # 2つのユーザーを登録
        self.user_handler._handle_register(self.test_user_data)
        
        second_user_data = {
            "email": "second@example.com",
            "password": "password123",
            "name": "Second User"
        }
        self.user_handler._handle_register(second_user_data)
        
        # 最初のユーザーでログイン
        login_response = self.user_handler._handle_login({
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        })
        
        login_body = json.loads(login_response["body"])
        token = login_body["token"]
        
        # 2番目のユーザーのメールアドレスに変更を試行
        update_data = {"email": second_user_data["email"]}
        headers = {"Authorization": f"Bearer {token}"}
        response = self.user_handler._handle_update_profile(update_data, headers)
        
        self.assertEqual(response["statusCode"], 409)
        response_body = json.loads(response["body"])
        self.assertIn("既に登録されています", response_body["message"])

    def test_update_profile_invalid_token(self):
        """無効なトークンでの更新テスト"""
        update_data = {"name": "Updated Name"}
        headers = {"Authorization": "Bearer invalid_token"}
        response = self.user_handler._handle_update_profile(update_data, headers)
        
        self.assertEqual(response["statusCode"], 401)
        response_body = json.loads(response["body"])
        self.assertIn("無効な認証トークン", response_body["message"])

    def test_update_profile_validation_errors(self):
        """バリデーションエラーのテスト"""
        # ユーザーを登録してログイン
        self.user_handler._handle_register(self.test_user_data)
        login_response = self.user_handler._handle_login({
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        })
        
        login_body = json.loads(login_response["body"])
        token = login_body["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 無効なメールアドレス
        response = self.user_handler._handle_update_profile(
            {"email": "invalid-email"}, headers
        )
        self.assertEqual(response["statusCode"], 400)
        
        # 空の名前
        response = self.user_handler._handle_update_profile(
            {"name": ""}, headers
        )
        self.assertEqual(response["statusCode"], 400)
        
        # 短すぎるパスワード
        response = self.user_handler._handle_update_profile(
            {"password": "123"}, headers
        )
        self.assertEqual(response["statusCode"], 400)


if __name__ == "__main__":
    unittest.main()