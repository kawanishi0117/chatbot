"""ChatRouter Lambda function module.

マルチチャネル Webhook を受け取り、コマンドパースやセッション管理を行う。"""

import json
import logging
import os
from typing import Any, Dict

# Lambda実行環境でのモジュールインポートを確保
try:
    import webhook_handler
    from common.responses import create_error_response, create_success_response
    from handlers.bot_settings_handler import BotSettingsHandler
    from handlers.user_handler import UserHandler
    from handlers.chat_handler import ChatHandler
except ImportError:
    from . import webhook_handler
    from .common.responses import create_error_response, create_success_response
    from .handlers.bot_settings_handler import BotSettingsHandler
    from .handlers.user_handler import UserHandler
    from .handlers.chat_handler import ChatHandler

# ログ設定
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 環境変数からバージョンを取得（デフォルト値を設定）
VERSION = os.environ.get("VERSION")

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


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """統合Lambda - HTTP APIとSQSイベントを処理

    主な機能:
    - HTTPイベント: マルチチャネル（LINE/Slack/Teams）ウェブフック受信、REST API
    - SQSイベント: AI処理（Bedrock API呼び出し）
    - コマンドパース（/ask, /質問, /investigate, /調査, /clear, /クリア等）
    - セッション管理とDynamoDB操作
    - AI応答生成・保存

    Args:
        event: Lambda event オブジェクト (HTTP API Gateway or SQS)
        context: Lambda context オブジェクト

    Returns:
        statusCode、headers、bodyを含む辞書 (HTTP) or 処理結果 (SQS)
    """
    try:
        # バージョン情報をログ出力
        logger.info("Unified Lambda started - Version: %s", VERSION)
        logger.info("Received event: %s", json.dumps(event))

        # イベントタイプを判定
        if 'Records' in event:
            # SQSイベント - AI処理
            return _handle_sqs_event(event, context)
        else:
            # HTTP APIイベント - ウェブフック・REST API処理
            return _handle_http_event(event, context)

    except Exception as e:
        logger.error("Unexpected error in lambda_handler: %s", str(e))
        if 'Records' in event:
            # SQSの場合はエラー情報を返す
            return create_error_response(500, "Lambda Error", str(e))
        else:
            # HTTPの場合はHTTPレスポンスを返す
            return {
                "statusCode": 500,
                "headers": COMMON_HEADERS,
                "body": json.dumps({
                    "success": False,
                    "error": "Lambda Error",
                    "message": str(e)
                })
            }


def _handle_http_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """HTTPイベントの処理（既存のロジック）"""
    try:

        # HTTPメソッドとパスを取得
        http_method = event.get("httpMethod", "UNKNOWN")
        path = event.get("path", "/")

        # OPTIONSリクエストの処理（CORS プリフライト）
        if http_method == "OPTIONS":
            return _handle_options_request()

        # クエリパラメータを取得
        query_params = event.get("queryStringParameters", {}) or {}

        # リクエストボディを取得し JSON としてパース（失敗時は元文字列を保持）
        raw_body = event.get("body", "")
        if raw_body:
            try:
                body = json.loads(raw_body)
            except json.JSONDecodeError as e:
                logger.warning("Failed to parse JSON body: %s", str(e))
                body = raw_body
        else:
            body = ""

        # パスに基づくルーティング
        if path.startswith("/webhook/"):
            # Webhook処理を専用ハンドラーに委譲
            logger.info(
                "Webhook request received: path=%s, method=%s", path, http_method
            )
            return webhook_handler.handle_webhook_request(
                event, context, path, http_method, body
            )
        elif path.startswith("/api/auth") or (
            path.startswith("/api/bots/") and ("/users" in path or "/invite" in path)
        ):
            # ユーザー認証・管理API処理
            logger.info(
                "User auth/management API request: path=%s, method=%s",
                path,
                http_method,
            )
            user_handler = UserHandler()
            headers = event.get("headers", {}) or {}
            return user_handler.handle_request(http_method, path, body, headers)
        elif path.startswith("/api/bots"):
            # ボット設定API処理
            logger.info(
                "Bot settings API request: path=%s, method=%s", path, http_method
            )
            bot_handler = BotSettingsHandler()
            headers = event.get("headers", {}) or {}
            return bot_handler.handle_request(
                http_method, path, body, query_params, headers
            )
        elif path.startswith("/api/chats"):
            # チャットルーム管理API処理
            logger.info("Chat API request: path=%s, method=%s", path, http_method)
            chat_handler = ChatHandler()
            headers = event.get("headers", {}) or {}
            return chat_handler.handle_request(http_method, path, body, headers)
        elif path == "/health":
            # ヘルスチェック用エンドポイント
            logger.info("Health check endpoint accessed")
            response_data = {
                "status": "healthy",
                "message": "Service is running properly",
                "version": VERSION or "unknown",
                "service": "ChatRouter",
            }
            return create_success_response(response_data)
        elif path == "/test":
            # テスト用エンドポイント
            response_data = {
                "message": "This is a test endpoint",
                "data": {"test": True, "version": VERSION},
                "method": http_method,
                "path": path,
                "queryParameters": query_params,
                "requestBody": body,
                "timestamp": context.aws_request_id if context else "local-test",
            }
            return create_success_response(response_data)
        elif path == "/" or path == "":
            # 基本レスポンス（バージョン情報）
            return create_success_response(
                {
                    "message": "ChatRouter Lambda is running",
                    "version": VERSION or "unknown",
                }
            )
        else:
            # 不明なエンドポイント
            return create_error_response(404, "Not Found", f"Unknown endpoint: {path}")

    except (KeyError, TypeError, ValueError) as e:
        logger.error("Error processing request: %s", str(e))
        return create_error_response(
            400, "Bad Request", "リクエストの処理中にエラーが発生しました"
        )

    except Exception as e:
        logger.error("Unexpected error: %s", str(e))
        return create_error_response(
            500, "Internal Server Error", "予期しないエラーが発生しました"
        )


