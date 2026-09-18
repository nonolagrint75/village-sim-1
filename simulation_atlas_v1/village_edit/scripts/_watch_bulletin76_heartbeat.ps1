$root='C:\Users\kamel\village-sim-1\simulation_atlas_v1\village_edit'
Start-Sleep -Seconds 180
Write-Output 'AGENT_LOOP_WAKE_bulletin76'
Get-Item $root\ATLAS_V1_TPS_500_PROOF.json,$root\ATLAS_V1_TPS_500_PROOF.txt,$root\NONO_SIMU_2D_BULLETIN.md -ErrorAction SilentlyContinue | Format-Table Name,Length,LastWriteTime -AutoSize
