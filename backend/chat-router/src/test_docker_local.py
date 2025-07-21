#!/usr/bin/env python3
"""Docker環境でのLambda関数テストスクリプト"""

import json
import os
import requests
import sys
from typing import Dict, Any

# カラーテキスト出力用クラス
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

# テスト実行関数
def run_test(name: str, payload: Dict[str, Any]) -> bool:
    """Lambdaエンドポイントにペイロードを送信してレスポンスをテスト"""
    # Docker Lambda URLを環境変数から取得、デフォルトはlocalhost:9001
    lambda_url = os.environ.get(
        "DOCKER_LAMBDA_URL", 
        "http://localhost:9001/2015-03-31/functions/function/invocations"
    )
    
    print(f"{Colors.BLUE}テスト実行: {name}{Colors.END}")
    print(f"エンドポイント: {lambda_url}")
    print(f"ペイロード: {json.dumps(payload, ensure_ascii=False)}")
    
    try:
        response = requests.post(
            lambda_url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # レスポンスコードの確認
        if response.status_code != 200:
            print(f"{Colors.RED}エラー: ステータスコード {response.status_code}{Colors.END}")
            print(f"レスポンス: {response.text}")
            return False
        
        # レスポンスのJSONパース
        try:
            result = response.json()
            print(f"{Colors.GREEN}成功: ステータスコード {response.status_code}{Colors.END}")
            print(f"レスポンス: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return True
        except json.JSONDecodeError:
            print(f"{Colors.RED}エラー: JSONデコード失敗{Colors.END}")
            print(f"レスポンス: {response.text}")
            return False
            
    except requests.RequestException as e:
        print(f"{Colors.RED}リクエストエラー: {str(e)}{Colors.END}")
        return False

def main():
    """メイン実行関数"""
    print(f"{Colors.HEADER}Docker Lambda テスト実行{Colors.END}")
    print(f"{Colors.BOLD}=============================={Colors.END}")
    
    # テストケースの定義
    tests = [
        {
            "name": "ヘルスチェック",
            "payload": {"path": "/health", "httpMethod": "GET"}
        },
        {
            "name": "テストエンドポイント",
            "payload": {"path": "/test", "httpMethod": "GET"}
        },
        {
            "name": "Slackウェブフックテスト",
            "payload": {
                "path": "/webhook/slack", 
                "httpMethod": "POST",
                "body": json.dumps({
                    "event": {
                        "type": "message",
                        "text": "/help",
                        "user": "U12345678",
                        "channel": "C87654321"
                    }
                })
            }
        }
    ]
    
    # テストの実行
    success_count = 0
    for test in tests:
        print("\n" + "-" * 40)
        result = run_test(test["name"], test["payload"])
        if result:
            success_count += 1
        print("-" * 40)
    
    # 結果の表示
    print(f"\n{Colors.BOLD}テスト結果: {success_count}/{len(tests)} 成功{Colors.END}")
    
    # 成功したかどうかで終了コードを設定
    if success_count == len(tests):
        print(f"{Colors.GREEN}全てのテストが成功しました！{Colors.END}")
        return 0
    else:
        print(f"{Colors.WARNING}いくつかのテストが失敗しました。{Colors.END}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 