# 🤖 AI自動応答機能仕様書 v1

---

## 1. 概要とゴール

### 1.1 目的
- **非同期AI応答**: ユーザーがメッセージを送信後、AIが自動的にレスポンスを生成してフロントエンドのチャット画面に表示
- **履歴保存**: ユーザーとAIの会話履歴をDynamoDBに永続化してチャット画面で閲覧可能
- **モデル選択**: タスク内容や用途に応じてAmazon Bedrock AIモデルを動的に切り替え
- **リアルタイム性**: WebSocketまたはポーリングによるリアルタイム応答表示

### 1.2 技術スタック
- **AI API**: Amazon Bedrock (Claude 3.5 Sonnet/Haiku、Titan等)
- **非同期処理**: AWS Lambda + SQS/EventBridge
- **ストレージ**: DynamoDB (チャット履歴)、AWS Secrets Manager (APIキー管理)
- **リアルタイム通信**: WebSocket API Gateway または REST APIポーリング

---

## 2. 📊 システムアーキテクチャ

### 2.1 全体フロー
```
フロントエンド (React)
    ↓ POST /webhook/custom
ChatRouter Lambda
    ↓ メッセージ保存
DynamoDB (chat_table)
    ↓ 非同期処理トリガー
SQS Queue / EventBridge
    ↓
AI処理Lambda
    ↓ Bedrock API呼び出し
Amazon Bedrock (Claude等)
    ↓ AI応答生成
AI処理Lambda
    ↓ 応答保存
DynamoDB (chat_table)
    ↓ WebSocket/ポーリング
フロントエンド (応答表示)
```

### 2.2 コンポーネント設計

#### 2.2.1 既存の変更点
- **CustomWebhookHandler**: メッセージ保存後にAI処理を非同期トリガー
- **ChatHandler**: メッセージ履歴取得APIの強化（AI応答も含む）

#### 2.2.2 新規コンポーネント
- **AIProcessorLambda**: Bedrock API呼び出しとAI応答処理
- **ModelSelectorService**: タスクに応じたモデル選択ロジック
- **BedrockClientService**: Bedrock API統合サービス
- **RealtimeNotificationService**: WebSocketまたはポーリング応答配信

---

## 3. 🗄️ データモデル設計

### 3.1 メッセージテーブル拡張（ChatHistory-dev）

**既存**: ユーザーメッセージのみ  
**拡張**: AI応答メッセージも同一テーブルに保存

**テーブル構造**: 
- **PK**: ルームキー（`custom:{chatId}` 等のプラットフォーム固有形式）
- **SK**: タイムスタンプ（19桁ゼロパディング、ソート順保証）

| 属性名 | 型 | 説明 | 例 |
|--------|----|----|-----|
| `PK` | `S` | ルームキー | `custom:chat123` |
| `SK` | `S` | タイムスタンプ（19桁） | `0001673840000000000` |
| `role` | `S` | **拡張**: `user` または `assistant` | `assistant` |
| `text` | `S` | メッセージ内容 | `こんにちは` |
| `contentType` | `S` | コンテンツタイプ | `text` |
| `s3Uri` | `S` | S3 URI（ファイル添付時） | `s3://bucket/file.png` |
| `ttl` | `N` | TTL（24時間後削除） | `1673926400` |
| `aiModel` | `S` | **新規**: 使用AIモデル | `claude-3-5-sonnet` |
| `processingStatus` | `S` | **新規**: `pending/processing/completed/failed` | `completed` |
| `responseTime` | `N` | **新規**: AI応答生成時間（ms） | `2500` |
| `tokenUsage` | `M` | **新規**: トークン使用量 | `{input: 100, output: 200}` |

### 3.2 ボット設定テーブル拡張（ChatbotSettingsDB-dev）

**既存構造**: 
- **PK**: `BOT#{botId}` （ボット設定用）
- **SK**: `CONFIG` （固定値）

**追加属性**: AIモデル設定とタスク分類

| 属性名 | 型 | 説明 | 例 |
|--------|----|----|-----|
| `PK` | `S` | `BOT#{botId}` | `BOT#test-bot-001` |
| `SK` | `S` | `CONFIG` | `CONFIG` |
| `botId` | `S` | ボットID | `test-bot-001` |
| `botName` | `S` | ボット名 | `AIアシスタント` |
| `description` | `S` | 説明 | `技術サポートボット` |
| `creatorId` | `S` | 作成者ID | `admin` |
| `isActive` | `BOOL` | アクティブ状態 | `true` |
| `aiConfig` | `M` | **新規**: AI設定 | 下記参照 |

