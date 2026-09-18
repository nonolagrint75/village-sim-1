Add-Type -AssemblyName System.Drawing
$p = "C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit\src\assets\nature\source\punyworld-overworld-tileset.png"
$out = "C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit\src\assets\nature\tiles\_puny_probe"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$img = [System.Drawing.Image]::FromFile($p)
$bmp = New-Object System.Drawing.Bitmap $img
Write-Host ("size {0}x{1}" -f $bmp.Width, $bmp.Height)
function Save-Tile([int]$col, [int]$row) {
  $tile = $bmp.Clone([System.Drawing.Rectangle]::new($col * 16, $row * 16, 16, 16), $bmp.PixelFormat)
  $name = Join-Path $out ("r{0}_c{1}.png" -f $row, $col)
  $tile.Save($name)
  $tile.Dispose()
}
for ($i = 0; $i -lt 14; $i++) { Save-Tile $i 0 }
for ($r = 1; $r -le 6; $r++) { for ($i = 0; $i -lt 10; $i++) { Save-Tile $i $r } }
for ($r = 45; $r -le 60; $r++) { for ($i = 0; $i -lt 18; $i++) { Save-Tile $i $r } }
$bmp.Dispose(); $img.Dispose()
Write-Host ("count " + (Get-ChildItem $out).Count)