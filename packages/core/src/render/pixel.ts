import type { View, SceneViewState, ViewConfig } from "../text/view.ts";
import { DEFAULT_VIEW_CONFIG } from "../text/view.ts";

export interface PixelFrame {
  sheetId: string;
  index: number;
  /** 在精灵表中的像素坐标 */
  x: number;
  y: number;
  size: number;
}

export interface SpriteSheet {
  id: string;
  /** 每行帧数 */
  columns: number;
  /** 单帧边长（像素） */
  frameSize: number;
  /** poseKey → 帧序号 */
  frames: Record<string, number>;
  /** 找不到 poseKey 时的兜底帧 */
  fallback: number;
}

/**
 * 像素渲染器 —— 文本引擎的可选视图。
 * 订阅 SceneViewState，按 poseKey 解析精灵表帧。
 * 关闭（pixel: "off"）时完全不接收节拍，但引擎照常推进。
 */
export class PixelRenderer implements View {
  readonly id = "pixel";
  private cfg: ViewConfig;
  private sheets = new Map<string, SpriteSheet>();
  private received: SceneViewState[] = [];
  private ended: string[] = [];
  private activeSheet: string | null = null;

  constructor(cfg: ViewConfig = DEFAULT_VIEW_CONFIG) {
    this.cfg = cfg;
  }

  registerSheet(sheet: SpriteSheet): void {
    this.sheets.set(sheet.id, sheet);
  }

  setActiveSheet(sheetId: string): void {
    if (!this.sheets.has(sheetId)) throw new Error(`未注册的精灵表：${sheetId}`);
    this.activeSheet = sheetId;
  }

  setConfig(cfg: ViewConfig): void {
    this.cfg = cfg;
  }

  get config(): ViewConfig {
    return this.cfg;
  }

  onBeat(state: SceneViewState): void {
    if (this.cfg.pixel === "off") return;
    // 关键帧模式：只接收标记为关键帧的节拍
    if (this.cfg.pixel === "keyframe" && !state.tags.includes("keyframe")) return;
    this.received.push(state);
  }

  onSceneEnd(sceneId: string): void {
    this.ended.push(sceneId);
  }

  /** 已接收的节拍（供测试与调试） */
  frames(): SceneViewState[] {
    return [...this.received];
  }

  frameCount(): number {
    return this.received.length;
  }

  endedScenes(): string[] {
    return [...this.ended];
  }

  /** 解析某个 poseKey 对应的帧 */
  resolveFrame(sheetId: string, poseKey: string): PixelFrame | null {
    const sheet = this.sheets.get(sheetId);
    if (!sheet) return null;
    const index = sheet.frames[poseKey] ?? sheet.fallback;
    const x = (index % sheet.columns) * sheet.frameSize;
    const y = Math.floor(index / sheet.columns) * sheet.frameSize;
    return { sheetId, index, x, y, size: sheet.frameSize };
  }

  /** 解析当前活动精灵表上的帧 */
  currentFrame(poseKey: string): PixelFrame | null {
    if (!this.activeSheet) return null;
    return this.resolveFrame(this.activeSheet, poseKey);
  }
}

/** 生成一份默认的 32×32 姐姐线精灵表映射 */
export function sisterSheet(): SpriteSheet {
  return {
    id: "sister_32",
    columns: 4,
    frameSize: 32,
    fallback: 0,
    frames: {
      push_down: 0,
      straddle: 1,
      sink: 2,
      slow: 3,
      faster: 4,
      climax: 5,
      afterglow: 6
    }
  };
}
