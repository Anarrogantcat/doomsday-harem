/**
 * Electron 桥接类型声明与访问器。
 *
 * preload.cjs 通过 contextBridge 暴露 window.dh；
 * 这里给出类型，并在非 Electron 环境返回 null（便于浏览器预览降级）。
 */

export interface ElectronLayout {
  dataRoot: string;
  saves: string;
  mods: string;
  cache: string;
  logs: string;
  exports: string;
}

export interface ElectronModEntry { id: string; path: string }

export interface ElectronBridge {
  isElectron: true;
  platform: string;
  save: {
    write(slot: string, json: string): Promise<string>;
    read(slot: string): Promise<string>;
    list(): Promise<Array<{ slot: string; savedAt: string; bytes: number }>>;
    remove(slot: string): Promise<boolean>;
  };
  mods: {
    list(): Promise<ElectronModEntry[]>;
    readManifest(id: string): Promise<Record<string, unknown> | null>;
    readFile(id: string, rel: string): Promise<string>;
    openDir(): Promise<boolean>;
  };
  data: {
    layout(): Promise<ElectronLayout>;
    openDir(): Promise<boolean>;
    setDir(): Promise<string | null>;
  };
}

declare global {
  interface Window { dh?: ElectronBridge }
}

/** 取 Electron 桥（浏览器环境返回 null） */
export function getElectronBridge(): ElectronBridge | null {
  if (typeof window === "undefined") return null;
  return window.dh && window.dh.isElectron ? window.dh : null;
}

/** 供 bridge.ts 直接使用 */
export const bridge: ElectronBridge | null = getElectronBridge();
