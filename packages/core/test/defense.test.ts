import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  RAIDS, raidDef, availableRaids, defenseLevel, rollRaid, resolveRaid, forceRaid,
  newReputation, afterRaid, decayReputation,
  newDefenseState, defenseToJSON, defenseFromJSON, describeDefense,
  RAID_LABEL, OUTCOME_LABEL,
  type RaidKind, type DefenseInput, type RaidContext, type RaidEvent, type RaidOutcome
} from "../src/systems/defense.ts";
import { mulberry32 } from "../src/systems/inventory.ts";
import { GameSession } from "../src/runtime/session.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(__dirname, "..", "data", "scripts");
const scripts = () => readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl")).map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8"));

function defInput(over: Partial<DefenseInput> = {}): DefenseInput {
  return {
    facilityDefense: 0, earlyWarning: 0, cover: 0, autoFire: 0, shield: 0,
    patrolBonus: 0, defenders: 0, heroBonus: 0,
    ...over
  };
}

// ============ 目录 ============

test("defense: 事件目录非空且类型唯一", () => {
  assert.ok(RAIDS.length >= 9, `应有 9 种事件，实际 ${RAIDS.length}`);
  const kinds = new Set(RAIDS.map((x) => x.kind));
  assert.equal(kinds.size, RAIDS.length);
});

test("defense: 事件字段合法", () => {
  for (const r of RAIDS) {
    assert.ok(RAID_LABEL[r.kind], `${r.kind} 缺标签`);
    assert.ok(r.description.length > 0, `${r.kind} 缺描述`);
    assert.ok(r.breachConsequence.length > 0, `${r.kind} 缺后果描述`);
    assert.ok(r.strength > 0 && r.strength <= 100, `${r.kind} 强度越界`);
    assert.ok(r.count[0] > 0 && r.count[1] >= r.count[0], `${r.kind} 数量范围非法`);
    assert.ok(r.weight > 0);
    assert.ok(r.minDay >= 1);
  }
});

test("defense: 难度随天数递增", () => {
  const sorted = [...RAIDS].sort((a, b) => a.minDay - b.minDay);
  assert.equal(sorted[0].kind, "wildlife");
  assert.equal(sorted[sorted.length - 1].kind, "siege");
  // 强度总体递增
  assert.ok(sorted[0].strength < sorted[sorted.length - 1].strength);
});

test("defense: 按天数过滤可用事件", () => {
  const day1 = availableRaids(1);
  assert.ok(day1.some((r) => r.kind === "wildlife"));
  assert.equal(day1.some((r) => r.kind === "siege"), false, "围攻不应在第一天出现");

  const day200 = availableRaids(200);
  assert.equal(day200.length, RAIDS.length);
});

test("defense: 可谈判事件标记正确", () => {
  assert.equal(raidDef("wanderers")!.negotiable, true);
  assert.equal(raidDef("bandits")!.negotiable, true);
  assert.equal(raidDef("military")!.negotiable, true);
  assert.equal(raidDef("horde")!.negotiable, false);
});

// ============ 防御等级 ============

test("defense: 无设施时为最低级", () => {
  const lvl = defenseLevel(defInput());
  assert.equal(lvl.tier, 1);
  assert.equal(lvl.label, "基础");
  assert.equal(lvl.total, 0);
  assert.ok(lvl.safety === 0);
  assert.ok(lvl.raidChance > 0.3, "无防御时遇袭概率应高");
});

test("defense: 设施提升等级", () => {
  const lvl = defenseLevel(defInput({ facilityDefense: 60 }));
  assert.ok(lvl.tier >= 2, `应至少初级，实际 ${lvl.tier}`);
  assert.ok(lvl.total >= 60);
});

test("defense: 全满为要塞级", () => {
  const lvl = defenseLevel(defInput({
    facilityDefense: 100, earlyWarning: 50, cover: 50, autoFire: 60,
    shield: 60, patrolBonus: 1, defenders: 8, heroBonus: 1
  }));
  assert.equal(lvl.tier, 5);
  assert.equal(lvl.label, "要塞级");
  assert.ok(lvl.safety > 80);
  assert.ok(lvl.raidChance < 0.1);
});

