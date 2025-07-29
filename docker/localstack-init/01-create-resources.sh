#!/bin/bash

# LocalStack初期化スクリプト（ハイブリッド構成用）
# AI自動応答機能に必要なローカルAWSリソースを作成
# 注意: DynamoDBは実AWS環境を使用するため、ここでは作成しません

echo "🚀 LocalStack初期化を開始します（ハイブリッド構成）..."
echo "📋 構成: 実AWS DynamoDB + ローカル SQS/EventBridge/Lambda"

# AWS CLI のローカル設定
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_ENDPOINT_URL=http://localhost:4566

# awslocal エイリアス設定
alias awslocal="aws --endpoint-url=http://localhost:4566"

echo "⚠️  DynamoDBテーブルは実AWS環境を使用します"
echo "   テーブル確認: ChatHistory-dev, ChatbotSettingsDB-dev"

echo "📨 SQSキューを作成中..."

# 3. AI処理用SQSキュー（新仕様対応）
awslocal sqs create-queue \
    --queue-name ai-processing-queue-dev \
    --attributes VisibilityTimeout=150,MessageRetentionPeriod=1209600,ReceiveMessageWaitTimeSeconds=20

# AI処理DLQ（Dead Letter Queue）
awslocal sqs create-queue \
    --queue-name ai-processing-dlq-dev \
    --attributes MessageRetentionPeriod=1209600

# 旧キュー名も互換性のため作成
awslocal sqs create-queue \
    --queue-name ai-processing-queue \
    --attributes DelaySeconds=0

echo "🎯 EventBridgeリソースを作成中..."

# 4. カスタムイベントバス
awslocal events create-event-bus \
    --name chatbot-events

# 5. AI処理トリガールール
awslocal events put-rule \
    --name ai-processing-trigger \
    --event-bus-name chatbot-events \
    --event-pattern '{
        "source": ["chatbot.message"],
        "detail-type": ["User Message Received"],
        "detail": {
            "platform": ["custom"],
            "requiresAIResponse": [true]
        }
    }' \
    --state ENABLED

# 6. SQSターゲット設定
QUEUE_URL=$(awslocal sqs get-queue-url --queue-name ai-processing-queue-dev --query 'QueueUrl' --output text)
QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url $QUEUE_URL --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

awslocal events put-targets \
    --rule ai-processing-trigger \
    --event-bus-name chatbot-events \
    --targets "Id"="1","Arn"="$QUEUE_ARN"

echo "🗄️ S3バケットを作成中..."

# 7. チャット添付ファイル用S3バケット
awslocal s3 mb s3://chat-history-assets-dev

