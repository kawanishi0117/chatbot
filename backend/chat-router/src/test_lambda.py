#!/usr/bin/env python3
"""
Lambda関数のローカルテスト用スクリプト
"""

import json
import requests
import time
import sys

def test_lambda_endpoint(url, payload):
    """Lambda エンドポイントをテストする"""
    try:
        print(f"Testing endpoint: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print("-" * 50)
        
        response = requests.post(url, json=payload, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        print("=" * 50)
        
        return response.status_code == 200
        
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False

def main():
    """メイン関数"""
    # Lambda関数のローカルエンドポイント
    lambda_url = "http://localhost:9000/2015-03-31/functions/function/invocations"
    
    # 待機時間（コンテナ起動待ち）
    print("Waiting for Lambda container to start...")
    time.sleep(5)
    
    # テストケース1: 基本的なAPI Gatewayイベント
    api_gateway_event = {
        "httpMethod": "GET",
        "path": "/test",
        "queryStringParameters": {"param1": "value1"},
        "headers": {
            "Content-Type": "application/json"
        },
        "body": None
    }
    
    # テストケース2: POSTリクエスト
    post_event = {
        "httpMethod": "POST",
        "path": "/test",
        "queryStringParameters": None,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({"test": "data", "number": 123})
    }
    
    # テストケース3: ヘルスチェック
    health_event = {
        "httpMethod": "GET",
        "path": "/health",
        "queryStringParameters": None,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": None
    }
    
    # テスト実行
    test_cases = [
        ("GET /test", api_gateway_event),
        ("POST /test", post_event),
        ("GET /health", health_event)
    ]
    
    success_count = 0
    for test_name, event in test_cases:
        print(f"\n🧪 Test Case: {test_name}")
        if test_lambda_endpoint(lambda_url, event):
            success_count += 1
            print("✅ PASSED")
        else:
            print("❌ FAILED")
    
    print(f"\n📊 Test Results: {success_count}/{len(test_cases)} tests passed")
    
    if success_count == len(test_cases):
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("💥 Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 