/**
 * 音频系统。
 *
 * 设计：
 *  - 音轨分类：BGM / 环境音 / 音效 / 语音
 *  - 每类有独立音量与开关
 *  - 场景可声明所需 BGM 与环境音，切换场景时自动交叉淡入淡出
 *  - 实际播放由前端（Web Audio）实现，本模块只管状态与调度意图
 *
 * 纯函数式。
 */

export type AudioChannel = "bgm" | "ambient" | "sfx" | "voice";

export const CHANNEL_LABEL: Record<AudioChannel, string> = {
  bgm: "背景音乐",
  ambient: "环境音",
  sfx: "音效",
  voice: "语音"
};

export interface ChannelSettings {
  volume: number;
  muted: boolean;
}

export interface AudioSettings {
  master: number;
  channels: Record<AudioChannel, ChannelSettings>;
  /** 淡入淡出时长（毫秒） */
  crossfadeMs: number;
}

export function defaultAudioSettings(): AudioSettings {
  return {
    master: 0.7,
    channels: {
      bgm: { volume: 0.6, muted: false },
      ambient: { volume: 0.4, muted: false },
      sfx: { volume: 0.8, muted: false },
      voice: { volume: 1.0, muted: false }
    },
    crossfadeMs: 800
  };
}

/** 音轨定义 */
export interface TrackDef {
  id: string;
  name: string;
  channel: AudioChannel;
  /** 时长（秒），0 表示循环 */
  durationSec: number;
  /** 是否循环 */
  loop: boolean;
  description: string;
  /** 触发条件标签：如 scene:h / battle / night / base */
  tags: string[];
}

export const TRACKS: TrackDef[] = [
  // ---- BGM ----
  { id: "bgm_base_calm", name: "据点·日常", channel: "bgm", durationSec: 0, loop: true, description: "安全屋内的平静日常", tags: ["base", "day"] },
  { id: "bgm_base_night", name: "据点·夜", channel: "bgm", durationSec: 0, loop: true, description: "夜里的低语与呼吸", tags: ["base", "night"] },
  { id: "bgm_tension", name: "紧张", channel: "bgm", durationSec: 0, loop: true, description: "危险临近的压迫感", tags: ["battle", "raid"] },
  { id: "bgm_explore", name: "远征", channel: "bgm", durationSec: 0, loop: true, description: "房车行驶在荒原上", tags: ["travel"] },
  { id: "bgm_intimate", name: "亲密", channel: "bgm", durationSec: 0, loop: true, description: "私密场景的柔和旋律", tags: ["scene", "h"] },
  { id: "bgm_sorrow", name: "哀悼", channel: "bgm", durationSec: 0, loop: true, description: "失去同伴时的低沉", tags: ["death", "loss"] },
  { id: "bgm_victory", name: "击退", channel: "bgm", durationSec: 0, loop: false, description: "成功防守后的短促旋律", tags: ["victory"] },

  // ---- 环境音 ----
  { id: "amb_rain", name: "雨声", channel: "ambient", durationSec: 0, loop: true, description: "雨点打在屋顶", tags: ["weather:rain"] },
  { id: "amb_wind", name: "风声", channel: "ambient", durationSec: 0, loop: true, description: "山风穿过林间", tags: ["weather:storm", "mountain"] },
  { id: "amb_fire", name: "炉火", channel: "ambient", durationSec: 0, loop: true, description: "壁炉的噼啪声", tags: ["base", "fire"] },
  { id: "amb_machine", name: "机械运转", channel: "ambient", durationSec: 0, loop: true, description: "避难所深处的地热机组", tags: ["bunker"] },
  { id: "amb_distant_horde", name: "远处的低吼", channel: "ambient", durationSec: 0, loop: true, description: "丧尸潮逼近的前兆", tags: ["raid", "horde"] },

  // ---- 音效 ----
  { id: "sfx_door", name: "门禁", channel: "sfx", durationSec: 2, loop: false, description: "三重认证通过", tags: ["base"] },
  { id: "sfx_gunshot", name: "枪声", channel: "sfx", durationSec: 1, loop: false, description: "射击", tags: ["battle"] },
  { id: "sfx_melee", name: "近战命中", channel: "sfx", durationSec: 1, loop: false, description: "刀刃入肉", tags: ["battle"] },
  { id: "sfx_build", name: "施工", channel: "sfx", durationSec: 3, loop: false, description: "建造完成", tags: ["base"] },
  { id: "sfx_craft", name: "合成完成", channel: "sfx", durationSec: 2, loop: false, description: "配方产出", tags: ["craft"] },
  { id: "sfx_ui_click", name: "界面点击", channel: "sfx", durationSec: 0.2, loop: false, description: "UI 反馈", tags: ["ui"] },
  { id: "sfx_levelup", name: "羁绊提升", channel: "sfx", durationSec: 3, loop: false, description: "关系加深", tags: ["harem"] },
  { id: "sfx_cloth", name: "衣物摩擦", channel: "sfx", durationSec: 1, loop: false, description: "脱衣", tags: ["h", "cloth"] },

  // ---- 语音 ----
  { id: "voice_greeting", name: "问候", channel: "voice", durationSec: 3, loop: false, description: "角色打招呼", tags: ["ui", "harem"] },
  { id: "voice_intimate", name: "亲密语音", channel: "voice", durationSec: 5, loop: false, description: "H 场景台词", tags: ["h"] },
  { id: "voice_raid", name: "夜袭语音", channel: "voice", durationSec: 4, loop: false, description: "夜袭台词", tags: ["h", "raid"] }
];

