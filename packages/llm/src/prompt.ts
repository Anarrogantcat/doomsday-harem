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

/**
 * 把模型输出的段落拆成四层。
 *
 * 模型通常把整段写成一行（无换行），因此必须：
 *   1. 先按换行切
 *   2. 再按句末标点切（。！？；…）
 *   3. 把对白「」内的内容整体归为 speech
 *   4. 剩余句子按关键词启发式归类
 *
 * 这是尽力而为的启发式：分类不完美不影响可读性，
 * 文本引擎按行输出，四层只是语义标注。
 */
export function classifyLines(paragraph: string): Array<{ layer: string; text: string }> {
  const out: Array<{ layer: string; text: string }> = [];

  // 1) 先按换行切
  const rawLines = paragraph.split(/\n+/).map((s) => s.trim()).filter(Boolean);

  for (const rawLine of rawLines) {
    // 2) 逐句切分：保留对白「」整体
    const segments = splitSentences(rawLine);
    for (const seg of segments) {
      const s = seg.trim();
      if (!s) continue;
      out.push({ layer: classifyOne(s), text: s });
    }
  }

  return out.length > 0 ? out : [{ layer: "mind", text: paragraph.trim() }];
}

const OPEN_QUOTES = "「『“‘";
const CLOSE_QUOTES = "」』”’";
const SENTENCE_END = "。！？；…";

/**
 * 按句末标点切句，并把引号块作为独立段切出。
 *
 * 例：「你以前不是这样的。」她低下头。
 *   → ["「你以前不是这样的。」", "她低下头。"]
 * 引号内的句末标点不切句。
 */
function splitSentences(line: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;

  const flush = () => {
    if (buf.trim()) out.push(buf.trim());
    buf = "";
  };

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (OPEN_QUOTES.includes(ch) && depth === 0) {
      // 引号开始：先结算引号前的内容
      flush();
      depth = 1;
      buf = ch;
      continue;
    }

    if (CLOSE_QUOTES.includes(ch) && depth === 1) {
      // 引号结束：整个引号块独立成段
      buf += ch;
      depth = 0;
      flush();
      continue;
    }

    buf += ch;

    // 引号外的句末标点 → 切句
    if (depth === 0 && SENTENCE_END.includes(ch)) {
      while (i + 1 < line.length && SENTENCE_END.includes(line[i + 1])) {
        buf += line[++i];
      }
      flush();
    }
  }

  flush();
  return out;
}

const ACTION_RE = /(手|指|腰|腿|脚|唇|舌|肩|背|胸|颈|臂|膝盖|身体|动作|节奏|按|抱|压|坐|推|拉|抬|翻|缠|扣|解|脱|握|插|抽|顶|撞|磨|抚|揉|掐|舔|咬|亲|贴|夹|跪|趴|躺|跨|骑|扭|挺|送|迎|退)/;
const SENSE_RE = /(温度|气味|味道|声音|响|触感|湿|热|烫|凉|冷|汗|呼吸|喘|颤抖|抖|紧|麻|酥|酸|痛|胀|黏|滑|腥|香|心跳|脉搏|耳鸣|晕)/;
const MIND_RE = /(想|觉得|知道|意识|记忆|羞|耻|愧|怕|惧|渴望|欲|忍|克制|克制|心|情绪|感受|以为|明白|恍惚|空白|十年|一直|从来|第一次|最后一次)/;

function classifyOne(s: string): string {
  // 以引号开头/结尾 → 对白
  if (/^[「『“‘"]/.test(s) || /[」』”’"]$/.test(s)) return "speech";
  // 含引号且引号占比高 → 对白
  const quoted = s.match(/[「『“‘"][^」』”’"]*[」』”’"]/g);
  if (quoted) {
    const quotedLen = quoted.join("").length;
    if (quotedLen / s.length > 0.5) return "speech";
  }

  const action = (s.match(new RegExp(ACTION_RE.source, "g")) ?? []).length;
  const sense = (s.match(new RegExp(SENSE_RE.source, "g")) ?? []).length;
  const mind = (s.match(new RegExp(MIND_RE.source, "g")) ?? []).length;

  const max = Math.max(action, sense, mind);
  if (max === 0) return "mind";
  if (action === max) return "action";
  if (sense === max) return "sense";
  return "mind";
}
