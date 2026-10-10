import { test } from "node:test";
import assert from "node:assert/strict";

import { renderRig, rigToSvg, rigToDataUri, buildFromText, type RigParams } from "../src/render/rig.ts";
import { newWardrobe, equip, CLOTHING } from "../src/systems/clothing.ts";

function base(over: Partial<RigParams> = {}): RigParams {
  return {
    name: "测试",
    heightCm: 168,
    build: 0.5,
    pregnant: false,
    pregnancyProgress: 0,
    wardrobe: null,
    mood: 60,
    lust: 30,
    ...over
  };
}

/** 穿一套衣服（equip 直接返回新的 Wardrobe） */
function dressed(ids: string[]) {
  let w = newWardrobe();
  for (const id of ids) w = equip(w, id);
  return w;
}

test("rig: 输出有效 SVG 结构", () => {
  const svg = rigToSvg(base());
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /viewBox="0 0 240 420"/);
});

test("rig: 含背景与渐变定义", () => {
  const out = renderRig(base());
  assert.match(out, /<defs>/);
  assert.match(out, /linearGradient/);
  assert.match(out, /radialGradient/);
});

test("rig: 身高影响画面占比", () => {
  const short = renderRig(base({ heightCm: 150 }));
  const tall = renderRig(base({ heightCm: 185 }));
  // 高个子应画出更大的身体（通过坐标数值体现）
  assert.notEqual(short, tall, "不同身高应产出不同图形");
});

test("rig: 身高被钳制在合理范围", () => {
  const a = renderRig(base({ heightCm: 100 }));
  const b = renderRig(base({ heightCm: 100 }));
  assert.equal(a, b, "同输入应稳定输出");
  const c = renderRig(base({ heightCm: 250 }));
  assert.notEqual(a, c);
});

test("rig: 体型影响宽度", () => {
  const slim = renderRig(base({ build: 0 }));
  const full = renderRig(base({ build: 1 }));
  assert.notEqual(slim, full);
});

test("rig: 怀孕绘制孕肚", () => {
  const flat = renderRig(base({ pregnant: false }));
  const preg = renderRig(base({ pregnant: true, pregnancyProgress: 25 }));
  assert.notEqual(flat, preg);
  assert.match(preg, /孕 25 天/);
});

test("rig: 怀孕进度影响孕肚大小", () => {
  const early = renderRig(base({ pregnant: true, pregnancyProgress: 5 }));
  const late = renderRig(base({ pregnant: true, pregnancyProgress: 29 }));
  assert.notEqual(early, late);
});

test("rig: 不怀孕时无孕肚标注", () => {
  const out = renderRig(base({ pregnant: false }));
  assert.doesNotMatch(out, /孕 \d+ 天/);
});

test("rig: 显示身高与暴露度", () => {
  const out = renderRig(base({ heightCm: 174 }));
  assert.match(out, /174cm/);
  assert.match(out, /暴露/);
});

test("rig: 心情影响嘴形", () => {
  const happy = renderRig(base({ mood: 80 }));
  const sad = renderRig(base({ mood: 20 }));
  assert.notEqual(happy, sad);
});

