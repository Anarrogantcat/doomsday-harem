import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LAWS, INVARIANTS, LAW_CATEGORY_LABEL, lawDef, lawsByCategory,
  lawsByStatus, lawIdGaps, lawsSummary, lawImplemented,
  checkParticipants, checkCaptiveRule,
  checkPartnerFate, checkPartnerHistoryLimit,
  IRREVERSIBLE_FATES, REVERSIBLE_FATES, PARTNER_HISTORY_LIMIT,
  NTR_FORBIDDEN_TERMS, scanForbiddenTerms,
  type Participant
} from "../src/systems/laws.ts";

// ============ 铁律注册表 ============

test("十五条铁律齐备且编号连续", () => {
  assert.equal(LAWS.length, 15);
  assert.deepEqual(lawIdGaps(), [], "编号必须无重、无缺口");
});

test("每条铁律字段完整", () => {
  for (const l of LAWS) {
    assert.ok(l.id, "id 不可为空");
    assert.ok(l.name, l.id + " 缺 name");
    assert.ok(l.rule, l.id + " 缺 rule");
    assert.ok(LAW_CATEGORY_LABEL[l.category], l.id + " 分类无效");
    assert.ok(Array.isArray(l.targets) && l.targets.length > 0, l.id + " 缺 targets");
  }
});

test("lawDef 可按 id 取到", () => {
  assert.equal(lawDef("L-1")?.name, "禁止同伴被侵犯 / 被展示");
  assert.equal(lawDef("L-15")?.name, "淫纹");
  assert.equal(lawDef("L-99"), undefined);
});

test("L-14 魅魔血脉必须挂在 INV-6 上", () => {
  assert.ok(lawDef("L-14")?.invariants?.includes("INV-6"));
});

test("L-15 淫纹必须挂在 INV-7 上（NTR 对抗机制）", () => {
  assert.ok(lawDef("L-15")?.invariants?.includes("INV-7"));
});

test("分类与状态筛选", () => {
  assert.ok(lawsByCategory("exclusivity").length >= 3);
  assert.ok(lawsByCategory("dominance").length >= 3);
  assert.equal(lawsByStatus("decided").length + lawsByStatus("implemented").length, 15);
});

test("lawsSummary 统计正确", () => {
  const s = lawsSummary();
  assert.equal(s.laws, 15);
  assert.equal(s.invariants, 9);
  assert.equal(s.pendingInvariants, 2, "INV-7 / INV-8 尚未落地");
  const sum = Object.values(s.byCategory).reduce((a, b) => a + b, 0);
  assert.equal(sum, 15);
});

test("lawImplemented：当前全部未落地（仅记录状态）", () => {
  assert.equal(lawImplemented("L-1"), false);
});

// ============ 不变式 ============

test("九条不变式齐备", () => {
  assert.equal(INVARIANTS.length, 9);
  const ids = INVARIANTS.map((i) => i.id);
  for (let n = 0; n <= 8; n++) {
    assert.ok(ids.includes("INV-" + n), "缺 INV-" + n);
  }
});

test("INV-7 / INV-8 校验时机为运行时", () => {
  const i7 = INVARIANTS.find((i) => i.id === "INV-7")!;
  const i8 = INVARIANTS.find((i) => i.id === "INV-8")!;
  assert.equal(i7.when, "runtime");
  assert.equal(i8.when, "runtime");
});

// ============ 参与者白名单（INV-7）============

const H = (id = "hero"): Participant => ({ id, kind: "hero" });
const C = (id = "sister"): Participant => ({ id, kind: "companion" });
const E = (id = "bandit1"): Participant => ({ id, kind: "enemy" });
const O = (id = "stranger"): Participant => ({ id, kind: "outsider" });

test("INV-7：主角 + 后宫 → 合法", () => {
  assert.deepEqual(checkParticipants([H(), C()]), []);
});

test("INV-7：后宫 + 后宫 → 合法（L-9 后宫互交）", () => {
  assert.deepEqual(checkParticipants([C("a"), C("b")]), []);
});

test("INV-7：主角 + 敌人 → 合法（L-7 榨精）", () => {
  assert.deepEqual(checkParticipants([H(), E()]), []);
});

test("INV-7：敌人 + 同伴 → 违规（这才是 NTR）", () => {
  const v = checkParticipants([E(), C()]);
  assert.equal(v.length, 1);
  assert.equal(v[0].code, "INV-7");
  assert.match(v[0].message, /NTR/);
});

test("INV-7：敌人 + 同伴 + 主角 → 仍违规（主角在场也不行）", () => {
  const v = checkParticipants([H(), E(), C()]);
  assert.equal(v.length, 1, "只应报 NTR 一条，不重复报「缺主角」");
  assert.match(v[0].message, /NTR/);
});

test("INV-7：报错不重复 —— 每类问题只报一条", () => {
  // 敌人+同伴已是最严重问题，不再叠加「必须含主角」
  assert.equal(checkParticipants([E(), C()]).length, 1);
  // 仅敌人（无主角）只报「必须含主角」
  assert.equal(checkParticipants([E("a"), E("b")]).length, 1);
});

