import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newSexStats, applyActEvent, shotFor, shotTargetFor, insertionSide,
  sidesFor, recordSoloAct, recordConception, recordBirthStat,
  recordContraceptive, syncPregnancyHistory,
  unlockedActCount, insideRate, shotInsideRate, receivedInsideRate,
  receivedTotal, avgMinutes, topRatio, analLevel, analTotal,
  favoritePose, mainPartner, partUsage, sexStatsView, sexStatsSummary,
  medCapable, medFertile, MED_SHOT_NOTE,
  sexStatsToJSON, sexStatsFromJSON, INSIDE_SHOTS, SHOT_LABEL,
  type ActEvent
} from "../src/systems/sexStats.ts";

/** 默认：主角扶她且能致孕，同伴是普通女性 */
function ev(over: Partial<ActEvent> = {}): ActEvent {
  return {
    actId: "vaginal_missionary",
    day: 10,
    minutes: 18,
    heroFutanari: true,
    partnerFutanari: false,
    partnerMedType: "none",
    heroFutanariFertile: true,
    partnerFutanariFertile: false,
    heroCanConceive: false,
    partnerCanConceive: false,
    heroOrgasm: true,
    partnerOrgasm: true,
    usedLube: false,
    usedToy: false,
    usedEnema: false,
    usedContraceptive: false,
    ...over
  };
}

/** 服用娱乐型扶她药的同伴：能插入、能内射，但精子不致孕 */
function evRecMed(over: Partial<ActEvent> = {}): ActEvent {
  return ev({
    partnerFutanari: true,
    partnerMedType: "recreational",
    partnerFutanariFertile: false,
    ...over
  });
}

/** 服用怀孕型扶她药的同伴：精子具备致孕能力 */
function evPregMed(over: Partial<ActEvent> = {}): ActEvent {
  return ev({
    partnerFutanari: true,
    partnerMedType: "pregnant",
    partnerFutanariFertile: true,
    ...over
  });
}

// ============ 基础 ============

test("newSexStats 全零且可变字段独立", () => {
  const a = newSexStats();
  const b = newSexStats();
  assert.equal(a.acts, 0);
  assert.equal(a.firstDay, null);
  assert.equal(a.penetrate, 0);
  assert.equal(a.analPrep, 0);
  assert.deepEqual(a.partners, {});
  a.partners.x = 1;
  assert.deepEqual(b.partners, {}, "两个实例不应共享 partners 对象");
});

test("扶她药的插入与致孕能力分开判定", () => {
  assert.equal(medCapable("none"), false);
  assert.equal(medFertile("none"), false);
  assert.equal(medCapable("recreational"), true, "娱乐型可以插入");
  assert.equal(medFertile("recreational"), false, "娱乐型不能致孕");
  assert.equal(medCapable("pregnant"), true);
  assert.equal(medFertile("pregnant"), true);
  assert.match(MED_SHOT_NOTE.recreational, /可内射/);
  assert.match(MED_SHOT_NOTE.recreational, /不致孕/);
});

// ============ 射精落点 ============

test("shotFor：非扶她无落点", () => {
  assert.equal(shotFor("vaginal_missionary", false, "hero"), "none");
  assert.equal(shotFor("oral_receive", false, "hero"), "none");
});

test("shotFor：插入类由插入方射出", () => {
  assert.equal(shotFor("vaginal_missionary", true, "hero"), "vagina");
  assert.equal(shotFor("vaginal_doggy", true, "hero"), "vagina");
  assert.equal(shotFor("anal_give", true, "hero"), "anus");
  assert.equal(shotFor("anal_double", true, "hero"), "anus");
  assert.equal(shotFor("vaginal_missionary", true, "partner"), "none", "非插入方不射");
});

test("shotFor：口交（受）由主角口爆对方", () => {
  assert.equal(shotFor("oral_receive", true, "hero"), "mouth");
  assert.equal(shotFor("oral_receive", true, "partner"), "none");
});

test("shotFor：口交（施）由对方口爆主角（需对方有器官）", () => {
  assert.equal(shotFor("oral_give", true, "hero"), "none", "主角在用口，不射");
  assert.equal(shotFor("oral_give", true, "partner"), "mouth", "对方射出");
});

test("shotFor：互口时双方都口爆", () => {
  assert.equal(shotFor("oral_mutual", true, "hero"), "mouth");
  assert.equal(shotFor("oral_mutual", true, "partner"), "mouth");
});

