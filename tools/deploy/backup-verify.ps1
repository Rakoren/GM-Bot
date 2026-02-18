param(
  [string]$VerifyCommand = "node tools/verify-backups.mjs"
)

$root = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
Push-Location $root
try {
  Write-Host "Verifying backups..."
  powershell.exe -Command $VerifyCommand
} finally {
  Pop-Location
}
