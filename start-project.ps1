# チャットボットプロジェクト起動スクリプト
Write-Host "チャットボットプロジェクトを起動しています..." -ForegroundColor Green

# バックエンド起動 (SAM)
Write-Host "バックエンドを起動中..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd backend/chat-router; sam build; sam local start-api" -WindowStyle Normal

# フロントエンド1起動 (chatbot-console)
Write-Host "フロントエンド (chatbot-console) を起動中..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd frontend/chatbot-console; npm run dev" -WindowStyle Normal

# フロントエンド2起動 (chatbot-ui)
Write-Host "フロントエンド (chatbot-ui) を起動中..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd frontend/chatbot-ui; npm run dev" -WindowStyle Normal

Write-Host "すべてのサービスが起動されました。各ウィンドウでサービスの状態を確認してください。" -ForegroundColor Green
Write-Host "終了するには各ウィンドウでCtrl+Cを押してください。" -ForegroundColor Cyan
