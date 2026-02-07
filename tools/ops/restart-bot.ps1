$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
Write-Host "Stopping bot..."
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -like "*Discord-DM-Bot*"
} | ForEach-Object { $_.Kill() }
Start-Sleep -Seconds 1
Write-Host "Starting bot..."
Start-Process -FilePath "npm" -ArgumentList "run", "start" -WorkingDirectory $root
