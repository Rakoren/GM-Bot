$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
Write-Host "Starting admin..."
Start-Process -FilePath "npm" -ArgumentList "run", "admin" -WorkingDirectory $root