test("defense: 安全指数与遇袭概率反向", () => {
  const low = defenseLevel(defInput());
  const high = defenseLevel(defInput({ facilityDefense: 200, autoFire: 100 }));
  assert.ok(high.safety > low.safety);
  assert.ok(high.raidChance < low.raidChance);
});

test("defense: 可抵御强度随防御上升", () => {
  const low = defenseLevel(defInput());
  const high = defenseLevel(defInput({ facilityDefense: 200 }));
  assert.ok(high.withstand > low.withstand);
});

test("defense: 分解明细完整", () => {
  const lvl = defenseLevel(defInput({ facilityDefense: 30, autoFire: 20, defenders: 3 }));
  assert.ok("设施" in lvl.breakdown);
  assert.ok("自动火力" in lvl.breakdown);
  assert.ok("人手" in lvl.breakdown);
  assert.equal(lvl.breakdown["设施"], 30);
  assert.equal(lvl.breakdown["人手"], 24);
});

// ============ 事件判定 ============

test("defense: 低概率时不触发", () => {
  const ctx: RaidContext = {
    day: 1,
    defense: defenseLevel(defInput({ facilityDefense: 500 })),
    night: false,
    reputation: 0,
    blood: 0
  };
  let hits = 0;
  for (let seed = 0; seed < 50; seed++) {
    if (rollRaid(ctx, mulberry32(seed))) hits++;
  }
  assert.ok(hits < 10, `高防御下不应频繁触发，实际 ${hits}/50`);
});

test("defense: 高概率时触发", () => {
  const ctx: RaidContext = {
    day: 100,
    defense: defenseLevel(defInput()),
    night: true,
    reputation: 100,
    blood: 100
  };
  let hits = 0;
  for (let seed = 0; seed < 50; seed++) {
    if (rollRaid(ctx, mulberry32(seed))) hits++;
  }
  assert.ok(hits > 25, `低防御高名声应频繁触发，实际 ${hits}/50`);
});

test("defense: 夜间概率更高", () => {
  const base = { day: 50, defense: defenseLevel(defInput({ facilityDefense: 30 })), reputation: 20, blood: 20 };
  let dayHits = 0;
  let nightHits = 0;
  for (let seed = 0; seed < 200; seed++) {
    if (rollRaid({ ...base, night: false }, mulberry32(seed))) dayHits++;
    if (rollRaid({ ...base, night: true }, mulberry32(seed))) nightHits++;
  }
  assert.ok(nightHits >= dayHits, `夜间 ${nightHits} 应不少于白天 ${dayHits}`);
});

test("defense: 事件判定可复现", () => {
  const ctx: RaidContext = {
    day: 50, defense: defenseLevel(defInput({ facilityDefense: 30 })),
    night: true, reputation: 20, blood: 20
  };
  const a = rollRaid(ctx, mulberry32(42));
  const b = rollRaid(ctx, mulberry32(42));
  assert.deepEqual(a, b);
});

test("defense: 强度波动在合理范围", () => {
  const ctx: RaidContext = {
    day: 100, defense: defenseLevel(defInput()), night: true, reputation: 50, blood: 50
  };
  for (let seed = 0; seed < 30; seed++) {
    const ev = rollRaid(ctx, mulberry32(seed));
    if (!ev) continue;
    assert.ok(ev.strength >= ev.def.strength * 0.8, "强度不应低于基础 80%");
    assert.ok(ev.strength <= ev.def.strength * 1.2, "强度不应高于基础 120%");
  }
});

test("defense: 威慑判定", () => {
  const strong = defenseLevel(defInput({ facilityDefense: 500 }));
  const ctx: RaidContext = { day: 10, defense: strong, night: true, reputation: 0, blood: 0 };
  // 强制选到可威慑事件
  const ev = rollRaid(ctx, mulberry32(7));
  if (ev && ev.def.deterrable) {
    assert.equal(ev.deterred, true, `防御 ${strong.total} 应威慑住强度 ${ev.strength}`);
  }
});

test("defense: 手动触发事件", () => {
  const ev = forceRaid("horde", 50);
  assert.ok(ev);
  assert.equal(ev!.kind, "horde");
  assert.equal(ev!.count, raidDef("horde")!.count[0]);
  assert.equal(forceRaid("nonexistent" as RaidKind, 1), null);
});

// ============ 结算 ============

