# Sign Electron artifacts (unpacked exe + NSIS installer + portable).
#
# Certificate subject: CN=RanMiao, O=RanMiao, C=CN (self-signed, imported to
# both Root and TrustedPublisher stores).
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/sign-electron.ps1
#
# Note: a self-signed certificate removes the "Unknown publisher" wording and
# improves SmartScreen, but cannot eliminate it entirely -- SmartScreen also
# weighs download source and reputation history.

$ErrorActionPreference = "Stop"

$subject = "CN=染喵, O=RanMiao, C=CN"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dist = Join-Path $root "apps\desktop\dist-electron"

Write-Host ""
Write-Host "=== Signing Electron artifacts ===" -ForegroundColor Cyan
Write-Host ""

# ---- 1. Locate certificate ----
$cert = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -eq $subject } |
  Select-Object -First 1

if (-not $cert) {
  Write-Host "Certificate not found: $subject" -ForegroundColor Red
  Write-Host "Run scripts/self-sign.ps1 first." -ForegroundColor Yellow
  exit 1
}
Write-Host ("Thumbprint: " + $cert.Thumbprint)
Write-Host ("Valid until: " + $cert.NotAfter)
Write-Host ""

# ---- 2. Locate signtool ----
$signtool = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin" -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match 'x64' } |
  Select-Object -First 1 -ExpandProperty FullName

if (-not $signtool) {
  $signtool = (Get-Command signtool.exe -ErrorAction SilentlyContinue).Source
}
if (-not $signtool) {
  Write-Host "signtool.exe not found (Windows SDK required)" -ForegroundColor Red
  exit 1
}
Write-Host "signtool: $signtool"
Write-Host ""

# ---- 3. Collect targets ----
$targets = @()
$targets += Get-ChildItem (Join-Path $dist "win-unpacked") -Filter "*.exe" -ErrorAction SilentlyContinue
$targets += Get-ChildItem $dist -Filter "*.exe" -ErrorAction SilentlyContinue

if ($targets.Count -eq 0) {
  Write-Host "No artifacts found. Run the packaging step first." -ForegroundColor Yellow
  exit 1
}

Write-Host ("Targets: " + $targets.Count) -ForegroundColor Cyan
Write-Host ""

# ---- 4. Sign each ----
$ok = 0
$fail = 0
foreach ($f in $targets) {
  Write-Host ("Signing: " + $f.Name) -ForegroundColor White
  & $signtool sign /sha1 $cert.Thumbprint /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 $f.FullName 2>&1 |
    ForEach-Object { Write-Host ("  " + $_) }

  if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK" -ForegroundColor Green
    $ok++
  } else {
    Write-Host ("  FAILED (exit " + $LASTEXITCODE + ")") -ForegroundColor Red
    $fail++
  }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host ("Signed: $ok   Failed: $fail")
Write-Host ""
Write-Host "Verify with:" -ForegroundColor White
Write-Host "  Get-AuthenticodeSignature '<path-to-exe>'"
Write-Host ""
