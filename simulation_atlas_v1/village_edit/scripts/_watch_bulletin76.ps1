$ErrorActionPreference = "Continue"
$watchRoot = "C:\Users\kamel\village-sim-1\simulation_atlas_v1\village_edit"
$names = @("ATLAS_V1_TPS_500_PROOF.json","ATLAS_V1_TPS_500_PROOF.txt","NONO_SIMU_2D_BULLETIN.md","SIMULATION_ATLAS_V1_SCORECARD.md","COLLAB_BOARD.md")
$fsw = New-Object System.IO.FileSystemWatcher $watchRoot, "*"
$fsw.IncludeSubdirectories = $true
$fsw.NotifyFilter = [IO.NotifyFilters]::LastWrite -bor [IO.NotifyFilters]::FileName -bor [IO.NotifyFilters]::Size
$fsw.EnableRaisingEvents = $true
$lastEmit = Get-Date 0
Write-Output "AGENT_LOOP_WATCH_bulletin77_ARMED hold=77.1-HARD visuel=69.5-HOLD root=$watchRoot"
while ($true) {
  $evt = $fsw.WaitForChanged([System.IO.WatcherChangeTypes]::Changed -bor [System.IO.WatcherChangeTypes]::Created -bor [System.IO.WatcherChangeTypes]::Renamed, 15000)
  if ($evt.TimedOut) { continue }
  $bn = [IO.Path]::GetFileName($evt.Name)
  if ($names -notcontains $bn -and $evt.Name -notmatch "(?i)(EYE|VISUEL|VISUAL|COMPOSITION|TPS_500|SHORE|NATURE)") { continue }
  $now = Get-Date
  if (($now - $lastEmit).TotalSeconds -lt 8) { continue }
  $lastEmit = $now
  $payload = (@{ prompt = "WATCH TICK bulletin 77.1 HARD. Perf matiere 89.5 already raised from ATLAS_V1_TPS_500_PROOF (tpsPass=true 89.5/90.6). Visuel 69.5 HOLD until eye-QA — continuous watch Visuel only for raise. Soft refuse global 90+. Chase perf@500 cible 100 for further Perf lift. Tree: simulation_atlas_v1/village_edit."; changed = $evt.Name; when = $now.ToUniversalTime().ToString("o"); hold = "77.1"; visuel = "69.5" } | ConvertTo-Json -Compress)
  Write-Output ("AGENT_LOOP_WAKE_bulletin77 " + $payload)
}
