# スクリプト・テストファイル構成

## 📁 ディレクトリ構造

```
scripts/
├── dev/           # 開発・起動スクリプト
├── deploy/        # デプロイ・セットアップスクリプト
└── test/          # テスト用スクリプト (未使用)

tests/
├── integration/   # 統合テスト
├── unit/          # ユニットテスト (未使用)
└── fixtures/      # テスト用データファイル
```

## 🚀 開発スクリプト (scripts/dev/)

### `start-project.ps1`
**用途**: プロジェクト全体の起動
```powershell
# 通常起動
.\scripts\dev\start-project.ps1

# AI機能付き起動
.\scripts\dev\start-project.ps1 -WithAI

# クリーンビルド
.\scripts\dev\start-project.ps1 -Clean
```

### `start-local-dev.ps1`
**用途**: ローカル開発環境の起動
```powershell
.\scripts\dev\start-local-dev.ps1
```

### `stop-project.ps1`
**用途**: プロジェクト停止・クリーンアップ
```powershell
.\scripts\dev\stop-project.ps1
```

## 🚢 デプロイスクリプト (scripts/deploy/)

### `setup-aws-test-data.ps1`
**用途**: AWS DynamoDBテストデータの投入・削除
```powershell
# テストデータ投入
.\scripts\deploy\setup-aws-test-data.ps1

# テストデータ削除
.\scripts\deploy\setup-aws-test-data.ps1 -Clean
```

## 🧪 統合テスト (tests/integration/)

### `test-sqs-complete.sh`
**用途**: SQS→Lambda完全統合テスト
```bash
# 統合テスト実行
./tests/integration/test-sqs-complete.sh
```

**機能**:
- LocalStack SQS健全性チェック
- テストメッセージ送信
- メッセージ受信・Lambda実行
- 処理済みメッセージ削除
- キュー状態確認

## 📄 テストデータ (tests/fixtures/)

### `manual-lambda-event.json`
**用途**: Lambda関数の手動テスト用SQSイベント形式データ
```bash
# 手動Lambda実行
cd backend/chat-router
sam local invoke ChatRouterFunction --event ../../tests/fixtures/manual-lambda-event.json
```

## 🗂️ 削除されたファイル

以下のファイルは重複・不完全・未使用のため削除されました：

- `lambda-test.py` - 不完全なPythonテスト
- `test-sqs.py` - 不完全なPython SQSテスト  
- `test-sqs-event.json` - 重複テストイベント
- `test-sqs-auto.ps1` - 構文エラーのあるPowerShellテスト
- `run-sqs-test.ps1` - 動作しないPowerShell統合テスト
- `sqs-lambda-processor.ps1` - 複雑で動作しないPowerShellプロセッサ

## 💡 使用方法

### 一般的な開発フロー
```bash
# 1. プロジェクト起動
.\scripts\dev\start-project.ps1 -WithAI

# 2. SQS統合テスト実行  
./tests/integration/test-sqs-complete.sh

# 3. プロジェクト停止
.\scripts\dev\stop-project.ps1
```

### トラブルシューティング
```bash
# Lambda手動テスト
cd backend/chat-router
sam local invoke ChatRouterFunction --event ../../tests/fixtures/manual-lambda-event.json

# テストデータリセット
.\scripts\deploy\setup-aws-test-data.ps1 -Clean
.\scripts\deploy\setup-aws-test-data.ps1
```