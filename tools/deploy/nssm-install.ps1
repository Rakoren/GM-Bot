param(
  [string]$NssmPath,
  [string]$BotService = "mimic-bot",
  [string]$AdminService = "mimic-admin",
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\\..\\..").Path,
  [string]$NodePath,
  [switch]$Start
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

function Resolve-Node {
  if ($NodePath) {
    if (-not (Test-Path $NodePath)) {
      throw "Node not found at $NodePath"
    }
    return (Resolve-Path $NodePath).Path
  }
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Node not found in PATH. Provide -NodePath."
  }
  return $cmd.Source
}

$nssm = Resolve-Nssm
$node = Resolve-Node
$logDir = Join-Path $RepoRoot "logs"
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$botScript = Join-Path $RepoRoot "index.js"
$adminScript = Join-Path $RepoRoot "admin\\server.js"

& $nssm install $BotService $node $botScript
& $nssm set $BotService AppDirectory $RepoRoot
& $nssm set $BotService AppStdout (Join-Path $logDir "bot-service.out.log")
& $nssm set $BotService AppStderr (Join-Path $logDir "bot-service.err.log")
& $nssm set $BotService AppRotateFiles 1
& $nssm set $BotService AppRotateOnline 1
& $nssm set $BotService AppRotateBytes 10485760
& $nssm set $BotService AppExit Default Restart
& $nssm set $BotService AppRestartDelay 5000
& $nssm set $BotService AppEnvironmentExtra "NODE_ENV=production"
& $nssm set $BotService Start SERVICE_AUTO_START

& $nssm install $AdminService $node $adminScript
& $nssm set $AdminService AppDirectory $RepoRoot
& $nssm set $AdminService AppStdout (Join-Path $logDir "admin-service.out.log")
& $nssm set $AdminService AppStderr (Join-Path $logDir "admin-service.err.log")
& $nssm set $AdminService AppRotateFiles 1
& $nssm set $AdminService AppRotateOnline 1
& $nssm set $AdminService AppRotateBytes 10485760
& $nssm set $AdminService AppExit Default Restart
& $nssm set $AdminService AppRestartDelay 5000
& $nssm set $AdminService AppEnvironmentExtra "NODE_ENV=production"
& $nssm set $AdminService Start SERVICE_AUTO_START

if ($Start) {
  & $nssm start $BotService
  & $nssm start $AdminService
}
