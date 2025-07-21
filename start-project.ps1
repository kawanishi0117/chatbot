# Lambda Docker Environment Startup Script
# PowerShell用起動スクリプト

param(
    [switch]$Test,
    [switch]$Clean,
    [switch]$Stop,
    [switch]$Logs,
    [switch]$Docker  # Docker Composeを使用するためのオプションを追加
)

# カラー出力用の関数
function Write-ColorText {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

# プロジェクトのルートディレクトリに移動
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptPath

Write-ColorText "🚀 Lambda Docker Environment Manager" "Cyan"
Write-ColorText "=====================================" "Cyan"

# Docker環境の確認
Write-ColorText "🔍 Checking Docker environment..." "Yellow"
try {
    $dockerVersion = docker --version
    Write-ColorText "✅ Docker found: $dockerVersion" "Green"
} catch {
    Write-ColorText "❌ Docker not found. Please install Docker Desktop." "Red"
    exit 1
}

# SAM CLI環境の確認 (Dockerオプションが指定されていない場合のみ)
if (-not $Docker) {
    Write-ColorText "🔍 Checking SAM CLI environment..." "Yellow"
    try {
        $samVersion = sam --version
        Write-ColorText "✅ SAM CLI found: $samVersion" "Green"
    } catch {
        Write-ColorText "❌ SAM CLI not found. Will use Docker Compose instead." "Yellow"
        $Docker = $true
    }
}

# 各種オプションの処理
if ($Stop) {
    Write-ColorText "🛑 Stopping environments..." "Yellow"
    
    # SAMローカルAPIプロセスを停止
    Get-Process -Name "sam" -ErrorAction SilentlyContinue | Stop-Process -Force
    # Docker containers も停止
    docker stop $(docker ps -q --filter "label=lambda-local") 2>$null
    # Docker Compose停止
    Set-Location backend/chat-router
    docker-compose down
    Set-Location ../..
    
    Write-ColorText "✅ All environments stopped" "Green"
    exit 0
}

if ($Clean) {
    Write-ColorText "🧹 Cleaning up resources..." "Yellow"
    # SAMプロセス停止
    Get-Process -Name "sam" -ErrorAction SilentlyContinue | Stop-Process -Force
    # SAMビルドキャッシュクリア
    if (Test-Path ".aws-sam") {
        Remove-Item -Recurse -Force ".aws-sam"
        Write-ColorText "🗑️ Removed .aws-sam directory" "Green"
    }
    # Docker cleanup
    docker stop $(docker ps -q --filter "label=lambda-local") 2>$null
    # Docker Compose停止とクリーンアップ
    Set-Location backend/chat-router
    docker-compose down -v
    Set-Location ../..
    docker system prune -f
    Write-ColorText "✅ Cleanup completed" "Green"
    exit 0
}

if ($Logs) {
    Write-ColorText "📋 Showing logs..." "Yellow"
    if ($Docker) {
        Set-Location backend/chat-router
        docker-compose logs -f
        Set-Location ../..
    } else {
        Write-ColorText "💡 SAM local logs are shown in the terminal where sam local start-api is running" "Yellow"
        Write-ColorText "💡 Lambda function logs appear in real-time during API calls" "Yellow"
    }
    exit 0
}

# Docker Compose 使用モード
if ($Docker) {
    Write-ColorText "🐳 Using Docker Compose environment..." "Cyan"
    Write-ColorText "🏗️ Building Docker images..." "Yellow"
    
    try {
        Set-Location backend/chat-router
        docker-compose build
        
        Write-ColorText "🚀 Starting Docker Compose environment..." "Yellow"
        docker-compose up -d
        
        Write-ColorText "⏳ Waiting for API to be ready..." "Yellow"
        $maxAttempts = 10
        $attempt = 0
        $apiReady = $false
        
        while ($attempt -lt $maxAttempts -and -not $apiReady) {
            try {
                $response = docker-compose ps
                if ($response -match "running") {
                    $apiReady = $true
                    Write-ColorText "✅ Docker Lambda environment is ready" "Green"
                }
            } catch {
                $attempt++
                Start-Sleep -Seconds 2
            }
        }
        
        Write-ColorText "" ""
        Write-ColorText "📡 Lambda Docker Endpoint Information:" "Cyan"
        Write-ColorText "─────────────────────────────────────" "Cyan"
        Write-ColorText "Lambda Invoke URL: http://localhost:9000/2015-03-31/functions/function/invocations" "White"
        Write-ColorText "Health Check: POST to above URL with body: {\"path\": \"/health\", \"httpMethod\": \"GET\"}" "White"
        Write-ColorText "Test Endpoint: POST to above URL with body: {\"path\": \"/test\", \"httpMethod\": \"GET\"}" "White"
        Write-ColorText "" ""
        
        # テストの実行
        if ($Test) {
            Write-ColorText "🧪 Running Docker integration tests..." "Yellow"
            
            # テスト用環境変数を設定
            $env:DOCKER_LAMBDA_URL = "http://localhost:9000/2015-03-31/functions/function/invocations"
            
            # テストコードがあれば実行
            if (Test-Path "test_docker_local.py") {
                python test_docker_local.py
            } else {
                Write-ColorText "Running basic endpoint tests..." "Yellow"
                try {
                    $payload = @{
                        path = "/health"
                        httpMethod = "GET"
                    } | ConvertTo-Json
                    
                    $healthResponse = Invoke-RestMethod -Uri "http://localhost:9000/2015-03-31/functions/function/invocations" -Method POST -Body $payload -ContentType "application/json"
                    Write-ColorText "✅ Health check passed" "Green"
                    
                    $payload = @{
                        path = "/test"
                        httpMethod = "GET"
                    } | ConvertTo-Json
                    
                    $testResponse = Invoke-RestMethod -Uri "http://localhost:9000/2015-03-31/functions/function/invocations" -Method POST -Body $payload -ContentType "application/json"
                    Write-ColorText "✅ Test endpoint passed" "Green"
                    
                    Write-ColorText "✅ All basic tests passed!" "Green"
                } catch {
                    Write-ColorText "❌ Some tests failed: $_" "Red"
                }
            }
        } else {
            Write-ColorText "💡 Tips:" "Cyan"
            Write-ColorText "  • Run tests: .\start-project.ps1 -Docker -Test" "White"
            Write-ColorText "  • View logs: .\start-project.ps1 -Docker -Logs" "White"
            Write-ColorText "  • Stop containers: .\start-project.ps1 -Stop" "White"
            Write-ColorText "  • Clean up: .\start-project.ps1 -Clean" "White"
            Write-ColorText "  • Manual testing: Use the endpoints shown above" "White"
        }
        
        Set-Location ../..
        Write-ColorText "" ""
        Write-ColorText "🎉 Docker environment is ready!" "Green"
        Write-ColorText "Docker containers will continue running in the background." "White"
        
    } catch {
        Set-Location $ScriptPath
        Write-ColorText "❌ Error occurred: $_" "Red"
        exit 1
    }
    
    exit 0
}

# メインSAM起動処理
Write-ColorText "🏗️ Building SAM application..." "Yellow"

try {
    # SAM build
    sam build --parallel
    if ($LASTEXITCODE -ne 0) {
        throw "SAM build failed"
    }
    Write-ColorText "✅ SAM build completed successfully" "Green"

    # SAM local API の起動
    Write-ColorText "🚀 Starting SAM local API..." "Yellow"
    Write-ColorText "💡 SAM local API will start on http://localhost:3000" "Yellow"
    
    # バックグラウンドでSAM local start-apiを実行
    $samJob = Start-Job -ScriptBlock {
        sam local start-api --host 0.0.0.0 --port 3000
    }
    
    Write-ColorText "✅ SAM local API started in background (Job ID: $($samJob.Id))" "Green"

    # APIの起動待ち
    Write-ColorText "⏳ Waiting for API to be ready..." "Yellow"
    $maxAttempts = 30
    $attempt = 0
    $apiReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $apiReady) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                $apiReady = $true
                Write-ColorText "✅ SAM local API is ready and responding" "Green"
            }
        } catch {
            $attempt++
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $apiReady) {
        Write-ColorText "⚠️ API health check failed, but continuing (may need a few more seconds)" "Yellow"
    }

    # エンドポイント情報の表示
    Write-ColorText "" ""
    Write-ColorText "📡 SAM Local API Endpoint Information:" "Cyan"
    Write-ColorText "─────────────────────────────────────" "Cyan"
    Write-ColorText "Base URL: http://localhost:3000" "White"
    Write-ColorText "Health Check: http://localhost:3000/health" "White"
    Write-ColorText "Test Endpoint: http://localhost:3000/test" "White"
    Write-ColorText "Slack Webhook: http://localhost:3000/webhook/slack" "White"
    Write-ColorText "LINE Webhook: http://localhost:3000/webhook/line" "White"
    Write-ColorText "Teams Webhook: http://localhost:3000/webhook/teams" "White"
    Write-ColorText "" ""

    # テストの実行
    if ($Test) {
        Write-ColorText "🧪 Running integration tests..." "Yellow"
        # SAM用のテストスクリプトを実行
        Set-Location backend/chat-router
        
        # テスト用環境変数を設定
        $env:SAM_LOCAL_URL = "http://localhost:3000"
        
        # SAM用テストスクリプトがある場合は実行、なければcurlでテスト
        if (Test-Path "test_sam_local.py") {
            python test_sam_local.py
        } else {
            Write-ColorText "Running basic endpoint tests..." "Yellow"
            try {
                $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
                Write-ColorText "✅ Health check passed" "Green"
                
                $testResponse = Invoke-RestMethod -Uri "http://localhost:3000/test" -Method GET
                Write-ColorText "✅ Test endpoint passed" "Green"
                
                Write-ColorText "✅ All basic tests passed!" "Green"
            } catch {
                Write-ColorText "❌ Some tests failed: $_" "Red"
            }
        }
        Set-Location ../..
    } else {
        Write-ColorText "💡 Tips:" "Cyan"
        Write-ColorText "  • Run tests: .\start-project.ps1 -Test" "White"
        Write-ColorText "  • View logs: SAM logs appear in real-time in the terminal" "White"
        Write-ColorText "  • Stop SAM: .\start-project.ps1 -Stop" "White"
        Write-ColorText "  • Clean up: .\start-project.ps1 -Clean" "White"
        Write-ColorText "  • Use Docker: .\start-project.ps1 -Docker" "White"
        Write-ColorText "  • Manual testing: Use the endpoints shown above" "White"
    }

    Write-ColorText "" ""
    Write-ColorText "🎉 SAM local environment is ready!" "Green"
    Write-ColorText "API will continue running in the background." "White"
    Write-ColorText "💡 Press Ctrl+C in the SAM terminal to stop the API" "Yellow"

} catch {
    Write-ColorText "❌ Error occurred: $_" "Red"
    Write-ColorText "📋 Check SAM build output above for details" "Yellow"
    Write-ColorText "💡 Try using Docker mode: .\start-project.ps1 -Docker" "Yellow"
    exit 1
}