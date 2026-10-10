/**
 * 程序化全身立绘。
 *
 * 为什么不用贴图：
 *  免费素材库（Kenney 等）没有合适的成人向整身人物，且静态贴图无法
 *  反映角色状态。程序化立绘可以按真实数据绘制：
 *  身高、体型、怀孕、着装（逐件）、暴露度、性格站姿、心情表情。
 *
 * 比例基准（以身高 bodyH 为单位，日式风格约 6.5 头身）：
 *  头       0.150
 *  颈       0.025
 *  肩→腰    0.175
 *  腰→胯    0.095
 *  胯→膝    0.255
 *  膝→踝    0.235
 *  脚       0.040
 *  合计     0.975
 *
 * 宽度（相对 bodyH）：
 *  肩 0.165 / 腰 0.105 / 胯 0.160 / 头宽 0.105
 *
 * 纯函数式：输入状态 → 输出 SVG 字符串。
 */
import type { Wardrobe, ClothingSlot, BodyZone } from "../systems/clothing.ts";
import { CLOTHING, exposure } from "../systems/clothing.ts";

export interface RigParams {
  name: string;
  heightCm: number;
  /** 体型 0-1（0 纤细 / 1 丰满） */
  build: number;
  /**
   * 罩杯 0-7（A=0 ... H=7），未提供时由 build 推导。
   * 直接控制胸部体积，是女性特征的主要视觉来源。
   */
  cup?: number;
  /**
   * 腰臀比（默认 0.72）。数值越小腰越细、臀越宽，女性曲线越明显。
   */
  whr?: number;
  pregnant: boolean;
  pregnancyProgress: number;
  wardrobe: Wardrobe | null;
  exposure?: number;
  mood: number;
  lust: number;
  personality?: string;
  futanari?: boolean;
  width?: number;
  height?: number;
}

function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

interface OutfitInfo {
  bySlot: Partial<Record<ClothingSlot, string>>;
  coverage: Partial<Record<BodyZone, number>>;
  exposure: number;
  hasOuter: boolean;
  hasUnderwearTop: boolean;
  hasUnderwearBottom: boolean;
}

function analyzeOutfit(w: Wardrobe | null): OutfitInfo {
  const bySlot: Partial<Record<ClothingSlot, string>> = {};
  const coverage: Partial<Record<BodyZone, number>> = {};

  if (w) {
    for (const [slot, g] of Object.entries(w.equipped)) {
      if (!g) continue;
      const def = CLOTHING.find((c) => c.id === g.itemId);
      if (!def) continue;
      bySlot[slot as ClothingSlot] = def.id;
      for (const [zone, cov] of Object.entries(def.coverage)) {
        const z = zone as BodyZone;
        coverage[z] = Math.max(coverage[z] ?? 0, cov as number);
      }
    }
  }

  return {
    bySlot,
    coverage,
    exposure: w ? exposure(w) : 100,
    hasOuter: !!bySlot.outer,
    hasUnderwearTop: !!bySlot.underwear_top,
    hasUnderwearBottom: !!bySlot.underwear_bottom
  };
}

function cov(info: OutfitInfo, zone: BodyZone): number {
  return info.coverage[zone] ?? 0;
}

