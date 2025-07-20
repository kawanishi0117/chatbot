import json
import logging

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
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
        # リクエスト情報をログに出力
        logger.info(f"Received event: {json.dumps(event)}")
        
        # HTTPメソッドとパスを取得
        http_method = event.get('httpMethod', 'UNKNOWN')
        path = event.get('path', '/')
        
        # クエリパラメータを取得
        query_params = event.get('queryStringParameters', {}) or {}
        
        # リクエストボディを取得
        body = event.get('body', '')
        if body:
            try:
                body = json.loads(body)
            except json.JSONDecodeError:
                body = body
        
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
            response_data['status'] = 'healthy'
            response_data['message'] = 'Service is running properly'
        elif path == '/test':
            response_data['message'] = 'This is a test endpoint'
            response_data['data'] = {"test": True, "version": "1.0.0"}
        
        # 成功レスポンス
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps(response_data, ensure_ascii=False)
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        
        # エラーレスポンス
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            }, ensure_ascii=False)
        }