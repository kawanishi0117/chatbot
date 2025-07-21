"""ChatRouter Lambda function module.

マルチチャネル Webhook を受け取り、コマンドパースやセッション管理を行う。"""

import json
import logging
import os
from typing import Any, Dict

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 環境変数からバージョンを取得（デフォルト値を設定）
VERSION = os.environ.get('VERSION')

# CORS および共通ヘッダ定義
COMMON_HEADERS: Dict[str, str] = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}
CORS_HEADERS: Dict[str, str] = {
    **COMMON_HEADERS,
    "Access-Control-Allow-Headers": (
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
    ),
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}

def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    ChatRouter Lambda - ウェブフック経由の処理全般を担当

    主な機能:
    - マルチチャネル（LINE/Slack/Teams）ウェブフック受信
    - コマンドパース（/ask, /質問, /investigate, /調査, /clear, /クリア等）
    - セッション管理とDynamoDB操作
    - Quick ACK応答（<100ms）
    - 回答生成とチャット処理
    - EventBridge連携による非同期処理トリガー
    """
    try:
        # バージョン情報をログ出力
        logger.info("ChatRouter Lambda started - Version: %s", VERSION)
        # F-string を避け、logger の lazily formatting を活用
        logger.info("Received event: %s", json.dumps(event))

        # HTTPメソッドとパスを取得
        http_method = event.get('httpMethod', 'UNKNOWN')
        path = event.get('path', '/')

        # クエリパラメータを取得
        query_params = event.get('queryStringParameters', {}) or {}

        # リクエストボディを取得し JSON としてパース（失敗時は元文字列を保持）
        raw_body = event.get("body", "")
        if raw_body:
            try:
                body = json.loads(raw_body)
            except json.JSONDecodeError:
                body = raw_body
        else:
            body = ""

        # レスポンスデータを作成
        response_data = {
            "message": "Lambda function is working!",
            "method": http_method,
            "path": path,
            "queryParameters": query_params,
            "requestBody": body,
            "timestamp": context.aws_request_id if context else "local-test"
        }

        # パスに基づく簡単なルーティング
        if path == '/health':
            # デバッグ用ログ出力
            logger.info("Health check endpoint accessed")
            logger.info("VERSION: %s", VERSION)
            print("-----" + VERSION)
            response_data['status'] = 'healthy'
            response_data['message'] = 'Service is running properly'
            response_data['version'] = VERSION
            response_data['service'] = 'ChatRouter'
            response_data['debug'] = {
                'version_printed': True,
                'version_value': VERSION
            }
        elif path == '/test':
            response_data['message'] = 'This is a test endpoint'
            response_data['data'] = {"test": True, "version": VERSION}

        # 成功レスポンス
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps(response_data, ensure_ascii=False)
        }

    except (KeyError, TypeError, ValueError) as e:
        logger.error("Error processing request: %s", str(e))

        # エラーレスポンス
        return {
            'statusCode': 500,
            'headers': COMMON_HEADERS,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            }, ensure_ascii=False)
        }
