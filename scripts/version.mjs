#!/usr/bin/env node
/**
 * 版本管理：以 VERSION 文件为唯一权威源。
 *
 *   node scripts/version.mjs          同步到所有 package.json
 *   node scripts/version.mjs --check  仅校验一致性（CI 用）
 *   node scripts/version.mjs --set 0.3.0  改写 VERSION 并同步
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_FILE = join(root, "VERSION");
const TARGETS = [
  "package.json",
  "packages/core/package.json",
  "packages/llm/package.json",
  "apps/desktop/package.json",
  "apps/desktop/src-tauri/tauri.conf.json"
];

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const setIdx = args.indexOf("--set");

const SEMVER = /^\d+\.\d+\.\d+$/;

function readVersion() {
  if (!existsSync(VERSION_FILE)) {
    console.error("✗ 缺少 VERSION 文件");
    process.exit(1);
  }
  const v = readFileSync(VERSION_FILE, "utf8").trim();
  if (!SEMVER.test(v)) {
    console.error(`✗ VERSION 不是合法语义化版本：${v}`);
    process.exit(1);
  }
  return v;
}

if (setIdx !== -1) {
  const next = args[setIdx + 1];
  if (!next || !SEMVER.test(next)) {
    console.error("✗ --set 需要一个 MAJOR.MINOR.PATCH 参数");
    process.exit(1);
  }
  writeFileSync(VERSION_FILE, next + "\n", "utf8");
  console.log(`VERSION → ${next}`);
}

const version = readVersion();
let failed = 0;

for (const rel of TARGETS) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    console.log(`- ${rel} （不存在，跳过）`);
    continue;
  }
  const raw = readFileSync(path, "utf8");
  const json = JSON.parse(raw);

  if (checkOnly) {
    if (json.version !== version) {
      console.error(`✗ ${rel}: ${json.version} ≠ ${version}`);
      failed++;
    } else {
      console.log(`✓ ${rel}: ${json.version}`);
    }
    continue;
  }

  if (json.version === version) {
    console.log(`= ${rel}: ${version}（已一致）`);
    continue;
  }
  json.version = version;
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`→ ${rel}: ${version}`);
}

// 同步 version.ts
const tsPath = join(root, "packages/core/src/version.ts");
if (existsSync(tsPath)) {
  const ts = readFileSync(tsPath, "utf8");
  const next = ts.replace(/export const VERSION = "[^"]*"/, `export const VERSION = "${version}"`);
  if (checkOnly) {
    if (next !== ts) {
      console.error(`✗ packages/core/src/version.ts 与 VERSION 不一致`);
      failed++;
    } else {
      console.log(`✓ packages/core/src/version.ts: ${version}`);
    }
  } else if (next !== ts) {
    writeFileSync(tsPath, next, "utf8");
    console.log(`→ packages/core/src/version.ts: ${version}`);
  } else {
    console.log(`= packages/core/src/version.ts: ${version}（已一致）`);
  }
}

// 同步 Cargo.toml 的 package.version
const cargoPath = join(root, "apps/desktop/src-tauri/Cargo.toml");
if (existsSync(cargoPath)) {
  const cargo = readFileSync(cargoPath, "utf8");
  const next = cargo.replace(/^(version\s*=\s*)"[^"]*"/m, `$1"${version}"`);
  if (checkOnly) {
    if (next !== cargo) {
      console.error("✗ apps/desktop/src-tauri/Cargo.toml 与 VERSION 不一致");
      failed++;
    } else {
      console.log(`✓ apps/desktop/src-tauri/Cargo.toml: ${version}`);
    }
  } else if (next !== cargo) {
    writeFileSync(cargoPath, next, "utf8");
    console.log(`→ apps/desktop/src-tauri/Cargo.toml: ${version}`);
  } else {
    console.log(`= apps/desktop/src-tauri/Cargo.toml: ${version}（已一致）`);
  }
}

if (failed > 0) {
  console.error(`\n✗ ${failed} 个文件版本不一致`);
  process.exit(1);
}
console.log(checkOnly ? "\n✓ 版本一致" : "\n✓ 版本已同步");