test("shotFor：胸交为胸射，胸部爱抚不射", () => {
  assert.equal(shotFor("paizuri", true, "hero"), "breast");
  assert.equal(shotFor("paizuri", true, "partner"), "none");
  assert.equal(shotFor("breast_play", true, "hero"), "none");
});

test("shotFor：手 / 腿 / 足由被服务方射出", () => {
  assert.equal(shotFor("hand_give", true, "hero"), "none", "主角在用手");
  assert.equal(shotFor("hand_give", true, "partner"), "outside");
  assert.equal(shotFor("hand_receive", true, "hero"), "outside");
  assert.equal(shotFor("thigh_job", true, "hero"), "none");
  assert.equal(shotFor("thigh_job", true, "partner"), "outside");
  assert.equal(shotFor("foot_job", true, "partner"), "outside");
});

test("shotFor：准备 / 束缚 / 玩具不产生落点", () => {
  for (const a of ["anal_prep", "nipple_focus", "breast_play", "restraint_play", "toy_use_partner", "double_dildo"]) {
    assert.equal(shotFor(a, true, "hero"), "none", a);
    assert.equal(shotFor(a, true, "partner"), "none", a);
  }
});

test("shotFor：未知行为返回 none", () => {
  assert.equal(shotFor("no_such_act", true, "hero"), "none");
  assert.equal(shotTargetFor("no_such_act", true), "none");
});

// ============ 插入方向 ============

test("insertionSide：插入方向与行为方向一致", () => {
  assert.equal(insertionSide("vaginal_missionary"), "hero");
  assert.equal(insertionSide("anal_give"), "hero");
  assert.equal(insertionSide("anal_receive"), "partner");
  assert.equal(insertionSide("anal_double"), "hero", "双穴同时仍是主角插入" );
  assert.equal(insertionSide("vaginal_side"), "hero");
  assert.equal(insertionSide("oral_give"), "none", "口交不属于插入");
  assert.equal(insertionSide("hand_give"), "none");
  assert.equal(insertionSide("toy_use_partner"), "none");
  assert.equal(insertionSide("anal_prep"), "none");
});

test("sidesFor：施受映射", () => {
  assert.deepEqual(sidesFor("give"), { hero: { giver: true, receiver: false }, companion: { giver: false, receiver: true } });
  assert.deepEqual(sidesFor("receive"), { hero: { giver: false, receiver: true }, companion: { giver: true, receiver: false } });
  assert.deepEqual(sidesFor("mutual"), { hero: { giver: true, receiver: true }, companion: { giver: true, receiver: true } });
});

// ============ 双边记账 ============

test("applyActEvent：双方次数同步，且插与被插分别记", () => {
  const r = applyActEvent(newSexStats(), newSexStats(), ev(), "hero", "sister");
  assert.equal(r.hero.acts, 1);
  assert.equal(r.companion.acts, 1);
  assert.equal(r.hero.penetrate, 1, "主角是插入方");
  assert.equal(r.hero.penetrated, 0);
  assert.equal(r.companion.penetrate, 0);
  assert.equal(r.companion.penetrated, 1, "同伴是被插入方");
  assert.equal(r.hero.penetrateVagina, 1);
  assert.equal(r.companion.penetratedVagina, 1);
  assert.equal(r.hero.partners["sister"], 1);
  assert.equal(r.companion.partners["hero"], 1);
});

test("applyActEvent：主角射出去不增加自己的被内射", () => {
  const r = applyActEvent(newSexStats(), newSexStats(), ev(), "hero", "sister");
  assert.equal(r.heroShot, "vagina");
  assert.equal(r.hero.shots, 1);
  assert.equal(r.hero.shotInside, 1);
  assert.equal(r.hero.inside, 0, "自己射出去不能被算成被内射");
  assert.equal(r.companion.inside, 1, "同伴被内射");
  assert.equal(r.companion.shots, 0);
});

test("输入对象不被修改（不可变）", () => {
  const h = newSexStats();
  const c = newSexStats();
  applyActEvent(h, c, ev(), "hero", "sister");
  assert.equal(h.acts, 0);
  assert.equal(c.acts, 0);
  assert.deepEqual(h.poses, {});
  assert.deepEqual(h.partners, {});
});

// ============ 扶她药 ============

