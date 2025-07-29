# AWS DynamoDBテストデータ投入スクリプト
# AI自動応答機能の開発・テスト用

param(
    [Parameter(HelpMessage="DynamoDBテーブルのプレフィックス")]
    [string]$TablePrefix = "dev",
    
    [Parameter(HelpMessage="AWSプロファイル")]
    [string]$AwsProfile = "default",
    
    [Parameter(HelpMessage="テストデータを削除")]
    [switch]$Clean
)

Write-Host "🗄️  AWS DynamoDB テストデータ管理" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# AWS CLI確認
try {
    $awsVersion = aws --version 2>$null
    Write-Host "✅ AWS CLI: $awsVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS CLIが見つかりません。インストールしてください。" -ForegroundColor Red
    exit 1
}

# テーブル名設定
$chatHistoryTable = "ChatHistory-$TablePrefix"
$settingsTable = "ChatbotSettingsDB-$TablePrefix"

Write-Host "📋 対象テーブル:" -ForegroundColor Yellow
Write-Host "  - $chatHistoryTable" -ForegroundColor Gray
Write-Host "  - $settingsTable" -ForegroundColor Gray

if ($AwsProfile -ne "default") {
    Write-Host "🔑 使用プロファイル: $AwsProfile" -ForegroundColor Yellow
    $awsCommand = "aws --profile $AwsProfile"
}
else {
    $awsCommand = "aws"
}

# テーブル存在確認
function Test-DynamoDBTable {
    param([string]$TableName)
    
    try {
        $result = Invoke-Expression "$awsCommand dynamodb describe-table --table-name $TableName 2>$null"
        return $true
    }
    catch {
        return $false
    }
}

Write-Host "🔍 テーブル存在確認..." -ForegroundColor Yellow

$chatHistoryExists = Test-DynamoDBTable $chatHistoryTable
$settingsExists = Test-DynamoDBTable $settingsTable

if ($chatHistoryExists) {
    Write-Host "✅ $chatHistoryTable が見つかりました" -ForegroundColor Green
}
else {
    Write-Host "❌ $chatHistoryTable が見つかりません" -ForegroundColor Red
}

if ($settingsExists) {
    Write-Host "✅ $settingsTable が見つかりました" -ForegroundColor Green
}
else {
    Write-Host "❌ $settingsTable が見つかりません" -ForegroundColor Red
}

if (-not $settingsExists) {
    Write-Host ""
    Write-Host "⚠️  必要なDynamoDBテーブルが見つかりません。" -ForegroundColor Yellow
    Write-Host "   既存のプロジェクトでテーブルを作成するか、" -ForegroundColor Yellow
    Write-Host "   SAM deployを実行してください。" -ForegroundColor Yellow
    exit 1
}

# テストデータ削除
if ($Clean) {
    Write-Host "🗑️  テストデータを削除中..." -ForegroundColor Red
    
    try {
        # テスト用ボット削除
        Invoke-Expression "$awsCommand dynamodb delete-item --table-name $settingsTable --key '{""PK"":{""S"":""BOT#test-bot-001""},""SK"":{""S"":""CONFIG""}}'"
        
        # テスト用ユーザー削除
        Invoke-Expression "$awsCommand dynamodb delete-item --table-name $settingsTable --key '{""PK"":{""S"":""USER#test-user""},""SK"":{""S"":""PROFILE""}}'"
        
        Write-Host "✅ テストデータが削除されました。" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  一部のデータ削除に失敗しました。" -ForegroundColor Yellow
    }
    exit 0
}

# テストデータ投入
Write-Host "📥 テストデータを投入中..." -ForegroundColor Green

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$testDataDir = Join-Path $scriptDir "docker/test-data"

# テスト用ボット設定
$botDataFile = Join-Path $testDataDir "test-bot-data.json"
if (Test-Path $botDataFile) {
    Write-Host "  🤖 テスト用ボットを作成中..." -ForegroundColor Gray
    try {
        Invoke-Expression "$awsCommand dynamodb put-item --table-name $settingsTable --item file://$botDataFile"
        Write-Host "    ✅ BOT#test-bot-001 が作成されました" -ForegroundColor Green
    }
    catch {
        Write-Host "    ⚠️  ボット作成に失敗しました" -ForegroundColor Yellow
    }
}
else {
    Write-Host "    ❌ ボットデータファイルが見つかりません: $botDataFile" -ForegroundColor Red
}

# テスト用ユーザー
$userDataFile = Join-Path $testDataDir "test-user-data.json"
if (Test-Path $userDataFile) {
    Write-Host "  👤 テスト用ユーザーを作成中..." -ForegroundColor Gray
    try {
        Invoke-Expression "$awsCommand dynamodb put-item --table-name $settingsTable --item file://$userDataFile"
        Write-Host "    ✅ USER#test-user が作成されました" -ForegroundColor Green
    }
    catch {
        Write-Host "    ⚠️  ユーザー作成に失敗しました" -ForegroundColor Yellow
    }
}
else {
    Write-Host "    ❌ ユーザーデータファイルが見つかりません: $userDataFile" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 テストデータの投入が完了しました！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 作成されたテストデータ:" -ForegroundColor Cyan
Write-Host "  🤖 ボット: test-bot-001" -ForegroundColor White
Write-Host "     名前: AI開発テストボット" -ForegroundColor Gray
Write-Host "     説明: AI自動応答機能の開発・テスト用ボット" -ForegroundColor Gray
Write-Host ""
Write-Host "  👤 ユーザー: test-user" -ForegroundColor White
Write-Host "     メール: test@example.com" -ForegroundColor Gray
Write-Host "     パスワード: password (SHA-256ハッシュ済み)" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 テスト用ログイン情報:" -ForegroundColor Cyan
Write-Host "  メール: test@example.com" -ForegroundColor White
Write-Host "  パスワード: password" -ForegroundColor White
Write-Host ""
Write-Host "🔍 確認コマンド:" -ForegroundColor Cyan
Write-Host "  $awsCommand dynamodb scan --table-name $settingsTable --filter-expression ""begins_with(PK, :pk)"" --expression-attribute-values '{\"":\""pk\""\":{\""S\""\":{\""BOT#\""}}}'" -ForegroundColor Gray