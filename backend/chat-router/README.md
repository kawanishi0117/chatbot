# ChatRouter Lambda

AWS Lambda関数として実装されたチャットルーティングサービスです。Slack、LINE、Microsoft Teamsからのウェブフックを受け付け、ユーザーのメッセージを適切に処理します。

## 機能

- マルチチャネル（LINE/Slack/Teams）ウェブフック受信
- コマンドパース（/ask, /質問, /investigate, /調査, /clear, /クリア等）
- セッション管理とDynamoDB操作
- Amazon Bedrockを使用したAI応答
- EventBridge連携による非同期処理トリガー

## 前提条件

- Docker Desktop
- PowerShell

## Docker上でのSAM CLIの実行

SAM CLIをローカルにインストールしなくても、Docker上でSAMコマンドを実行できます。

### 簡単な使用方法

ビルドとローカルAPIの起動用にショートカットスクリプトを用意しています：

```powershell
# プロジェクトのビルド
.\build.ps1

# ローカルAPIサーバーの起動
.\start-api.ps1
```

### 詳細な使用方法

より詳細なオプションを指定する場合は、`sam-docker.ps1`スクリプトを直接使用できます：

```powershell
# ヘルプの表示
.\sam-docker.ps1 help

# SAMプロジェクトのビルド（オプション付き）
.\sam-docker.ps1 build --debug

# ローカルAPIサーバーの起動（オプション付き）
.\sam-docker.ps1 local --host 0.0.0.0

# その他のSAMコマンドの実行
.\sam-docker.ps1 validate
.\sam-docker.ps1 deploy --guided
```

## APIエンドポイント

ローカルAPIサーバーが起動したら、以下のエンドポイントにアクセスできます：

- ヘルスチェック: http://localhost:3000/health
- テストエンドポイント: http://localhost:3000/test
- Slackウェブフック: http://localhost:3000/webhook/slack
- LINEウェブフック: http://localhost:3000/webhook/line
- Teamsウェブフック: http://localhost:3000/webhook/teams

## 開発方法

1. `src/lambda_function.py` でLambdaのハンドラーロジックを実装
2. 必要な依存関係は `requirements.txt` に追加
3. `.\build.ps1` でプロジェクトをビルド
4. `.\start-api.ps1` でローカルAPIサーバーを起動してテスト
5. AWS環境へのデプロイには、SAMテンプレート（template.yaml）を使用

## トラブルシューティング

### ポートが既に使用されている場合

ポート3000が既に使用されている場合は、以下のようにポート番号を変更できます：

```powershell
.\sam-docker.ps1 local -p 3001
```

これにより、http://localhost:3001 でアクセスできるようになります。

### Dockerボリュームマウントの問題

Windows環境でボリュームマウントに問題がある場合は、絶対パスを使用してみてください：

```powershell
docker run --rm -v "${PWD}:/app" -p 3000:3000 sam-cli-docker sam local start-api
```

## 環境変数

Docker環境で使用する主な環境変数：

- `STAGE`: デプロイステージ（dev/staging/prod）
- `LOG_LEVEL`: ログレベル（INFO/DEBUG/ERROR）
- `BEDROCK_MODEL_ID`: Amazon Bedrockのモデルエンドポイント
- `SLACK_SIGNING_SECRET`: Slackアプリの署名シークレット
- `LINE_CHANNEL_SECRET`: LINEチャンネルシークレット
- `TEAMS_SECRET`: Teamsウェブフックシークレット
- `GITHUB_APP_KEY`: GitHub Appのプライベートキー
- `COMMAND_LANG_MAP`: コマンド言語マッピング（JSON文字列）