test("娱乐型扶她药：可以内射，但完全不产生受精风险", () => {
  const r = applyActEvent(
    newSexStats(), newSexStats(),
    evRecMed({ actId: "anal_receive", heroCanConceive: true, partnerCanConceive: true }),
    "hero", "sister"
  );
  assert.equal(r.partnerShot, "anus", "娱乐型也能内射");
  assert.equal(r.hero.inside, 1, "主角被内射");
  assert.equal(r.companion.shots, 1, "同伴确实射了");
  assert.equal(r.hero.fertilized, 0, "精子不致孕，主角色不应记受精风险");
});

test("怀孕型扶她药：同样内射，但产生受精风险", () => {
  const r = applyActEvent(
    newSexStats(), newSexStats(),
    evPregMed({ actId: "anal_receive", heroCanConceive: true }),
    "hero", "sister"
  );
  assert.equal(r.hero.inside, 1);
  assert.equal(r.hero.fertilized, 1, "怀孕型才有受精风险");
});

test("娱乐型与怀孕型的内射统计完全一致，仅致孕不同", () => {
  const a = applyActEvent(newSexStats(), newSexStats(), evRecMed({ actId: "vaginal_ride" }), "h", "c");
  const b = applyActEvent(newSexStats(), newSexStats(), evPregMed({ actId: "vaginal_ride" }), "h", "c");
  assert.equal(a.hero.inside, b.hero.inside);
  assert.equal(a.companion.shots, b.companion.shots);
  assert.equal(a.companion.shotInside, b.companion.shotInside);
});

test("主角被内射只在易孕窗口 + 精子有效时才记受精风险", () => {
  const noWindow = applyActEvent(newSexStats(), newSexStats(),
    evPregMed({ actId: "vaginal_ride", heroCanConceive: false }), "h", "c");
  assert.equal(noWindow.hero.inside, 1);
  assert.equal(noWindow.hero.fertilized, 0);
  const risky = applyActEvent(newSexStats(), newSexStats(),
    evPregMed({ actId: "vaginal_ride", heroCanConceive: true }), "h", "c");
  assert.equal(risky.hero.fertilized, 1);
});

test("同伴受精风险只在主角射入 + 同伴可孕时记", () => {
  const safe = applyActEvent(newSexStats(), newSexStats(),
    ev({ actId: "anal_give", partnerCanConceive: false }), "h", "c");
  assert.equal(safe.companion.fertilized, 0);
  const risky = applyActEvent(newSexStats(), newSexStats(),
    ev({ actId: "anal_give", partnerCanConceive: true }), "h", "c");
  assert.equal(risky.companion.fertilized, 1);
  assert.equal(risky.hero.fertilized, 0, "主角是射精方");
});

test("同伴无器官时口交（施）不产生射精", () => {
  const r = applyActEvent(newSexStats(), newSexStats(),
    ev({ actId: "oral_give", partnerFutanari: false }), "hero", "sister");
  assert.equal(r.partnerShot, "none");
  assert.equal(r.hero.inMouth, 0);
  assert.equal(r.companion.shots, 0);
  assert.equal(r.hero.givenOral, 1, "记录本身仍然存在");
});

// ============ 后庭专项 ============

test("后庭准备单独计入 analPrep 与 enema", () => {
  const r = applyActEvent(newSexStats(), newSexStats(),
    ev({ actId: "anal_prep", usedEnema: true }), "h", "c");
  assert.equal(r.hero.enema, 1, "准备工作只记一次灌肠");
  assert.equal(r.hero.analPrep, 1);
  assert.equal(r.companion.analPrep, 1);
  assert.equal(r.heroShot, "none");
  assert.equal(insertionSide("anal_prep"), "none");
});

test("后庭玩具与双穴分别计数", () => {
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_play" }), "h", "c").hero;
  assert.equal(s.analToy, 1);
  assert.equal(s.toys, 1, "后庭玩具同时计入玩具消耗");
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_double" }), "h", "c").hero;
  assert.equal(s.analDouble, 1);
  assert.equal(s.penetrateAnus, 1);
});

test("analTotal 统计施与受之和", () => {
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_give" }), "h", "c").hero;
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_receive" }), "h", "c").hero;
  assert.equal(s.penetrateAnus, 1);
  assert.equal(s.penetratedAnus, 1);
  assert.equal(analTotal(s), 2);
});

