#!/usr/bin/env node
/**
 * 把 data/scripts/*.dsl 打包成一份 TS 模块，供前端直接 import。
 *
 * 原因：Vite 的 import.meta.glob 无法解析裸包名（@doomsday/core/...），
 * 因此在构建前把剧本内联成一个模块最稳妥。
 *
 *   node scripts/gen-scripts.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "packages", "core", "data", "scripts");
const outDir = join(root, "packages", "core", "src", "generated");
const outFile = join(outDir, "scripts.ts");

const files = readdirSync(srcDir).filter((f) => f.endsWith(".dsl")).sort();

const entries = files.map((f) => {
  const content = readFileSync(join(srcDir, f), "utf8");
  return "  { file: " + JSON.stringify(f) + ", source: " + JSON.stringify(content) + " }";
});

const header = [
  "/**",
  " * 自动生成 —— 请勿手改。",
  " * 由 scripts/gen-scripts.mjs 从 packages/core/data/scripts/*.dsl 生成。",
  " */",
  "",
  "export interface ScriptSource {",
  "  file: string;",
  "  source: string;",
  "}",
  ""
].join("\n");

const body = [
  "export const SCRIPT_SOURCES: ScriptSource[] = [",
  entries.join(",\n"),
  "];",
  "",
  "export function allScriptTexts(): string[] {",
  "  return SCRIPT_SOURCES.map((s) => s.source);",
  "}",
  "",
  "export const SCRIPT_COUNT = " + files.length + ";"
].join("\n");

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, header + "\n" + body + "\n", "utf8");
console.log("生成 " + outFile + "（" + files.length + " 个剧本）");
