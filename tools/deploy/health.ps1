param(
  [string]$AdminBase = "",
  [string]$BotHost = "",
  [int]$BotPort = 0
)

if (-not $AdminBase) {
  $AdminBase = $env:ADMIN_BASE_URL
}
if (-not $AdminBase) {
  $AdminBase = "http://127.0.0.1:3001"
}

if (-not $BotHost) {
  $BotHost = $env:BOT_HEALTH_HOST
}
if (-not $BotHost) {
  $BotHost = "127.0.0.1"
}
if (-not $BotPort -or $BotPort -le 0) {
  $BotPort = [int]($env:BOT_HEALTH_PORT)
}
if (-not $BotPort -or $BotPort -le 0) {
  $BotPort = 3099
}

$adminHealth = "$AdminBase/healthz"
$adminReady = "$AdminBase/readyz"
$botHealth = "http://$BotHost`:$BotPort/healthz"

function Check-Endpoint($url, $label) {
  try {
    $res = Invoke-RestMethod -Uri $url -TimeoutSec 5
    Write-Host "$label OK: $($res | ConvertTo-Json -Compress)"
  } catch {
    Write-Host "$label FAILED: $($_.Exception.Message)"
    exit 1
  }
}

Check-Endpoint $adminHealth "admin health"
Check-Endpoint $adminReady "admin ready"
Check-Endpoint $botHealth "bot health"
