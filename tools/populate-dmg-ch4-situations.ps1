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
      $current = [ordered]@{ roll = $matches[1]; situation = $matches[2] }
      continue
    }
    if ($current) {
      if ($t -match '^[A-Z][A-Z \-:]+$') { continue }
      $current.situation = ($current.situation + ' ' + $t).Trim()
    }
  }
  if ($current) { $entries += $current }
  return $entries
}

$block1 = Get-Block 'LEVELS 1' 'LEVELS 5'
$block2 = Get-Block 'LEVELS 5' 'LEVELS 11'
$block3 = Get-Block 'LEVELS 11' 'LEVELS 17'
$block4 = Get-Block 'LEVELS 17' 'ADVENTURE SETTING'

$entries1 = Parse-Table $block1
$entries2 = Parse-Table $block2
$entries3 = Parse-Table $block3
$entries4 = Parse-Table $block4

function Update-Table($path, $entries) {
  $json = Get-Content -Path $path | ConvertFrom-Json
  $json.entries = $entries
  $json.status = 'complete'
  $json | ConvertTo-Json -Depth 6 | Set-Content -Path $path
}

Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_1.json" $entries1
Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_2.json" $entries2
Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_3.json" $entries3
Update-Table "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_4.json" $entries4
