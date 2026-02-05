$paths = @(
  "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_1.json",
  "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_2.json",
  "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_3.json",
  "docs/dmg-2024/chapter-04/tables/table.dmg.chapter04.adventure_situations_tier_4.json"
)
foreach ($path in $paths) {
  $doc = Get-Content -Path $path | ConvertFrom-Json
  $fixed = @()
  foreach ($e in $doc.entries) {
    $s = $e.situation
    $s = $s -replace '\s*1d(12|20)\s+Situation\s*', ''
    $s = $s -replace '—', ' - '
    $s = $s -replace '\s+', ' '
    $e.situation = $s.Trim()
    $fixed += $e
  }
  $doc.entries = $fixed
  $doc.status = 'complete'
  $doc.notes = @()
  $doc | ConvertTo-Json -Depth 6 | Set-Content -Path $path
}
