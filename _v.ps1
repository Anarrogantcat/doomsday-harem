Remove-Item _z.ps1,_d.err,_srv.err,_c.ps1,_msg.txt -Force -ErrorAction SilentlyContinue
node scripts/version.mjs 0.45.0
Write-Host '=== VERSION ==='
Get-Content VERSION
Write-Host ''
git add -A
git commit -q -m 'chore: 版本号同步为 0.45.0'
git tag -f v0.45.0
git log --oneline -2
Write-Host ''
git status --short