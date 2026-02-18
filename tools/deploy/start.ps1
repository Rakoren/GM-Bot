param(
  [string]$AdminCommand = "npm run admin",
  [string]$BotCommand = "npm run start"
)

$root = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
$logDir = Join-Path $root "logs"
$pidDir = Join-Path $logDir "pids"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
New-Item -ItemType Directory -Force -Path $pidDir | Out-Null

$adminOut = Join-Path $logDir "admin.out.log"
$adminErr = Join-Path $logDir "admin.err.log"
$botOut = Join-Path $logDir "bot.out.log"
$botErr = Join-Path $logDir "bot.err.log"

$adminProc = Start-Process -FilePath "powershell.exe" -ArgumentList "-Command", $AdminCommand -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $adminOut -RedirectStandardError $adminErr -PassThru
Set-Content -Path (Join-Path $pidDir "admin.pid") -Value $adminProc.Id

$botProc = Start-Process -FilePath "powershell.exe" -ArgumentList "-Command", $BotCommand -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $botOut -RedirectStandardError $botErr -PassThru
Set-Content -Path (Join-Path $pidDir "bot.pid") -Value $botProc.Id

Write-Host "Started admin (PID $($adminProc.Id)) and bot (PID $($botProc.Id))."
