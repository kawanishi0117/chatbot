# Multi-Platform Chat Router

This module implements a common pipeline for processing webhooks from multiple chat platforms (Slack, Microsoft Teams, LINE, and a custom UI) and storing messages in DynamoDB and binary data in S3.

## Architecture

The system follows a serverless architecture using AWS services:

1. **API Gateway (HTTP API)** - Receives webhook requests from different platforms
2. **Lambda (Router)** - Routes requests to the appropriate handler
3. **Lambda (Normalizer)** - Normalizes platform-specific data to a common format
4. **Lambda (Saver)** - Saves normalized data to DynamoDB and binary data to S3
5. **DynamoDB (ChatHistory)** - Stores text and metadata with TTL for 24-hour retention
6. **S3 (chat-assets-prod)** - Stores binary data with lifecycle rules for 24-hour retention

## Data Model

### Room Key Format

Each platform has a unique room key format that includes the platform name:

| Platform  | roomKey Format                      | Example                              |
|-----------|------------------------------------|------------------------------------|
| Slack     | `slack:{team_id}:{channel}`        | `slack:T0AAA:C123456`              |
| Teams     | `teams:{tenantId}:{conversationId}` | `teams:72fabc:19:abc@thread.tacv2` |
| LINE      | `line:{source.type}:{id}`          | `line:group:Ca56f946…`             |
| Custom UI | `custom:{roomId}`                  | `custom:abc123`                    |

### DynamoDB Schema

The `ChatHistory` table has the following schema:

| Attribute      | Type | Description                                |
|----------------|------|--------------------------------------------|
| **PK**         | `S`  | roomKey                                    |
| **SK**         | `N`  | `ts` (Unix ms) - Sort key                  |
| `role`         | `S`  | `"user"` / `"assistant"`                   |
| `text`         | `S`  | Message text content                       |
| `contentType`  | `S`  | `"text"` / `"image"` / `"file"` / etc.     |
| `s3Uri`        | `S`  | S3 URI for binary data (if applicable)     |
| **ttl**        | `N`  | Expiration time (Unix seconds + 24 hours)  |

### S3 Storage

Binary data is stored in S3 with the following path format:

```
<platform>/<roomKey>/<ts>.<ext>
```

Lifecycle rules are configured to automatically delete objects after 24 hours.

## Components

### 1. Normalizer

The normalizer module (`normalizer.py`) converts platform-specific webhook payloads to a common format:

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

### 2. Storage

The storage module (`storage.py`) handles storing messages in DynamoDB and binary data in S3:

```python
# Save message to DynamoDB
result = storage.save_message(message)

# Save binary data to S3
s3_uri = storage.save_binary_to_s3(message, binary_data, file_extension)

# Get recent messages (last 3 exchanges = 6 messages)
messages = storage.get_recent_messages(room_key, limit=6)
```

### 3. Webhook Handler

The webhook handler module (`webhook_handler.py`) processes webhook requests from different platforms:

- Verifies signatures for security
- Normalizes messages using the normalizer
- Saves messages and binary data using the storage module
- Returns appropriate responses for each platform

## Usage

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

### Custom UI Webhook

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

## Retrieving Conversation History

To retrieve the last 3 conversation exchanges (6 messages):

```python
messages = storage.get_recent_messages(room_key, limit=6)
```

The messages are returned in chronological order (oldest first).

## Testing

Run the tests using pytest:

```bash
cd backend/chat-router
python -m pytest test_normalizer.py test_storage.py test_webhook_handler.py -v
```

## Deployment

Deploy the system using AWS SAM:

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