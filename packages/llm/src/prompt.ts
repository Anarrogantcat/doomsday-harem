/**
 * 提示词构建 —— 把游戏状态转成模型可理解的上下文。
 * 关键：强制四层结构（动作/感官/心理/对白），与文本引擎一致。
 */
import type { ChatMessage } from "./types.ts";

export interface ScenePromptContext {
  sceneId: string;
  title: string;
  tone: string;
  participants: Array<{
    name: string;
    title?: string;
    /** 关系状态描述，如「好感 85 / 羁绊 Lv3 / 欲情 92」 */
    relation?: string;
    /** 生理状态，如「初次 / 已怀孕 12 天」 */
    physiology?: string;
  }>;
  /** 已发生的节拍摘要，用于续写时保持连贯 */
  priorBeats?: string[];
  /** 玩家选择的走向 */
  direction?: string;
  /** 可用的道具，如「娱乐型扶她药」「双头龙」 */
  props?: string[];
  /** 当前游戏内时间与地点 */
  time?: string;
  location?: string;
  /** 自定义补充要求 */
  extra?: string;
}

const LAYER_SPEC = `每个节拍必须同时包含四层描写，缺一不可：
- 动作层：谁在做什么，身体如何移动、姿势与节奏的变化
- 感官层：触觉、温度、气味、声音、体液等身体感受
- 心理层：角色内心的羞耻、渴望、犹豫、占有欲或背德感
- 对白层：完整句子与断续的碎片，用「」包裹，标注说话人

四层应自然交织，不要分段罗列标签。`;

const STYLE_RULES = `写作要求：
1. 第二人称视角叙述主角，称呼主角为「你」
2. 文字具体、克制、有质感，避免抽象堆砌与空洞形容词
3. 对白符合角色性格与当下关系阶段
4. 不回避身体细节，但不使用低俗词汇堆砌
5. 保持与前文节拍的时间与情绪连贯`;

export function buildSystemPrompt(): ChatMessage {
  return {
    role: "system",
    content: `你是一款末日生存后宫文字游戏的叙事引擎，负责生成成人向亲密场景的文本。

${LAYER_SPEC}

${STYLE_RULES}

输出格式：直接输出节拍文本，不要添加标题、编号或解释。
若要求多个节拍，用单独一行「---」分隔。`
  };
}

export function buildScenePrompt(ctx: ScenePromptContext): ChatMessage {
  const lines: string[] = [];
  lines.push(`场景：${ctx.title}`);
  if (ctx.tone) lines.push(`基调：${ctx.tone}`);
  if (ctx.time) lines.push(`时间：${ctx.time}`);
  if (ctx.location) lines.push(`地点：${ctx.location}`);

  lines.push("");
  lines.push("参与角色：");
  for (const p of ctx.participants) {
    const bits = [p.name];
    if (p.title) bits.push(`（${p.title}）`);
    const meta: string[] = [];
    if (p.relation) meta.push(p.relation);
    if (p.physiology) meta.push(p.physiology);
    if (meta.length) bits.push(` — ${meta.join("；")}`);
    lines.push(`- ${bits.join("")}`);
  }

  if (ctx.props?.length) {
    lines.push("");
    lines.push(`可用道具：${ctx.props.join("、")}`);
  }

  if (ctx.priorBeats?.length) {
    lines.push("");
    lines.push("已发生的节拍（保持连贯，不要重复）：");
    for (const b of ctx.priorBeats) lines.push(`- ${b}`);
  }

  if (ctx.direction) {
    lines.push("");
    lines.push(`本场走向：${ctx.direction}`);
  }

  if (ctx.extra) {
    lines.push("");
    lines.push(ctx.extra);
  }

  lines.push("");
  lines.push("请生成接下来的节拍。");

  return { role: "user", content: lines.join("\n") };
}

export function buildMessages(ctx: ScenePromptContext): ChatMessage[] {
  return [buildSystemPrompt(), buildScenePrompt(ctx)];
}

/** 解析模型输出：按 --- 切分节拍 */
export function parseBeats(text: string): string[] {
  return text
    .split(/^\s*---\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 把模型输出的段落拆成四层（启发式，尽力而为） */
export function classifyLines(paragraph: string): Array<{ layer: string; text: string }> {
  const out: Array<{ layer: string; text: string }> = [];
  for (const raw of paragraph.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[「『"].*[」』"]$/.test(line) || /[「『"]/.test(line)) {
      out.push({ layer: "speech", text: line });
    } else if (/^(你|她|他|主角)/.test(line) && /(手|身体|腰|腿|唇|动作|节奏|按|抱|压|坐)/.test(line)) {
      out.push({ layer: "action", text: line });
    } else if (/(温度|气味|声音|触|湿|热|汗|呼吸|颤抖|紧|麻)/.test(line)) {
      out.push({ layer: "sense", text: line });
    } else {
      out.push({ layer: "mind", text: line });
    }
  }
  return out;
}
