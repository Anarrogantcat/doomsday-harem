import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { buildParticipant, buildSceneContext } from "../src/context.ts";
import { buildMessages, extractSpeech, classifyLines } from "../src/prompt.ts";
import { GameSession } from "@doomsday/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(dirname(dirname(__dirname)), "core", "data", "scripts");

function makeSession(): GameSession {
  const s = new GameSession();
  const dir = SCRIPT_DIR;
  s.loadScripts(readdirSync(dir).filter((f) => f.endsWith(".dsl")).map((f) => readFileSync(join(dir, f), "utf8")));
  return s;
}

test("context: 主角上下文含性格与着装", () => {
  const s = makeSession();
  const p = buildParticipant(s, "主角");
  assert.equal(p.name, "主角");
  assert.ok(p.personality, "主角应有性格标注");
  assert.ok(p.tone, "主角应有说话风格");
  assert.ok(p.outfit, "主角应有着装描述");
  assert.ok(typeof p.exposure === "number");
  assert.ok(p.relation, "主角应有关系/状态描述");
});

test("context: 同伴上下文含全部关键字段", () => {
  const s = makeSession();
  const p = buildParticipant(s, "姐姐", "主导方");
  assert.equal(p.name, "姐姐");
  assert.equal(p.title, "企业项目经理");
  assert.equal(p.role, "主导方");
  assert.equal(p.personality, "主动强势");
  assert.match(p.tone ?? "", /直接/);
  assert.match(p.voiceSample ?? "", /回房间/);
  // 序章期间好感为亲情基准 50
  assert.match(p.relation ?? "", /好感 50/);
  assert.match(p.outfit ?? "", /围巾/);
  assert.ok((p.exposure ?? 100) < 20, "姐姐着装完整，暴露度应低");
});

test("context: 害羞角色性格标注正确", () => {
  const s = makeSession();
  const p = buildParticipant(s, "妹妹");
  assert.equal(p.personality, "害羞内敛");
  assert.match(p.voiceSample ?? "", /那个/);
});

test("context: 旁观者定位写入", () => {
  const s = makeSession();
  const p = buildParticipant(s, "妹妹", "旁观者（只观察与反应，不参与主要行为）");
  assert.match(p.role ?? "", /旁观者/);
});

test("context: 未知角色退化为最小上下文", () => {
  const s = makeSession();
  const p = buildParticipant(s, "不存在的角色");
  assert.equal(p.name, "不存在的角色");
  assert.equal(p.personality, undefined);
  assert.equal(p.outfit, undefined);
});

test("context: 完整场景上下文", () => {
  const s = makeSession();
  const ctx = buildSceneContext(s, {
    scene: {
      id: "test", title: "姐妹同场", tone: "姐姐主导",
      participants: ["主角", "姐姐", "妹妹"], beats: []
    },
    dominant: "姐姐",
    observers: ["妹妹"],
    props: ["双头龙"],
    pose: "床沿坐姿",
    beatCount: 2,
    direction: "姐姐主导，妹妹旁观"
  });

  assert.equal(ctx.title, "姐妹同场");
  assert.equal(ctx.pose, "床沿坐姿");
  assert.equal(ctx.beatCount, 2);
  assert.equal(ctx.participants.length, 3);
  assert.deepEqual(ctx.props, ["双头龙"]);
  assert.match(ctx.time ?? "", /第30天/);
  assert.ok(ctx.location);

  const sister = ctx.participants.find((p) => p.name === "姐姐")!;
  assert.equal(sister.role, "主导方");
  const sister2 = ctx.participants.find((p) => p.name === "妹妹")!;
  assert.match(sister2.role ?? "", /旁观者/);
});

test("context: 旁观者自动补入参与列表", () => {
  const s = makeSession();
  const ctx = buildSceneContext(s, {
    scene: { id: "t", title: "t", tone: "t", participants: ["主角", "姐姐"], beats: [] },
    observers: ["妹妹"]
  });
  assert.equal(ctx.participants.length, 3);
  assert.ok(ctx.participants.some((p) => p.name === "妹妹"));
});

