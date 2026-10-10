#!/usr/bin/env node
/**
 * Demo 启动器 —— 本地静态服务器。
 *
 * 用法：
 *   node scripts/demo.mjs           # 默认 4173 端口
 *   node scripts/demo.mjs --port 8080
 *   node scripts/demo.mjs --open    # 自动打开浏览器
 *
 * 为什么需要它：
 *   file:// 下浏览器会拦截 fetch（文本库存加载）与部分资源。
 *   用本地服务可以完整验证，包括模型生成。
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(root, "apps", "desktop", "dist-demo");

const args = process.argv.slice(2);
const portArg = args.indexOf("--port");
const PORT = portArg !== -1 && args[portArg + 1] ? Number(args[portArg + 1]) : 4173;
const AUTO_OPEN = args.includes("--open");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".map": "application/json"
};

if (!existsSync(DIST)) {
  console.error("✗ 未找到 demo 构建产物：" + DIST);
  console.error("  请先运行：pnpm build:demo");
  process.exit(1);
}

const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (p === "/") p = "/index.html";

  const file = join(DIST, p);
  // 防目录穿越
  if (!file.startsWith(DIST)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }

  if (!existsSync(file) || statSync(file).isDirectory()) {
    // SPA 回退
    const fallback = join(DIST, "index.html");
    if (existsSync(fallback)) {
      res.writeHead(200, { "content-type": MIME[".html"] });
      res.end(readFileSync(fallback));
      return;
    }
    res.writeHead(404);
    res.end("not found");
    return;
  }

  res.writeHead(200, {
    "content-type": MIME[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-cache"
  });
  res.end(readFileSync(file));
});

// 端口占用检测：避免起多个实例
import { createConnection } from "node:net";

function portInUse(port) {
  return new Promise((resolve) => {
    const sock = createConnection({ port, host: "127.0.0.1" });
    sock.once("connect", () => { sock.destroy(); resolve(true); });
    sock.once("error", () => resolve(false));
    setTimeout(() => { sock.destroy(); resolve(false); }, 500);
  });
}

if (await portInUse(PORT)) {
  console.error(`✗ 端口 ${PORT} 已被占用`);
  console.error("  可能是之前启动的实例没关。可执行：");
  console.error(`    Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`);
  console.error("  或换端口：node scripts/demo.mjs --port 4180");
  process.exit(1);
}

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log("");
  console.log("  末日生存·后宫  —  Demo");
  console.log("  ─────────────────────────────");
  console.log(`  ${url}`);
  console.log("");
  console.log("  快捷键：");
  console.log("    Tab      切换 叙事 / 要塞剖面 / 战斗");
  console.log("    I N T B  物品 / 主线 / 科技 / 基地");
  console.log("    W H M S  服装 / 后宫 / 模型 / 存档");
  console.log("    ← →      翻页    Esc  关闭面板");
  console.log("");
  console.log(`  进程号 ${process.pid}（Ctrl+C 停止）`);
  console.log("");

  if (AUTO_OPEN) {
    const cmd = process.platform === "win32" ? `start "" "${url}"`
      : process.platform === "darwin" ? `open "${url}"`
      : `xdg-open "${url}"`;
    exec(cmd, () => {});
  }
});

function shutdown(reason) {
  console.log(`\n已停止（${reason}）`);
  server.close(() => process.exit(0));
  // 兜底：500ms 内没关干净就强制退出
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", () => shutdown("Ctrl+C"));
process.on("SIGTERM", () => shutdown("terminated"));