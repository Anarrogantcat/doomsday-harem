/**
 * 事件脚本 DSL。
 *
 *   @scene sister_first
 *     title: 互相破处
 *     participants: 主角, 姐姐
 *     tone: 压抑十年的释放
 *     when: virgin == true && affection >= 60
 *
 *     @beat b1 pose:push_down
 *       action: 姐姐把主角按在床沿。
 *       sense:  夜里的空气是凉的。
 *       mind:   十年了。
 *       speech(姐姐): 你以前不是这样的。
 *
 *     @variant b2 when: lust > 80
 *       speech(姐姐): 快点……我等不了了。
 *   @end
 *
 * 续行：以 | 开头的行追加到上一行文本。
 */
import type { Beat, Line, Scene, LayerKind } from "../text/engine.ts";
import { evaluate, type Vars } from "./condition.ts";
import { SCRIPT_FORMAT_VERSION } from "../version.ts";

export interface ScriptVariant {
  beatId: string;
  when: string;
  lines: Line[];
}

export interface ScriptScene {
  id: string;
  title: string;
  participants: string[];
  tone: string;
  when: string;
  beats: Beat[];
  variants: ScriptVariant[];
}

export interface ParseResult {
  formatVersion: number;
  scenes: ScriptScene[];
}

const LAYER_KEYS: LayerKind[] = ["action", "sense", "mind", "speech"];
const SPEECH_RE = /^speech(?:\(([^)]*)\))?\s*:\s*(.*)$/;

export function parseScript(src: string): ParseResult {
  const lines = src.split(/\r?\n/);
  const scenes: ScriptScene[] = [];

  let cur: ScriptScene | null = null;
  let beat: Beat | null = null;
  let variant: ScriptVariant | null = null;
  let lastLine: Line | null = null;

  const fail = (n: number, msg: string): never => {
    throw new Error(`脚本第 ${n} 行：${msg}`);
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const n = idx + 1;
    const raw = lines[idx];
    const line = raw.trim();

    if (line === "" || line.startsWith("#") || line.startsWith("//")) { lastLine = null; continue; }

    // 续行
    if (line.startsWith("|")) {
      if (!lastLine) fail(n, "续行 '|' 之前没有可追加的文本行");
      lastLine!.text += line.slice(1).trim();
      continue;
    }

    if (line.startsWith("@scene")) {
      const id = line.slice("@scene".length).trim();
      if (!id) fail(n, "@scene 缺少 id");
      cur = { id, title: id, participants: [], tone: "", when: "", beats: [], variants: [] };
      scenes.push(cur);
      beat = null; variant = null; lastLine = null;
      continue;
    }

    if (line === "@end") {
      if (!cur) fail(n, "@end 没有对应的 @scene");
      if (cur.beats.length === 0) fail(n, `场景 ${cur.id} 没有任何 @beat`);
      cur = null; beat = null; variant = null; lastLine = null;
      continue;
    }

    if (!cur) fail(n, "内容出现在 @scene 之外");

    if (line.startsWith("@beat")) {
      const rest = line.slice("@beat".length).trim();
      const [id, ...attrs] = rest.split(/\s+/).filter(Boolean);
      if (!id) fail(n, "@beat 缺少 id");
      let poseKey = id;
      for (const a of attrs) {
        const [k, v] = a.split(":");
        if (k === "pose" && v) poseKey = v;
      }
      beat = { id, poseKey, lines: [] };
      cur.beats.push(beat);
      variant = null; lastLine = null;
      continue;
    }

    if (line.startsWith("@variant")) {
      const rest = line.slice("@variant".length).trim();
      const m = rest.match(/^(\S+)\s+when\s*:\s*(.+)$/);
      if (!m) fail(n, "@variant 格式应为：@variant <beatId> when: <表达式>");
      if (!cur.beats.some((b) => b.id === m[1])) {
        fail(n, `@variant 引用了不存在的节拍 '${m[1]}'`);
      }
      variant = { beatId: m[1], when: m[2].trim(), lines: [] };
      cur.variants.push(variant);
      lastLine = null;
      continue;
    }

    // key: value
    const colon = line.indexOf(":");
    if (colon === -1) fail(n, `无法解析的行：'${line}'`);
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();

    if (beat && LAYER_KEYS.includes(key as LayerKind) && !variant) {
      const l: Line = { layer: key as LayerKind, text: value };
      beat.lines.push(l);
      lastLine = l;
      continue;
    }

    const speechMatch = line.match(SPEECH_RE);
    if (speechMatch && (beat || variant)) {
      const l: Line = { layer: "speech", speaker: speechMatch[1]?.trim() || undefined, text: speechMatch[2].trim() };
      if (variant) variant.lines.push(l); else beat!.lines.push(l);
      lastLine = l;
      continue;
    }

    // 场景级属性
    if (variant) fail(n, `@variant 块内只允许文本行，收到 '${key}'`);
    if (beat && key !== "title") fail(n, `@beat 块内只允许 action/sense/mind/speech，收到 '${key}'`);

    if (key === "title") { cur.title = value; continue; }
    if (key === "tone") { cur.tone = value; continue; }
    if (key === "when") { cur.when = value; continue; }
    if (key === "participants") {
      cur.participants = value.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
      continue;
    }
    fail(n, `未知的场景属性 '${key}'`);
  }

  if (cur) throw new Error(`场景 ${cur.id} 缺少 @end`);
  return { formatVersion: SCRIPT_FORMAT_VERSION, scenes };
}

/**
 * 按变量集把 ScriptScene 实体化为引擎可渲染的 Scene。
 * 场景级 when 不满足 → 返回 null。
 * 节拍级 variant 条件满足 → 追加到对应节拍。
 */
export function materializeScene(s: ScriptScene, vars: Vars = {}): Scene | null {
  if (!evaluate(s.when, vars)) return null;

  const beats: Beat[] = s.beats.map((b) => ({ id: b.id, poseKey: b.poseKey, lines: [...b.lines] }));

  for (const v of s.variants) {
    if (!evaluate(v.when, vars)) continue;
    const target = beats.find((b) => b.id === v.beatId);
    if (target) target.lines.push(...v.lines);
  }

  return {
    id: s.id,
    title: s.title,
    participants: s.participants,
    tone: s.tone,
    beats
  };
}

export function materializeAll(r: ParseResult, vars: Vars = {}): Scene[] {
  const out: Scene[] = [];
  for (const s of r.scenes) {
    const scene = materializeScene(s, vars);
    if (scene) out.push(scene);
  }
  return out;
}
