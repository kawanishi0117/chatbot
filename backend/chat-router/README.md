# マルチプラットフォーム チャット ルータ

このモジュールは、複数のチャットプラットフォーム（Slack、Microsoft Teams、LINE、カスタムUI）からのWebhookを処理し、メッセージをDynamoDBに、バイナリデータをS3に保存するための共通パイプラインを実装します。

## アーキテクチャ

このシステムはAWSサービスを使用したサーバーレスアーキテクチャに従っています：

1. **API Gateway (HTTP API)** - 異なるプラットフォームからのWebhookリクエストを受信
2. **Lambda (Router)** - リクエストを適切なハンドラーにルーティング
3. **Lambda (Normalizer)** - プラットフォーム固有のデータを共通フォーマットに正規化
4. **Lambda (Saver)** - 正規化されたデータをDynamoDBに、バイナリデータをS3に保存
5. **DynamoDB (ChatHistory)** - 24時間保持のTTLを持つテキストとメタデータを保存
6. **S3 (chat-assets-prod)** - 24時間保持のライフサイクルルールを持つバイナリデータを保存

## データモデル

### ルームキー形式

各プラットフォームはプラットフォーム名を含む一意のルームキー形式を持ちます：

| プラットフォーム | roomKey 形式                        | 例                                 |
|------------------|------------------------------------|------------------------------------|
| Slack            | `slack:{team_id}:{channel}`        | `slack:T0AAA:C123456`              |
| Teams            | `teams:{tenantId}:{conversationId}` | `teams:72fabc:19:abc@thread.tacv2` |
| LINE             | `line:{source.type}:{id}`          | `line:group:Ca56f946…`             |
| カスタムUI       | `custom:{roomId}`                  | `custom:abc123`                    |

### DynamoDBスキーマ

`ChatHistory`テーブルは以下のスキーマを持ちます：

| 属性名         | 型   | 説明                                       |
|----------------|------|--------------------------------------------|
| **PK**         | `S`  | roomKey                                    |
| **SK**         | `N`  | `ts` (Unix ミリ秒) - ソートキー            |
| `role`         | `S`  | `"user"` / `"assistant"`                   |
| `text`         | `S`  | メッセージテキスト内容                     |
| `contentType`  | `S`  | `"text"` / `"image"` / `"file"` / など     |
| `s3Uri`        | `S`  | バイナリデータのS3 URI（該当する場合）      |
| **ttl**        | `N`  | 有効期限時刻（Unix秒 + 24時間）             |

### S3ストレージ

バイナリデータは以下のパス形式でS3に保存されます：

```
<platform>/<roomKey>/<ts>.<ext>
```

ライフサイクルルールは24時間後にオブジェクトを自動的に削除するように設定されています。

## コンポーネント

### 1. ノーマライザー

ノーマライザーモジュール（`normalizer.py`）は、プラットフォーム固有のWebhookペイロードを共通フォーマットに変換します：

```python
message = UnifiedMessage(
    platform="slack",
    room_key="slack:T0AAA:C123456",
    sender_id="U123",
    ts=1617235678000,
    role="user",
    text="hello",
    content_type="text",
    s3_uri=None
)
```

### 2. ストレージ

ストレージモジュール（`storage.py`）は、DynamoDBへのメッセージ保存とS3へのバイナリデータ保存を処理します：

```python
# DynamoDBにメッセージを保存
result = storage.save_message(message)

# S3にバイナリデータを保存
s3_uri = storage.save_binary_to_s3(message, binary_data, file_extension)

# 最近のメッセージを取得（最後の3回の交換 = 6メッセージ）
messages = storage.get_recent_messages(room_key, limit=6)
```

### 3. Webhookハンドラー

Webhookハンドラーモジュール（`webhook_handler.py`）は、異なるプラットフォームからのWebhookリクエストを処理します：

- セキュリティのために署名を検証
- ノーマライザーを使用してメッセージを正規化
- ストレージモジュールを使用してメッセージとバイナリデータを保存
- 各プラットフォームに適切なレスポンスを返送

## 使用方法

### Slack Webhook

```
POST /webhook/slack
Content-Type: application/json
X-Slack-Request-Timestamp: 1617235678
X-Slack-Signature: v0=abcdef...

{
  "team_id": "T0AAA",
  "event": {
    "type": "message",
    "channel": "C123456",
    "user": "U123",
    "text": "Hello, world!",
    "ts": "1617235678.123456"
  }
}
```

### Microsoft Teams Webhook

```
POST /webhook/teams
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "type": "message",
  "from": {"id": "29:1bSnHZ7Js2STWrgk6ScEErLk1Lel6F7-mik_cu"},
  "conversation": {"id": "19:ja0l70qzgkyq5s1aobl8xj0co@thread.tacv2"},
  "channelData": {"tenant": {"id": "72f988bf-86f1-41af-91ab-2d7cd011db47"}},
  "text": "Hello, world!",
  "timestamp": "2021-03-31T12:34:56.123Z"
}
```

### LINE Webhook

```
POST /webhook/line
Content-Type: application/json
X-Line-Signature: abcdef...

{
  "events": [
    {
      "type": "message",
      "source": {"type": "user", "userId": "U123456789abcdef"},
      "message": {"type": "text", "text": "Hello, world!"},
      "timestamp": 1617235678000
    }
  ]
}
```

### カスタムUI Webhook

```
POST /webhook/custom
Content-Type: application/json
X-Custom-Signature: abcdef...

{
  "roomId": "room123",
  "senderId": "user456",
  "text": "Hello, world!",
  "timestamp": 1617235678000,
  "contentType": "text",
  "binaryData": "base64encoded...",
  "fileExtension": "jpg"
}
```

## 会話履歴の取得

最後の3回の会話交換（6メッセージ）を取得するには：

```python
messages = storage.get_recent_messages(room_key, limit=6)
```

メッセージは時系列順（古いものから）で返されます。

## テスト

pytestを使用してテストを実行：

```bash
cd backend/chat-router
python -m pytest test_normalizer.py test_storage.py test_webhook_handler.py -v
```

## デプロイメント

AWS SAMを使用してシステムをデプロイ：

```bash
sam build --parallel
sam deploy --config-env prod \
  --parameter-overrides \
    Stage=prod \
    SlackSigningSecret=your-slack-secret \
    LineChannelSecret=your-line-secret \
    TeamsSecret=your-teams-secret \
    CustomUISecret=your-custom-secret
```