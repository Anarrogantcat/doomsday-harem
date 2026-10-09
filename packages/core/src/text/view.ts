/**
 * 视图层抽象：文本为核心，像素/插画/Live2D 均为可选订阅者。
 * 关闭所有视图时，状态机照常运行，文字照常输出。
 */
export interface SceneViewState {
  sceneId: string;
  beatIndex: number;
  beatId: string;
  poseKey: string;
  participants: string[];
  tags: string[];
}

export interface View {
  readonly id: string;
  onBeat(state: SceneViewState): void;
  onSceneEnd(sceneId: string): void;
}

export type PixelMode = "off" | "keyframe" | "full";

export interface ViewConfig {
  pixel: PixelMode;
  pixelSize: 16 | 32 | 64;
  pixelPlacement: "fullscreen" | "top" | "side";
  pixelSync: "beat" | "loop";
  illustration: boolean;
  live2d: boolean;
}

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  pixel: "keyframe",
  pixelSize: 32,
  pixelPlacement: "top",
  pixelSync: "beat",
  illustration: false,
  live2d: false
};

export function viewsFromConfig(cfg: ViewConfig): string[] {
  const out: string[] = [];
  if (cfg.pixel !== "off") out.push(`pixel:${cfg.pixel}`);
  if (cfg.illustration) out.push("illustration");
  if (cfg.live2d) out.push("live2d");
  return out;
}
