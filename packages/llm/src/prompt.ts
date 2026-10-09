/**
 * 提示词构建 —— 把游戏状态转成模型可理解的上下文。
 *
 * 设计要点（针对模型生成的一致性）：
 *  1. 四层结构强制：动作/感官/心理/对白
 *  2. 说话人必须标注，格式固定为「角色名「台词」」
 *  3. 姿势与道具的物理约束写清楚（双头龙是两人各持一端）
 *  4. 角色性格与行为边界写清楚（害羞角色不会主动扑上去）
 *  5. 着装状态必须传入，模型不得凭空添加未穿的衣物
 *  6. 基调约束：亲密而非暴力，禁止血腥/伤害描写
 *  7. 每个节拍标注节拍号与姿势键，便于像素层切帧
 */
import type { ChatMessage } from "./types.ts";

/** 角色上下文（含性格与着装） */
export interface ParticipantContext {
  name: string;
  /** 身份头衔 */
  title?: string;
  /** 性格标签与行为风格，如「主动强势（直接、主动、带压迫感）」 */
  personality?: string;
  /** 该性格的说话风格 */
  tone?: string;
  /** 该性格的典型开场白（供模型参考语气，不要照抄） */
  voiceSample?: string;
  /** 关系状态，如「好感 85 / 羁绊 Lv3 / 欲情 92」 */
  relation?: string;
  /** 生理状态，如「初次 / 已怀孕 12 天」 */
  physiology?: string;
  /** 当前着装描述 */
  outfit?: string;
  /** 暴露度 0-100 */
  exposure?: number;
  /** 在场景中的角色定位，如「主导方」「被动方」「旁观者」 */
  role?: string;
}

export interface ScenePromptContext {
  sceneId: string;
  title: string;
  tone: string;
  participants: ParticipantContext[];
  /** 已发生的节拍（供续写连贯） */
  priorBeats?: string[];
  /** 本场走向 */
  direction?: string;
  /** 可用的道具 */
  props?: string[];
  /** 当前姿势（如 straddle / sink / 背后位） */
  pose?: string;
  /** 要求的节拍数 */
  beatCount?: number;
  time?: string;
  location?: string;
  extra?: string;
}

const LAYER_SPEC = `每个节拍必须同时包含四层描写，缺一不可：
- 动作层：谁在做什么，身体如何移动、姿势与节奏的变化
- 感官层：触觉、温度、气味、声音、体液等身体感受
- 心理层：角色内心的羞耻、渴望、犹豫、占有欲或背德感
- 对白层：台词，必须标注说话人`;

const SPEAKER_SPEC = `对白格式（严格遵守）：
- 每一句台词必须写成「角色名「台词内容」」
- 例：姐姐「别动。」　　妹妹「我、我不是故意的……」
- 主角的说话人一律标注为「主角」，不要写成「你」或「我」
- 叙述主角时用第二人称「你」，但台词标注用「主角」
- 禁止写出没有说话人的台词
- 禁止把旁白写成台词，也禁止把台词写成旁白
- 一次只能有一个人在说话；若多人同时说话，分句写出`;

const POSE_SPEC = `姿势与道具的物理约束：
- 严格遵循给定姿势，不要自行切换体位
- 道具按实际用法描写：
  · 双头龙：两端各由一人使用，不是单方面的武器
  · 穿戴式假阳具：穿戴者主动，另一端承受
  · 震动棒 / 跳蛋：手持或置入，注意开关状态
  · 捆绑带：束缚的是身体，不是伤害
- 身体接触必须双方都在场，不要凭空出现第三人`;

const TONE_SPEC = `基调约束（重要）：
- 这是亲密的成人场景，核心是欲望、羞耻、渴望与情感张力
- 禁止血腥描写：不要出现流血、伤口、惨叫、撕裂、窒息等
- 禁止暴力伤害：不要出现殴打、致伤、危及生命的行为
- 疼痛可以有，但必须是性语境下的轻微不适（如「有点胀」「不太适应」），
  不是受伤
- 禁止使用低俗词汇堆砌，用具体、克制、有质感的描写`;

const CHARACTER_SPEC = `角色一致性（严格遵守）：
- 每位角色的性格、说话风格、行为边界已在下方给出，不得违背
- 害羞的角色不会主动扑上去；主动的角色不会突然变得畏缩
- 角色的着装已给出，不得描写未穿着的衣物，也不得随意脱掉未指定的衣物
- 角色之间的称呼按给定关系，不要自行创造亲昵称呼
- 若某角色被标为「旁观者」，则只做观察与反应，不参与主要行为`;

const STYLE_RULES = `写作要求：
1. 第二人称视角叙述主角，称呼主角为「你」
2. 文字具体、克制、有质感，避免抽象堆砌与空洞形容词
3. 对白符合角色性格与当下关系阶段
4. 保持与前文节拍的时间、姿势与情绪连贯
5. 每个节拍控制在 3-6 句，四层自然交织，不要分段罗列标签`;

const OUTPUT_SPEC = `输出格式（严格遵守）：
- 直接输出节拍正文，不要标题、编号、解释或说明
- 多个节拍之间用单独一行「---」分隔
- 每句台词写成「角色名「台词」」形式
- 不要在开头写「节拍 1」之类的标记
- 动作与感官描写直接写，不要用括号包裹，不要写成旁白腔`;

