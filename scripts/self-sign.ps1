# 自签名脚本（可选）
#
# 给 exe 打上自签名证书。这不能完全消除误报，
# 但能让程序在「数字签名」一栏有内容，
# 部分杀软的启发式评分会因此下降。
#
# 用法：右键 → 使用 PowerShell 运行（需管理员权限）

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Doomsday Harem 自签名 ===" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "需要管理员权限，请右键以管理员身份运行。" -ForegroundColor Red
  pause
  exit 1
}

$gameDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $gameDir "DoomsdayHarem.exe"
if (-not (Test-Path $exe)) {
  $exe = Join-Path $gameDir "doomsday-harem.exe"
}
if (-not (Test-Path $exe)) {
  Write-Host "找不到主程序。" -ForegroundColor Red
  pause
  exit 1
}

Write-Host "目标: $exe"
Write-Host ""

# 1. 生成自签名证书（若不存在）
$certName = "CN=Doomsday Harem Studio"
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $certName } | Select-Object -First 1

if (-not $cert) {
  Write-Host "[1/3] 生成自签名证书…" -ForegroundColor Yellow
  $cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $certName `
    -KeyUsage DigitalSignature `
    -FriendlyName "Doomsday Harem 自签名" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(5) `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
  Write-Host "  已生成" -ForegroundColor Green
} else {
  Write-Host "[1/3] 使用已有证书" -ForegroundColor Gray
}
Write-Host ""

# 2. 导入受信任根（让签名被本机认可）
Write-Host "[2/3] 导入受信任的根证书颁发机构…" -ForegroundColor Yellow
try {
  $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
  $store.Open("ReadWrite")
  if (-not ($store.Certificates | Where-Object { $_.Subject -eq $cert.Subject })) {
    $store.Add($cert)
    Write-Host "  已导入" -ForegroundColor Green
  } else {
    Write-Host "  已存在" -ForegroundColor Gray
  }
  $store.Close()
} catch {
  Write-Host "  导入失败: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. 签名
Write-Host "[3/3] 签名 exe…" -ForegroundColor Yellow
$sig = Set-AuthenticodeSignature -FilePath $exe -Certificate $cert -TimestampServer "http://timestamp.digicert.com" -ErrorAction SilentlyContinue
if (-not $sig -or $sig.Status -eq "UnknownError") {
  # 无网络时用无时间戳签名
  $sig = Set-AuthenticodeSignature -FilePath $exe -Certificate $cert
}

Write-Host "  状态: $($sig.Status)" -ForegroundColor $(if ($sig.Status -eq "Valid") { "Green" } else { "Yellow" })
Write-Host ""

# 验证
$vi = (Get-Item $exe).VersionInfo
Write-Host "=== 签名后信息 ===" -ForegroundColor Cyan
Write-Host "  文件: $($vi.FileDescription)"
Write-Host "  公司: $($vi.CompanyName)"
Write-Host "  版本: $($vi.FileVersion)"
Write-Host ""
Write-Host "注意：自签名不能消除火绒这类启发式引擎的误报，" -ForegroundColor Yellow
Write-Host "      仍建议同时把目录加入信任区。" -ForegroundColor Yellow
Write-Host ""
pause
