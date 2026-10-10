#!/usr/bin/env node
/**
 * 便携版打包。
 *
 * 产出一个 ZIP：解压即用，无需安装，数据与程序同目录。
 * 便携版没有安装器，被杀软启发式误报的概率明显低于 NSIS 安装包。
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = readFileSync(join(root, "VERSION"), "utf8").trim();
const STAGE_PARENT = join(root, "_portable");
const STAGE = join(STAGE_PARENT, "DoomsdayHarem");
const OUT = join(root, "apps", "desktop", "src-tauri", "target", "release", "bundle");
const EXE = join(root, "apps", "desktop", "src-tauri", "target", "release", "doomsday-harem.exe");

if (!existsSync(EXE)) {
  console.error("x 未找到主程序，请先运行：pnpm tauri build");
  console.error("  " + EXE);
  process.exit(1);
}

console.log("打包便携版 v" + version);

rmSync(STAGE_PARENT, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });

// 主程序
copyFileSync(EXE, join(STAGE, "DoomsdayHarem.exe"));
console.log("  ok 主程序");

// 数据目录结构（便携模式）
for (const d of ["saves", "config", "mods", "logs"]) {
  mkdirSync(join(STAGE, "data", d), { recursive: true });
}

writeFileSync(join(STAGE, "data", "portable.txt"),
  "portable=1\nnote=游戏数据与存档保存在此目录\n", "utf8");

writeFileSync(join(STAGE, "data", "mods", "README.txt"),
  ["将 Mod 目录放在此处，每个 Mod 一个子目录。", "",
   "结构：",
   "  mods/你的Mod名/mod.json       元信息（id/name/version/author）",
   "  mods/你的Mod名/scripts/*.dsl  剧本",
   "  mods/你的Mod名/data/*.json    数据覆盖",
   "  mods/你的Mod名/assets/        素材", "",
   "在游戏内按 L 打开 Mod 面板可查看与启停。", ""].join("\n"), "utf8");
console.log("  ok data 目录结构");

// 使用说明
writeFileSync(join(STAGE, "使用说明.txt"),
  ["Doomsday Harem v" + version + " 便携版", "",
   "【运行】",
   "  双击 DoomsdayHarem.exe，无需安装。", "",
   "【数据位置】",
   "  存档、配置、Mod 全在 data/ 目录下，与程序同目录。",
   "  整个文件夹可随意移动，或放在 U 盘上。", "",
   "【如果被安全软件拦截】",
   "  本程序未购买代码签名证书，部分杀软会启发式误报。",
   "  处理方式（任选其一）：",
   "    1. 在杀软弹窗中选择「允许」或「信任」",
   "    2. 把整个文件夹加入杀软白名单",
   "    3. 火绒：设置 → 病毒防护 → 信任区 → 添加目录",
   "    4. 右键 exe → 属性 → 解除锁定（若来自网络下载）", "",
   "【卸载】",
   "  直接删除整个文件夹。想保留存档就先备份 data/。", ""].join("\n"), "utf8");

// 用 tar 打包（Windows 10 1803+ 自带 bsdtar，支持 zip）
const zipName = "DoomsdayHarem_" + version + "_portable.zip";
const zipPath = join(OUT, zipName);
mkdirSync(OUT, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath, { force: true });

console.log("  压缩中…");
try {
  execFileSync("tar", ["-a", "-c", "-f", zipPath, "-C", STAGE_PARENT, "DoomsdayHarem"], {
    stdio: "inherit"
  });
} catch (e) {
  // 回退到 PowerShell
  console.log("  tar 不可用，改用 PowerShell…");
  execFileSync("powershell", [
    "-NoProfile", "-Command",
    "Compress-Archive -Path '" + STAGE + "\\*' -DestinationPath '" + zipPath + "' -Force"
  ], { stdio: "inherit" });
}

rmSync(STAGE_PARENT, { recursive: true, force: true });

if (!existsSync(zipPath)) {
  console.error("x 打包失败");
  process.exit(1);
}

console.log("");
console.log("完成：" + zipName);
console.log("  大小 " + (statSync(zipPath).size / 1024 / 1024).toFixed(2) + " MB");
console.log("  路径 " + zipPath);