test("context: 生成的提示词包含全部约束", () => {
  const s = makeSession();
  const ctx = buildSceneContext(s, {
    scene: { id: "t", title: "姐妹同场", tone: "姐姐主导", participants: ["主角", "姐姐", "妹妹"], beats: [] },
    dominant: "姐姐",
    observers: ["妹妹"],
    props: ["双头龙"],
    pose: "床沿坐姿",
    beatCount: 2
  });

  const msgs = buildMessages(ctx);
  const sys = msgs[0].content;
  const user = msgs[1].content;

  // 系统提示必须含全部约束
  assert.match(sys, /角色名「台词内容」/);
  assert.match(sys, /禁止血腥描写/);
  assert.match(sys, /害羞的角色不会主动扑上去/);
  assert.match(sys, /不得描写未穿着的衣物/);
  assert.match(sys, /双头龙：两端各由一人使用/);
  assert.match(sys, /旁观者/);

  // 用户提示必须含真实状态
  assert.match(user, /姐姐/);
  assert.match(user, /主动强势/);
  assert.match(user, /围巾/);
  assert.match(user, /好感 50/);
  assert.match(user, /旁观者/);
  assert.match(user, /双头龙/);
  assert.match(user, /床沿坐姿/);
  assert.match(user, /生成 2 个节拍/);
});

test("context: 不同角色生成不同提示词", () => {
  const s = makeSession();
  const ctxSister = buildSceneContext(s, {
    scene: { id: "t", title: "t", tone: "t", participants: ["主角", "姐姐"], beats: [] }
  });
  const ctxSister2 = buildSceneContext(s, {
    scene: { id: "t", title: "t", tone: "t", participants: ["主角", "妹妹"], beats: [] }
  });

  const u1 = buildMessages(ctxSister)[1].content;
  const u2 = buildMessages(ctxSister2)[1].content;
  assert.notEqual(u1, u2, "不同角色应产出不同提示词");
  assert.match(u1, /主动强势/);
  assert.match(u2, /害羞内敛/);
});

test("context: 着装随实际状态变化", () => {
  const s = makeSession();
  const before = buildParticipant(s, "姐姐");
  s.stripAll("sister");
  const after = buildParticipant(s, "姐姐");
  assert.notEqual(before.outfit, after.outfit);
  assert.equal(after.exposure, 100, "脱光后暴露度 100");
});

test("context: 关系数值随会话变化", () => {
  const s = makeSession();
  const before = buildParticipant(s, "姐姐");
  // 序章基准 50，加 30 → 80
  s.gainAffection("sister", 30, 20);
  const after = buildParticipant(s, "姐姐");
  assert.notEqual(before.relation, after.relation);
  assert.match(after.relation ?? "", /好感 80/);
});

test("context: 怀孕状态写入生理字段", () => {
  const s = makeSession();
  s.startHeroPregnancy("sister");
  s.sleep(10);
  const p = buildParticipant(s, "主角");
  assert.match(p.physiology ?? "", /已怀孕/);
});

test("context: 生成的文本可被分类器正确解析", () => {
  // 模拟模型按新规范输出
  const sample = `姐姐「抓紧我。」
你的手指按在双头龙金属环上，冰凉的触感顺着指缝攀爬。
妹妹「那、那个……姐姐？」
她缩在床角的影子里，呼吸声重得像受伤的小兽。`;

  const lines = classifyLines(sample);
  const speeches = lines.filter((l) => l.layer === "speech");
  assert.equal(speeches.length, 2, "应识别出两句台词");
  assert.equal(speeches[0].speaker, "姐姐");
  assert.equal(speeches[1].speaker, "妹妹");
  assert.equal(speeches[0].text, "抓紧我。");
  assert.ok(lines.some((l) => l.layer === "action"));
  assert.ok(lines.some((l) => l.layer === "sense"));
});

test("context: 冒号写法也能识别说话人", () => {
  const lines = classifyLines("姐姐：抓紧我。\n妹妹：我、我不敢。");
  const speeches = lines.filter((l) => l.layer === "speech");
  assert.equal(speeches.length, 2);
  assert.equal(speeches[0].speaker, "姐姐");
  assert.equal(speeches[1].speaker, "妹妹");
});

test("context: 主角台词标注为「主角」而非「你」", () => {
  const r = extractSpeech("主角「……好。」");
  assert.equal(r?.speaker, "主角");
  assert.equal(r?.text, "……好。");
});
