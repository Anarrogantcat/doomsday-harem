node scripts/version.mjs --set 0.45.0
Get-Content VERSION
git add -A
git commit -q -m 'chore: 版本号同步为 0.45.0'
git tag -f v0.45.0
git log --oneline -3
Write-Host '---'
git status --short