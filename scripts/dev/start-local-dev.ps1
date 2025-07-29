# AI自動応答機能開発用 - ローカル環境起動スクリプト (Windows11)
# 構成: AWS DynamoDB (実際のAWS) + ローカル LocalStack (SQS/Lambda/S3)

param(
    [Parameter(HelpMessage="バックグラウンドで起動")]
    [switch]$Detached,
    
    [Parameter(HelpMessage="既存コンテナを停止してクリーンスタート")]
    [switch]$Clean,
    
    [Parameter(HelpMessage="ログを表示")]
    [switch]$Logs,
    
    [Parameter(HelpMessage="環境を停止")]
    [switch]$Stop,
    
    [Parameter(HelpMessage="すべてのデータを初期化")]
    [switch]$Reset
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = $ScriptDir

Write-Host "🤖 AI自動応答機能 - ローカル開発環境" -ForegroundColor Cyan
Write-Host "構成: AWS DynamoDB + LocalStack (SQS/Lambda/S3)" -ForegroundColor Gray
Write-Host "==================================" -ForegroundColor Cyan

# Docker環境の確認
function Test-Requirements {
    Write-Host "🔍 必要な環境を確認中..." -ForegroundColor Yellow
    
    try {
        $dockerVersion = docker --version
        Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Dockerが見つかりません。Docker Desktopをインストールしてください。" -ForegroundColor Red
        exit 1
    }
    
    try {
        $composeVersion = docker compose version
        Write-Host "✅ Docker Compose: $composeVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Docker Composeが見つかりません。" -ForegroundColor Red
        exit 1
    }
    
    # AWS設定確認
    $awsConfigPath = "$env:USERPROFILE\.aws\credentials"
    if (Test-Path $awsConfigPath) {
        Write-Host "✅ AWS設定ファイルが見つかりました: $awsConfigPath" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  AWS設定ファイルが見つかりません: $awsConfigPath" -ForegroundColor Yellow
        Write-Host "   実AWS DynamoDBを使用する場合は、以下を実行してください：" -ForegroundColor Yellow
        Write-Host "   aws configure" -ForegroundColor Gray
    }
}

# 環境停止
if ($Stop) {
    Write-Host "🛑 開発環境を停止中..." -ForegroundColor Red
    docker compose -f docker-compose.local.yml down
    Write-Host "✅ 環境が停止されました。" -ForegroundColor Green
    exit 0
}

# リセット処理
if ($Reset) {
    Write-Host "🗑️  すべてのデータを初期化中..." -ForegroundColor Red
    Write-Host "⚠️  この操作により、すべてのローカルデータが削除されます。" -ForegroundColor Yellow
    $confirmation = Read-Host "続行しますか？ (y/N)"
    
    if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
        docker compose -f docker-compose.local.yml down -v --remove-orphans
        docker volume prune -f
        Write-Host "✅ データが初期化されました。" -ForegroundColor Green
    }
    else {
        Write-Host "❌ リセット操作がキャンセルされました。" -ForegroundColor Gray
    }
    exit 0
}

# ログ表示
if ($Logs) {
    Write-Host "📋 ログを表示中..." -ForegroundColor Blue
    docker compose -f docker-compose.local.yml logs -f
    exit 0
}

# メイン処理開始
Test-Requirements

if ($Clean) {
    Write-Host "🧹 既存環境をクリーンアップ中..." -ForegroundColor Yellow
    docker compose -f docker-compose.local.yml down --remove-orphans
}

Write-Host "🚀 開発環境を起動中..." -ForegroundColor Green

# Docker Compose実行
if ($Detached) {
    docker compose -f docker-compose.local.yml up -d
    
    Write-Host "⏳ LocalStackの起動を待機中..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # 接続テスト
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4566/health" -TimeoutSec 10 -UseBasicParsing
        Write-Host "✅ LocalStack: http://localhost:4566" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  LocalStackの起動に時間がかかっています..." -ForegroundColor Yellow
    }
    
    # 初期化スクリプト実行
    Write-Host "📋 AWS リソースを初期化中..." -ForegroundColor Yellow
    docker compose -f docker-compose.local.yml --profile init run --rm aws-cli sh /scripts/init-ai-services.sh
}
else {
    docker compose -f docker-compose.local.yml up
}

Write-Host ""
Write-Host "🎉 開発環境が起動しました！" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

Write-Host "🔗 アクセス情報:" -ForegroundColor Cyan
Write-Host "  LocalStack:        http://localhost:4566" -ForegroundColor White
Write-Host "  SQS Queue UI:      http://localhost:4566/_localstack/sqs" -ForegroundColor White
Write-Host "  S3 Browser:        http://localhost:4566/_localstack/s3" -ForegroundColor White

Write-Host ""
Write-Host "🛠️  開発用コマンド例:" -ForegroundColor Cyan
Write-Host "  # 環境確認" -ForegroundColor Gray
Write-Host "  .\start-local-dev.ps1 -Logs" -ForegroundColor Gray
Write-Host ""
Write-Host "  # 環境停止" -ForegroundColor Gray
Write-Host "  .\start-local-dev.ps1 -Stop" -ForegroundColor Gray
Write-Host ""
Write-Host "  # SQSキュー確認" -ForegroundColor Gray
Write-Host "  aws --endpoint-url=http://localhost:4566 sqs list-queues" -ForegroundColor Gray
Write-Host ""
Write-Host "  # DynamoDB確認 (実AWS)" -ForegroundColor Gray
Write-Host "  aws dynamodb list-tables" -ForegroundColor Gray