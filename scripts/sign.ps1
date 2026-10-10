# 自动签名脚本
#
# 在 tauri build 之后运行，给主程序与安装包签名。
# 证书主体：CN=染喵, O=RanMiao, C=CN
#
# 用法：powershell -ExecutionPolicy Bypass -File scripts/sign.ps1

$ErrorActionPreference = "Stop"

$subject = "CN=染喵, O=RanMiao, C=CN"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$release = Join-Path $root "apps\desktop\src-tauri\target\release"
$bundle = Join-Path $release "bundle"

Write-Host ""
Write-Host "=== 代码签名（染喵）===" -ForegroundColor Cyan
Write-Host ""

# 找证书
$cert = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -eq $subject } |
  Select-Object -First 1

if (-not $cert) {
  Write-Host "证书不存在，正在生成…" -ForegroundColor Yellow
  $cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $subject `
    -KeyUsage DigitalSignature `
    -KeyAlgorithm RSA -KeyLength 4096 `
    -FriendlyName "染喵 - Doomsday Harem" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(10) `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3")

  # 导入受信任存储
  foreach ($name in @("Root", "TrustedPublisher")) {
    foreach ($scope in @("LocalMachine", "CurrentUser")) {
      try {
        $s = New-Object System.Security.Cryptography.X509Certificates.X509Store($name, $scope)
        $s.Open("ReadWrite")
        if (-not ($s.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint })) {
          $s.Add($cert)
        }
        $s.Close()
      } catch { }
    }
  }
  Write-Host "  已生成并导入信任存储" -ForegroundColor Green
}

Write-Host "证书: $($cert.Subject)"
Write-Host "指纹: $($cert.Thumbprint)"
Write-Host ""

# 待签名的目标
$targets = @()

$mainExe = Join-Path $release "doomsday-harem.exe"
if (Test-Path $mainExe) { $targets += $mainExe }

if (Test-Path (Join-Path $bundle "nsis")) {
  Get-ChildItem (Join-Path $bundle "nsis") -Filter "*.exe" -File | ForEach-Object {
    $targets += $_.FullName
  }
}

if ($targets.Count -eq 0) {
  Write-Host "未找到待签名文件。" -ForegroundColor Yellow
  exit 0
}

$ok = 0
$fail = 0
foreach ($t in $targets) {
  $name = Split-Path -Leaf $t
  try {
    # 先尝试带时间戳（需要网络）
    $sig = Set-AuthenticodeSignature -FilePath $t -Certificate $cert `
      -TimestampServer "http://timestamp.digicert.com" -ErrorAction SilentlyContinue

    if (-not $sig -or $sig.Status -ne "Valid") {
      # 回退：无时间戳
      $sig = Set-AuthenticodeSignature -FilePath $t -Certificate $cert
    }

    if ($sig.Status -eq "Valid") {
      Write-Host "  [OK]   $name" -ForegroundColor Green
      $ok++
    } else {
      Write-Host "  [WARN] $name  状态: $($sig.Status)" -ForegroundColor Yellow
      $fail++
    }
  } catch {
    Write-Host "  [FAIL] $name  $($_.Exception.Message)" -ForegroundColor Red
    $fail++
  }
}

Write-Host ""
Write-Host "完成：成功 $ok  失败 $fail" -ForegroundColor Cyan
Write-Host ""

# 输出验证摘要
Write-Host "=== 验证 ===" -ForegroundColor Cyan
foreach ($t in $targets) {
  $v = Get-AuthenticodeSignature $t
  $n = Split-Path -Leaf $t
  Write-Host "  $n"
  Write-Host "    状态: $($v.Status)"
  if ($v.SignerCertificate) {
    Write-Host "    签名者: $($v.SignerCertificate.Subject)"
  }
}