export function buildSystemPrompt(): ChatMessage {
  return {
    role: "system",
    content: `你是一款末日生存后宫文字游戏的叙事引擎，负责生成成人向亲密场景的文本。
写作必须严格遵循以下规范。

${LAYER_SPEC}

${SPEAKER_SPEC}

${POSE_SPEC}

${TONE_SPEC}

${CHARACTER_SPEC}

${STYLE_RULES}

${OUTPUT_SPEC}`
  };
}

export function buildScenePrompt(ctx: ScenePromptContext): ChatMessage {
  const lines: string[] = [];

  lines.push(`【场景】${ctx.title}`);
  if (ctx.tone) lines.push(`【基调】${ctx.tone}`);
  if (ctx.time) lines.push(`【时间】${ctx.time}`);
  if (ctx.location) lines.push(`【地点】${ctx.location}`);
  if (ctx.pose) lines.push(`【当前姿势】${ctx.pose}`);

  lines.push("");
  lines.push("【角色】");
  for (const p of ctx.participants) {
    lines.push(`▸ ${p.name}${p.title ? `（${p.title}）` : ""}`);
    if (p.role) lines.push(`   定位：${p.role}`);
    if (p.personality) lines.push(`   性格：${p.personality}${p.tone ? `　说话风格：${p.tone}` : ""}`);
    if (p.voiceSample) lines.push(`   语气参考（不要照抄）：「${p.voiceSample}」`);
    if (p.relation) lines.push(`   关系：${p.relation}`);
    if (p.physiology) lines.push(`   生理：${p.physiology}`);
    if (p.outfit) {
      lines.push(`   着装：${p.outfit}${p.exposure !== undefined ? `（暴露度 ${p.exposure}%）` : ""}`);
    } else {
      lines.push("   着装：（未记录）");
    }
  }

  if (ctx.props?.length) {
    lines.push("");
    lines.push(`【可用道具】${ctx.props.join("、")}`);
  }

  if (ctx.priorBeats?.length) {
    lines.push("");
    lines.push("【已发生的节拍】（保持连贯，不要重复，不要倒退姿势）");
    for (const b of ctx.priorBeats) lines.push(`· ${b}`);
  }

  if (ctx.direction) {
    lines.push("");
    lines.push(`【本场走向】${ctx.direction}`);
  }

  if (ctx.extra) {
    lines.push("");
    lines.push(`【补充要求】${ctx.extra}`);
  }

  lines.push("");
  lines.push(
    ctx.beatCount
      ? `请生成 ${ctx.beatCount} 个节拍，用「---」分隔。注意：每句台词必须写成「角色名「台词」」。`
      : "请生成接下来的节拍。注意：每句台词必须写成「角色名「台词」」。"
  );

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

/** 台词识别：「角色名「台词」」 */
const SPEAKER_RE = /^([^「」\n]{1,12})\s*[「『]([^」』]+)[」』]/;

/**
 * 从一行文本中提取说话人与台词。
 * 支持「姐姐「别动。」」与「姐姐：别动。」两种写法。
 */
export function extractSpeech(line: string): { speaker: string; text: string } | null {
  const m = line.match(SPEAKER_RE);
  if (m) return { speaker: m[1].trim(), text: m[2].trim() };

  // 冒号写法：姐姐：别动。 / 姐姐：「别动。」
  const colon = line.match(/^([^：:\n]{1,12})[：:]\s*[「『]?([^」』]+?)[」』]?$/);
  if (colon && !/[，。！？；…]\s*$/.test(colon[1]) && colon[2].trim().length > 0) {
    return { speaker: colon[1].trim(), text: colon[2].trim() };
  }
  return null;
}

/**
 * 把模型输出的段落拆成四层。
 *
 * 处理顺序：
 *  1. 按换行切
 *  2. 按句末标点切（引号内不切）
 *  3. 台词优先识别说话人
 *  4. 其余按关键词启发式归类
 */
export function classifyLines(paragraph: string): Array<{ layer: string; text: string; speaker?: string }> {
  const out: Array<{ layer: string; text: string; speaker?: string }> = [];

  const rawLines = paragraph.split(/\n+/).map((s) => s.trim()).filter(Boolean);

  for (const rawLine of rawLines) {
    // 整行就是一句台词（含说话人）
    const whole = extractSpeech(rawLine);
    if (whole && rawLine.length < 80) {
      out.push({ layer: "speech", text: whole.text, speaker: whole.speaker });
      continue;
    }

    const segments = splitSentences(rawLine);
    for (const seg of segments) {
      const s = seg.trim();
      if (!s) continue;

      // 段落内嵌台词
      const sp = extractSpeech(s);
      if (sp) {
        out.push({ layer: "speech", text: sp.text, speaker: sp.speaker });
        continue;
      }
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
      flush();
      depth = 1;
      buf = ch;
      continue;
    }

    if (CLOSE_QUOTES.includes(ch) && depth === 1) {
      buf += ch;
      depth = 0;
      flush();
      continue;
    }

    buf += ch;

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
const MIND_RE = /(想|觉得|知道|意识|记忆|羞|耻|愧|怕|惧|渴望|欲|忍|克制|心|情绪|感受|以为|明白|恍惚|空白|十年|一直|从来|第一次|最后一次)/;

function classifyOne(s: string): string {
  if (/^[「『“‘"]/.test(s) || /[」』”’"]$/.test(s)) return "speech";

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