### 3.3 チャットルーム管理テーブル（ChatbotSettingsDB-dev）

**チャットルーム情報**: 既存構造を使用
- **PK**: `USER#{userId}` （ユーザー別チャット管理）
- **SK**: `CHAT#{chatId}` （チャットルーム識別）

| 属性名 | 型 | 説明 | 例 |
|--------|----|----|-----|
| `PK` | `S` | `USER#{userId}` | `USER#test-user` |
| `SK` | `S` | `CHAT#{chatId}` | `CHAT#chat123` |
| `chatId` | `S` | チャットID | `chat123` |
| `userId` | `S` | ユーザーID | `test-user` |
| `title` | `S` | チャット名 | `新しいチャット` |
| `botId` | `S` | 使用ボットID | `test-bot-001` |
| `botName` | `S` | ボット名 | `AIアシスタント` |
| `isActive` | `BOOL` | アクティブ状態 | `true` |

**aiConfig構造** (DynamoDB Map型):
```json
{
  "M": {
    "defaultModel": {"S": "anthropic.claude-3-5-sonnet-20241022-v2:0"},
    "taskModelMapping": {
      "M": {
        "general": {"S": "anthropic.claude-3-5-haiku-20241022-v2:0"},
        "technical": {"S": "anthropic.claude-3-5-sonnet-20241022-v2:0"},
        "creative": {"S": "anthropic.claude-3-5-sonnet-20241022-v2:0"},
        "analysis": {"S": "anthropic.claude-3-5-sonnet-20241022-v2:0"}
      }
    },
    "maxTokens": {"N": "4096"},
    "temperature": {"N": "0.7"},
    "topP": {"N": "0.9"},
    "systemPrompt": {"S": "あなたは親切なアシスタントです。"}
  }
}
```

---

## 4. 🔄 API設計

### 4.1 既存API拡張

#### 4.1.1 メッセージ送信 (POST /webhook/custom)

**リクエスト例**:
```json
{
  "chatId": "chat123",
  "text": "こんにちは",
  "userId": "user456",
  "timestamp": 1673840000000
}
```

**レスポンス例**:
```json
{
  "status": "success",
  "message": "Message received and AI processing started",
  "messageId": "msg123",
  "aiProcessingId": "ai456"
}
```

#### 4.1.2 メッセージ履歴取得 (GET /api/chats/{chatId}/messages)

**レスポンス例**:
```json
{
  "chatId": "chat123",
  "messages": [
    {
      "id": "msg1",
      "content": "こんにちは",
      "role": "user",
      "timestamp": "1673840000000",
      "contentType": "text"
    },
    {
      "id": "msg2", 
      "content": "こんにちは！何かお手伝いできることはありますか？",
      "role": "assistant",
      "timestamp": "1673840002500",
      "contentType": "text",
      "aiModel": "claude-3-5-sonnet-20241022",
      "responseTime": 2500,
      "tokenUsage": {"input": 50, "output": 80}
    }
  ],
  "count": 2
}
```

### 4.2 新規API

#### 4.2.1 AI応答状態確認 (GET /api/chats/{chatId}/ai-status)

**レスポンス例**:
```json
{
  "processingMessages": [
    {
      "messageId": "msg123",
      "status": "processing",
      "aiModel": "claude-3-5-sonnet-20241022",
      "startedAt": 1673840001000,
      "estimatedCompletion": 1673840004000
    }
  ]
}
```

#### 4.2.2 WebSocket接続 (WSS /ws/chat/{chatId})

**接続時認証**:
```json
{
  "action": "authenticate",
  "token": "Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**AI応答通知**:
```json
{
  "type": "ai_response",
  "chatId": "chat123",
  "message": {
    "id": "msg456",
    "content": "AI応答内容",
    "role": "assistant",
    "timestamp": 1673840003000,
    "aiModel": "claude-3-5-sonnet-20241022"
  }
}
```

---

## 5. ⚙️ AI処理サービス実装

### 5.1 AIProcessorLambda

**責務**:
- SQSキューからメッセージ受信
- Bedrock API呼び出し
- AI応答の保存
- WebSocket通知送信

**環境変数**:
```yaml
Environment:
  Variables:
    BEDROCK_REGION: ap-northeast-1
    DEFAULT_AI_MODEL: claude-3-5-sonnet-20241022
    MAX_TOKENS: 4096
    WEBSOCKET_API_ENDPOINT: wss://api.example.com/ws
    CHAT_TABLE_NAME: ChatTable
    SQS_QUEUE_URL: https://sqs.region.amazonaws.com/queue
