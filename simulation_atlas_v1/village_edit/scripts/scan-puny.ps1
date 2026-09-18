Add-Type -AssemblyName System.Drawing
$p = "C:\Users\kamel\village-sim-1\_wt_rhythm\village_edit\src\assets\nature\source\punyworld-overworld-tileset.png"
$bmp = New-Object System.Drawing.Bitmap $p
function Sample([int]$c,[int]$r) {
  $x=$c*16; $y=$r*16
  $uniq = @{}
  for ($yy=0;$yy -lt 16;$yy++) {
    for ($xx=0;$xx -lt 16;$xx++) {
      $col = $bmp.GetPixel($x+$xx,$y+$yy)
      $k = "{0:X2}{1:X2}{2:X2}" -f $col.R,$col.G,$col.B
      if (-not $uniq.ContainsKey($k)) { $uniq[$k]=0 }
      $uniq[$k]++
    }
  }
  $top = $uniq.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 4
  $s = ($top | ForEach-Object { $_.Key+":"+$_.Value }) -join ","
  Write-Host ("r{0}_c{1} n={2} {3}" -f $r,$c,$uniq.Count,$s)
}
# scan for tiles with brown (path-like) - R high G mid B low
Write-Host "=== row0 all cols ==="
for ($c=0;$c -lt 27;$c++) { Sample $c 0 }
Write-Host "=== find brown-ish tiles ==="
for ($r=0;$r -lt 20;$r++) {
  for ($c=0;$c -lt 27;$c++) {
    $brown=0; $green=0
    for ($yy=0;$yy -lt 16;$yy++) {
      for ($xx=0;$xx -lt 16;$xx++) {
        $col=$bmp.GetPixel($c*16+$xx,$r*16+$yy)
        if ($col.R -gt 120 -and $col.G -gt 80 -and $col.G -lt 160 -and $col.B -lt 90) { $brown++ }
        if ($col.G -gt $col.R + 20 -and $col.G -gt 100) { $green++ }
      }
    }
    if ($brown -gt 20 -and $green -gt 20) { Write-Host ("PATHLIKE r{0}_c{1} brown={2} green={3}" -f $r,$c,$brown,$green) }
  }
}
$bmp.Dispose()