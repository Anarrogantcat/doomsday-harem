/**
 * 版本单一来源。
 * VERSION 文件为权威值，scripts/version.mjs 负责同步到各 package.json 并校验一致性。
 */

/** 游戏版本，语义化版本号 */
export const VERSION = "0.43.0";

/** 存档结构版本 —— 不兼容变更时递增 */
export const SCHEMA_VERSION = 1;

/** 事件脚本 DSL 版本 */
export const SCRIPT_FORMAT_VERSION = 1;

export interface BuildInfo {
  version: string;
  schemaVersion: number;
  scriptFormatVersion: number;
}

export function buildInfo(): BuildInfo {
  return {
    version: VERSION,
    schemaVersion: SCHEMA_VERSION,
    scriptFormatVersion: SCRIPT_FORMAT_VERSION
  };
}

/** 存档兼容性判定 */
export function isSaveCompatible(schemaVersion: number): boolean {
  return schemaVersion === SCHEMA_VERSION;
}
