$p = 'docs/ui-prototype.html'
$lines = Get-Content $p
$out = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
  $l = $lines[$i]
  # 在每个内容列之前插入分隔条
  if ($l -match '^  <div class="center">') { $out += '  <div class="splitter" data-col="left" title="拖动调整名册宽度"></div>' }
  if ($l -match '^  <div class="right">') { $out += '  <div class="splitter" data-col="right" title="拖动调整地图宽度"></div>' }
  if ($l -match '^  <div class="detail-side"') { $out += '  <div class="splitter" data-col="detail" title="拖动调整详情栏宽度"></div>' }
  $out += $l
}
$out | Set-Content $p -Encoding UTF8
Write-Host '分隔条已插入'
$l2 = Get-Content $p
Write-Host ('  splitter 元素: ' + ([regex]::Matches(($l2 -join "`n"), 'class="splitter"')).Count)
$d = 0
foreach ($x in $l2) { $d += ([regex]::Matches($x, '<div\b')).Count - ([regex]::Matches($x, '</div>')).Count }
Write-Host ('  div 深度: ' + $d)