test("INV-7：仅敌人无主角 → 违规", () => {
  const v = checkParticipants([E("a"), E("b")]);
  assert.ok(v.some((x) => /必须包含主角/.test(x.message)));
});

test("INV-7：含外部者 → 违规", () => {
  const v = checkParticipants([H(), O()]);
  assert.equal(v[0].code, "INV-7");
  assert.match(v[0].message, /非后宫/);
});

test("INV-7：空参与者 → 违规", () => {
  const v = checkParticipants([]);
  assert.equal(v[0].code, "INV-7");
});

test("INV-7：主角单独 → 合法（自慰场景）", () => {
  assert.deepEqual(checkParticipants([H()]), []);
});

// ============ 被俘规则（L-1 / INV-8）============

test("L-1：同伴被俘 + 性内容 → 违规", () => {
  const v = checkCaptiveRule({ captive: true, subject: "companion", sexual: true });
  assert.equal(v[0].code, "INV-8");
});

test("L-1：同伴被俘 + 无性内容 → 合法", () => {
  assert.deepEqual(checkCaptiveRule({ captive: true, subject: "companion", sexual: false }), []);
});

test("L-1 放宽：主角被俘 + 性内容 → 合法", () => {
  assert.deepEqual(checkCaptiveRule({ captive: true, subject: "hero", sexual: true }), []);
});

test("L-1：无被俘状态 + 性内容 → 合法", () => {
  assert.deepEqual(checkCaptiveRule({ captive: false, subject: "companion", sexual: true }), []);
});

// ============ 旧关系措辞（L-2）============

test("L-2：不可逆措辞通过", () => {
  for (const f of IRREVERSIBLE_FATES) {
    assert.deepEqual(checkPartnerFate("丈夫" + f), [], f + " 应通过");
  }
});

test("L-2：可逆措辞被拦", () => {
  for (const f of REVERSIBLE_FATES) {
    const v = checkPartnerFate("丈夫" + f);
    assert.equal(v.length, 1, f + " 应被拦");
    assert.equal(v[0].code, "L-2");
  }
});

test("L-2：诱饵 —— 「失踪」必须被拦（最典型的钩子）", () => {
  assert.equal(checkPartnerFate("对门住户 / 丈夫失踪").length, 1);
});

test("L-2：不可逆与可逆词表无交集", () => {
  for (const a of IRREVERSIBLE_FATES) {
    assert.ok(!(REVERSIBLE_FATES as readonly string[]).includes(a), a + " 同时出现在两表");
  }
});

// ============ 有过伴侣者上限（L-4 / L-5）============

test("L-4：上限为 3", () => {
  assert.equal(PARTNER_HISTORY_LIMIT, 3);
});

test("L-4：正好 3 人通过", () => {
  const list = [
    { id: "mother", name: "母亲", hadPartner: true },
    { id: "singlemom", name: "单亲妈妈", hadPartner: true },
    { id: "neighbor", name: "邻居人妻", hadPartner: true },
    { id: "sister", name: "姐姐", hadPartner: false }
  ];
  assert.deepEqual(checkPartnerHistoryLimit(list), []);
});

test("L-4：4 人被拦", () => {
  const list = [
    { id: "a", name: "a", hadPartner: true },
    { id: "b", name: "b", hadPartner: true },
    { id: "c", name: "c", hadPartner: true },
    { id: "d", name: "d", hadPartner: true }
  ];
  const v = checkPartnerHistoryLimit(list);
  assert.equal(v[0].code, "L-4");
  assert.match(v[0].message, /4 人/);
});

test("L-4：全处女通过", () => {
  assert.deepEqual(checkPartnerHistoryLimit([
    { id: "a", name: "a", hadPartner: false },
    { id: "b", name: "b", hadPartner: false }
  ]), []);
});

// ============ 禁止词扫描（NTR-9）============

test("禁止词表非空且无重复", () => {
  assert.ok(NTR_FORBIDDEN_TERMS.length > 10);
  const terms = NTR_FORBIDDEN_TERMS.map((t) => t.term);
  assert.equal(new Set(terms).size, terms.length, "禁止词不可重复");
});

test("scanForbiddenTerms：命中并报告行号", () => {
  const src = ["第一行正常", "第二行有强暴", "第三行也干净"].join("\n");
  const hits = scanForbiddenTerms(src);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].term, "强暴");
  assert.equal(hits[0].line, 2);
});

test("scanForbiddenTerms：干净文本无命中", () => {
  assert.deepEqual(scanForbiddenTerms("主角与姐姐在日常中互动，一切正常。"), []);
});

test("scanForbiddenTerms：一行多词全部报出", () => {
  const hits = scanForbiddenTerms("强暴与轮奸同时出现");
  assert.equal(hits.length, 2);
});

test("禁止词不含误伤词（「调教」本身允许，L-12）", () => {
  const terms = NTR_FORBIDDEN_TERMS.map((t) => t.term);
  assert.ok(!terms.includes("调教"), "「调教」是允许的玩法（L-12）");
  assert.ok(terms.includes("调教成"), "但「调教成（归属转移）」应禁");
});
