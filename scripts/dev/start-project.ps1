# Chatbot Project Startup Script
param(
    [switch]$Test,
    [switch]$Clean,
    [switch]$WithAI
)

Write-Host "Chatbot project starting..." -ForegroundColor Green

# Start Docker environment if AI features are enabled
if ($WithAI) {
    Write-Host "Starting Docker environment for AI auto-response..." -ForegroundColor Yellow
    try {
        # Check Docker environment
        $dockerVersion = docker --version 2>$null
        if (-not $dockerVersion) {
            Write-Host "Docker not found. Please install Docker Desktop." -ForegroundColor Red
            Write-Host "Continuing without AI features..." -ForegroundColor Yellow
        } else {
            # Start LocalStack (for SQS/Lambda)
            Write-Host "Starting LocalStack..." -ForegroundColor Yellow
            docker compose -f docker-compose.local.yml up -d localstack
            Write-Host "LocalStack (SQS/Lambda environment) started" -ForegroundColor Green
            
            # Wait for initialization
            Write-Host "Waiting for LocalStack initialization..." -ForegroundColor Yellow
            Start-Sleep -Seconds 15
            
            # Run initialization script if it exists
            if (Test-Path "docker/scripts/init-ai-services.sh") {
                Write-Host "Initializing AI environment..." -ForegroundColor Yellow
                docker compose -f docker-compose.local.yml run --rm aws-cli sh /scripts/init-ai-services.sh
            }
        }
    } catch {
        Write-Host "Failed to start Docker environment: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Continuing without AI features..." -ForegroundColor Yellow
    }
}

# Clean build
if ($Clean) {
    Write-Host "Running clean build..." -ForegroundColor Yellow
    Push-Location "backend/chat-router"
    Write-Host "Stopping any running processes that might lock files..." -ForegroundColor Yellow
    Get-Process -Name "python*" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*sam*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Remove-Item -Recurse -Force ".aws-sam" -ErrorAction SilentlyContinue
    sam build --parallel
    Pop-Location
}

# Start backend (SAM)
Write-Host "Starting backend..." -ForegroundColor Yellow
if ($WithAI) {
    # Set environment variables for AI features and start SAM
    # LocalStack用のSQSエンドポイントのみ設定、AWS認証は既存のプロファイルを使用
    $backendScript = @"
cd backend/chat-router
Write-Host "Cleaning build directory..." -ForegroundColor Yellow
Remove-Item -Recurse -Force ".aws-sam" -ErrorAction SilentlyContinue
Set-Item -Path Env:SQS_ENDPOINT_URL -Value "http://localhost:4566"
Write-Host "SQS_ENDPOINT_URL set to: `$env:SQS_ENDPOINT_URL" -ForegroundColor Green
sam build --parallel
sam local start-api --host 0.0.0.0 --port 3000
"@
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $backendScript -WindowStyle Normal
} else {
    $backendScript = 'cd backend/chat-router; sam build --parallel; sam local start-api --host 0.0.0.0 --port 3000'
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $backendScript -WindowStyle Normal
}

# Wait 2 seconds
Start-Sleep -Seconds 2

# Start frontend 1 (chatbot-console)
Write-Host "Starting frontend (chatbot-console)..." -ForegroundColor Yellow
$consoleScript = 'cd frontend/chatbot-console; npm run dev'
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $consoleScript -WindowStyle Normal

# Wait 2 seconds
Start-Sleep -Seconds 2

# Start frontend 2 (chatbot-ui)
Write-Host "Starting frontend (chatbot-ui)..." -ForegroundColor Yellow
$uiScript = 'cd frontend/chatbot-ui; npm run dev'
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $uiScript -WindowStyle Normal

Write-Host "All services have been started. Check the status in each window." -ForegroundColor Green

if ($WithAI) {
    Write-Host "" -ForegroundColor White
    Write-Host "[AI Auto-Response Features] ENABLED" -ForegroundColor Cyan
    Write-Host "  - LocalStack SQS: http://localhost:4566" -ForegroundColor Gray
    Write-Host "  - AI processing Lambda functions are also running" -ForegroundColor Gray
    Write-Host "" -ForegroundColor White
}

Write-Host "Access URLs:" -ForegroundColor White
Write-Host "  - Backend API: http://localhost:3000" -ForegroundColor Gray
Write-Host "  - Chat UI: http://localhost:5173" -ForegroundColor Gray  
Write-Host "  - Admin Console: http://localhost:5174" -ForegroundColor Gray
Write-Host "" -ForegroundColor White
Write-Host "Press Ctrl+C in each window to stop services." -ForegroundColor Cyan

if ($Test) {
    Write-Host "" -ForegroundColor White
    Write-Host "Test mode startup completed." -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor White
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  .\start-project.ps1              # Normal startup" -ForegroundColor Gray
Write-Host "  .\start-project.ps1 -WithAI      # Startup with AI features" -ForegroundColor Gray
Write-Host "  .\start-project.ps1 -Clean       # Clean build" -ForegroundColor Gray
Write-Host "  .\start-project.ps1 -Clean -WithAI # Clean build + AI features" -ForegroundColor Gray