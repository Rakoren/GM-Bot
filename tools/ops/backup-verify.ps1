$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$backupDir = $env:BACKUP_DIR
if (-not $backupDir) { $backupDir = Join-Path $root 'data\\backups' }

if (-not (Test-Path $backupDir)) {
  Write-Host "Backup dir missing: $backupDir"
  exit 1
}

$files = Get-ChildItem -Path $backupDir -Filter "*.sqlite" | Sort-Object LastWriteTime -Descending
if ($files.Count -eq 0) {
  Write-Host "No backups found in $backupDir"
  exit 1
}

$latest = $files[0]
Write-Host "Latest backup: $($latest.FullName)"
Write-Host "Last write: $($latest.LastWriteTime)"
Write-Host "Size: $([Math]::Round($latest.Length / 1MB, 2)) MB"
