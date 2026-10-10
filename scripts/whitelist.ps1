# 一键加白名单 + 解除锁定
#
# 用途：解决杀毒软件拦截本程序的问题
# 用法：右键本文件 → 使用 PowerShell 运行
#       或在 PowerShell 中执行：powershell -ExecutionPolicy Bypass -File 一键加白名单.ps1

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Doomsday Harem 安全软件白名单配置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 定位本脚本所在目录（即游戏目录）
$gameDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $gameDir) { $gameDir = (Get-Location).Path }

Write-Host "游戏目录: $gameDir"
Write-Host ""

# ---------- 1. 解除文件锁定 ----------
Write-Host "[1/4] 解除文件锁定（网络来源标记）…" -ForegroundColor Yellow
$unlocked = 0
Get-ChildItem $gameDir -Recurse -Include *.exe,*.dll,*.zip -File | ForEach-Object {
  $zone = Get-Item $_.FullName -Stream Zone.Identifier -ErrorAction SilentlyContinue
  if ($zone) {
    Remove-Item $_.FullName -Stream Zone.Identifier -ErrorAction SilentlyContinue
    if ($?) { $unlocked++; Write-Host "  已解除: $($_.Name)" -ForegroundColor Green }
  }
}
if ($unlocked -eq 0) { Write-Host "  无需解除（没有锁定标记）" -ForegroundColor Gray }
Write-Host ""

# ---------- 2. Windows Defender 排除 ----------
Write-Host "[2/4] 添加 Windows Defender 排除项…" -ForegroundColor Yellow
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
  try {
    Add-MpPreference -ExclusionPath $gameDir -ErrorAction Stop
    Write-Host "  已添加目录排除: $gameDir" -ForegroundColor Green
  } catch {
    Write-Host "  添加失败: $($_.Exception.Message)" -ForegroundColor Red
  }
} else {
  Write-Host "  跳过（需要管理员权限）" -ForegroundColor Gray
  Write-Host "  提示：右键本脚本 → 以管理员身份运行 可自动添加" -ForegroundColor Gray
}
Write-Host ""

# ---------- 3. 检测火绒 ----------
Write-Host "[3/4] 检测火绒安全…" -ForegroundColor Yellow
$hr = Get-Process HipsTray,HipsDaemon -ErrorAction SilentlyContinue
if ($hr) {
  Write-Host "  检测到火绒正在运行" -ForegroundColor Green
  Write-Host ""
  Write-Host "  火绒需要手动加白名单（无命令行接口），步骤：" -ForegroundColor White
  Write-Host "    1. 打开火绒安全" -ForegroundColor White
  Write-Host "    2. 点右上角「≡」→ 设置" -ForegroundColor White
  Write-Host "    3. 左侧选「病毒防护」" -ForegroundColor White
  Write-Host "    4. 找到「信任区」→ 点「添加」" -ForegroundColor White
  Write-Host "    5. 选「目录」，把下面这个路径加进去：" -ForegroundColor White
  Write-Host ""
  Write-Host "       $gameDir" -ForegroundColor Cyan
  Write-Host ""

  # 尝试自动打开火绒设置
  $hrExe = (Get-Process HipsTray -ErrorAction SilentlyContinue).Path
  if ($hrExe) {
    $open = Read-Host "  是否现在打开火绒主界面？(y/n)"
    if ($open -eq "y") {
      Start-Process $hrExe
      Write-Host "  已打开火绒" -ForegroundColor Green
    }
  }
} else {
  Write-Host "  未检测到火绒" -ForegroundColor Gray
}
Write-Host ""

# ---------- 4. 检查其他杀软 ----------
Write-Host "[4/4] 检测其他安全软件…" -ForegroundColor Yellow
$avs = Get-CimInstance -Namespace "root\SecurityCenter2" -ClassName AntiVirusProduct -ErrorAction SilentlyContinue
if ($avs) {
  foreach ($av in $avs) {
    Write-Host "  · $($av.displayName)" -ForegroundColor Gray
  }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "如果仍被拦截，请：" -ForegroundColor White
Write-Host "  · 查看同目录下的「安装被拦截怎么办.md」" -ForegroundColor White
Write-Host "  · 或在杀软弹窗中直接选择「允许」/「信任」" -ForegroundColor White
Write-Host ""
Write-Host "按任意键退出…"
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
