/**
 * 文本引擎 —— 本游戏成人内容的第一呈现层（核心，不可关闭）。
 * 每场 H 场景按「节拍 beat」推进，每个节拍同时输出四层描写：
 *   动作 / 感官 / 心理 / 对白
 * 像素、插画、Live2D 均为可选视图，订阅同一状态机。
 */

export type LayerKind = "action" | "sense" | "mind" | "speech";

export interface Line {
  layer: LayerKind;
  speaker?: string;
  text: string;
}

export interface Beat {
  id: string;
  /** 节拍标题，用于像素视图切帧 */
  poseKey: string;
  lines: Line[];
}

export interface Scene {
  id: string;
  title: string;
  participants: string[];
  /** 场景基调 */
  tone: string;
  beats: Beat[];
}

export type DetailLevel = "brief" | "standard" | "detailed" | "exhaustive";

export const DETAIL_MIN_BEATS: Record<DetailLevel, number> = {
  brief: 3,
  standard: 5,
  detailed: 7,
  exhaustive: 10
};

export interface TextRenderOptions {
  detail: DetailLevel;
  /** 是否显示层次标签（调试/无障碍用） */
  showLayerTags: boolean;
}

export const DEFAULT_TEXT_OPTIONS: TextRenderOptions = {
  detail: "detailed",
  showLayerTags: false
};

/** 按详细度裁剪节拍 */
export function sliceBeats(scene: Scene, detail: DetailLevel): Beat[] {
  const want = DETAIL_MIN_BEATS[detail];
  if (scene.beats.length <= want) return scene.beats;
  // 均匀采样，保留首尾
  const out: Beat[] = [];
  const step = (scene.beats.length - 1) / (want - 1);
  for (let i = 0; i < want; i++) out.push(scene.beats[Math.round(i * step)]);
  return out;
}

const LAYER_TAG: Record<LayerKind, string> = {
  action: "动作",
  sense: "感官",
  mind: "心理",
  speech: "对白"
};

/** 渲染单个节拍为纯文本段落 */
export function renderBeat(beat: Beat, opt: TextRenderOptions): string {
  const parts = beat.lines.map((l) => {
    if (l.layer === "speech") {
      const who = l.speaker ? l.speaker : "";
      return `${who}${who ? "" : ""}「${l.text}」`;
    }
    if (opt.showLayerTags) return `（${LAYER_TAG[l.layer]}）${l.text}`;
    return l.text;
  });
  return parts.join("\n");
}

/** 渲染整场 */
export function renderScene(scene: Scene, opt: TextRenderOptions = DEFAULT_TEXT_OPTIONS): string {
  const beats = sliceBeats(scene, opt.detail);
  const head = `【${scene.title}】${scene.participants.join(" × ")} · ${scene.tone}`;
  const body = beats.map((b, i) => `\n— 节拍 ${i + 1}/${beats.length} —\n${renderBeat(b, opt)}`).join("\n");
  return head + "\n" + body;
}

/** 统计字数，用于校验详细度 */
export function sceneLength(scene: Scene, opt: TextRenderOptions): number {
  return renderScene(scene, opt).replace(/\s/g, "").length;
}
