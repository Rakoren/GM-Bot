param(
  [string]$NssmPath,
  [string]$BotService = "mimic-bot",
  [string]$AdminService = "mimic-admin"
)

function Resolve-Nssm {
  if ($NssmPath) {
    if (-not (Test-Path $NssmPath)) {
      throw "NSSM not found at $NssmPath"
    }
    return (Resolve-Path $NssmPath).Path
  }
  $cmd = Get-Command nssm -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "NSSM not found in PATH. Provide -NssmPath."
  }
  return $cmd.Source
}

$nssm = Resolve-Nssm

& $nssm stop $BotService
& $nssm stop $AdminService
& $nssm remove $BotService confirm
& $nssm remove $AdminService confirm
