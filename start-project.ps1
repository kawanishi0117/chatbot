# チャットボットプロジェクト一括起動スクリプト

Write-Host "チャットボットプロジェクトを起動中..." -ForegroundColor Cyan

# 現在のディレクトリを記録
$rootDir = Get-Location

# 1. バックエンドをビルドして起動
Write-Host "バックエンドを起動中..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend\chat-router'; sam build; sam local start-api --port 3003"

# 2秒待機
Start-Sleep -Seconds 2

# 2. フロントエンド Console を起動
Write-Host "Console を起動中..." -ForegroundColor Magenta  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend\chatbot-console'; npm run dev"

# 2秒待機
Start-Sleep -Seconds 2

# 3. フロントエンド UI を起動
Write-Host "UI を起動中..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\frontend\chatbot-ui'; npm run dev -- --port 3001"

Write-Host ""
Write-Host "起動完了！" -ForegroundColor Green
Write-Host "Console: http://localhost:3000" -ForegroundColor Magenta
Write-Host "UI:      http://localhost:3001" -ForegroundColor Blue
Write-Host "API:     http://localhost:3003" -ForegroundColor Green
Write-Host ""
Write-Host "各サービスを停止するには、各ウィンドウでCtrl+Cを押してください。" -ForegroundColor Yellow 