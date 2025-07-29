#!/bin/bash
# AI自動応答機能用LocalStack初期化スクリプト

set -e

echo "AI自動応答機能用のAWSリソースを初期化中..."

# 環境変数設定
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_ENDPOINT_URL=http://localstack:4566

# SQSキューの作成
echo "SQSキューを作成中..."

# AI処理用キュー
aws --endpoint-url=$AWS_ENDPOINT_URL sqs create-queue \
    --queue-name ai-processing-queue-dev \
    --attributes VisibilityTimeoutSeconds=150,MessageRetentionPeriod=1209600,ReceiveMessageWaitTimeSeconds=20

# デッドレターキュー
aws --endpoint-url=$AWS_ENDPOINT_URL sqs create-queue \
    --queue-name ai-processing-dlq-dev \
    --attributes MessageRetentionPeriod=1209600

echo "SQSキューが作成されました"

# キューのURLを取得して表示
AI_QUEUE_URL=$(aws --endpoint-url=$AWS_ENDPOINT_URL sqs get-queue-url --queue-name ai-processing-queue-dev --query 'QueueUrl' --output text)
DLQ_URL=$(aws --endpoint-url=$AWS_ENDPOINT_URL sqs get-queue-url --queue-name ai-processing-dlq-dev --query 'QueueUrl' --output text)

echo "作成されたキュー:"
echo "  - AI処理キュー: $AI_QUEUE_URL"
echo "  - デッドレターキュー: $DLQ_URL"

# S3バケット作成（ファイルアップロード用）
echo "S3バケットを作成中..."
aws --endpoint-url=$AWS_ENDPOINT_URL s3 mb s3://chat-history-assets-dev || echo "バケットは既に存在します"

# Secrets Manager用シークレット作成（テスト用）
echo "テスト用シークレットを作成中..."
aws --endpoint-url=$AWS_ENDPOINT_URL secretsmanager create-secret \
    --name chatbot/bedrock/keys \
    --description "AI自動応答機能用Bedrockテストキー" \
    --secret-string '{"accessKeyId":"test","secretAccessKey":"test","region":"ap-northeast-1"}' \
    || echo "シークレットは既に存在します"

echo "AI自動応答機能用LocalStackの初期化が完了しました"
echo ""
echo "使用可能なサービス:"
echo "  - SQS: http://localhost:4566"
echo "  - S3: http://localhost:4566" 
echo "  - Secrets Manager: http://localhost:4566"
echo ""
echo "注意: Bedrockはローカルではエミュレートできないため、実際のAWS Bedrockサービスを使用してください"