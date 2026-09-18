$ErrorActionPreference = "Continue"
$watchRoot = "C:\Users\kamel\village-sim-1\simulation_atlas_v1\village_edit"
$names = @("ATLAS_V1_TPS_500_PROOF.json","ATLAS_V1_TPS_500_PROOF.txt","NONO_SIMU_2D_BULLETIN.md","SIMULATION_ATLAS_V1_SCORECARD.md","COLLAB_BOARD.md")
$fsw = New-Object System.IO.FileSystemWatcher $watchRoot, "*"
$fsw.IncludeSubdirectories = $true
$fsw.NotifyFilter = [IO.NotifyFilters]::LastWrite -bor [IO.NotifyFilters]::FileName -bor [IO.NotifyFilters]::Size
$fsw.EnableRaisingEvents = $true
$lastEmit = Get-Date 0
Write-Output "AGENT_LOOP_WATCH_bulletin78_ARMED root=$watchRoot"
while ($true) {
  $evt = $fsw.WaitForChanged([System.IO.WatcherChangeTypes]::Changed -bor [System.IO.WatcherChangeTypes]::Created -bor [System.IO.WatcherChangeTypes]::Renamed, 15000)
  if ($evt.TimedOut) { continue }
  $bn = [IO.Path]::GetFileName($evt.Name)
  if ($names -notcontains $bn -and $evt.Name -notmatch "(?i)(EYE|VISUEL|VISUAL|COMPOSITION|TPS_500)") { continue }
  $now = Get-Date
  if (($now - $lastEmit).TotalSeconds -lt 8) { continue }
  $lastEmit = $now
  $payload = (@{ prompt = "WATCH TICK bulletin 78.7 soft-refuse: re-read proofs; raise matieres ONLY if PASS"; changed = $evt.Name; when = $now.ToUniversalTime().ToString("o") } | ConvertTo-Json -Compress)
  Write-Output ("AGENT_LOOP_WAKE_bulletin78 " + $payload)
}