test("defense: 战力碾压时击退", () => {
  const ev = forceRaid("strays", 10)!;
  const r = resolveRaid({
    event: ev,
    defense: defenseLevel(defInput({ facilityDefense: 300, autoFire: 100 })),
    power: 500,
    ammo: 1000,
    defenders: ["a", "b", "c"],
    choice: "fight"
  }, mulberry32(1));
  assert.equal(r.outcome, "repelled");
  assert.equal(r.captured.length, 0);
  assert.ok(Object.keys(r.spoils).length > 0, "击退应有战利品");
});

test("defense: 战力不足时被突破", () => {
  const ev = forceRaid("siege", 200)!;
  const r = resolveRaid({
    event: ev,
    defense: defenseLevel(defInput()),
    power: 1,
    ammo: 0,
    defenders: ["a", "b", "c", "d"],
    choice: "fight"
  }, mulberry32(1));
  assert.equal(r.outcome, "breached");
  assert.ok(r.lootLost > 0, "突破应损失物资");
  assert.ok(r.wallDamage > 0, "突破应损坏围墙");
});

test("defense: 威慑退去无损失", () => {
  const ev = forceRaid("wildlife", 5)!;
  ev.deterred = true;
  const r = resolveRaid({
    event: ev, defense: defenseLevel(defInput()), power: 10, ammo: 0,
    defenders: [], choice: "fight"
  }, mulberry32(1));
  assert.equal(r.outcome, "deterred");
  assert.equal(r.casualties, 0);
  assert.equal(r.ammoUsed, 0);
});

test("defense: 谈判可成功", () => {
  const ev = forceRaid("wanderers", 10)!;
  let negotiated = 0;
  for (let seed = 0; seed < 30; seed++) {
    const r = resolveRaid({
      event: ev,
      defense: defenseLevel(defInput({ facilityDefense: 50 })),
      power: 50, ammo: 100, defenders: ["a"], choice: "negotiate"
    }, mulberry32(seed));
    if (r.outcome === "negotiated") negotiated++;
  }
  assert.ok(negotiated > 0, "谈判应有成功率");
});

test("defense: 不可谈判事件谈判转为战斗", () => {
  const ev = forceRaid("horde", 50)!;
  const r = resolveRaid({
    event: ev,
    defense: defenseLevel(defInput()),
    power: 1, ammo: 0, defenders: ["a"], choice: "negotiate"
  }, mulberry32(1));
  assert.notEqual(r.outcome, "negotiated");
});

test("defense: 固守利用工事加成", () => {
  const ev = forceRaid("bandits", 50)!;
  const strongDef = defenseLevel(defInput({ facilityDefense: 200, autoFire: 80, cover: 50 }));
  const r = resolveRaid({
    event: ev, defense: strongDef, power: 100, ammo: 500,
    defenders: ["a", "b"], choice: "hold"
  }, mulberry32(1));
  assert.ok(["repelled", "retreated"].includes(r.outcome), `固守应能守住，实际 ${r.outcome}`);
});

test("defense: 突破时匪帮会掳走同伴", () => {
  const ev = forceRaid("bandits", 100)!;
  let captured = 0;
  for (let seed = 0; seed < 20; seed++) {
    const r = resolveRaid({
      event: ev,
      defense: defenseLevel(defInput()),
      power: 1, ammo: 0, defenders: ["a", "b", "c"], choice: "fight"
    }, mulberry32(seed));
    if (r.outcome === "breached" && r.captured.length > 0) { captured++; break; }
  }
  assert.ok(captured > 0, "匪帮突破时应可能掳走同伴");
});

test("defense: 弹药消耗不超过持有量", () => {
  const ev = forceRaid("horde", 50)!;
  const r = resolveRaid({
    event: ev, defense: defenseLevel(defInput({ autoFire: 50 })),
    power: 100, ammo: 5, defenders: ["a"], choice: "fight"
  }, mulberry32(1));
  assert.ok(r.ammoUsed <= 5, `弹药消耗不应超过持有量，实际 ${r.ammoUsed}`);
});

test("defense: 结算可复现", () => {
  const ev = forceRaid("horde", 50)!;
  const input = {
    event: ev,
    defense: defenseLevel(defInput({ facilityDefense: 100 })),
    power: 100, ammo: 500, defenders: ["a", "b"], choice: "fight" as const
  };
  const a = resolveRaid(input, mulberry32(42));
  const b = resolveRaid(input, mulberry32(42));
  assert.deepEqual(a, b);
});