# バケットポリシー設定（ローカル開発用）
awslocal s3api put-bucket-policy \
    --bucket chat-history-assets-dev \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::chat-history-assets-dev/*"
            }
        ]
    }'

echo "🔑 IAMロールを作成中..."

# Lambda実行用のIAMロールを作成
awslocal iam create-role \
    --role-name lambda-role \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }'

# Lambda基本実行ポリシーを添付
awslocal iam attach-role-policy \
    --role-name lambda-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# SQS読み取り権限を添付
awslocal iam attach-role-policy \
    --role-name lambda-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole

echo "⚡ Lambda関数を作成中..."

# Lambda関数用のZIPファイルを作成
mkdir -p /tmp/lambda-zip
cat > /tmp/lambda-zip/lambda_function.py << 'EOF'
import json
import logging
import os
import sys

# ローカル開発用のパス追加
sys.path.append('/opt/python')
sys.path.append('/var/task')

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """LocalStack用の簡単なSQS処理Lambda"""
    try:
        logger.info(f"Received SQS event: {json.dumps(event)}")
        
        # SQSレコードを処理
        for record in event.get('Records', []):
            body = json.loads(record['body'])
            logger.info(f"Processing message: chatId={body.get('chatId')}, botId={body.get('botId')}")
            
            # 実際のAI処理はここで実行（今は簡単なログ出力のみ）
            logger.info(f"AI processing would happen here for: {body.get('userMessage')}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'SQS messages processed successfully'})
        }
        
    except Exception as e:
        logger.error(f"Error processing SQS messages: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
EOF

# Lambda関数パッケージを作成
cd /tmp/lambda-zip
zip -r lambda-function.zip lambda_function.py

# Lambda関数を作成
awslocal lambda create-function \
    --function-name ChatRouterFunction \
    --runtime python3.12 \
    --role arn:aws:iam::000000000000:role/lambda-role \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://lambda-function.zip \
    --timeout 120 \
    --memory-size 512 \
    --environment Variables='{
        "VERSION":"1.0.0",
        "CHAT_HISTORY_TABLE":"ChatHistory-dev",
        "CHATBOT_SETTINGS_TABLE":"ChatbotSettingsDB-dev",
        "AI_PROCESSING_QUEUE":"ai-processing-queue-dev",
        "BEDROCK_REGION":"ap-northeast-1"
    }'

echo "🔗 SQS Event Source Mappingを作成中..."

# SQSキューのARNを取得
QUEUE_URL=$(awslocal sqs get-queue-url --queue-name ai-processing-queue-dev --query 'QueueUrl' --output text)
echo "Queue URL: $QUEUE_URL"

# Event Source Mappingを作成（SQS → Lambda）
awslocal lambda create-event-source-mapping \
    --function-name ChatRouterFunction \
    --event-source-arn arn:aws:sqs:ap-northeast-1:000000000000:ai-processing-queue-dev \
    --batch-size 5 \
    --maximum-batching-window-in-seconds 10

echo "🔐 Secrets Managerシークレットを作成中..."

# 8. Bedrock API設定
awslocal secretsmanager create-secret \
    --name chatbot/bedrock/config \
    --description "Bedrock API configuration for AI processing" \
    --secret-string '{
        "region": "ap-northeast-1",
        "defaultModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "maxTokens": 4096,
        "temperature": 0.7
    }'

# 9. WebSocket認証設定
awslocal secretsmanager create-secret \
    --name chatbot/websocket/auth \
    --description "WebSocket authentication configuration" \
    --secret-string '{
        "jwtSecret": "local-development-secret-key",
        "connectionTimeout": 300000
    }'

# DynamoDBテストデータは実AWS環境に手動で作成する必要があります
echo "⚠️  テストデータについて:"
echo "   DynamoDBテストデータは実AWS環境で以下のコマンドで作成してください："
echo ""
echo "   # テスト用ボット設定"
echo "   aws dynamodb put-item --table-name ChatbotSettingsDB-dev --item file://test-bot-data.json"
echo ""
echo "   # テスト用ユーザー"  
echo "   aws dynamodb put-item --table-name ChatbotSettingsDB-dev --item file://test-user-data.json"
echo ""

echo "✅ LocalStack初期化が完了しました！"
echo ""
echo "📊 作成されたローカルリソース:"
echo "  - SQS: ai-processing-queue, ai-processing-dlq"
echo "  - EventBridge: chatbot-events (ai-processing-trigger)"
echo "  - S3: chat-history-assets-dev"
echo "  - Secrets: chatbot/bedrock/config, chatbot/websocket/auth"
echo ""
echo "📊 実AWS環境のリソース（要確認）:"
echo "  - DynamoDB: ChatHistory-dev, ChatbotSettingsDB-dev"
echo ""
echo "🔗 アクセスURL:"
echo "  - LocalStack Dashboard: http://localhost:4566"
echo "  - SQS Queue UI: http://localhost:4566/_localstack/sqs"
echo ""
echo "🧪 テストコマンド例:"
echo "  # ローカルSQS"
echo "  aws --endpoint-url=http://localhost:4566 sqs receive-message --queue-url http://localhost:4566/000000000000/ai-processing-queue"
echo ""
echo "  # 実AWS DynamoDB"
echo "  aws dynamodb scan --table-name ChatbotSettingsDB-dev"