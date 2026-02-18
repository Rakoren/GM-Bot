param(
  [string]$AdminCommand = "npm run admin",
  [string]$BotCommand = "npm run start"
)

$root = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
& (Join-Path $PSScriptRoot "stop.ps1")
Start-Sleep -Seconds 1
& (Join-Path $PSScriptRoot "start.ps1") -AdminCommand $AdminCommand -BotCommand $BotCommand
