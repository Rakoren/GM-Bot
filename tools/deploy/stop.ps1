param(
  [string]$AdminPidFile = "logs/pids/admin.pid",
  [string]$BotPidFile = "logs/pids/bot.pid"
)

$root = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
$adminPidPath = Join-Path $root $AdminPidFile
$botPidPath = Join-Path $root $BotPidFile

function Stop-ByPidFile($pidPath, $label) {
  if (!(Test-Path $pidPath)) {
    Write-Host "$label PID file not found."
    return
  }
  $pid = Get-Content $pidPath | Select-Object -First 1
  if ($pid -match '^\d+$') {
    Stop-Process -Id $pid -ErrorAction SilentlyContinue
    Write-Host "Stopped $label (PID $pid)."
  }
  Remove-Item -Force -ErrorAction SilentlyContinue $pidPath
}

Stop-ByPidFile $adminPidPath "admin"
Stop-ByPidFile $botPidPath "bot"
