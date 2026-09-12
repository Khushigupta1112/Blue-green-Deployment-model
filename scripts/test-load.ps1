# Automated Zero-Downtime Deployment Verifier
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " STARTING AUTOMATED ZERO-DOWNTIME TRAFFIC SWITCH TEST" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

$SuccessCount = 0
$ErrorCount = 0
$BlueCount = 0
$GreenCount = 0
$TotalRequests = 50

Write-Host "Sending $TotalRequests continuous requests to Proxy while switching traffic..." -ForegroundColor Yellow

for ($i = 1; $i -le $TotalRequests; $i++) {
    if ($i -eq 15) {
        Write-Host "`n>>> [TRIGGERING CANARY SWITCH (80% Blue / 20% Green)] <<<" -ForegroundColor Yellow
        Invoke-RestMethod -Uri "http://localhost:8000/proxy/switch" -Method Post -Body '{"mode":"CANARY","blueWeight":80,"greenWeight":20}' -ContentType "application/json" | Out-Null
    }
    elseif ($i -eq 30) {
        Write-Host "`n>>> [PROMOTING TO 100% GREEN RELEASE] <<<" -ForegroundColor Green
        Invoke-RestMethod -Uri "http://localhost:8000/proxy/switch" -Method Post -Body '{"mode":"GREEN","blueWeight":0,"greenWeight":100}' -ContentType "application/json" | Out-Null
    }

    try {
        $res = Invoke-RestMethod -Uri "http://localhost:8000/api/data" -Method Get -TimeoutSec 2
        $SuccessCount++
        if ($res.environment -eq "Blue") { $BlueCount++ }
        if ($res.environment -eq "Green") { $GreenCount++ }
        Write-Host "Req #$($i): Status 200 OK | Served by: $($res.environment) ($($res.version))" -ForegroundColor Gray
    } catch {
        $ErrorCount++
        Write-Host "Req #$($i): FAILED!" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 50
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " ZERO-DOWNTIME TEST RESULTS SUMMARY" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Total Requests Sent: $TotalRequests" -ForegroundColor White
Write-Host "Successful (200 OK): $SuccessCount" -ForegroundColor Green
Write-Host "Failed Requests:     $ErrorCount" -ForegroundColor Red
Write-Host "Blue (v1.0.0) Count: $BlueCount" -ForegroundColor Blue
Write-Host "Green (v2.0.0) Count:$GreenCount" -ForegroundColor Green
$Availability = [math]::Round(($SuccessCount / $TotalRequests) * 100, 2)
Write-Host "System Availability: $Availability%" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