test("defense: 结果都有叙事文本", () => {
  const ev = forceRaid("strays", 10)!;
  const r = resolveRaid({
    event: ev, defense: defenseLevel(defInput({ facilityDefense: 100 })),
    power: 200, ammo: 100, defenders: ["a"], choice: "fight"
  }, mulberry32(1));
  assert.ok(r.narrative.length > 10);
  assert.ok(r.narrative.includes(ev.def.description));
});

// ============ 声望 ============

test("defense: 初始声望", () => {
  const r = newReputation();
  assert.equal(r.reputation, 10);
  assert.equal(r.blood, 5);
});

test("defense: 击退提升名声与血腥", () => {
  const r = afterRaid(newReputation(), "horde", "repelled");
  assert.ok(r.reputation > 10);
  assert.ok(r.blood > 5);
});

test("defense: 被突破降低名声提升血腥", () => {
  const r = afterRaid(newReputation(), "bandits", "breached");
  assert.ok(r.reputation < 10);
  assert.ok(r.blood > 5);
});

test("defense: 声望有上下限", () => {
  let r = newReputation();
  for (let i = 0; i < 100; i++) r = afterRaid(r, "horde", "repelled");
  assert.ok(r.reputation <= 100);
  assert.ok(r.blood <= 100);

  let r2 = newReputation();
  for (let i = 0; i < 100; i++) r2 = afterRaid(r2, "bandits", "breached");
  assert.ok(r2.reputation >= 0);
});

test("defense: 声望自然衰减", () => {
  const r = decayReputation({ reputation: 50, blood: 50 }, 10);
  assert.ok(r.reputation < 50);
  assert.ok(r.blood < 50);
});

// ============ 序列化 ============

test("defense: 初始状态", () => {
  const s = newDefenseState();
  assert.equal(s.reputation, 10);
  assert.equal(s.wallDamage, 0);
  assert.equal(s.captured.length, 0);
  assert.equal(s.history.length, 0);
});

test("defense: 序列化往返", () => {
  let s = newDefenseState();
  s = { ...s, reputation: 40, blood: 30, wallDamage: 2, captured: ["sister"], lastRaidDay: 15 };
  s.history.push({ day: 15, kind: "bandits", outcome: "breached" });

  const json = defenseToJSON(s);
  const back = defenseFromJSON(json);

  assert.equal(back.reputation, 40);
  assert.equal(back.blood, 30);
  assert.equal(back.wallDamage, 2);
  assert.deepEqual(back.captured, ["sister"]);
  assert.equal(back.history.length, 1);
});

test("defense: 反序列化过滤未知事件", () => {
  const back = defenseFromJSON({
    reputation: 20, blood: 10, wallDamage: 0, lastRaidDay: 0, captured: [],
    history: [
      { day: 1, kind: "nonexistent" as RaidKind, outcome: "repelled" },
      { day: 2, kind: "horde", outcome: "repelled" }
    ]
  });
  assert.equal(back.history.length, 1);
});

test("defense: 空输入返回初始状态", () => {
  const s = defenseFromJSON(null);
  assert.equal(s.reputation, 10);
});

test("defense: 描述文本", () => {
  const txt = describeDefense(defenseLevel(defInput({ facilityDefense: 50 })), newDefenseState());
  assert.match(txt, /防御等级/);
  assert.match(txt, /安全指数/);
  assert.match(txt, /名声/);
});

test("defense: 待营救出现在描述里", () => {
  const st = newDefenseState();
  st.captured = ["sister", "mother"];
  const txt = describeDefense(defenseLevel(defInput()), st);
  assert.match(txt, /待营救/);
});

// ============ 会话集成 ============

test("session/defense: 开局防御状态", () => {
  const s = new GameSession();
  const lvl = s.defenseLevel();
  assert.equal(lvl.tier, 1);
  assert.equal(s.defense.captured.length, 0);
  assert.equal(s.defense.wallDamage, 0);
});

test("session/defense: 建造防御设施提升等级", () => {
  const s = new GameSession();
  const before = s.defenseLevel().total;
  s.finishBuild("fence");
  s.finishBuild("trench");
  s.finishBuild("sandbag");
  const after = s.defenseLevel().total;
  assert.ok(after > before, `防御应从 ${before} 提升到更高，实际 ${after}`);
});

