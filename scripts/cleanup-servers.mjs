#!/usr/bin/env node
/**
 * 清理遗留的 demo 服务进程。
 *
 * 用法：node scripts/cleanup-servers.mjs
 *
 * 起因：开发过程中反复起服务截图，容易忘记关闭，
 * 累积占用多个端口。此脚本扫描常见端口并终止占用者。
 */
import { execSync } from "node:child_process";

const PORTS = [4173, 4174, 4175, 4176, 4177, 4178, 4179, 4180, 4181, 5173];

console.log("扫描占用端口…\n");

let killed = 0;
for (const port of PORTS) {
  try {
    const out = execSync(
      `netstat -ano | findstr ":${port} " | findstr LISTENING`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();

    if (!out) continue;

    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`  端口 ${port}：已终止 PID ${pid}`);
        killed++;
      } catch {
        console.log(`  端口 ${port}：无法终止 PID ${pid}`);
      }
    }
  } catch {
    // 端口空闲
  }
}

console.log("");
if (killed === 0) {
  console.log("没有遗留服务，全部端口空闲");
} else {
  console.log(`已清理 ${killed} 个进程`);
}
