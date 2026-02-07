$ErrorActionPreference = 'Stop'

$adminHost = $env:ADMIN_HOST
if (-not $adminHost) { $adminHost = '127.0.0.1' }
$adminPort = $env:ADMIN_PORT
if (-not $adminPort) { $adminPort = '3001' }
$botHost = $env:BOT_HEALTH_HOST
if (-not $botHost) { $botHost = '127.0.0.1' }
$botPort = $env:BOT_HEALTH_PORT
if (-not $botPort) { $botPort = '3099' }

$adminReady = "http://$adminHost`:$adminPort/readyz"
$adminVersion = "http://$adminHost`:$adminPort/version"
$botHealth = "http://$botHost`:$botPort/healthz"
$botVersion = "http://$botHost`:$botPort/version"

Write-Host "Admin readyz: $adminReady"
try {
  $r = Invoke-RestMethod -Uri $adminReady -TimeoutSec 5
  Write-Host ($r | ConvertTo-Json -Depth 5)
} catch {
  Write-Host "Admin readyz failed: $($_.Exception.Message)"
}

Write-Host "Admin version: $adminVersion"
try {
  $r = Invoke-RestMethod -Uri $adminVersion -TimeoutSec 5
  Write-Host ($r | ConvertTo-Json -Depth 5)
} catch {
  Write-Host "Admin version failed: $($_.Exception.Message)"
}

Write-Host "Bot healthz: $botHealth"
try {
  $r = Invoke-RestMethod -Uri $botHealth -TimeoutSec 5
  Write-Host ($r | ConvertTo-Json -Depth 5)
} catch {
  Write-Host "Bot healthz failed: $($_.Exception.Message)"
}

Write-Host "Bot version: $botVersion"
try {
  $r = Invoke-RestMethod -Uri $botVersion -TimeoutSec 5
  Write-Host ($r | ConvertTo-Json -Depth 5)
} catch {
  Write-Host "Bot version failed: $($_.Exception.Message)"
}
