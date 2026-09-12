# CLI Traffic Switcher Tool for Blue-Green Platform
param (
    [string]$Mode = "BLUE", # BLUE, GREEN, or CANARY
    [int]$BlueWeight = 100,
    [int]$GreenWeight = 0
)

$Body = @{
    mode = $Mode.ToUpper()
    blueWeight = $BlueWeight
    greenWeight = $GreenWeight
} | ConvertTo-Json

try {
    $Response = Invoke-RestMethod -Uri "http://localhost:8000/proxy/switch" -Method Post -Body $Body -ContentType "application/json"
    Write-Host "Traffic successfully switched to $($Response.routerState.mode)" -ForegroundColor Green
    Write-Host "Blue Weight: $($Response.routerState.blueWeight)%" -ForegroundColor Blue
    Write-Host "Green Weight: $($Response.routerState.greenWeight)%" -ForegroundColor Green
} catch {
    Write-Host "Error connecting to Router Proxy at http://localhost:8000" -ForegroundColor Red
}
