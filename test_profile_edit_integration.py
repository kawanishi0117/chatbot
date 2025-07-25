#!/usr/bin/env python3
"""
ユーザープロファイル編集機能の統合テスト

このスクリプトは、新しく実装されたプロファイル編集機能が
正しく動作することを確認するための統合テストです。
"""

import json
import os
import sys
import time
from typing import Dict, Any

# テスト用の環境変数を設定
os.environ["CHATBOT_SETTINGS_TABLE"] = "ChatbotSettingsDB-test"

try:
    import boto3
    from moto import mock_dynamodb
    
    # バックエンドのモジュールをインポート
    sys.path.append('backend/chat-router/src')
    from handlers.user_handler import UserHandler
    from common.responses import create_success_response, create_error_response
    
    print("✅ 必要なモジュールのインポートが完了しました")
except ImportError as e:
    print(f"❌ モジュールのインポートに失敗しました: {e}")
    print("必要な依存関係をインストールしてください:")
    print("pip install boto3 moto")
    sys.exit(1)


class ProfileEditIntegrationTest:
    """プロファイル編集機能の統合テスト"""
    
    def __init__(self):
        self.mock_dynamodb = mock_dynamodb()
        self.user_handler = UserHandler()
        self.test_user_data = {
            "email": "integration@test.com",
            "password": "testpassword123",
            "name": "Integration Test User"
        }
        
    def setup(self):
        """テスト環境のセットアップ"""
        print("🔧 テスト環境をセットアップ中...")
        
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
        
        print("✅ テスト環境のセットアップが完了しました")
    
    def teardown(self):
        """テスト環境のクリーンアップ"""
        print("🧹 テスト環境をクリーンアップ中...")
        self.mock_dynamodb.stop()
        print("✅ テスト環境のクリーンアップが完了しました")
    
    def register_test_user(self) -> str:
        """テストユーザーを登録してトークンを取得"""
        print("👤 テストユーザーを登録中...")
        
        # ユーザー登録
        register_response = self.user_handler._handle_register(self.test_user_data)
        if register_response["statusCode"] != 200:
            raise Exception(f"ユーザー登録に失敗: {register_response}")
        
        # ログイン
        login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        login_response = self.user_handler._handle_login(login_data)
        if login_response["statusCode"] != 200:
            raise Exception(f"ログインに失敗: {login_response}")
        
        login_body = json.loads(login_response["body"])
        token = login_body["token"]
        
        print(f"✅ テストユーザーが登録され、トークンを取得しました: {token[:20]}...")
        return token
    
    def test_profile_name_update(self, token: str):
        """名前の更新テスト"""
        print("📝 名前の更新をテスト中...")
        
        update_data = {"name": "Updated Integration User"}
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.user_handler._handle_update_profile(update_data, headers)
        
        if response["statusCode"] != 200:
            raise Exception(f"名前の更新に失敗: {response}")
        
        response_body = json.loads(response["body"])
        if response_body["name"] != "Updated Integration User":
            raise Exception(f"名前が正しく更新されていません: {response_body['name']}")
        
        print("✅ 名前の更新テストが成功しました")
    
    def test_profile_email_update(self, token: str) -> str:
        """メールアドレスの更新テスト"""
        print("📧 メールアドレスの更新をテスト中...")
        
        new_email = "updated@test.com"
        update_data = {"email": new_email}
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.user_handler._handle_update_profile(update_data, headers)
        
        if response["statusCode"] != 200:
            raise Exception(f"メールアドレスの更新に失敗: {response}")
        
        response_body = json.loads(response["body"])
        if response_body["email"] != new_email:
            raise Exception(f"メールアドレスが正しく更新されていません: {response_body['email']}")
        
        # 古いメールアドレスでのレコードが削除されていることを確認
        old_user_response = self.table.get_item(
            Key={"PK": f"USER#{self.test_user_data['email']}", "SK": "PROFILE"}
        )
        if "Item" in old_user_response:
            raise Exception("古いメールアドレスのレコードが削除されていません")
        
        # 新しいメールアドレスでのレコードが存在することを確認
        new_user_response = self.table.get_item(
            Key={"PK": f"USER#{new_email}", "SK": "PROFILE"}
        )
        if "Item" not in new_user_response:
            raise Exception("新しいメールアドレスのレコードが作成されていません")
        
        print("✅ メールアドレスの更新テストが成功しました")
        return new_email
    
    def test_profile_password_update(self, token: str, current_email: str):
        """パスワードの更新テスト"""
        print("🔒 パスワードの更新をテスト中...")
        
        new_password = "newpassword456"
        update_data = {"password": new_password}
        headers = {"Authorization": f"Bearer {token}"}
        
        response = self.user_handler._handle_update_profile(update_data, headers)
        
        if response["statusCode"] != 200:
            raise Exception(f"パスワードの更新に失敗: {response}")
        
        # 新しいパスワードでログインできることを確認
        login_data = {
            "email": current_email,
            "password": new_password
        }
        login_response = self.user_handler._handle_login(login_data)
        
        if login_response["statusCode"] != 200:
            raise Exception("新しいパスワードでのログインに失敗")
        
        # 古いパスワードではログインできないことを確認
        old_login_data = {
            "email": current_email,
            "password": self.test_user_data["password"]
        }
        old_login_response = self.user_handler._handle_login(old_login_data)
        
        if old_login_response["statusCode"] == 200:
            raise Exception("古いパスワードでログインできてしまいました")
        
        print("✅ パスワードの更新テストが成功しました")
    
    def test_validation_errors(self, token: str):
        """バリデーションエラーのテスト"""
        print("⚠️ バリデーションエラーをテスト中...")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 無効なメールアドレス
        response = self.user_handler._handle_update_profile(
            {"email": "invalid-email"}, headers
        )
        if response["statusCode"] != 400:
            raise Exception("無効なメールアドレスのバリデーションが機能していません")
        
        # 空の名前
        response = self.user_handler._handle_update_profile(
            {"name": ""}, headers
        )
        if response["statusCode"] != 400:
            raise Exception("空の名前のバリデーションが機能していません")
        
        # 短すぎるパスワード
        response = self.user_handler._handle_update_profile(
            {"password": "123"}, headers
        )
        if response["statusCode"] != 400:
            raise Exception("短すぎるパスワードのバリデーションが機能していません")
        
        print("✅ バリデーションエラーのテストが成功しました")
    
    def test_unauthorized_access(self):
        """認証なしでのアクセステスト"""
        print("🚫 認証なしでのアクセスをテスト中...")
        
        # 無効なトークン
        headers = {"Authorization": "Bearer invalid_token"}
        response = self.user_handler._handle_update_profile({"name": "Test"}, headers)
        
        if response["statusCode"] != 401:
            raise Exception("無効なトークンでのアクセスが拒否されていません")
        
        # トークンなし
        headers = {}
        response = self.user_handler._handle_update_profile({"name": "Test"}, headers)
        
        if response["statusCode"] != 401:
            raise Exception("トークンなしでのアクセスが拒否されていません")
        
        print("✅ 認証なしでのアクセステストが成功しました")
    
    def run_all_tests(self):
        """すべてのテストを実行"""
        print("🚀 プロファイル編集機能の統合テストを開始します\n")
        
        try:
            self.setup()
            
            # テストユーザーを登録してトークンを取得
            token = self.register_test_user()
            
            # 各種更新テストを実行
            self.test_profile_name_update(token)
            current_email = self.test_profile_email_update(token)
            self.test_profile_password_update(token, current_email)
            
            # バリデーションテスト
            self.test_validation_errors(token)
            
            # 認証テスト
            self.test_unauthorized_access()
            
            print("\n🎉 すべてのテストが成功しました！")
            print("✅ プロファイル編集機能は正常に動作しています")
            
        except Exception as e:
            print(f"\n❌ テストが失敗しました: {e}")
            return False
        
        finally:
            self.teardown()
        
        return True


def main():
    """メイン関数"""
    print("=" * 60)
    print("ユーザープロファイル編集機能 統合テスト")
    print("=" * 60)
    
    test_runner = ProfileEditIntegrationTest()
    success = test_runner.run_all_tests()
    
    print("\n" + "=" * 60)
    if success:
        print("🎊 統合テストが完了しました - すべて成功！")
        sys.exit(0)
    else:
        print("💥 統合テストが失敗しました")
        sys.exit(1)


if __name__ == "__main__":
    main()