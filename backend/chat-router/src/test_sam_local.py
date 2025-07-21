#!/usr/bin/env python3
"""
SAM Local API テスト用スクリプト
sam local start-api で起動したAPIをテストする
"""

import json
import requests
import time
import sys
import os

def test_api_endpoint(url, method="GET", data=None, expected_status=200):
    """API エンドポイントをテストする"""
    try:
        print(f"Testing {method} {url}")
        if data:
            print(f"Request data: {json.dumps(data, indent=2)}")
        print("-" * 50)
        
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_json = response.json()
            print(f"Response Body: {json.dumps(response_json, indent=2, ensure_ascii=False)}")
        except json.JSONDecodeError:
            print(f"Response Body (text): {response.text}")
        
        print("=" * 50)
        
        return response.status_code == expected_status
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False

def main():
    """メイン関数"""
    # SAM Local APIのベースURL
    base_url = os.getenv("SAM_LOCAL_URL", "http://localhost:3000")
    
    print("🧪 SAM Local API Integration Tests")
    print("=" * 50)
    print(f"Base URL: {base_url}")
    print()
    
    # 待機時間（API起動待ち）
    print("⏳ Waiting for SAM local API to be ready...")
    time.sleep(3)
    
    # テストケース定義
    test_cases = [
        # 基本エンドポイント
        {
            "name": "Health Check",
            "url": f"{base_url}/health",
            "method": "GET",
            "expected_status": 200
        },
        {
            "name": "Test Endpoint (GET)",
            "url": f"{base_url}/test",
            "method": "GET",
            "expected_status": 200
        },
        {
            "name": "Test Endpoint (POST)",
            "url": f"{base_url}/test",
            "method": "POST",
            "data": {"test": "data", "timestamp": int(time.time())},
            "expected_status": 200
        },
        
        # Webhook エンドポイント
        {
            "name": "Slack Webhook",
            "url": f"{base_url}/webhook/slack",
            "method": "POST",
            "data": {
                "token": "test-token",
                "challenge": "test-challenge",
                "type": "url_verification"
            },
            "expected_status": 200
        },
        {
            "name": "LINE Webhook",
            "url": f"{base_url}/webhook/line",
            "method": "POST",
            "data": {
                "events": [
                    {
                        "type": "message",
                        "message": {"type": "text", "text": "/ask test message"},
                        "source": {"type": "user", "userId": "test-user"},
                        "timestamp": int(time.time() * 1000)
                    }
                ]
            },
            "expected_status": 200
        },
        {
            "name": "Teams Webhook",
            "url": f"{base_url}/webhook/teams",
            "method": "POST",
            "data": {
                "type": "message",
                "text": "/質問 テストメッセージ",
                "from": {"id": "test-user", "name": "Test User"},
                "channelId": "test-channel"
            },
            "expected_status": 200
        }
    ]
    
    # テスト実行
    success_count = 0
    total_tests = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}/{total_tests}: {test_case['name']}")
        
        success = test_api_endpoint(
            url=test_case["url"],
            method=test_case["method"],
            data=test_case.get("data"),
            expected_status=test_case["expected_status"]
        )
        
        if success:
            success_count += 1
            print("✅ PASSED")
        else:
            print("❌ FAILED")
    
    # 結果表示
    print(f"\n📊 Test Results: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 