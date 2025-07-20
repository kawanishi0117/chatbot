# Multi-Channel Chatbot Backend

マルチチャネル（LINE/Slack/Teams）対応チャットボットのバックエンド環境です。  
AWS LambdaとAPI Gatewayを模擬したローカル開発環境をDockerで構築します。

## 🏗️ システム概要

このプロジェクトは以下の構成で設計されています：

- **ウェブフック処理**: ChatRouter Lambda（現在実装中）
  - ウェブフック受信、コマンドパース、セッション管理、回答生成
- **ベクター検索**: データ生成・保存Lambda（今後実装予定）
- **その他Lambda**: Retrieve, DecideAction, Summarize, Notifier等（今後実装予定）

詳細は `document/初期設計書.md` をご参照ください。

## 📁 プロジェクト構成

```
.
├── backend/                           # Lambda関数群
│   ├── chat-router/                   # ウェブフック処理・チャットルーティング
│   │   ├── lambda_function.py        # ChatRouter Lambda関数
│   │   ├── Dockerfile                # Docker設定（ローカル開発用）
│   │   ├── docker-compose.yml        # Docker Compose設定
│   │   ├── requirements.txt          # Python依存関係
│   │   └── test_lambda.py            # テストスクリプト
│   └── vector-processor/             # ベクター検索用Lambda（今後実装）
├── template.yaml                     # AWS SAM テンプレート
├── samconfig.toml                    # SAM CLI 設定
├── .gitignore                        # Git除外設定
├── start-project.ps1                 # 起動スクリプト（PowerShell）
└── README.md                         # このファイル
```

## 🚀 クイックスタート

### 前提条件

- Docker Desktop がインストールされていること
- AWS SAM CLI がインストールされていること
- PowerShell が使用可能であること（Windows）
- Python 3.11+ （テスト実行時）

**SAM CLI インストール:**
- [SAM CLI インストールガイド](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

### 1. 環境起動

PowerShellでプロジェクトルートから以下を実行：

```powershell
# 基本起動
.\start-project.ps1

# テスト付きで起動
.\start-project.ps1 -Test
```

### 2. API エンドポイント

SAM Local APIは以下のローカルエンドポイントで動作します：

- **ベースURL**: `http://localhost:3000`
- **ヘルスチェック**: `http://localhost:3000/health`
- **テストエンドポイント**: `http://localhost:3000/test`
- **Slack Webhook**: `http://localhost:3000/webhook/slack`
- **LINE Webhook**: `http://localhost:3000/webhook/line`
- **Teams Webhook**: `http://localhost:3000/webhook/teams`

### 3. テスト実行

```powershell
# SAM Local APIのテスト
cd backend/chat-router
python test_sam_local.py

# または直接PowerShellから
.\start-project.ps1 -Test
```

## 🚀 AWS デプロイメント

### SAM CLIを使用したデプロイ

```bash
# ビルド
sam build --parallel

# 開発環境にデプロイ
sam deploy --config-env dev

# 本番環境にデプロイ
sam deploy --config-env prod \
  --parameter-overrides \
    SlackSigningSecret=your-slack-secret \
    LineChannelSecret=your-line-secret \
    GithubAppKey=your-github-key
```

### デプロイで作成されるリソース

- **API Gateway**: マルチチャネルウェブフック受信
- **Lambda関数**: ChatRouter処理
- **DynamoDB**: セッションログとナレッジベクター
- **EventBridge**: 非同期処理用イベントバス

## 🛠️ ローカル開発

### PowerShellスクリプトオプション

```powershell
# 環境起動
.\start-project.ps1

# テスト付き起動
.\start-project.ps1 -Test

# ログの表示
.\start-project.ps1 -Logs

# コンテナ停止
.\start-project.ps1 -Stop

# 完全クリーンアップ
.\start-project.ps1 -Clean
```

### 手動Docker操作

```bash
# SAM Local APIで作業

# ビルド
sam build --parallel

# ローカルAPI起動
sam local start-api --host 0.0.0.0 --port 3000

# 個別Lambda関数の実行
sam local invoke ChatRouterFunction --event events/test-event.json

# ログはリアルタイムでターミナルに表示されます
```

## 📡 API使用例

### curlでのテスト

```bash
# ヘルスチェック
curl -X GET http://localhost:3000/health

# テストエンドポイント
curl -X GET http://localhost:3000/test

# Slack Webhook
curl -X POST http://localhost:3000/webhook/slack \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token",
    "challenge": "test-challenge",
    "type": "url_verification"
  }'

# LINE Webhook
curl -X POST http://localhost:3000/webhook/line \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "message",
      "message": {"type": "text", "text": "/ask test message"},
      "source": {"type": "user", "userId": "test-user"}
    }]
  }'
```

### PowerShellでのテスト

```powershell
# ヘルスチェック
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET

# テストエンドポイント
Invoke-RestMethod -Uri "http://localhost:3000/test" -Method GET

# Slack Webhook
$slackBody = @{
    token = "test-token"
    challenge = "test-challenge"
    type = "url_verification"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/webhook/slack" -Method POST -Body $slackBody -ContentType "application/json"
```

## 🏗️ Lambda関数の機能

現在のLambda関数は以下の機能を提供します：

- **ルーティング**: パスベースの簡単なルーティング
- **CORS対応**: クロスオリジンリクエストのサポート
- **エラーハンドリング**: 適切なHTTPステータスコードとエラーレスポンス
- **ログ出力**: リクエスト情報のログ記録

### サポートされるエンドポイント

| パス | メソッド | 説明 |
|------|----------|------|
| `/health` | GET | ヘルスチェック |
| `/test` | GET/POST | テスト用エンドポイント |
| その他 | ALL | 汎用レスポンス |

## 🔧 カスタマイズ

### Lambda関数の拡張

`backend/chat-router/lambda_function.py` を編集して新しいエンドポイントや機能を追加できます：

```python
# 新しいルートの追加例
if path == '/new-endpoint':
    response_data['message'] = 'New endpoint response'
    response_data['custom_data'] = {'key': 'value'}
```

### 依存関係の追加

`backend/chat-router/requirements.txt` に新しいPythonパッケージを追加：

```
new-package==1.0.0
```

その後、イメージを再ビルド：

```powershell
.\start-project.ps1 -Clean
.\start-project.ps1
```

## 📊 トラブルシューティング

### コンテナが起動しない場合

1. ログを確認：
   ```powershell
   .\start-project.ps1 -Logs
   ```

2. ポート競合をチェック：
   ```powershell
   netstat -an | findstr :9000
   ```

3. Docker環境をリセット：
   ```powershell
   .\start-project.ps1 -Clean
   ```

### テストが失敗する場合

1. コンテナのステータス確認：
   ```bash
   docker-compose ps
   ```

2. Lambda関数のログ確認：
   ```bash
   docker-compose logs lambda-function
   ```

## 📝 開発ノート

- このプロジェクトはローカル開発用です
- 実際のAWS Lambda/API Gatewayとは異なる場合があります
- 本番環境では適切なAWS設定を使用してください