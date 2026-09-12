# Blue-Green & Canary Deployment Orchestrator - One-Click Launcher for Windows
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " STARTING ENTERPRISE BLUE-GREEN DEPLOYMENT PLATFORM ON LOCALHOST" -ForegroundColor BrightWhite
Write-Host "=================================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent $ScriptDir

Set-Location $RootDir

Write-Host "`n[1/3] Launching Blue Service (v1.0.0 - Port 8081)..." -ForegroundColor Blue
$BlueJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    node server.js
} -ArgumentList (Join-Path $RootDir "blue-service")

Write-Host "[2/3] Launching Green Service (v2.0.0 - Port 8082)..." -ForegroundColor Green
$GreenJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    node server.js
} -ArgumentList (Join-Path $RootDir "green-service")

Start-Sleep -Seconds 1

Write-Host "[3/3] Launching Smart Router & Control Dashboard (Port 8000)..." -ForegroundColor Cyan
$ProxyJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    node router.js
} -ArgumentList (Join-Path $RootDir "proxy")

Start-Sleep -Seconds 2

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host " ALL SERVICES STARTED SUCCESSFULLY!" -ForegroundColor BrightWhite
Write-Host "=================================================================" -ForegroundColor Green
Write-Host " -> Access Visual Dashboard at: http://localhost:8000" -ForegroundColor BrightYellow
Write-Host " -> Blue Direct Endpoint:       http://localhost:8081/health" -ForegroundColor Blue
Write-Host " -> Green Direct Endpoint:      http://localhost:8082/health" -ForegroundColor Green
Write-Host " -> Router API Endpoint:        http://localhost:8000/api/data" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Press Ctrl+C or run 'Stop-Job *' in PowerShell to stop background jobs." -ForegroundColor Gray
