# Chatbot Project Shutdown Script
param(
    [switch]$Force
)

Write-Host "Chatbot project shutdown starting..." -ForegroundColor Yellow

# Docker環境を停止
Write-Host "Stopping Docker services..." -ForegroundColor Yellow
try {
    # LocalStackやその他のDockerサービスを停止
    $dockerComposeExists = Test-Path "docker-compose.local.yml"
    if ($dockerComposeExists) {
        Write-Host "Stopping LocalStack and other Docker services..." -ForegroundColor Yellow
        docker compose -f docker-compose.local.yml down
        
        if ($Force) {
            Write-Host "Force cleanup: removing volumes and orphaned containers..." -ForegroundColor Yellow
            docker compose -f docker-compose.local.yml down --volumes --remove-orphans
        }
    }
    
    # 個別のSAM開発コンテナがあれば停止
    $samContainers = docker ps --filter "name=chatbot-sam" --format "{{.Names}}" 2>$null
    if ($samContainers) {
        Write-Host "Stopping SAM development containers..." -ForegroundColor Yellow
        docker stop $samContainers 2>$null
        if ($Force) {
            Write-Host "Removing SAM containers..." -ForegroundColor Yellow
            docker rm $samContainers 2>$null
        }
    }
    
    Write-Host "Docker services stopped successfully" -ForegroundColor Green
} catch {
    Write-Host "Error stopping Docker services: $($_.Exception.Message)" -ForegroundColor Red
}

# PowerShellプロセスを特定して終了
Write-Host "Stopping development processes..." -ForegroundColor Yellow

# フロントエンド開発サーバーを停止 (npm run dev)
$frontendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
    $_.CommandLine -like "*npm*dev*" -or 
    $_.CommandLine -like "*vite*" -or
    $_.CommandLine -like "*chatbot-console*" -or
    $_.CommandLine -like "*chatbot-ui*"
}

if ($frontendProcesses) {
    Write-Host "Stopping frontend development servers..." -ForegroundColor Yellow
    $frontendProcesses | ForEach-Object {
        try {
            Write-Host "  Stopping process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "    Failed to stop process $($_.Id): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# SAM Local APIを停止
$samProcesses = Get-Process -Name "sam" -ErrorAction SilentlyContinue
$pythonSamProcesses = Get-Process -Name "python*" -ErrorAction SilentlyContinue | Where-Object { 
    $_.CommandLine -like "*sam*local*start-api*" -or
    $_.CommandLine -like "*chalice*" -or
    $_.CommandLine -like "*lambda*"
}

$allSamProcesses = @()
if ($samProcesses) { $allSamProcesses += $samProcesses }
if ($pythonSamProcesses) { $allSamProcesses += $pythonSamProcesses }

if ($allSamProcesses) {
    Write-Host "Stopping SAM Local API servers..." -ForegroundColor Yellow
    $allSamProcesses | ForEach-Object {
        try {
            Write-Host "  Stopping process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "    Failed to stop process $($_.Id): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# 開発用PowerShellウィンドウを検索・終了
Write-Host "Checking for development PowerShell windows..." -ForegroundColor Yellow

# 特定のタイトルや引数でPowerShellプロセスを特定
$devPowershellProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*chatbot*" -or
    $_.CommandLine -like "*npm run dev*" -or
    $_.CommandLine -like "*sam local start-api*" -or
    $_.CommandLine -like "*sam build*"
}

if ($devPowershellProcesses) {
    Write-Host "Found development PowerShell processes. Terminating..." -ForegroundColor Yellow
    $devPowershellProcesses | ForEach-Object {
        try {
            # 現在のスクリプトを実行しているプロセスは除外
            if ($_.Id -ne $PID) {
                Write-Host "  Stopping PowerShell process: PID $($_.Id)" -ForegroundColor Gray
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "    Failed to stop PowerShell process $($_.Id): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# ポート使用状況をチェック
Write-Host "Checking port usage..." -ForegroundColor Yellow
$ports = @(3000, 5173, 5174, 4566)
foreach ($port in $ports) {
    try {
        $portProcess = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($portProcess) {
            Write-Host "  Port $port is still in use by PID: $($portProcess.OwningProcess)" -ForegroundColor Red
            if ($Force) {
                $processToKill = Get-Process -Id $portProcess.OwningProcess -ErrorAction SilentlyContinue
                if ($processToKill) {
                    Write-Host "    Force stopping process using port $port..." -ForegroundColor Yellow
                    Stop-Process -Id $processToKill.Id -Force -ErrorAction SilentlyContinue
                }
            }
        } else {
            Write-Host "  Port $port is available" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Could not check port $port status" -ForegroundColor Gray
    }
}

Write-Host "" -ForegroundColor White
Write-Host "✅ Chatbot project shutdown completed!" -ForegroundColor Green
Write-Host "" -ForegroundColor White

if ($Force) {
    Write-Host "🧹 Force cleanup performed:" -ForegroundColor Cyan
    Write-Host "  - Docker volumes removed" -ForegroundColor Gray
    Write-Host "  - Orphaned containers removed" -ForegroundColor Gray
    Write-Host "  - Processes forcefully terminated" -ForegroundColor Gray
} else {
    Write-Host "💡 Tips:" -ForegroundColor Cyan
    Write-Host "  - Use -Force flag for complete cleanup: .\stop-project.ps1 -Force" -ForegroundColor Gray
    Write-Host "  - Check remaining processes: Get-Process -Name 'node','python','powershell'" -ForegroundColor Gray
    Write-Host "  - Check port usage: Get-NetTCPConnection -LocalPort 3000,5173,5174,4566" -ForegroundColor Gray
}

Write-Host "" -ForegroundColor White
Write-Host "Usage examples:" -ForegroundColor Cyan
Write-Host "  .\stop-project.ps1           # Normal shutdown" -ForegroundColor Gray
Write-Host "  .\stop-project.ps1 -Force    # Force cleanup with volumes" -ForegroundColor Gray