const BY_ID = new Map(TRACKS.map((x) => [x.id, x]));

export function trackDef(id: string): TrackDef | undefined {
  return BY_ID.get(id);
}

export function tracksByChannel(ch: AudioChannel): TrackDef[] {
  return TRACKS.filter((x) => x.channel === ch);
}

export function tracksByTag(tag: string): TrackDef[] {
  return TRACKS.filter((x) => x.tags.includes(tag));
}

/** 某场景应播放的 BGM */
export function bgmForTags(tags: string[]): TrackDef | null {
  const candidates = TRACKS.filter(
    (x) => x.channel === "bgm" && x.tags.some((t) => tags.includes(t))
  );
  return candidates[0] ?? null;
}

/** 某场景应播放的环境音（可多个） */
export function ambientForTags(tags: string[]): TrackDef[] {
  return TRACKS.filter(
    (x) => x.channel === "ambient" && x.tags.some((t) => tags.includes(t))
  );
}

// ============ 播放状态 ============

export interface AudioState {
  settings: AudioSettings;
  /** 当前播放的 BGM id */
  currentBgm: string | null;
  /** 当前环境音 id 列表 */
  currentAmbient: string[];
  /** 正在淡出中的 BGM */
  fadingOut: string | null;
  /** 播放历史（用于调试） */
  history: Array<{ at: number; track: string; action: "play" | "stop" | "fade" }>;
}

export function newAudioState(settings = defaultAudioSettings()): AudioState {
  return { settings, currentBgm: null, currentAmbient: [], fadingOut: null, history: [] };
}

/** 有效音量（主音量 × 通道音量，静音时为 0） */
export function effectiveVolume(state: AudioState, ch: AudioChannel): number {
  const c = state.settings.channels[ch];
  if (!c || c.muted) return 0;
  return Math.max(0, Math.min(1, state.settings.master * c.volume));
}

export function setMaster(state: AudioState, volume: number): AudioState {
  return {
    ...state,
    settings: { ...state.settings, master: Math.max(0, Math.min(1, volume)) }
  };
}

export function setChannelVolume(state: AudioState, ch: AudioChannel, volume: number): AudioState {
  return {
    ...state,
    settings: {
      ...state.settings,
      channels: {
        ...state.settings.channels,
        [ch]: { ...state.settings.channels[ch], volume: Math.max(0, Math.min(1, volume)) }
      }
    }
  };
}

export function toggleMute(state: AudioState, ch: AudioChannel): AudioState {
  return {
    ...state,
    settings: {
      ...state.settings,
      channels: {
        ...state.settings.channels,
        [ch]: { ...state.settings.channels[ch], muted: !state.settings.channels[ch].muted }
      }
    }
  };
}

/** 切换 BGM（交叉淡入淡出） */
export function playBgm(state: AudioState, trackId: string | null, now = 0): AudioState {
  if (trackId === state.currentBgm) return state;
  const def = trackId ? trackDef(trackId) : null;
  if (trackId && (!def || def.channel !== "bgm")) return state;

  const history = [
    ...state.history,
    ...(state.currentBgm ? [{ at: now, track: state.currentBgm, action: "fade" as const }] : []),
    ...(trackId ? [{ at: now, track: trackId, action: "play" as const }] : [])
  ].slice(-50);

  return {
    ...state,
    currentBgm: trackId,
    fadingOut: state.currentBgm,
    history
  };
}

/** 设置环境音集合 */
export function setAmbient(state: AudioState, trackIds: string[], now = 0): AudioState {
  const valid = trackIds.filter((id) => trackDef(id)?.channel === "ambient");
  const history = [
    ...state.history,
    ...valid.map((t) => ({ at: now, track: t, action: "play" as const }))
  ].slice(-50);
  return { ...state, currentAmbient: valid, history };
}

/** 一次性设置场景音轨 */
export function applySceneAudio(state: AudioState, tags: string[], now = 0): AudioState {
  const bgm = bgmForTags(tags);
  const amb = ambientForTags(tags).map((t) => t.id);
  let s = playBgm(state, bgm?.id ?? null, now);
  s = setAmbient(s, amb, now);
  return s;
}

/** 淡出完成（清除 fadingOut） */
export function finishFade(state: AudioState): AudioState {
  return { ...state, fadingOut: null };
}

/** 播放音效（不改变状态，只记录） */
export function playSfx(state: AudioState, trackId: string, now = 0): AudioState {
  const def = trackDef(trackId);
  if (!def || (def.channel !== "sfx" && def.channel !== "voice")) return state;
  return {
    ...state,
    history: [...state.history, { at: now, track: trackId, action: "play" as const }].slice(-50)
  };
}

/** 描述当前音频状态 */
export function describeAudio(state: AudioState): string {
  const bgm = state.currentBgm ? trackDef(state.currentBgm)?.name ?? state.currentBgm : "（无）";
  const amb = state.currentAmbient.length > 0
    ? state.currentAmbient.map((id) => trackDef(id)?.name ?? id).join("、")
    : "（无）";
  return [
    `主音量：${Math.round(state.settings.master * 100)}%`,
    `BGM：${bgm}`,
    `环境音：${amb}`,
    `通道：${(Object.keys(CHANNEL_LABEL) as AudioChannel[])
      .map((c) => `${CHANNEL_LABEL[c]} ${Math.round(effectiveVolume(state, c) * 100)}%`)
      .join("　")}`
  ].join("\n");
}
