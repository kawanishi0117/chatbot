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
- PowerShell が使用可能であること（Windows）
- Python 3.11+ （テスト実行時）

### 1. 環境起動

PowerShellでプロジェクトルートから以下を実行：

```powershell
# 基本起動
.\start-project.ps1

# テスト付きで起動
.\start-project.ps1 -Test
```

### 2. API エンドポイント

Lambda関数は以下のローカルエンドポイントで動作します：

- **ベースURL**: `http://localhost:9000/2015-03-31/functions/function/invocations`
- **ヘルスチェック**: `/health`
- **テストエンドポイント**: `/test`

### 3. テスト実行

```powershell
# Lambda関数のテスト
cd backend/chat-router
python test_lambda.py
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
# ChatRouter Lambdaで作業
cd backend/chat-router

# ビルド
docker-compose build

# 起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down
```

## 📡 API使用例

### curlでのテスト

```bash
# ヘルスチェック
curl -X POST http://localhost:9000/2015-03-31/functions/function/invocations \
  -H "Content-Type: application/json" \
  -d '{
    "httpMethod": "GET",
    "path": "/health",
    "headers": {"Content-Type": "application/json"}
  }'

# テストエンドポイント
curl -X POST http://localhost:9000/2015-03-31/functions/function/invocations \
  -H "Content-Type: application/json" \
  -d '{
    "httpMethod": "GET",
    "path": "/test",
    "queryStringParameters": {"param1": "value1"},
    "headers": {"Content-Type": "application/json"}
  }'
```

### PowerShellでのテスト

```powershell
# ヘルスチェック
$body = @{
    httpMethod = "GET"
    path = "/health"
    headers = @{"Content-Type" = "application/json"}
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9000/2015-03-31/functions/function/invocations" -Method POST -Body $body -ContentType "application/json"
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