test("analLevel 随开发程度递增且封顶 10", () => {
  assert.equal(analLevel(newSexStats()), 0);
  let s = newSexStats();
  for (let i = 0; i < 5; i++) s = applyActEvent(s, newSexStats(), ev({ actId: "anal_prep" }), "h", "c").hero;
  const lv1 = analLevel(s);
  for (let i = 0; i < 60; i++) s = applyActEvent(s, newSexStats(), ev({ actId: "anal_double" }), "h", "c").hero;
  assert.ok(analLevel(s) > lv1, "开发后等级应上升");
  assert.equal(analLevel(s), 10, "封顶 10 级");
});

test("性玩具行为同时计入 toys 与对应专项", () => {
  const r = applyActEvent(newSexStats(), newSexStats(),
    ev({ actId: "toy_use_partner", usedToy: true }), "h", "c");
  assert.equal(r.hero.toys, 2, "行为本身 + usedToy");
  assert.equal(r.hero.analToy, 0, "玩具行为不一定是后庭玩具");
});

// ============ 道具与避孕 ============

test("润滑剂与灌肠准备双边都记", () => {
  const r = applyActEvent(newSexStats(), newSexStats(),
    ev({ actId: "anal_give", usedLube: true, usedEnema: true }), "h", "c");
  assert.equal(r.hero.lube, 1);
  assert.equal(r.companion.lube, 1);
  assert.equal(r.hero.enema, 1);
  assert.equal(r.companion.enema, 1);
});

test("事后避孕显式计数优先于差值", () => {
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_give", partnerCanConceive: true }), "h", "c").hero;
  assert.equal(s.fertilized, 0, "主角侧无受精风险");
  s = recordContraceptive(s);
  s = recordContraceptive(s);
  assert.equal(sexStatsView(s).pill, 2);
});

test("事后避孕缺省时回退为差值", () => {
  let c = newSexStats();
  c = applyActEvent(newSexStats(), c, ev({ partnerCanConceive: true }), "h", "c").companion;
  c = applyActEvent(newSexStats(), c, ev({ partnerCanConceive: true }), "h", "c").companion;
  c = recordConception(c);
  const v = sexStatsView(c);
  assert.equal(v.fertilized, 2);
  assert.equal(v.conceived, 1);
  assert.equal(v.pill, 1);
});

test("pill 不为负", () => {
  let s = newSexStats();
  s = recordConception(s);
  s = recordConception(s);
  assert.equal(sexStatsView(s).pill, 0);
});

// ============ 派生指标 ============

test("攻受比：纯插入为 100，纯被插入为 0", () => {
  const top = applyActEvent(newSexStats(), newSexStats(), ev({ actId: "anal_give" }), "h", "c").hero;
  assert.equal(topRatio(top), 100);
  const bottom = applyActEvent(newSexStats(), newSexStats(), ev({ actId: "anal_receive" }), "h", "c").hero;
  assert.equal(topRatio(bottom), 0);
  const half = applyActEvent(top, newSexStats(), ev({ actId: "anal_receive" }), "h", "c").hero;
  assert.equal(topRatio(half), 50);
  assert.equal(topRatio(newSexStats()), 0, "无记录时不应除零");
});

test("内射占比：自己射出去与被射接受分别计算，互不干扰", () => {
  let h = newSexStats();
  h = applyActEvent(h, newSexStats(), ev({ actId: "anal_give" }), "h", "c").hero;
  h = applyActEvent(h, newSexStats(), ev({ actId: "hand_receive" }), "h", "c").hero;
  assert.equal(h.shots, 2);
  assert.equal(shotInsideRate(h), 50);

  let c = newSexStats();
  c = applyActEvent(newSexStats(), c, ev({ actId: "anal_give" }), "h", "c").companion;
  c = applyActEvent(newSexStats(), c, ev({ actId: "hand_receive" }), "h", "c").companion;
  assert.equal(receivedTotal(c), 2);
  assert.equal(receivedInsideRate(c), 50);
  assert.equal(insideRate(h), 50);
  assert.equal(insideRate(c), 50);
  assert.equal(insideRate(newSexStats()), 0);
});

test("unlockedActCount / avgMinutes", () => {
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_give" }), "h", "c").hero;
  s = applyActEvent(s, newSexStats(), ev({ actId: "oral_receive", minutes: 12 }), "h", "c").hero;
  assert.equal(unlockedActCount(s), 2);
  assert.equal(avgMinutes(s), 15);
  assert.equal(avgMinutes(newSexStats()), 0);
});

