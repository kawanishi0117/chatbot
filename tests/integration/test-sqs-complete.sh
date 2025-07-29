#!/bin/bash

# SQS完全自動処理テストスクリプト
# LocalStack SQS + SAM Local Lambda の統合テスト

echo "🧪 SQS完全自動処理テスト開始"
echo "============================"

# 設定
LOCALSTACK_ENDPOINT="http://localhost:4566"
QUEUE_URL="http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/ai-processing-queue-dev"
BACKEND_PATH="backend/chat-router"

# 関数: SQSメッセージ送信
send_test_message() {
    local chat_id="${1:-test-chat-complete}"
    local bot_id="${2:-test-bot-complete}"
    local message="${3:-完全自動処理テストメッセージ}"
    
    echo "📤 テストメッセージ送信中..."
    echo "  チャットID: $chat_id"
    echo "  ボットID: $bot_id"
    echo "  メッセージ: $message"
    
    # JSONメッセージボディを作成
    local message_body=$(cat <<EOF
{"chatId":"$chat_id","botId":"$bot_id","userMessage":"$message","userMessageId":"test-msg-$(date +%s)","timestamp":$(date +%s000),"source":"custom-ui"}
EOF
)
    
    # URL エンコードされた形式でSQSに送信
    local response=$(curl -s -X POST "$LOCALSTACK_ENDPOINT/" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "Action=SendMessage&QueueUrl=$(echo -n "$QUEUE_URL" | sed 's/:/%3A/g; s/\//%2F/g')&MessageBody=$(echo -n "$message_body" | sed 's/ /%20/g; s/"/%22/g; s/:/%3A/g; s/,/%2C/g; s/{/%7B/g; s/}/%7D/g')")
    
    if echo "$response" | grep -q "MessageId"; then
        local message_id=$(echo "$response" | grep -o '<MessageId>[^<]*</MessageId>' | sed 's/<[^>]*>//g')
        echo "✅ メッセージ送信成功: $message_id"
        return 0
    else
        echo "❌ メッセージ送信失敗"
        echo "Response: $response"
        return 1
    fi
}

# 関数: SQSメッセージ受信
receive_messages() {
    echo "📥 SQSメッセージ受信中..."
    
    local response=$(curl -s -X POST "$LOCALSTACK_ENDPOINT/" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "Action=ReceiveMessage&QueueUrl=$(echo -n "$QUEUE_URL" | sed 's/:/%3A/g; s/\//%2F/g')&MaxNumberOfMessages=10")
    
    if echo "$response" | grep -q "MessageId"; then
        echo "$response"
        return 0
    else
        echo "ℹ️  受信メッセージなし"
        return 1
    fi
}

# 関数: SQS Lambda イベント作成
create_lambda_event() {
    local sqs_response="$1"
    local temp_file="sqs-lambda-event.json"
    
    # SQSレスポンスからメッセージ情報を抽出
    local message_id=$(echo "$sqs_response" | grep -o '<MessageId>[^<]*</MessageId>' | sed 's/<[^>]*>//g')
    local receipt_handle=$(echo "$sqs_response" | grep -o '<ReceiptHandle>[^<]*</ReceiptHandle>' | sed 's/<[^>]*>//g')
    local body=$(echo "$sqs_response" | grep -o '<Body>[^<]*</Body>' | sed 's/<[^>]*>//g' | sed 's/&quot;/"/g')
    local md5_body=$(echo "$sqs_response" | grep -o '<MD5OfBody>[^<]*</MD5OfBody>' | sed 's/<[^>]*>//g')
    
    # Lambda SQSイベント形式でJSONファイル作成
    cat > "$temp_file" << EOF
{
  "Records": [
    {
      "messageId": "$message_id",
      "receiptHandle": "$receipt_handle",
      "body": "$body",
      "attributes": {
        "ApproximateReceiveCount": "1",
        "SentTimestamp": "$(date +%s)000",
        "SenderId": "LOCALTEST",
        "ApproximateFirstReceiveTimestamp": "$(date +%s)000"
      },
      "messageAttributes": {},
      "md5OfBody": "$md5_body",
      "eventSource": "aws:sqs",
      "eventSourceARN": "arn:aws:sqs:us-east-1:000000000000:ai-processing-queue-dev",
      "awsRegion": "us-east-1"
    }
  ]
}
EOF
    
    echo "$temp_file"
}

# 関数: Lambda関数実行
invoke_lambda() {
    local event_file="$1"
    
    echo "🚀 Lambda関数実行中..."
    
    cd "$BACKEND_PATH" || return 1
    
    # SAM build確認
    if [ ! -d ".aws-sam" ]; then
        echo "⚠️  SAM buildが必要です。buildを実行中..."
        powershell.exe -Command "sam build --parallel" || return 1
    fi
    
    # Lambda関数実行
    if powershell.exe -Command "sam local invoke ChatRouterFunction --event '$event_file'"; then
        echo "✅ Lambda関数実行成功"
        cd - > /dev/null
        return 0
    else
        echo "❌ Lambda関数実行失敗"
        cd - > /dev/null
        return 1
    fi
}

# 関数: メッセージ削除
delete_message() {
    local receipt_handle="$1"
    
    echo "🗑️  処理済みメッセージ削除中..."
    
    local encoded_handle=$(echo -n "$receipt_handle" | sed 's/ /%20/g; s/+/%2B/g; s/=/%3D/g; s/\//%2F/g')
    local response=$(curl -s -X POST "$LOCALSTACK_ENDPOINT/" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "Action=DeleteMessage&QueueUrl=$(echo -n "$QUEUE_URL" | sed 's/:/%3A/g; s/\//%2F/g')&ReceiptHandle=$encoded_handle")
    
    if echo "$response" | grep -q "DeleteMessageResponse"; then
        echo "✅ メッセージ削除成功"
        return 0
    else
        echo "⚠️  メッセージ削除失敗"
        return 1
    fi
}

# 関数: キュー状態確認
check_queue_status() {
    echo "📊 キュー状態確認中..."
    
    local response=$(curl -s -X POST "$LOCALSTACK_ENDPOINT/" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "Action=GetQueueAttributes&QueueUrl=$(echo -n "$QUEUE_URL" | sed 's/:/%3A/g; s/\//%2F/g')&AttributeName.1=ApproximateNumberOfMessages")
    
    if echo "$response" | grep -q "GetQueueAttributesResult"; then
        local message_count=$(echo "$response" | grep -o '<Value>[^<]*</Value>' | sed 's/<[^>]*>//g')
        echo "  キューのメッセージ数: $message_count"
    else
        echo "  キュー状態取得エラー"
    fi
}

# メイン処理
main() {
    echo "🔍 前提条件チェック..."
    
    # LocalStack健全性チェック
    if ! curl -s "$LOCALSTACK_ENDPOINT/_localstack/health" | grep -q '"sqs": "running"'; then
        echo "❌ LocalStack SQSが起動していません"
        exit 1
    fi
    echo "✅ LocalStack SQS接続OK"
    
    # バックエンドディレクトリチェック
    if [ ! -d "$BACKEND_PATH" ]; then
        echo "❌ バックエンドディレクトリが見つかりません: $BACKEND_PATH"
        exit 1
    fi
    echo "✅ バックエンドディレクトリ確認OK"
    
    echo ""
    echo "🚀 完全自動処理開始..."
    
    # 1. テストメッセージ送信
    if ! send_test_message "test-chat-auto" "test-bot-auto" "自動処理統合テスト"; then
        exit 1
    fi
    
    echo "⏳ メッセージ処理のため2秒待機..."
    sleep 2
    
    # 2. メッセージ受信
    echo ""
    sqs_response=$(receive_messages)
    if [ $? -ne 0 ]; then
        echo "❌ メッセージ受信失敗"
        exit 1
    fi
    
    # 3. Lambda イベント作成
    echo ""
    event_file=$(create_lambda_event "$sqs_response")
    echo "📄 Lambdaイベントファイル作成: $event_file"
    
    # 4. Lambda関数実行
    echo ""
    if invoke_lambda "$event_file"; then
        echo "✅ Lambda処理成功"
        
        # 5. メッセージ削除
        echo ""
        receipt_handle=$(echo "$sqs_response" | grep -o '<ReceiptHandle>[^<]*</ReceiptHandle>' | sed 's/<[^>]*>//g')
        delete_message "$receipt_handle"
    else
        echo "❌ Lambda処理失敗"
    fi
    
    # 6. 結果確認
    echo ""
    check_queue_status
    
    # クリーンアップ
    if [ -f "$event_file" ]; then
        rm -f "$event_file"
    fi
    
    echo ""
    echo "🎉 SQS完全自動処理テスト完了!"
}

# スクリプト実行
main "$@"