def _handle_options_request() -> Dict[str, Any]:
    """CORS プリフライトリクエストのハンドリング

    Returns:
        dict: CORSレスポンス
    """
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}


def _handle_error(error_message: str, status_code: int = 500) -> Dict[str, Any]:
    """エラーレスポンスの生成（互換性のため残す）

    Args:
        error_message: エラーメッセージ
        status_code: HTTPステータスコード

    Returns:
        dict: エラーレスポンス
    """
    logger.error(error_message)
    return create_error_response(status_code, "Error", error_message)


def _handle_sqs_event(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """SQSイベントの処理 - AI処理ロジック
    
    Args:
        event: SQSイベント
        context: Lambda context
        
    Returns:
        dict: 処理結果
    """
    try:
        # AI処理に必要なサービスをインポート
        from services.bedrock_client_service import BedrockClientService
        from services.model_selector_service import ModelSelectorService
        from storage import DynamoDBManager, save_ai_response_message
        
        # 環境変数から設定を取得
        bedrock_region = os.environ.get('BEDROCK_REGION', 'ap-northeast-1')
        
        # サービス初期化
        bedrock_service = BedrockClientService(region=bedrock_region)
        model_selector = ModelSelectorService()
        dynamodb_manager = DynamoDBManager()
        
        logger.info(f"AI Processor started with {len(event.get('Records', []))} records")
        
        # SQSレコードを処理
        processed_count = 0
        error_count = 0
        
        for record in event.get('Records', []):
            try:
                # SQSメッセージを処理
                result = _process_sqs_message(record, bedrock_service, model_selector, dynamodb_manager)
                if result['success']:
                    processed_count += 1
                else:
                    error_count += 1
                    logger.error(f"Failed to process SQS message: {result.get('error')}")
                    
            except Exception as e:
                error_count += 1
                logger.error(f"Error processing SQS record: {str(e)}")
        
        logger.info(f"AI processing completed: {processed_count} successful, {error_count} errors")
        
        return create_success_response({
            'processedCount': processed_count,
            'errorCount': error_count
        })
        
    except Exception as e:
        logger.error(f"Critical error in SQS handler: {str(e)}")
        return create_error_response(500, "SQS Processing Error", str(e))


def _process_sqs_message(record: Dict[str, Any], bedrock_service, model_selector, dynamodb_manager) -> Dict[str, Any]:
    """SQSメッセージを処理してAI応答を生成
    
    Args:
        record: SQSレコード
        bedrock_service: BedrockClientService instance
        model_selector: ModelSelectorService instance
        dynamodb_manager: DynamoDBManager instance
        
    Returns:
        dict: 処理結果
    """
    try:
        # SQSメッセージボディを解析
        message_body = json.loads(record['body'])
        
        # 必要な情報を抽出
        chat_id = message_body.get('chatId')
        bot_id = message_body.get('botId')
        user_message = message_body.get('userMessage')
        user_message_id = message_body.get('userMessageId')
        
        if not all([chat_id, bot_id, user_message]):
            return {
                'success': False,
                'error': 'Missing required fields in SQS message'
            }
        
        logger.info(f"Processing AI request: chatId={chat_id}, botId={bot_id}")
        
        # 1. ボット設定を取得
        bot_result = dynamodb_manager.get_bot_settings(bot_id)
        if not bot_result['found']:
            return {
                'success': False,
                'error': f'Bot not found: {bot_id}'
            }
        
        bot_config = bot_result['data']
        
        # 2. チャット履歴を取得
        chat_history = _get_chat_history(chat_id, dynamodb_manager)
        
        # 3. AIモデルを選択
        selected_model = model_selector.select_model(user_message, bot_config)
        
        # 4. Bedrock APIを呼び出し
        ai_response = _call_bedrock_api(
            chat_history, 
            user_message, 
            selected_model, 
            bot_config,
            bedrock_service,
            model_selector
        )
        
        if not ai_response['success']:
            return {
                'success': False,
                'error': f"Bedrock API failed: {ai_response.get('error')}"
            }
        
        # 5. AI応答をDynamoDBに保存
        save_result = _save_ai_response(
            chat_id, 
            ai_response, 
            user_message_id
        )
        
        if not save_result['success']:
            return {
                'success': False,
                'error': f"Failed to save AI response: {save_result.get('error')}"
            }
        
        logger.info(
            f"AI response generated successfully: "
            f"chatId={chat_id}, model={selected_model}, "
            f"responseTime={ai_response['responseTime']}ms"
        )
        
        return {
            'success': True,
            'chatId': chat_id,
            'aiMessageId': save_result['messageId'],
            'model': selected_model,
            'responseTime': ai_response['responseTime']
        }
        
    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f'Invalid JSON in SQS message: {str(e)}'
        }
    except Exception as e:
        logger.error(f"Error processing SQS message: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def _get_chat_history(chat_id: str, dynamodb_manager) -> list:
    """チャット履歴を取得"""
    try:
        messages_result = dynamodb_manager.get_chat_messages(chat_id, limit=20)
        
        if not messages_result['success']:
            logger.warning(f"Failed to get chat history: {messages_result.get('error')}")
            return []
        
        messages = messages_result.get('data', [])
        logger.info(f"Retrieved {len(messages)} messages from chat history")
        
        return messages
        
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        return []


def _call_bedrock_api(chat_history: list, user_message: str, model_id: str, bot_config: dict, bedrock_service, model_selector) -> dict:
    """Bedrock APIを呼び出してAI応答を生成"""
    try:
        # チャット履歴をBedrock形式に変換
        formatted_history = bedrock_service.format_chat_history(chat_history)
        
        # 現在のユーザーメッセージを追加
        formatted_history.append({
            "role": "user",
            "content": user_message
        })
        
        # AI設定を抽出
        ai_config = bot_config.get('aiConfig', {})
        if isinstance(ai_config, dict) and 'M' in ai_config:
            # DynamoDB Map型の場合
            ai_config = model_selector._extract_from_dynamodb_map(ai_config['M'])
        
        # モデル設定を準備
        model_config = {
            'maxTokens': ai_config.get('maxTokens', 4096),
            'temperature': ai_config.get('temperature', 0.7),
            'topP': ai_config.get('topP', 0.9),
            'systemPrompt': ai_config.get('systemPrompt', 
                'あなたは親切なAIアシスタントです。ユーザーの質問に対して、正確で分かりやすい回答を提供してください。')
        }
        
        # Bedrock API呼び出し
        response = bedrock_service.invoke_model(
            model_id, 
            formatted_history, 
            model_config
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error calling Bedrock API: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'content': '',
            'usage': {},
            'model': model_id,
            'responseTime': 0
        }


def _save_ai_response(chat_id: str, ai_response: dict, user_message_id: str = None) -> dict:
    """AI応答をDynamoDBに保存"""
    try:
        from storage import save_ai_response_message
        
        # ルームキーを構築
        room_key = f"custom:{chat_id}"
        
        # AI応答メッセージを保存
        result = save_ai_response_message(
            room_key=room_key,
            ai_content=ai_response.get('content', ''),
            ai_model=ai_response.get('model', ''),
            processing_status='completed' if ai_response.get('success') else 'failed',
            response_time=ai_response.get('responseTime', 0),
            token_usage=ai_response.get('usage', {}),
            user_message_id=user_message_id
        )
        
        logger.info(f"AI response saved: messageId={result['messageId']}, chatId={chat_id}")
        
        return {
            'success': True,
            'messageId': result['messageId'],
            'chatId': chat_id
        }
        
    except Exception as e:
        logger.error(f"Error saving AI response: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