test("favoritePose / mainPartner", () => {
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_give" }), "h", "sister").hero;
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_give" }), "h", "sister").hero;
  s = applyActEvent(s, newSexStats(), ev({ actId: "hand_give" }), "h", "mother").hero;
  assert.deepEqual(favoritePose(s), { id: "anal_give", count: 2 });
  assert.deepEqual(mainPartner(s), { id: "sister", count: 2 });
  assert.equal(favoritePose(newSexStats()), null);
  assert.equal(mainPartner(newSexStats()), null);
});

test("partUsage 覆盖五个部位，后庭含准备与玩具", () => {
  const p = partUsage(newSexStats());
  assert.deepEqual(p.map((x) => x.part), ["口", "前庭", "后庭", "手", "道具"]);
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_prep" }), "h", "c").hero;
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_give" }), "h", "c").hero;
  const anal = partUsage(s).find((x) => x.part === "后庭")!;
  assert.equal(anal.count, 2, "准备 1 + 插入 1");
});

// ============ 生育 ============

test("受精 / 生产 / 履历同步", () => {
  let s = newSexStats();
  s = recordConception(s);
  assert.equal(s.conceived, 1);
  s = recordBirthStat(s, 1);
  assert.equal(s.births, 1);
  assert.equal(s.children, 1);
  s = syncPregnancyHistory(s, { conceived: 4, births: 3, children: 3 });
  assert.equal(s.conceived, 4);
  assert.equal(s.births, 3);
  assert.equal(s.children, 3);
});

// ============ 展示结构 ============

test("sexStatsView：后庭准备状态随步骤数变化", () => {
  const s = newSexStats();
  assert.equal(sexStatsView(s, { analPrepSteps: 0, analPrepTotal: 2 }).prep, "未准备");
  assert.equal(sexStatsView(s, { analPrepSteps: 1, analPrepTotal: 2 }).prep, "1/2");
  assert.equal(sexStatsView(s, { analPrepSteps: 2, analPrepTotal: 2 }).prep, "已就绪");
  assert.equal(sexStatsView(s, { analPrepSteps: 2 }).prepReady, true);
});

test("sexStatsView：插入与后庭字段齐备", () => {
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_double" }), "h", "c").hero;
  const v = sexStatsView(s, { analPrepSteps: 2, analPrepTotal: 2 });
  assert.equal(v.penetrate, 1);
  assert.equal(v.penetrateAnus, 1);
  assert.equal(v.analDouble, 1);
  assert.equal(v.analLevel, 0, "1 次双穴不足以升级");
  assert.equal(v.prep, "已就绪");
  assert.equal(v.topRatio, 100);
});

test("sexStatsView：显示名可注入，未知 id 回退原 id", () => {
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_give" }), "h", "sister").hero;
  const v = sexStatsView(s, {
    poseName: (id) => (id === "anal_give" ? "后庭（施）" : undefined),
    partnerName: (id) => (id === "sister" ? "姐姐" : undefined)
  });
  assert.equal(v.pose, "后庭（施） · 1 次");
  assert.equal(v.partner, "姐姐");
  const v2 = sexStatsView(s, { poseName: () => "未知" });
  assert.equal(v2.partner, "sister", "未提供 partnerName 时应回退 id");
});

test("sexStatsView：空统计的偏好字段为占位符", () => {
  const v = sexStatsView(newSexStats());
  assert.equal(v.partner, "—");
  assert.equal(v.pose, "—");
  assert.equal(v.total, 0);
  assert.equal(v.prep, "未准备");
});

test("sexStatsSummary：无经验时有专属文案，有经验时含后庭", () => {
  assert.equal(sexStatsSummary(newSexStats(), "妹妹"), "妹妹尚无性经验");
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_give" }), "h", "c").hero;
  const t = sexStatsSummary(s, "姐姐");
  assert.match(t, /累计亲密 1 次/);
  assert.match(t, /插入 1 \/ 被插入 0/);
  assert.match(t, /后庭 1 次/);
});

test("recordSoloAct：单人行为只更新一侧", () => {
  const s = recordSoloAct(newSexStats(), ev({ actId: "hand_receive" }), "hero");
  assert.equal(s.acts, 1);
  assert.equal(s.shotOutside, 1);
  assert.deepEqual(s.partners, { hero: 1 });
});

// ============ JSON ============

test("JSON 往返：完整字段无丢失", () => {
  let s = newSexStats();
  s = applyActEvent(s, newSexStats(), ev({ actId: "anal_double", usedLube: true, partnerCanConceive: true }), "h", "sister").hero;
  s = recordConception(s);
  s = recordContraceptive(s);
  s = recordBirthStat(s, 2);
  const back = sexStatsFromJSON(sexStatsToJSON(s));
  assert.deepEqual(back, s);
});

