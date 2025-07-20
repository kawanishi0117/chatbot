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

# 各種オプションの処理
if ($Stop) {
    Write-ColorText "🛑 Stopping Lambda containers..." "Yellow"
    docker-compose -f backend/api-gateway/docker-compose.yml down
    Write-ColorText "✅ Containers stopped" "Green"
    exit 0
}

if ($Clean) {
    Write-ColorText "🧹 Cleaning up Docker resources..." "Yellow"
    docker-compose -f backend/api-gateway/docker-compose.yml down --volumes --remove-orphans
    docker system prune -f
    Write-ColorText "✅ Cleanup completed" "Green"
    exit 0
}

if ($Logs) {
    Write-ColorText "📋 Showing container logs..." "Yellow"
    docker-compose -f backend/api-gateway/docker-compose.yml logs -f
    exit 0
}

# メイン起動処理
Write-ColorText "🏗️ Building Lambda container..." "Yellow"
Set-Location backend/api-gateway

try {
    # Docker イメージのビルド
    docker-compose build
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed"
    }
    Write-ColorText "✅ Build completed successfully" "Green"

    # コンテナの起動
    Write-ColorText "🚀 Starting Lambda container..." "Yellow"
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) {
        throw "Container startup failed"
    }
    Write-ColorText "✅ Container started successfully" "Green"

    # コンテナの起動待ち
    Write-ColorText "⏳ Waiting for container to be ready..." "Yellow"
    Start-Sleep -Seconds 10

    # コンテナのステータス確認
    $containerStatus = docker-compose ps --services --filter "status=running"
    if ($containerStatus -match "lambda-function") {
        Write-ColorText "✅ Lambda container is running" "Green"
    } else {
        Write-ColorText "❌ Lambda container failed to start" "Red"
        docker-compose logs
        exit 1
    }

    # エンドポイント情報の表示
    Write-ColorText "" ""
    Write-ColorText "📡 Lambda Endpoint Information:" "Cyan"
    Write-ColorText "─────────────────────────────────" "Cyan"
    Write-ColorText "Local Lambda URL: http://localhost:9000/2015-03-31/functions/function/invocations" "White"
    Write-ColorText "Container Name: lambda-api-gateway" "White"
    Write-ColorText "" ""

    # テストの実行
    if ($Test) {
        Write-ColorText "🧪 Running integration tests..." "Yellow"
        python test_lambda.py
        if ($LASTEXITCODE -eq 0) {
            Write-ColorText "✅ All tests passed!" "Green"
        } else {
            Write-ColorText "❌ Some tests failed!" "Red"
        }
    } else {
        Write-ColorText "💡 Tips:" "Cyan"
        Write-ColorText "  • Run tests: .\start-project.ps1 -Test" "White"
        Write-ColorText "  • View logs: .\start-project.ps1 -Logs" "White"
        Write-ColorText "  • Stop containers: .\start-project.ps1 -Stop" "White"
        Write-ColorText "  • Clean up: .\start-project.ps1 -Clean" "White"
    }

    Write-ColorText "" ""
    Write-ColorText "🎉 Lambda environment is ready!" "Green"
    Write-ColorText "Container will continue running in the background." "White"

} catch {
    Write-ColorText "❌ Error occurred: $_" "Red"
    Write-ColorText "📋 Showing container logs for debugging:" "Yellow"
    docker-compose logs
    exit 1
} finally {
    Set-Location ../..
}