export function renderRig(p: RigParams): string {
  const W = p.width ?? 240;
  const H = p.height ?? 420;
  const hue = hueOf(p.name);
  const info = analyzeOutfit(p.wardrobe);
  const exp = p.exposure ?? info.exposure;

  // 配色
  const skin = `hsl(${hue}, 30%, 78%)`;
  const skinMid = `hsl(${hue}, 26%, 70%)`;
  const skinDark = `hsl(${hue}, 22%, 58%)`;
  const hair = `hsl(${(hue + 200) % 360}, 36%, 24%)`;
  const hairHi = `hsl(${(hue + 200) % 360}, 32%, 38%)`;
  const clothTop = `hsl(${(hue + 45) % 360}, 40%, 48%)`;
  const clothBottom = `hsl(${(hue + 45) % 360}, 34%, 38%)`;
  const clothUnder = `hsl(${(hue + 320) % 360}, 46%, 54%)`;
  const clothOuter = `hsl(${(hue + 15) % 360}, 26%, 32%)`;
  const clothShoe = `hsl(${(hue + 210) % 360}, 18%, 26%)`;
  const lip = "#a84456";

  // 身高占比：150cm → 0.74，185cm → 0.94
  const hr = Math.max(0.70, Math.min(0.95, (p.heightCm - 96) / 96));
  const bodyH = H * hr;
  const top = H - bodyH - 8;

  // 纵向关键点（比例基准）
  const HEAD = bodyH * 0.150;
  const NECK = bodyH * 0.025;
  const TORSO = bodyH * 0.175;   // 肩→腰
  const PELVIS = bodyH * 0.095;  // 腰→胯
  const THIGH = bodyH * 0.242;   // 胯→膝
  const SHIN = bodyH * 0.222;    // 膝→踝
  const FOOT = bodyH * 0.042;

  const yTop = top;
  const yHeadC = yTop + HEAD * 0.5;
  const yNeck = yTop + HEAD;
  const yShoulder = yNeck + NECK;
  const yWaist = yShoulder + TORSO;
  const yHip = yWaist + PELVIS;
  const yKnee = yHip + THIGH;
  const yAnkle = yKnee + SHIN;
  const yFoot = yAnkle + FOOT;

  const cx = W / 2;

  // 宽度基准
  const build = p.build;
  const whr = p.whr ?? 0.72;

  // 罩杯：0-7，未提供时由体型推导
  const cup = p.cup ?? Math.max(0, Math.min(7, Math.round(build * 5 + 1)));

  // 肩宽：女性肩窄，且随体型略微增加（上限受控，避免男性化）
  const shoulderW = bodyH * (0.132 + build * 0.022);

  // 腰宽：由腰臀比反推 —— 腰臀比越小腰越细
  const hipBase = bodyH * (0.152 + build * 0.030);
  const waistW = hipBase * whr;
  const hipW = hipBase;

  const headW = bodyH * 0.104;
  const headH = HEAD * 0.92;

  // 四肢：女性四肢较细，但仍随体型变化（下限提高，避免火柴棍）
  const limbW = bodyH * (0.033 + build * 0.012);
  const thighW = limbW * (1.6 + build * 0.6);

  // 怀孕：孕肚宽度上限为胯宽的 0.9 倍，避免比例失真
  const pregT = p.pregnant ? Math.min(1, p.pregnancyProgress / 30) : 0;
  const bellyR = hipW * (0.30 + pregT * 0.60);

  // 站姿（性格）
  const stance = p.personality === "bold" || p.personality === "proud" ? 1
    : p.personality === "shy" || p.personality === "reserved" ? -1 : 0;
  const legGap = hipW * 0.30 + stance * bodyH * 0.012;

  const P: string[] = [];

  // ---------- 背景 ----------
  P.push(`<defs>
<linearGradient id="bg${hue}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#241c2e"/><stop offset="100%" stop-color="#100e16"/>
</linearGradient>
<radialGradient id="gl${hue}" cx="0.5" cy="0.32" r="0.65">
  <stop offset="0%" stop-color="hsl(${hue},45%,34%)" stop-opacity="0.40"/>
  <stop offset="100%" stop-color="transparent"/>
</radialGradient>
<linearGradient id="sk${hue}" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="${skinDark}"/>
  <stop offset="35%" stop-color="${skin}"/>
  <stop offset="100%" stop-color="${skinMid}"/>
</linearGradient>
<linearGradient id="cl${hue}" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="${clothBottom}"/>
  <stop offset="40%" stop-color="${clothTop}"/>
  <stop offset="100%" stop-color="${clothBottom}"/>
</linearGradient>
</defs>`);
  P.push(`<rect width="${W}" height="${H}" fill="url(#bg${hue})"/>`);
  P.push(`<rect width="${W}" height="${H}" fill="url(#gl${hue})"/>`);
  // 地面投影
  P.push(`<ellipse cx="${cx}" cy="${yFoot + 6}" rx="${hipW * 1.1}" ry="${bodyH * 0.012}" fill="#000" opacity="0.35"/>`);

  // ---------- 后发 ----------
  P.push(`<path d="M${cx - headW * 0.62} ${yHeadC - headH * 0.1}
    Q${cx - headW * 0.95} ${yHeadC + headH * 0.5} ${cx - headW * 0.72} ${yShoulder + TORSO * 0.55}
    L${cx + headW * 0.72} ${yShoulder + TORSO * 0.55}
    Q${cx + headW * 0.95} ${yHeadC + headH * 0.5} ${cx + headW * 0.62} ${yHeadC - headH * 0.1} Z"
    fill="${hair}"/>`);

  // ---------- 腿 ----------
  const thighTopW = hipW * 0.52;
  const kneeW = limbW * 1.45;
  const ankleW = limbW * 0.95;

  for (const side of [-1, 1]) {
    const hx = cx + side * hipW * 0.26;
    const kx = cx + side * legGap;
    const ax = kx + side * bodyH * 0.004;

    const legCovered = cov(info, "thigh") >= 0.5;
    const calfCovered = cov(info, "calf") >= 0.5;
    const footCovered = cov(info, "foot") >= 0.5;

    // 大腿（外侧饱满，内侧收窄）
    P.push(`<path d="M${hx - thighTopW * 0.52} ${yHip - bodyH * 0.005} L${hx + thighTopW * 0.52} ${yHip - bodyH * 0.005}
      Q${kx + side * kneeW * 0.62} ${yHip + THIGH * 0.35} ${kx + kneeW * 0.48} ${yKnee}
      L${kx - kneeW * 0.48} ${yKnee}
      Q${kx - side * kneeW * 0.30} ${yHip + THIGH * 0.55} ${hx - thighTopW * 0.42} ${yHip - bodyH * 0.005} Z"
      fill="${legCovered ? "url(#cl" + hue + ")" : "url(#sk" + hue + ")"}"/>`);
    // 小腿
    P.push(`<path d="M${kx - kneeW * 0.5} ${yKnee} L${kx + kneeW * 0.5} ${yKnee}
      Q${ax + ankleW * 0.55} ${(yKnee + yAnkle) / 2} ${ax + ankleW * 0.5} ${yAnkle}
      L${ax - ankleW * 0.5} ${yAnkle}
      Q${ax - ankleW * 0.55} ${(yKnee + yAnkle) / 2} ${kx - kneeW * 0.5} ${yKnee} Z"
      fill="${calfCovered ? "url(#cl" + hue + ")" : "url(#sk" + hue + ")"}"/>`);
    // 脚 / 鞋
    P.push(`<path d="M${ax - ankleW * 0.5} ${yAnkle} L${ax + ankleW * 0.5} ${yAnkle}
      L${ax + ankleW * 0.62} ${yFoot} L${ax - ankleW * 0.9} ${yFoot} Z"
      fill="${footCovered ? clothShoe : skinMid}"/>`);
  }

  // ---------- 胯部与臀（女性特征） ----------
  const hipCovered = cov(info, "buttock") >= 0.5 || cov(info, "genital") >= 0.5;
  const hipFill = hipCovered ? "url(#cl" + hue + ")" : "url(#sk" + hue + ")";

  // 主胯部：从细腰向外扩
  P.push(`<path d="M${cx - waistW * 0.50} ${yWaist}
    Q${cx - hipW * 0.68} ${yWaist + PELVIS * 0.45} ${cx - hipW * 0.58} ${yHip}
    L${cx + hipW * 0.58} ${yHip}
    Q${cx + hipW * 0.68} ${yWaist + PELVIS * 0.45} ${cx + waistW * 0.50} ${yWaist} Z"
    fill="${hipFill}"/>`);

  // 臀线（两侧外扩的弧）
  for (const side of [-1, 1]) {
    P.push(`<path d="M${cx + side * hipW * 0.52} ${yWaist + PELVIS * 0.35}
      Q${cx + side * hipW * 0.72} ${yHip - PELVIS * 0.15} ${cx + side * hipW * 0.50} ${yHip + PELVIS * 0.05}"
      fill="${hipCovered ? "url(#cl" + hue + ")" : "url(#sk" + hue + ")"}"/>`);
    // 臀沟阴影
    P.push(`<path d="M${cx + side * hipW * 0.20} ${yHip - PELVIS * 0.15}
      Q${cx + side * hipW * 0.34} ${yHip + PELVIS * 0.05} ${cx + side * hipW * 0.16} ${yHip + PELVIS * 0.15}"
      stroke="${skinDark}" stroke-width="${bodyH * 0.009}" fill="none" opacity="0.22"/>`);
  }

  // ---------- 扶她轮廓（明确可辨识） ----------
  if (p.futanari && cov(info, "genital") < 0.5) {
    const gx = cx;
    const gy = yHip + bodyH * 0.008;
    const gw = bodyH * 0.010;
    const gh = bodyH * 0.032;
    // 阴囊
    P.push(`<ellipse cx="${gx}" cy="${gy + gh * 0.45}" rx="${gw * 1.5}" ry="${gh * 0.42}" fill="${skinMid}"/>`);
    // 阴茎（略微前倾）
    P.push(`<path d="M${gx - gw * 0.55} ${gy - gh * 0.15}
      Q${gx - gw * 0.75} ${gy + gh * 0.55} ${gx} ${gy + gh * 0.62}
      Q${gx + gw * 0.75} ${gy + gh * 0.55} ${gx + gw * 0.55} ${gy - gh * 0.15}
      L${gx + gw * 0.30} ${gy - gh * 0.30}
      L${gx - gw * 0.30} ${gy - gh * 0.30} Z"
      fill="${skinMid}"/>`);
    // 龟头
    P.push(`<ellipse cx="${gx}" cy="${gy + gh * 0.58}" rx="${gw * 0.62}" ry="${gh * 0.22}" fill="${skin}"/>`);
    // 高光
    P.push(`<path d="M${gx - gw * 0.25} ${gy - gh * 0.1} L${gx - gw * 0.25} ${gy + gh * 0.45}"
      stroke="#fff" stroke-width="${gw * 0.2}" stroke-linecap="round" opacity="0.18"/>`);
  }

  // ---------- 躯干（沙漏型曲线） ----------
  const chestCovered = cov(info, "chest") >= 0.5;
  const bellyCovered = cov(info, "belly") >= 0.5;
  const ribW = shoulderW * 0.92;          // 肋部：介于肩与腰之间

  P.push(`<path d="M${cx - shoulderW * 0.50} ${yShoulder + 2}
    Q${cx - ribW * 0.62} ${yShoulder + TORSO * 0.30} ${cx - ribW * 0.56} ${yShoulder + TORSO * 0.55}
    Q${cx - waistW * 0.54} ${yWaist - TORSO * 0.10} ${cx - waistW * 0.50} ${yWaist}
    L${cx + waistW * 0.50} ${yWaist}
    Q${cx + waistW * 0.54} ${yWaist - TORSO * 0.10} ${cx + ribW * 0.56} ${yShoulder + TORSO * 0.55}
    Q${cx + ribW * 0.62} ${yShoulder + TORSO * 0.30} ${cx + shoulderW * 0.50} ${yShoulder + 2} Z"
    fill="${chestCovered || bellyCovered ? "url(#cl" + hue + ")" : "url(#sk" + hue + ")"}"/>`);

  // 腰部内收阴影（强化曲线）
  for (const side of [-1, 1]) {
    P.push(`<path d="M${cx + side * waistW * 0.42} ${yWaist - TORSO * 0.22}
      Q${cx + side * waistW * 0.50} ${yWaist - TORSO * 0.05} ${cx + side * waistW * 0.40} ${yWaist + PELVIS * 0.2}"
      stroke="${skinDark}" stroke-width="${bodyH * 0.010}" fill="none" opacity="0.16"/>`);
  }

  // 肩
  for (const side of [-1, 1]) {
    P.push(`<ellipse cx="${cx + side * shoulderW * 0.48}" cy="${yShoulder + bodyH * 0.008}"
      rx="${bodyH * 0.022}" ry="${bodyH * 0.020}"
      fill="${chestCovered ? "url(#cl" + hue + ")" : "url(#sk" + hue + ")"}"/>`);
  }

  // ---------- 胸部（女性特征的主要视觉来源） ----------
  // 罩杯映射到半径：A≈0.028H，H≈0.058H
  const bustR = bodyH * (0.026 + cup * 0.0046);
  const bustY = yShoulder + TORSO * (0.34 + cup * 0.008);
  // 罩杯越大，越向外下垂
  const bustDrop = cup * bodyH * 0.004;
  const bustSep = shoulderW * (0.20 + cup * 0.012);

  // 是否可见：未穿衣，或只穿内衣（内衣会勾勒轮廓）
  const showBust = !chestCovered || info.hasUnderwearTop;
  if (showBust) {
    const bustFill = chestCovered ? "url(#cl" + hue + ")" : "url(#sk" + hue + ")";
    for (const side of [-1, 1]) {
      const bx = cx + side * bustSep;
      const by = bustY + bustDrop;
      // 主体
      P.push(`<ellipse cx="${bx}" cy="${by}" rx="${bustR * 1.05}" ry="${bustR * 0.98}" fill="${bustFill}"/>`);
      // 下缘阴影（体现重量感）
      P.push(`<path d="M${bx - bustR * 0.9} ${by + bustR * 0.15} Q${bx} ${by + bustR * 1.1} ${bx + bustR * 0.9} ${by + bustR * 0.15}"
        fill="${skinDark}" opacity="0.18"/>`);
      // 乳头（仅裸露时）
      if (!chestCovered) {
        P.push(`<ellipse cx="${bx + side * bustR * 0.35}" cy="${by + bustR * 0.42}" rx="${bustR * 0.22}" ry="${bustR * 0.19}"
          fill="${skinDark}" opacity="0.75"/>`);
      }
    }
    // 乳沟（罩杯较大时更明显）
    if (cup >= 3) {
      P.push(`<path d="M${cx} ${bustY - bustR * 0.4} L${cx} ${bustY + bustR * 1.15}"
        stroke="${skinDark}" stroke-width="${bustR * 0.22}" stroke-linecap="round"
        fill="none" opacity="0.28"/>`);
    }
  }

  // 怀孕隆起：位于腰与胯之间，宽度渐进
  if (p.pregnant) {
    const bellyCY = yWaist + PELVIS * 0.42;
    const bellyFill = bellyCovered ? "url(#cl" + hue + ")" : "url(#sk" + hue + ")";
    P.push(`<ellipse cx="${cx}" cy="${bellyCY}" rx="${bellyR}" ry="${bellyR * 0.86}" fill="${bellyFill}"/>`);
    // 肚脐
    if (!bellyCovered) {
      P.push(`<ellipse cx="${cx}" cy="${bellyCY + bellyR * 0.25}" rx="${bellyR * 0.09}" ry="${bellyR * 0.05}"
        fill="${skinDark}" opacity="0.55"/>`);
    }
    // 孕肚高光
    P.push(`<ellipse cx="${cx - bellyR * 0.32}" cy="${bellyCY - bellyR * 0.22}" rx="${bellyR * 0.30}" ry="${bellyR * 0.26}"
      fill="#fff" opacity="0.07"/>`);
  }

  // ---------- 手臂 ----------
  const armCovered = cov(info, "arm") >= 0.5;
  const handCovered = cov(info, "hand") >= 0.5;
  const armFill = armCovered ? "url(#cl" + hue + ")" : "url(#sk" + hue + ")";
  const elbowY = yShoulder + TORSO * 0.62;
  const wristY = yWaist + PELVIS * 0.55;

  for (const side of [-1, 1]) {
    const sx = cx + side * shoulderW * 0.46;
    const ex = cx + side * (shoulderW * 0.58 + stance * bodyH * 0.008);
    const wx = cx + side * (shoulderW * 0.56 + stance * bodyH * 0.010);

    P.push(`<path d="M${sx - limbW * 0.55} ${yShoulder + 4}
      Q${ex - limbW * 0.5} ${elbowY} ${wx - limbW * 0.42} ${wristY}
      L${wx + limbW * 0.42} ${wristY}
      Q${ex + limbW * 0.5} ${elbowY} ${sx + limbW * 0.55} ${yShoulder + 4} Z"
      fill="${armFill}"/>`);
    // 手（与前臂相接）
    P.push(`<path d="M${wx - limbW * 0.40} ${wristY}
      Q${wx - limbW * 0.62} ${wristY + limbW * 1.05} ${wx} ${wristY + limbW * 1.25}
      Q${wx + limbW * 0.62} ${wristY + limbW * 1.05} ${wx + limbW * 0.40} ${wristY} Z"
      fill="${handCovered ? clothOuter : skinMid}"/>`);
  }

  // ---------- 内衣 ----------
  if (info.hasUnderwearBottom && !hipCovered) {
    P.push(`<path d="M${cx - hipW * 0.44} ${yWaist + PELVIS * 0.45} L${cx + hipW * 0.44} ${yWaist + PELVIS * 0.45}
      L${cx + hipW * 0.30} ${yHip} L${cx - hipW * 0.30} ${yHip} Z" fill="${clothUnder}"/>`);
  }

  // ---------- 外衣 ----------
  if (info.hasOuter) {
    for (const side of [-1, 1]) {
      P.push(`<path d="M${cx + side * shoulderW * 0.52} ${yShoulder}
        Q${cx + side * shoulderW * 0.72} ${yShoulder + TORSO * 0.6} ${cx + side * shoulderW * 0.50} ${yWaist + PELVIS * 0.4}
        L${cx + side * shoulderW * 0.38} ${yWaist + PELVIS * 0.4}
        Q${cx + side * shoulderW * 0.56} ${yShoulder + TORSO * 0.6} ${cx + side * shoulderW * 0.40} ${yShoulder} Z"
        fill="${clothOuter}"/>`);
    }
  }

  // ---------- 颈 ----------
  P.push(`<path d="M${cx - bodyH * 0.018} ${yNeck - 4} L${cx + bodyH * 0.018} ${yNeck - 4}
    L${cx + bodyH * 0.022} ${yShoulder + 4} L${cx - bodyH * 0.022} ${yShoulder + 4} Z"
    fill="${skinMid}"/>`);

  // ---------- 头 ----------
  P.push(`<ellipse cx="${cx}" cy="${yHeadC}" rx="${headW * 0.5}" ry="${headH * 0.5}" fill="url(#sk${hue})"/>`);
  // 下颌收窄
  P.push(`<path d="M${cx - headW * 0.42} ${yHeadC + headH * 0.12}
    Q${cx} ${yHeadC + headH * 0.62} ${cx + headW * 0.42} ${yHeadC + headH * 0.12}"
    fill="url(#sk${hue})"/>`);
  // 耳
  for (const side of [-1, 1]) {
    P.push(`<ellipse cx="${cx + side * headW * 0.50}" cy="${yHeadC + headH * 0.05}" rx="${headW * 0.05}" ry="${headH * 0.08}" fill="${skinMid}"/>`);
  }

  // ---------- 前发 ----------
  P.push(`<path d="M${cx - headW * 0.54} ${yHeadC - headH * 0.05}
    Q${cx - headW * 0.62} ${yHeadC - headH * 0.62} ${cx} ${yHeadC - headH * 0.58}
    Q${cx + headW * 0.62} ${yHeadC - headH * 0.62} ${cx + headW * 0.54} ${yHeadC - headH * 0.05}
    Q${cx + headW * 0.36} ${yHeadC - headH * 0.36} ${cx + headW * 0.10} ${yHeadC - headH * 0.30}
    Q${cx - headW * 0.10} ${yHeadC - headH * 0.40} ${cx - headW * 0.28} ${yHeadC - headH * 0.28}
    Q${cx - headW * 0.42} ${yHeadC - headH * 0.34} ${cx - headW * 0.54} ${yHeadC - headH * 0.05} Z"
    fill="${hair}"/>`);
  P.push(`<path d="M${cx - headW * 0.30} ${yHeadC - headH * 0.50}
    Q${cx - headW * 0.05} ${yHeadC - headH * 0.62} ${cx + headW * 0.22} ${yHeadC - headH * 0.46}"
    stroke="${hairHi}" stroke-width="${headH * 0.045}" fill="none" stroke-linecap="round" opacity="0.75"/>`);

  // ---------- 表情 ----------
  const eyeY = yHeadC + headH * 0.02;
  const eyeDx = headW * 0.20;
  const eyeOpen = p.lust > 72 ? 0.55 : p.mood < 30 ? 0.75 : 1;
  const eyeR = headW * 0.075;

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDx;
    P.push(`<ellipse cx="${ex}" cy="${eyeY}" rx="${eyeR}" ry="${eyeR * 1.15 * eyeOpen}" fill="#f2eef6"/>`);
    P.push(`<ellipse cx="${ex}" cy="${eyeY}" rx="${eyeR * 0.62}" ry="${eyeR * 0.95 * eyeOpen}" fill="${hair}"/>`);
    P.push(`<circle cx="${ex - eyeR * 0.2}" cy="${eyeY - eyeR * 0.3}" r="${eyeR * 0.24}" fill="#fff" opacity="0.9"/>`);
    // 眼线
    P.push(`<path d="M${ex - eyeR * 1.2} ${eyeY - eyeR * 0.9} Q${ex} ${eyeY - eyeR * 1.5} ${ex + eyeR * 1.2} ${eyeY - eyeR * 0.85}"
      stroke="#2a1f30" stroke-width="${headH * 0.022}" fill="none" stroke-linecap="round"/>`);
  }
  // 眉
  for (const side of [-1, 1]) {
    const bx = cx + side * eyeDx;
    P.push(`<path d="M${bx - eyeR * 0.9} ${eyeY - eyeR * 1.9} Q${bx} ${eyeY - eyeR * 2.2} ${bx + eyeR * 0.9} ${eyeY - eyeR * 1.85}"
      stroke="${hair}" stroke-width="${headH * 0.020}" fill="none" stroke-linecap="round" opacity="0.85"/>`);
  }

  // 鼻
  P.push(`<path d="M${cx} ${yHeadC + headH * 0.12} L${cx + headW * 0.04} ${yHeadC + headH * 0.17}"
    stroke="${skinDark}" stroke-width="${headH * 0.014}" fill="none" stroke-linecap="round" opacity="0.6"/>`);

  // 嘴
  const my = yHeadC + headH * 0.30;
  if (p.lust > 68) {
    P.push(`<ellipse cx="${cx}" cy="${my}" rx="${headW * 0.075}" ry="${headH * 0.045}" fill="${lip}"/>`);
    P.push(`<ellipse cx="${cx}" cy="${my + headH * 0.012}" rx="${headW * 0.045}" ry="${headH * 0.020}" fill="#6e2a38"/>`);
  } else if (p.mood > 62) {
    P.push(`<path d="M${cx - headW * 0.085} ${my - headH * 0.008} Q${cx} ${my + headH * 0.055} ${cx + headW * 0.085} ${my - headH * 0.008}"
      stroke="${lip}" stroke-width="${headH * 0.026}" fill="none" stroke-linecap="round"/>`);
  } else if (p.mood < 34) {
    P.push(`<path d="M${cx - headW * 0.085} ${my + headH * 0.022} Q${cx} ${my - headH * 0.028} ${cx + headW * 0.085} ${my + headH * 0.022}"
      stroke="${lip}" stroke-width="${headH * 0.026}" fill="none" stroke-linecap="round"/>`);
  } else {
    P.push(`<path d="M${cx - headW * 0.07} ${my} L${cx + headW * 0.07} ${my}"
      stroke="${lip}" stroke-width="${headH * 0.024}" stroke-linecap="round"/>`);
  }

  // 腮红
  if (p.lust > 50 || p.mood > 72) {
    const a = Math.min(0.45, (p.lust - 35) / 160 + 0.16);
    for (const side of [-1, 1]) {
      P.push(`<ellipse cx="${cx + side * headW * 0.32}" cy="${yHeadC + headH * 0.18}"
        rx="${headW * 0.13}" ry="${headH * 0.07}" fill="#c8506e" opacity="${a.toFixed(2)}"/>`);
    }
  }

  // ---------- 角标 ----------
  P.push(`<text x="${W - 8}" y="16" text-anchor="end" font-size="10" fill="#8b94a3"
    font-family="system-ui,sans-serif">${p.heightCm}cm</text>`);
  P.push(`<text x="${W - 8}" y="29" text-anchor="end" font-size="10" fill="#8b94a3"
    font-family="system-ui,sans-serif">暴露 ${Math.round(exp)}%</text>`);
  if (p.pregnant) {
    P.push(`<text x="${W - 8}" y="42" text-anchor="end" font-size="10" fill="#c8506e"
      font-family="system-ui,sans-serif">孕 ${Math.floor(p.pregnancyProgress)} 天</text>`);
  }

  return P.join("\n");
}

