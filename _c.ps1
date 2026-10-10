Remove-Item _d.err,_srv.err,_g.ps1 -Force -ErrorAction SilentlyContinue
git reset -q
git add -A
git reset -q _d.err _srv.err 2>$null
Remove-Item _d.err,_srv.err -Force -ErrorAction SilentlyContinue
git status --short
Write-Host ''
git commit -q -F _msg.txt
git log --oneline -1