```

**処理フロー**:
```python
def lambda_handler(event, context):
    # 1. SQSメッセージ解析
    for record in event['Records']:
        message_data = json.loads(record['body'])
        
        # 2. チャット履歴とボット設定取得
        chat_history = get_chat_history(message_data['chatId'])
        bot_config = get_bot_config(message_data['botId'])
        
        # 3. AIモデル選択
        ai_model = select_ai_model(message_data['content'], bot_config)
        
        # 4. Bedrock API呼び出し
        ai_response = call_bedrock_api(chat_history, ai_model, bot_config)
        
        # 5. 応答保存
        save_ai_response(message_data['chatId'], ai_response)
        
        # 6. WebSocket通知
        notify_websocket(message_data['chatId'], ai_response)
```

### 5.2 ModelSelectorService

**モデル選択ロジック**:
```python
class ModelSelectorService:
    def select_model(self, user_message: str, bot_config: dict) -> str:
        # キーワードベース判定
        if any(keyword in user_message.lower() for keyword in ['bug', 'error', 'issue']):
            return bot_config['taskModelMapping'].get('technical', 'claude-3-5-sonnet-20241022')
        
        if any(keyword in user_message.lower() for keyword in ['create', 'write', 'generate']):
            return bot_config['taskModelMapping'].get('creative', 'claude-3-5-sonnet-20241022')
        
        if any(keyword in user_message.lower() for keyword in ['analyze', 'explain', 'compare']):
            return bot_config['taskModelMapping'].get('analysis', 'claude-3-5-sonnet-20241022')
            
        return bot_config.get('defaultModel', 'claude-3-5-haiku-20241022')
```

### 5.3 BedrockClientService

**Bedrock API統合**:
```python
import boto3
from botocore.exceptions import ClientError

class BedrockClientService:
    def __init__(self, region='ap-northeast-1'):
        self.client = boto3.client('bedrock-runtime', region_name=region)
    
    def invoke_model(self, model_id: str, messages: list, config: dict) -> dict:
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": config.get('maxTokens', 4096),
            "temperature": config.get('temperature', 0.7),
            "top_p": config.get('topP', 0.9),
            "messages": messages,
            "system": config.get('systemPrompt', '')
        }
        
        try:
            response = self.client.invoke_model(
                modelId=model_id,
                body=json.dumps(body),
                contentType='application/json',
                accept='application/json'
            )
            
            result = json.loads(response['body'].read())
            return {
                'content': result['content'][0]['text'],
                'usage': result.get('usage', {}),
                'model': model_id
            }
            
        except ClientError as e:
            raise Exception(f"Bedrock API error: {str(e)}")
```

---

## 6. 🌐 フロントエンド統合

### 6.1 リアルタイム応答表示

#### 6.1.1 WebSocket実装

**接続管理**:
```typescript
class WebSocketManager {
  private ws: WebSocket | null = null;
  
  connect(chatId: string, token: string) {
    this.ws = new WebSocket(`wss://api.example.com/ws/chat/${chatId}`);
    
    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({
        action: 'authenticate',
        token: token
      }));
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ai_response') {
        this.handleAIResponse(data.message);
      }
    };
  }
  
  private handleAIResponse(message: AIMessage) {
    // チャット画面にAI応答を追加
    addMessageToChat(message);
  }
}
```

#### 6.1.2 ポーリング実装（代替案）

**useChat.ts拡張**:
```typescript
const useChat = () => {
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  
  const pollForAIResponse = useCallback(async (chatId: string) => {
    setIsAIProcessing(true);
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.getChatMessages(chatId);
        const newMessages = response.messages.filter(
          msg => !currentMessages.some(existing => existing.id === msg.id)
        );
        
        if (newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages]);
          setIsAIProcessing(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // 2秒間隔でポーリング
    
    // 30秒後にタイムアウト
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsAIProcessing(false);
    }, 30000);
  }, [currentMessages]);
  
  const sendMessage = useCallback(async (content: string, chatId: string) => {
    await api.sendMessage(content, chatId);
    await pollForAIResponse(chatId); // AI応答を待機
  }, [pollForAIResponse]);
  
  return { sendMessage, isAIProcessing };
};
```

### 6.2 UI改善

#### 6.2.1 AI応答表示コンポーネント

**AIMessage.tsx**:
```typescript
interface AIMessageProps {
  message: {
    content: string;
    aiModel: string;
    responseTime?: number;
    tokenUsage?: { input: number; output: number };
  };
}

