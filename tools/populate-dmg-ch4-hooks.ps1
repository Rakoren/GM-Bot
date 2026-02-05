$raw = Get-Content -Path "docs/dmg-2024/chapter-04/chapter-04.raw.txt"

function Get-Block($startPattern, $endPattern) {
  $startIdx = ($raw | Select-String -Pattern $startPattern | Select-Object -First 1).LineNumber
  if (-not $startIdx) { return @() }
  $startIdx = $startIdx - 1
  $endIdx = ($raw | Select-String -Pattern $endPattern | Select-Object -First 1).LineNumber
  if (-not $endIdx) { $endIdx = $raw.Length }
  $endIdx = $endIdx - 2
  if ($endIdx -lt $startIdx) { $endIdx = $raw.Length - 1 }
  return $raw[$startIdx..$endIdx]
}

function Parse-Table($lines) {
  $entries = @()
  $current = $null
  foreach ($line in $lines) {
    $t = $line.Trim()
    if ($t -eq '' -or $t -match '^P\d+' -or $t -match '^--') { continue }
    if ($t -match '^(\d+)\s+(.+)$') {
      if ($current) { $entries += $current }
      $current = [ordered]@{ roll = $matches[1]; hook = $matches[2] }
      continue
    }
    if ($current) {
      if ($t -match '^[A-Z][A-Z \-:]+$') { continue }
      $current.hook = ($current.hook + ' ' + $t).Trim()
    }
  }
  if ($current) { $entries += $current }
  return $entries
}

$patron = Get-Block 'Patron Hooks' 'SUPERNATURAL HOOKS'
$supernatural = Get-Block 'Supernatural Hooks' 'HAPPENSTANCE HOOKS'
$happenstance = Get-Block 'Happenstance Hooks' 'PLAN ENCOUNTERS'

$entriesPatron = Parse-Table $patron
$entriesSuper = Parse-Table $supernatural
$entriesHappen = Parse-Table $happenstance

function Update-Table($path, $entries) {
  $doc = Get-Content -Path $path | ConvertFrom-Json
  $doc.entries = $entries
  $doc.status = 'complete'
  $doc.notes = @()
  $doc | ConvertTo-Json -Depth 6 | Set-Content -Path $path
}

Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.patron_hooks.json" $entriesPatron
Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.supernatural_hooks.json" $entriesSuper
Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.happenstance_hooks.json" $entriesHappen
