$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
Write-Host "Stopping admin..."
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -like "*Discord-DM-Bot*"
} | ForEach-Object { $_.Kill() }
Start-Sleep -Seconds 1
Write-Host "Starting admin..."
Start-Process -FilePath "npm" -ArgumentList "run", "admin" -WorkingDirectory $root
