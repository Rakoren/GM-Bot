$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
Write-Host "Starting bot..."
Start-Process -FilePath "npm" -ArgumentList "run", "start" -WorkingDirectory $root
