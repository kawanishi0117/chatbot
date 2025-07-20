# Lambda API Gateway Docker Project

AWS LambdaとAPI Gatewayを模擬したローカル開発環境をDockerで構築するプロジェクトです。

## 📁 プロジェクト構成

```
.
├── backend/                    # Lambda関数とDocker設定
│   ├── lambda_function.py     # Lambda関数のメインファイル
│   ├── Dockerfile             # Lambda用Dockerファイル
│   ├── docker-compose.yml     # Docker Compose設定
│   ├── requirements.txt       # Python依存関係
│   └── test_lambda.py         # テストスクリプト
├── start-project.ps1          # 起動スクリプト（PowerShell）
└── README.md                  # このファイル
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
cd backend
python test_lambda.py
```

## 🛠️ 開発者向けコマンド

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
# バックエンドディレクトリで作業
cd backend

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

`backend/lambda_function.py` を編集して新しいエンドポイントや機能を追加できます：

```python
# 新しいルートの追加例
if path == '/new-endpoint':
    response_data['message'] = 'New endpoint response'
    response_data['custom_data'] = {'key': 'value'}
```

### 依存関係の追加

`backend/requirements.txt` に新しいPythonパッケージを追加：

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