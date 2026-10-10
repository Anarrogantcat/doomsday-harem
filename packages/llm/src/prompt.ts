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

/**
 * 规范化模型输出，修复常见格式偏差。
 *
 * 处理的问题：
 *  1. 说话人与台词被换行拆开：`姐姐\n「台词」` → `姐姐「台词」`
 *  2. 嵌套引号：`「「台词」」` → `「台词」`
 *  3. 说话人后缀冒号：`姐姐：「台词」` → `姐姐「台词」`
 *  4. 引号用半角：`"台词"` → `「台词」`（仅当整行是台词时）
 */
export function normalizeOutput(text: string): string {
  let s = text;

  // 1) 说话人与引号之间被换行隔开（允许中间夹着 ? ？ : 等杂字符）
  //    但分隔符行（--- / *** / ===）不是说话人，必须排除
  s = s.replace(
    /([^\s「『"：:\n\-*=]{1,12})\s*\n\s*[?？:：,，.。]*\s*([「『])/g,
    "$1$2"
  );
  // 2) 嵌套引号收拢
  s = s.replace(/「「([^」]*)」」/g, "「$1」");
  s = s.replace(/『『([^』]*)』』/g, "『$1』");
  s = s.replace(/「『([^』]*)』」/g, "「$1」");
  // 3) 说话人后的冒号
  s = s.replace(/([^\s「『"：:\n]{1,12})[：:]\s*([「『])/g, "$1$2");
  // 4) 孤立的多余引号
  s = s.replace(/「」/g, "");
  s = s.replace(/^[?？]\s*(?=[「『])/gm, "");

  return s;
}

/** 节拍分隔符：兼容「---」「--- 节拍 1/5 ---」「***」等写法 */
const BEAT_SEPARATOR = /^\s*(?:-{3,}|\*{3,}|={3,})\s*(?:节拍\s*\d+\s*(?:\/\s*\d+)?\s*)?(?:-{3,}|\*{3,}|={3,})?\s*$/m;

/**
 * 解析模型输出：按分隔符切分节拍。
 * 同时剥离模型自带的「节拍 N/M」标题行。
 */
export function parseBeats(text: string): string[] {
  const normalized = normalizeOutput(text)
    // 去掉独占一行的节拍标题
    .replace(/^\s*节拍\s*\d+\s*(?:\/\s*\d+)?\s*[:：]?\s*$/gm, "")
    // 去掉行内的「--- 节拍 N/M ---」标记（保留 --- 供下面切分）
    .replace(/-{3,}\s*节拍\s*\d+\s*(?:\/\s*\d+)?\s*-{3,}/g, "---");

  return normalized
    .split(BEAT_SEPARATOR)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 判断一行是否只是节拍标记 */
export function isBeatMarker(line: string): boolean {
  return /^\s*(?:-{3,}|\*{3,}|={3,})\s*(?:节拍\s*\d+.*)?(?:-{3,})?\s*$/.test(line);
}

/** 台词识别：「角色名「台词」」 */
const SPEAKER_RE = /^([^「」\n]{1,12})\s*[「『]([^」』]+)[」』]/;

/**
 * 整行恰好是「角色名「台词」」，无任何前后缀。
 * 说话人名限制在 1-6 字，且不能含动词、代词、标点 ——
 * 避免把「你俯身吻她耳垂」这样的叙述误判成人名。
 */
const FULL_SPEECH_RE = /^([^「」\n]{1,6})\s*[「『]([^」』]+)[」』]$/;

/** 叙述性词汇：出现在「说话人」位置说明这是叙述而非人名 */
const NARRATION_WORDS = /[你我的了她他它们着过就都还又很太被把让使能动说问道看听想觉得站坐走跑俯身伸抬低抱吻舔咬手指膝盖腰唇舌臂腿脚呼吸喉眼嘴头肩背身]/;

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
export function classifyLines(
  paragraph: string,
  knownSpeakers: string[] = []
): Array<{ layer: string; text: string; speaker?: string }> {
  const out: Array<{ layer: string; text: string; speaker?: string }> = [];

  const rawLines = paragraph
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isBeatMarker(s))
    // 过滤孤立标点噪声行（模型偶尔输出单独的「。」）
    .filter((s) => !/^[。，、；：！？…—\-]+$/.test(s));

  /**
   * 从最近的上文推断说话人。
   *
   * 只看非台词行（动作/心理/感官描写），因为台词内容里出现的名字
   * 是「被称呼的对象」而非说话人。
   * 按距离加权：越近的行权重越高。
   */
  const inferSpeaker = (lookahead: string[] = []): string | undefined => {
    const scores = new Map<string, number>();

    // 向后看：最近几行非台词描写里提到的角色
    let weight = 3;
    for (let i = out.length - 1; i >= 0 && weight > 0; i--, weight--) {
      const line = out[i];
      if (line.layer === "speech") continue;
      for (const name of knownSpeakers) {
        if (name === "主角" || name === "你") continue;
        if (line.text.includes(name)) {
          scores.set(name, (scores.get(name) ?? 0) + weight);
        }
      }
    }

    // 向前看：若上文无线索，用后续描写推断（权重略低）
    let fw = 2;
    for (let i = 0; i < lookahead.length && fw > 0; i++, fw--) {
      for (const name of knownSpeakers) {
        if (name === "主角" || name === "你") continue;
        if (lookahead[i].includes(name)) {
          scores.set(name, (scores.get(name) ?? 0) + fw);
        }
      }
    }

    if (scores.size === 0) return undefined;
    return [...scores.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  /**
   * 由「引号前的叙述」判定说话人。
   *
   * 看主语小句（第一个小句）而非最后一个小句：
   *   「她的膝盖顶住你腰侧，呼吸喷在你耳后」→ 主语是「她」
   *   「你俯身用唇尖轻触她耳垂」→ 主语是「你」
   *   「大学女教师的手指…」→ 直接点名
   */
  const speakerFromNarration = (before: string): string | undefined => {
    if (!before.trim()) return undefined;
    const clauses = before.split(/[，,。；;]/).map((x) => x.trim()).filter(Boolean);
    const subject = clauses[0] ?? before;
    const females = knownSpeakers.filter((n) => n !== "主角" && n !== "你");

    // 1) 主语小句直接点名某角色
    const named = females.find((n) => subject.includes(n));
    if (named) return named;

    // 2) 主语是第二人称 → 主角
    if (/^(你|您)/.test(subject)) return "主角";

    // 3) 主语是第三人称代词 → 唯一候选
    if (/^(她|他|它)/.test(subject) && females.length === 1) return females[0];

    // 4) 叙述里提到唯一候选
    const inBefore = females.find((n) => before.includes(n));
    if (inBefore && females.length === 1) return inBefore;

    return undefined;
  };

  /** 取当前行之后的前几行非台词文本，供向前推断 */
  const lookaheadFrom = (startIdx: number): string[] => {
    const out2: string[] = [];
    for (let i = startIdx; i < rawLines.length && out2.length < 3; i++) {
      const l = rawLines[i];
      if (!l.includes("「")) out2.push(l);
    }
    return out2;
  };

  for (let rawIdx = 0; rawIdx < rawLines.length; rawIdx++) {
    const rawLine = rawLines[rawIdx];
    // 整行恰好是一句台词（含说话人），无前后缀。
    // 需校验前缀确实是个人名：要么是已知角色，要么不含叙述性词汇。
    const full = rawLine.match(FULL_SPEECH_RE);
    if (full) {
      const name = full[1].trim();
      const isKnown = knownSpeakers.includes(name);
      // 未登记的名字必须像人名：不含叙述性词汇
      const looksLikeName = !NARRATION_WORDS.test(name);
      if (isKnown || looksLikeName) {
        out.push({ layer: "speech", text: full[2].trim(), speaker: name });
        continue;
      }
      // 否则当作叙述+台词处理（落到下面的 inline 分支）
    }

    // 多引号行：`大学女教师「第一句」「第二句」`
    // 模型常把同一人的多句台词连写，需拆成多条
    const multiQuote = rawLine.match(/^([^「」\n]{1,6})\s*((?:[「『][^」』]*[」』])+)$/);
    if (multiQuote) {
      const nm = multiQuote[1].trim();
      const isKnown = knownSpeakers.includes(nm);
      if (isKnown || !NARRATION_WORDS.test(nm)) {
        const quotes = [...multiQuote[2].matchAll(/[「『]([^」』]*)[」』]/g)];
        for (const q of quotes) {
          const t = q[1].trim();
          if (t) out.push({ layer: "speech", text: t, speaker: nm });
        }
        if (quotes.length > 0) continue;
      }
    }

    // 冒号写法：`姐姐：抓紧我。`（无引号）
    const colonForm = rawLine.match(/^([^：:\n]{1,6})[：:]\s*(.+)$/);
    if (colonForm) {
      const nm = colonForm[1].trim();
      const isKnown = knownSpeakers.includes(nm);
      if (isKnown || !NARRATION_WORDS.test(nm)) {
        out.push({ layer: "speech", text: colonForm[2].trim(), speaker: nm });
        continue;
      }
    }

    const segments = splitSentences(rawLine);
    for (const seg of segments) {
      const s = seg.trim();
      if (!s) continue;

      // 丢弃纯引号残片（模型输出的孤立「」或」）
      if (/^[「『」』\s]*$/.test(s)) continue;
      if (/^[「『]?[…\.\s]*[」』]?$/.test(s)) continue;

      // 段落内嵌台词。仅当整段就是「名字「台词」」时才算，
      // 否则交给下面的 inline 分支按叙述+台词拆分。
      const spFull = s.match(FULL_SPEECH_RE);
      if (spFull) {
        const nm = spFull[1].trim();
        const known = knownSpeakers.includes(nm);
        if (known || !NARRATION_WORDS.test(nm)) {
          out.push({ layer: "speech", text: spFull[2].trim(), speaker: nm });
          continue;
        }
      }

      // 引号对 + 多余的闭合引号（「台词」」）→ 只取台词，丢弃多余引号
      const extraClose = s.match(/^[「『]([^」』]+)[」』][」』]+$/);
      if (extraClose) {
        const text = extraClose[1].trim();
        if (text) {
          const lastSpk = [...out].reverse().find((l) => l.layer === "speech")?.speaker;
          const prevNar = [...out].reverse().find((l) => l.layer !== "speech");
          const spk = lastSpk
            ?? (prevNar ? speakerFromNarration(prevNar.text) : undefined)
            ?? inferSpeaker(lookaheadFrom(rawIdx + 1))
            ?? "主角";
          out.push({ layer: "speech", text, speaker: spk });
        }
        continue;
      }

      // 引号闭合后还有叙述（`「别动。」她想了很久。`）→ 拆分
      const closeThenText = s.match(/^[「『]([^」』]*)[」』](.+)$/);
      if (closeThenText && closeThenText[2].trim()) {
        const speechText = closeThenText[1].trim();
        if (speechText) {
          const prevNar = [...out].reverse().find((l) => l.layer !== "speech");
          const spk =
            (prevNar ? speakerFromNarration(prevNar.text) : undefined) ??
            inferSpeaker(lookaheadFrom(rawIdx + 1)) ??
            "主角";
          out.push({ layer: "speech", text: speechText, speaker: spk });
        }
        const rest = closeThenText[2].trim();
        if (rest) out.push({ layer: classifyOne(rest), text: rest });
        continue;
      }

      // 纯引号行（无说话人）→ 从上下文推断
      const bare = s.match(/^[「『](.+(?:[」』]?))$/);
      if (bare) {
        const text = bare[1].replace(/[」』]$/, "").trim();

        // 孤立引号（模型输出的残片，如单独一个「」或」）→ 丢弃
        if (!text || /^[「『」』\s]*$/.test(text)) {
          continue;
        }

        // 若该行只有引号与省略号（如「……」），也视为残片
        if (/^[「『」』…\.\s]+$/.test(text)) {
          continue;
        }

        // 优先沿用上一位说话人（模型常把同一人的多句拆到多行）
        const lastSpeaker = [...out].reverse().find((l) => l.layer === "speech")?.speaker;

        // 其次用紧邻的上一条叙述行判定
        const prevNarration = [...out].reverse().find((l) => l.layer !== "speech");
        let inferred =
          lastSpeaker ??
          (prevNarration ? speakerFromNarration(prevNarration.text) : undefined) ??
          inferSpeaker(lookaheadFrom(rawIdx + 1));

        // 若台词开头直接呼唤某角色（如「姐姐……求求你」），
        // 说明说话人不是被呼唤者，需换一个候选
        const called = knownSpeakers.find(
          (n) => n !== "主角" && text.startsWith(n)
        );
        if (called && inferred === called) {
          const others = knownSpeakers.filter(
            (n) => n !== "主角" && n !== called && n !== "你"
          );
          inferred = others.length === 1 ? others[0] : undefined;
        }

        out.push({ layer: "speech", text, speaker: inferred });
        continue;
      }

      // 正文里夹着的引号 → 拆成「正文 + 台词 + 正文」
      // 形如：`你的呼吸扫过她耳畔「嘘——」`
      // 说话人判定：若引号前的正文以第二人称叙述主角动作，则说话人是主角
      const inline = s.match(/^(.+?)[「『]([^」』]+)[」』](.*)$/);
      if (inline && inline[1].trim().length > 0) {
        const before = inline[1].trim();
        out.push({ layer: classifyOne(before), text: before });

        const speaker =
          speakerFromNarration(before) ??
          inferSpeaker(lookaheadFrom(rawIdx + 1)) ??
          "主角";

        out.push({ layer: "speech", text: inline[2].trim(), speaker });
        if (inline[3].trim()) out.push({ layer: classifyOne(inline[3].trim()), text: inline[3].trim() });
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
 * 按句末标点切句。
 *
 * 关键：遇到开引号时**不**切断，保留引号前的叙述，这样后续才能
 * 依据「谁在说话之前做了什么」判定说话人。
 * 形如 `你的呼吸扫过她耳畔「嘘——」` 会作为一个整体段落下传。
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
      depth = 1;
      buf += ch;
      continue;
    }

    if (CLOSE_QUOTES.includes(ch) && depth === 1) {
      buf += ch;
      depth = 0;
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