test("JSON 往返：null / undefined 得到空统计", () => {
  assert.deepEqual(sexStatsFromJSON(null), newSexStats());
  assert.deepEqual(sexStatsFromJSON(undefined), newSexStats());
});

test("JSON 往返：缺字段按 0 补齐（旧存档兼容）", () => {
  const partial = { a: 3, ins: 2, pen: 1 } as never;
  const s = sexStatsFromJSON(partial);
  assert.equal(s.acts, 3);
  assert.equal(s.inside, 2);
  assert.equal(s.penetrate, 1);
  assert.equal(s.analPrep, 0, "旧存档没有后庭字段，应为 0");
  assert.equal(s.orgasm, 0);
  assert.deepEqual(s.partners, {});
});

// ============ 不变式 ============

test("不变式：连续 200 次行为后所有计数单调不减", () => {
  let h = newSexStats();
  let c = newSexStats();
  const ids = ["anal_give", "oral_receive", "hand_give", "paizuri", "vaginal_missionary"];
  const keys: Array<keyof typeof h> = ["acts", "orgasm", "penetrate", "penetrated", "inside", "outside", "toys", "shots", "analPrep"];
  const prev: Record<string, number> = {};
  for (const k of keys) prev[k] = 0;
  for (let i = 0; i < 200; i++) {
    const r = applyActEvent(h, c, ev({ actId: ids[i % ids.length], day: i + 1, minutes: 10 }), "hero", "sister");
    h = r.hero; c = r.companion;
    for (const k of keys) {
      const v = h[k] as number;
      assert.ok(v >= prev[k], `第 ${i} 轮 ${String(k)} 下降了`);
      prev[k] = v;
    }
  }
  assert.equal(h.acts, 200);
  assert.equal(c.acts, 200, "同伴侧次数应与主角侧一致");
});

test("不变式：射出的落点之和 = 射精总数", () => {
  let h = newSexStats();
  let c = newSexStats();
  const ids = ["anal_give", "oral_receive", "hand_receive", "paizuri", "vaginal_doggy"];
  for (let i = 0; i < 40; i++) {
    const r = applyActEvent(h, c, ev({ actId: ids[i % ids.length] }), "hero", "s");
    h = r.hero; c = r.companion;
  }
  assert.ok(h.shots > 0);
  assert.equal(h.shots, h.shotInside + h.shotOutside + h.shotMouth + h.shotFacial + h.shotBreast);
});

test("不变式：主角射出的每一发都记在同伴身上", () => {
  let h = newSexStats();
  let c = newSexStats();
  const ids = ["anal_give", "oral_receive", "hand_receive", "paizuri", "vaginal_ride"];
  for (let i = 0; i < 60; i++) {
    const r = applyActEvent(h, c, ev({ actId: ids[i % ids.length] }), "hero", "sister");
    h = r.hero; c = r.companion;
  }
  assert.equal(receivedTotal(c), h.shots, "主角射出的每一发都应记在同伴身上");
  assert.equal(c.shots, 0, "非扶她同伴不应产生射精");
  assert.equal(receivedTotal(h), 0, "双方都没反向射精时，主角不应被射到");
});

test("不变式：插入总次数与行为次数对齐", () => {
  let h = newSexStats();
  let c = newSexStats();
  const ids = ["anal_give", "vaginal_doggy", "anal_receive", "oral_give", "hand_give"];
  let insertActs = 0;
  for (let i = 0; i < 50; i++) {
    const id = ids[i % ids.length];
    if (insertionSide(id) === "hero" || insertionSide(id) === "both") insertActs++;
    const r = applyActEvent(h, c, ev({ actId: id }), "hero", "sister");
    h = r.hero; c = r.companion;
  }
  assert.equal(h.penetrate, insertActs, "主角插入次数应与插入类行为数一致");
  assert.equal(h.penetrate, c.penetrated, "主角插入数 = 同伴被插入数");
  assert.equal(c.penetrate, h.penetrated, "同伴插入数 = 主角被插入数");
});

test("INSIDE_SHOTS 与 SHOT_LABEL 覆盖一致", () => {
  for (const s of INSIDE_SHOTS) assert.ok(SHOT_LABEL[s]);
  assert.equal(INSIDE_SHOTS.length, 2);
});