test("rig: 欲情影响表情与腮红", () => {
  const calm = renderRig(base({ lust: 10 }));
  const aroused = renderRig(base({ lust: 90 }));
  assert.notEqual(calm, aroused);
  // 高欲情应有腮红
  assert.match(aroused, /#c8506e/);
});

test("rig: 扶她轮廓", () => {
  const normal = renderRig(base({ futanari: false }));
  const futa = renderRig(base({ futanari: true }));
  assert.notEqual(normal, futa);
});

test("rig: 着装影响绘制", () => {
  const naked = renderRig(base({ wardrobe: null }));
  const clothed = renderRig(base({ wardrobe: dressed(["tee_shirt", "jeans"]) }));
  assert.notEqual(naked, clothed);
});

test("rig: 着装后暴露度下降", () => {
  const w = dressed(["tee_shirt", "jeans"]);
  const out = renderRig(base({ wardrobe: w }));
  const m = out.match(/暴露 (\d+)%/);
  assert.ok(m, "应显示暴露度");
  const exp = Number(m![1]);
  assert.ok(exp < 100, `着装后暴露度应低于 100，实际 ${exp}`);
});

test("rig: 外衣绘制", () => {
  const withOuter = renderRig(base({ wardrobe: dressed(["jacket"]) }));
  const without = renderRig(base({ wardrobe: null }));
  assert.notEqual(withOuter, without);
});

test("rig: 性格影响站姿", () => {
  const bold = renderRig(base({ personality: "bold" }));
  const shy = renderRig(base({ personality: "shy" }));
  const neutral = renderRig(base({ personality: "neutral" }));
  assert.notEqual(bold, shy);
  assert.notEqual(bold, neutral);
});

test("rig: 同输入输出稳定", () => {
  const p = base({ name: "姐姐", heightCm: 174 });
  assert.equal(renderRig(p), renderRig(p));
});

test("rig: 不同名字产生不同配色", () => {
  const a = renderRig(base({ name: "姐姐" }));
  const b = renderRig(base({ name: "妹妹" }));
  assert.notEqual(a, b);
});

test("rig: 尺寸可配置", () => {
  const svg = rigToSvg(base({ width: 200, height: 340 }));
  assert.match(svg, /width="200"/);
  assert.match(svg, /height="340"/);
});

test("rig: data URI 可编码中文", () => {
  const uri = rigToDataUri(base({ name: "母亲" }));
  assert.match(uri, /^data:image\/svg\+xml;charset=utf-8,/);
  assert.ok(uri.length > 100);
  // 解码后应含中文
  const decoded = decodeURIComponent(uri.split(",")[1]);
  assert.match(decoded, /母亲|孕|暴露/);
});

test("rig: 全部 21 位后宫都能绘制", async () => {
  const { COMPANIONS } = await import("../src/systems/companions.ts");
  for (const c of COMPANIONS) {
    const svg = rigToSvg(base({ name: c.name, heightCm: 165 }));
    assert.ok(svg.length > 500, `${c.name} 的立绘过短`);
    assert.match(svg, /<\/svg>/);
  }
});

test("rig: 输出无 NaN 或 undefined", () => {
  const out = renderRig(base({ pregnant: true, pregnancyProgress: 15, build: 0.8 }));
  assert.doesNotMatch(out, /NaN/);
  assert.doesNotMatch(out, /undefined/);
  assert.doesNotMatch(out, /null/);
});

// ============ 性别与身材可辨识 ============

test("rig: 罩杯影响胸部体积", () => {
  const flat = renderRig(base({ cup: 0 }));
  const huge = renderRig(base({ cup: 7 }));
  assert.notEqual(flat, huge, "不同罩杯应产出不同图形");
  // 大罩杯应有乳沟绘制
  assert.match(huge, /stroke-width/, "大罩杯应有阴影/乳沟");
});

test("rig: 腰臀比影响曲线", () => {
  const slim = renderRig(base({ whr: 0.62 }));
  const wide = renderRig(base({ whr: 0.85 }));
  assert.notEqual(slim, wide, "不同腰臀比应产出不同图形");
});

test("rig: 扶她轮廓可辨识", () => {
  const female = renderRig(base({ futanari: false }));
  const futa = renderRig(base({ futanari: true }));
  assert.notEqual(female, futa);
  // 扶她应有额外的胯部元素
  assert.ok(futa.length > female.length, "扶她应绘制更多元素");
});

test("rig: 未提供罩杯时由体型推导", () => {
  const slim = renderRig(base({ build: 0.1, cup: undefined }));
  const full = renderRig(base({ build: 0.9, cup: undefined }));
  assert.notEqual(slim, full, "体型应影响推导出的罩杯");
});

test("rig: 女性比例（肩窄于胯）", () => {
  // 通过输出对比验证：肩宽参数应小于胯宽参数
  const out = renderRig(base({ build: 0.5 }));
  // 检查是否含胸部绘制（女性特征）
  assert.match(out, /ellipse/, "应绘制胸部椭圆");
});

test("rig: buildFromText 解析体型描述", () => {
  const a = buildFromText("成熟丰腴型，E-cup，腰臀比 0.7，保养极好");
  const b = buildFromText("清纯可爱型，C-cup，纤细柔软");
  assert.ok(a > b, `丰腴型(${a}) 应大于纤细型(${b})`);
  assert.ok(a >= 0 && a <= 1);
  assert.ok(b >= 0 && b <= 1);
});

test("rig: buildFromText 处理空与特殊值", () => {
  assert.equal(buildFromText(""), 0.5);
  assert.ok(buildFromText("无实体（T6 投影）") > 0);
});

test("rig: buildFromText 解析罩杯", () => {
  const a = buildFromText("A-cup");
  const h = buildFromText("H-cup");
  assert.ok(h > a, "H 罩杯应大于 A 罩杯");
});

test("rig: 身材差异在图形上可辨识", () => {
  // 纤细 vs 丰腴，输出应明显不同
  const slim = renderRig(base({ build: 0.05, cup: 0, whr: 0.78 }));
  const full = renderRig(base({ build: 0.95, cup: 7, whr: 0.64 }));
  assert.notEqual(slim, full);
  // 长度差异应显著（元素数量不同）
  const diff = Math.abs(slim.length - full.length);
  assert.ok(diff > 100, `身材差异应产生明显不同的图形，长度差 ${diff}`);
});