export function rigToSvg(p: RigParams): string {
  const W = p.width ?? 240;
  const H = p.height ?? 420;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${renderRig(p)}</svg>`;
}

export function rigToDataUri(p: RigParams): string {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(rigToSvg(p));
}

/**
 * 从角色数据的体型描述文字推断数值（0-1）。
 *
 * 角色数据里的 build 是文字（如「成熟丰腴型，E-cup，腰臀比 0.7」），
 * 这里做关键词映射，让立绘能反映实际体型。
 */
export function buildFromText(desc: string): number {
  if (!desc) return 0.5;

  let score = 0.5;

  // 丰满程度
  if (/丰腴|丰满|成熟/.test(desc)) score += 0.22;
  if (/纤细|清纯|娇小|柔软/.test(desc)) score -= 0.18;
  if (/蜂腰|翘臀|御姐/.test(desc)) score += 0.10;
  if (/运动|结实|肌肉/.test(desc)) score += 0.05;
  if (/无实体|投影|仿生/.test(desc)) score = 0.45;

  // 罩杯
  const cup = desc.match(/([A-H])-?cup/i);
  if (cup) {
    const idx = cup[1].toUpperCase().charCodeAt(0) - 65; // A=0
    score += (idx - 2) * 0.055;
  }

  // 腰臀比
  const whr = desc.match(/腰臀比\s*([0-9.]+)/);
  if (whr) {
    const v = parseFloat(whr[1]);
    if (!isNaN(v)) score += (v - 0.7) * 1.2;
  }

  return Math.max(0, Math.min(1, score));
}

/** 从角色数据一次性构造立绘参数 */
export function rigParamsFromCompanion(c: {
  name: string;
  heightCm: number;
  build: string;
  personality?: string;
  pregnant?: boolean;
  pregnancyProgress?: number;
  mood?: number;
  lust?: number;
  exposure?: number;
  wardrobe?: Wardrobe | null;
  futanari?: boolean;
}): RigParams {
  return {
    name: c.name,
    heightCm: c.heightCm || 168,
    build: buildFromText(c.build),
    pregnant: c.pregnant ?? false,
    pregnancyProgress: c.pregnancyProgress ?? 0,
    wardrobe: c.wardrobe ?? null,
    exposure: c.exposure,
    mood: c.mood ?? 60,
    lust: c.lust ?? 30,
    personality: c.personality,
    futanari: c.futanari ?? false
  };
}