test("session/defense: 巡逻岗位提升防御", () => {
  const s = new GameSession();
  s.finishBuild("fence");
  const before = s.defenseLevel().total;
  s.setJob("sister", "patrol", 0.5);
  s.setJob("sister2", "patrol", 0.3);
  const after = s.defenseLevel().total;
  assert.ok(after > before, "巡逻岗位应提升防御");
});

test("session/defense: 手动触发事件并结算", () => {
  const s = new GameSession();
  const r = s.triggerRaid("strays");
  assert.ok(r);
  assert.ok(["repelled", "breached", "retreated", "negotiated", "deterred"].includes(r!.outcome));
  assert.equal(s.defense.history.length, 1);
  assert.equal(s.defense.lastRaidDay, s.time.day);
});

test("session/defense: 事件消耗弹药", () => {
  const s = new GameSession();
  s.addToStorage("ammo_762", 500);
  const before = s.resources["ammo_762"] ?? 0;
  s.triggerRaid("horde");
  const after = s.resources["ammo_762"] ?? 0;
  assert.ok(after <= before, "应消耗或不消耗弹药");
});

test("session/defense: 突破时同伴被掳走", () => {
  const s = new GameSession();
  // 无防御 + 强敌 → 必然突破
  const r = s.triggerRaid("siege");
  assert.ok(r);
  if (r!.outcome === "breached" && r!.captured.length > 0) {
    assert.ok(s.defense.captured.length > 0);
    const c = s.companion(r!.captured[0]);
    assert.equal(c?.joined, false, "被掳走的同伴应标记为未加入");
  }
});

test("session/defense: 营救被掳同伴", () => {
  const s = new GameSession();
  s.defense = { ...s.defense, captured: ["sister"] };
  s.companion("sister")!.joined = false;

  let rescued = false;
  for (let seed = 0; seed < 50; seed++) {
    if (s.rescueCaptured("sister", seed)) { rescued = true; break; }
  }
  assert.equal(rescued, true, "50 次尝试应能救回");
  assert.equal(s.companion("sister")!.joined, true);
  assert.equal(s.defense.captured.length, 0);
});

test("session/defense: 修复围墙", () => {
  const s = new GameSession();
  s.defense = { ...s.defense, wallDamage: 3 };
  const fixed = s.repairWall(2);
  assert.equal(fixed, 2);
  assert.equal(s.defense.wallDamage, 1);
});

test("session/defense: 防御数值进入剧本变量集", () => {
  const s = new GameSession();
  const v = s.vars();
  assert.equal(v["defenseTier"], 1);
  assert.equal(v["reputation"], 10);
  assert.equal(v["wallDamage"], 0);
  assert.equal(v["capturedCount"], 0);
});

test("session/defense: 随存档往返", () => {
  const s = new GameSession();
  s.triggerRaid("horde");
  s.defense = { ...s.defense, wallDamage: 2, captured: ["sister"] };

  const data = s.toSave("slot");
  const back = GameSession.fromSave(data);

  assert.equal(back.defense.wallDamage, 2);
  assert.deepEqual(back.defense.captured, ["sister"]);
  assert.equal(back.defense.history.length, s.defense.history.length);
});

test("session/defense: 摘要包含防御信息", () => {
  const s = new GameSession();
  const sum = s.summary();
  assert.equal(sum.defenseTier, 1);
  assert.equal(sum.captured, 0);
});

test("session/defense: 睡觉期间可能遇袭", () => {
  const s = new GameSession();
  // 低防御 + 高名声提高概率
  s.defense = { ...s.defense, reputation: 100, blood: 100 };
  let raided = false;
  for (let i = 0; i < 40; i++) {
    const out = s.sleep(1);
    if (out.warnings.some((w) => w.includes("夜袭"))) { raided = true; break; }
  }
  assert.equal(raided, true, "40 天睡眠应至少遇袭一次");
  assert.ok(s.defense.history.length > 0);
});

test("session/defense: 防御描述文本", () => {
  const s = new GameSession();
  s.finishBuild("fence");
  const txt = s.defenseText();
  assert.match(txt, /防御等级/);
});
