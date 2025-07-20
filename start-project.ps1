# Lambda Docker Environment Startup Script
# PowerShell用起動スクリプト

param(
    [switch]$Test,
    [switch]$Clean,
    [switch]$Stop,
    [switch]$Logs
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

# SAM CLI環境の確認
Write-ColorText "🔍 Checking SAM CLI environment..." "Yellow"
try {
    $samVersion = sam --version
    Write-ColorText "✅ SAM CLI found: $samVersion" "Green"
} catch {
    Write-ColorText "❌ SAM CLI not found. Please install SAM CLI." "Red"
    Write-ColorText "Install from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html" "Yellow"
    exit 1
}

# 各種オプションの処理
if ($Stop) {
    Write-ColorText "🛑 Stopping SAM local API..." "Yellow"
    # SAMローカルAPIプロセスを停止
    Get-Process -Name "sam" -ErrorAction SilentlyContinue | Stop-Process -Force
    # Docker containers も停止
    docker stop $(docker ps -q --filter "label=lambda-local") 2>$null
    Write-ColorText "✅ SAM local environment stopped" "Green"
    exit 0
}

if ($Clean) {
    Write-ColorText "🧹 Cleaning up SAM and Docker resources..." "Yellow"
    # SAMプロセス停止
    Get-Process -Name "sam" -ErrorAction SilentlyContinue | Stop-Process -Force
    # SAMビルドキャッシュクリア
    if (Test-Path ".aws-sam") {
        Remove-Item -Recurse -Force ".aws-sam"
        Write-ColorText "🗑️ Removed .aws-sam directory" "Green"
    }
    # Docker cleanup
    docker stop $(docker ps -q --filter "label=lambda-local") 2>$null
    docker system prune -f
    Write-ColorText "✅ Cleanup completed" "Green"
    exit 0
}

if ($Logs) {
    Write-ColorText "📋 Showing SAM local logs..." "Yellow"
    Write-ColorText "💡 SAM local logs are shown in the terminal where sam local start-api is running" "Yellow"
    Write-ColorText "💡 Lambda function logs appear in real-time during API calls" "Yellow"
    exit 0
}

# メイン起動処理
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
        Write-ColorText "  • Manual testing: Use the endpoints shown above" "White"
    }

    Write-ColorText "" ""
    Write-ColorText "🎉 SAM local environment is ready!" "Green"
    Write-ColorText "API will continue running in the background." "White"
    Write-ColorText "💡 Press Ctrl+C in the SAM terminal to stop the API" "Yellow"

} catch {
    Write-ColorText "❌ Error occurred: $_" "Red"
    Write-ColorText "📋 Check SAM build output above for details" "Yellow"
    Write-ColorText "💡 Try: sam build --parallel" "Yellow"
    exit 1
}