const AIMessage: React.FC<AIMessageProps> = ({ message }) => {
  return (
    <div className="ai-message">
      <div className="message-content">{message.content}</div>
      <div className="message-meta">
        <span className="ai-model">🤖 {message.aiModel}</span>
        {message.responseTime && (
          <span className="response-time">⏱️ {message.responseTime}ms</span>
        )}
      </div>
    </div>
  );
};
```

#### 6.2.2 処理中インジケーター

**ProcessingIndicator.tsx**:
```typescript
const ProcessingIndicator: React.FC = () => {
  return (
    <div className="ai-processing">
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p>AIが応答を生成中...</p>
    </div>
  );
};
```

---

## 7. 🔒 セキュリティ・設定管理

### 7.1 AWS Secrets Manager

**シークレット構成**:
```json
{
  "chatbot/bedrock/keys": {
    "accessKeyId": "AKIA...",
    "secretAccessKey": "...",
    "region": "ap-northeast-1"
  },
  "chatbot/websocket/auth": {
    "jwtSecret": "...",
    "connectionTimeout": 300000
  }
}
```

**Lambda環境変数**:
```yaml
Environment:
  Variables:
    SECRETS_ARN_BEDROCK: arn:aws:secretsmanager:region:account:secret:chatbot/bedrock/keys
    SECRETS_ARN_WEBSOCKET: arn:aws:secretsmanager:region:account:secret:chatbot/websocket/auth
```

### 7.2 IAM権限

**AIProcessorLambda用ポリシー**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet*",
        "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-haiku*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/ChatTable"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:chatbot/*"
    }
  ]
}
```

---

## 8. 📈 監視・ログ

### 8.1 CloudWatchメトリクス

**カスタムメトリクス**:
- `AIProcessing/ResponseTime`: AI応答生成時間
- `AIProcessing/TokenUsage`: トークン使用量
- `AIProcessing/ErrorRate`: AI処理エラー率
- `WebSocket/ActiveConnections`: アクティブWebSocket接続数

### 8.2 ログ設計

**AI処理ログ**:
```json
{
  "timestamp": "2024-01-01T10:00:00.000Z",
  "level": "INFO",
  "chatId": "chat123",
  "messageId": "msg456",
  "aiModel": "claude-3-5-sonnet-20241022",
  "processingTime": 2500,
  "tokenUsage": {
    "input": 150,
    "output": 200
  },
  "success": true
}
```

---

## 9. 🚀 実装フェーズ

### Phase 1: コア機能実装
- [ ] AIProcessorLambda作成
- [ ] BedrockClientService実装
- [ ] DynamoDBスキーマ拡張
- [ ] SQS統合

### Phase 2: フロントエンド統合
- [ ] ポーリング機能実装
- [ ] AI応答表示UI
- [ ] 処理中インジケーター
- [ ] メッセージ履歴拡張

### Phase 3: リアルタイム機能
- [ ] WebSocket API Gateway
- [ ] WebSocketクライアント実装
- [ ] リアルタイム通知

### Phase 4: 高度な機能
- [ ] モデル選択ロジック
- [ ] 設定管理画面
- [ ] 監視・アラート設定

---

## 10. 🧪 テスト戦略

### 10.1 単体テスト
- BedrockClientService API呼び出し
- ModelSelectorService ロジック
- メッセージ正規化処理

### 10.2 統合テスト
- エンドツーエンドメッセージフロー
- AI応答生成→保存→通知
- WebSocket接続・切断

### 10.3 負荷テスト
- 同時メッセージ処理数
- AI応答生成時間
- WebSocket接続数上限

---

*最終更新: 2024年12月*