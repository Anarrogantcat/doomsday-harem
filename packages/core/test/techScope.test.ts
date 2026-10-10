import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  BRANCH_SCOPE, SCOPE_OVERRIDES, nodeScope, canCompanionResearch,
  researchContribution, teamResearchRate, scopeStats,
  allNodePairs, scopeMap, globalScopeStats, branchScopeOf,
  SCOPE_LABEL, SCOPE_DESC, SCOPE_ICON,
  COMPANION_RESEARCH_CAP, MAX_TEAM_BONUS,
  type TechScope
} from "../src/tech/scope.ts";
import { BRANCHES } from "../src/tech/branches.ts";
import { GameSession } from "../src/runtime/session.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(dirname(dirname(__dirname)), "core", "data", "scripts");

function session(): GameSession {
  const s = new GameSession();
  s.loadScripts(readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl"))
    .map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8")));
  return s;
}

// ============ 归属定义 ============

test("scope: 八个分支都有归属", () => {
  for (const b of BRANCHES) {
    assert.ok(BRANCH_SCOPE[b.id], `${b.id} 缺归属`);
    assert.ok(["shared", "personal"].includes(BRANCH_SCOPE[b.id]));
  }
});

test("scope: 自我与寿命为主角个人", () => {
  assert.equal(BRANCH_SCOPE.self, "personal");
  assert.equal(BRANCH_SCOPE.longevity, "personal");
});

test("scope: 避难所/防御/能源/机器人为共用", () => {
  assert.equal(BRANCH_SCOPE.shelter, "shared");
  assert.equal(BRANCH_SCOPE.defense, "shared");
  assert.equal(BRANCH_SCOPE.energy, "shared");
  assert.equal(BRANCH_SCOPE.robot, "shared");
});

test("scope: 标签与说明齐备", () => {
  for (const s of ["shared", "personal"] as TechScope[]) {
    assert.ok(SCOPE_LABEL[s]);
    assert.ok(SCOPE_DESC[s]);
    assert.ok(SCOPE_ICON[s]);
  }
});

test("scope: 节点归属继承分支", () => {
  const pairs = allNodePairs();
  assert.ok(pairs.length > 100, `应有 100+ 节点，实际 ${pairs.length}`);

  for (const { node, branch } of pairs) {
    const scope = nodeScope(node, branch);
    const expected = SCOPE_OVERRIDES[node.id] ?? BRANCH_SCOPE[branch];
    assert.equal(scope, expected, `${node.id} 归属错误`);
  }
});

test("scope: 共用与个人都有大量节点", () => {
  const s = globalScopeStats();
  assert.ok(s.shared > 40, `共用科技应有 40+，实际 ${s.shared}`);
  assert.ok(s.personal > 15, `个人科技应有 15+，实际 ${s.personal}`);
  assert.equal(s.shared + s.personal, s.total);
});

test("scope: 按分支统计", () => {
  const s = globalScopeStats();
  assert.equal(Object.keys(s.byBranch).length, BRANCHES.length);
  // 自我分支应全是个人
  assert.equal(s.byBranch.self.personal, s.byBranch.self.shared + s.byBranch.self.personal);
});

test("scope: scopeMap 覆盖全部节点", () => {
  const m = scopeMap();
  const total = allNodePairs().length;
  assert.equal(Object.keys(m).length, total);
});

test("scope: 共用节点可被同伴研究", () => {
  const shared = allNodePairs().filter((x) => nodeScope(x.node, x.branch) === "shared");
  for (const { node, branch } of shared.slice(0, 20)) {
    assert.equal(canCompanionResearch(node, branch), true, `${node.id} 应可共用研究`);
  }
});

test("scope: 个人节点不可被同伴研究", () => {
  const personal = allNodePairs().filter((x) => nodeScope(x.node, x.branch) === "personal");
  for (const { node, branch } of personal.slice(0, 20)) {
    assert.equal(canCompanionResearch(node, branch), false, `${node.id} 不应可共用研究`);
  }
});

test("scope: 分支归属查询", () => {
  assert.equal(branchScopeOf("self"), "personal");
  assert.equal(branchScopeOf("shelter"), "shared");
});

// ============ 科研贡献 ============

test("research: 贡献度计算", () => {
  const c = researchContribution({
    craftLevel: 5, medicalLevel: 3, jobId: "lab", perkCount: 2
  });
  assert.ok(c > 0);
  assert.ok(c <= COMPANION_RESEARCH_CAP, "贡献度不应超过上限");
});

test("research: 技能越高贡献越大", () => {
  const low = researchContribution({ craftLevel: 0, medicalLevel: 0, jobId: null, perkCount: 0 });
  const high = researchContribution({ craftLevel: 10, medicalLevel: 10, jobId: "lab", perkCount: 5 });
  assert.ok(high > low);
});

test("research: 岗位影响贡献", () => {
  const noJob = researchContribution({ craftLevel: 5, medicalLevel: 5, jobId: null, perkCount: 0 });
  const lab = researchContribution({ craftLevel: 5, medicalLevel: 5, jobId: "lab", perkCount: 0 });
  assert.ok(lab > noJob, "实验室岗位应有加成");
});

test("research: 贡献度有上限", () => {
  const c = researchContribution({
    craftLevel: 100, medicalLevel: 100, jobId: "lab", perkCount: 100
  });
  assert.equal(c, COMPANION_RESEARCH_CAP);
});

test("research: 团队速率", () => {
  const t = teamResearchRate(1, [0.1, 0.15, 0.2]);
  assert.ok(t.rate > 1);
  assert.ok(t.bonus > 0);
  assert.equal(t.contributors, 3);
});

test("research: 团队加成有上限", () => {
  const many = Array(20).fill(0.4);
  const t = teamResearchRate(1, many);
  assert.equal(t.bonus, MAX_TEAM_BONUS, "总加成应有上限");
});

test("research: 无贡献者时等于基础", () => {
  const t = teamResearchRate(1.5, []);
  assert.equal(t.rate, 1.5);
  assert.equal(t.bonus, 0);
  assert.equal(t.contributors, 0);
});

// ============ 会话集成 ============

test("session: 查询节点归属", () => {
  const s = session();
  // 自我科技 → 个人
  const selfNode = BRANCHES.find((b) => b.id === "self")!.nodes[0];
  assert.equal(s.techScopeOf(selfNode.id), "personal");

  // 避难所 → 共用
  const shelterNode = BRANCHES.find((b) => b.id === "shelter")!.nodes[0];
  assert.equal(s.techScopeOf(shelterNode.id), "shared");
});

test("session: 未知节点返回 null", () => {
  const s = session();
  assert.equal(s.techScopeOf("nonexistent"), null);
});

test("session: 双轨统计", () => {
  const s = session();
  const st = s.techScopeStats();
  assert.ok(st.shared > 40);
  assert.ok(st.personal > 15);
});

test("session: 科研人员列表", () => {
  const s = session();
  const shelterNode = BRANCHES.find((b) => b.id === "shelter")!.nodes[0];
  const list = s.researchContributors(shelterNode.id);
  assert.ok(list.length > 0, "应有同伴可选");
  // 每位都应有名称
  assert.ok(list.every((x) => x.name.length > 0));
});

test("session: 个人科技无合格科研人员", () => {
  const s = session();
  const selfNode = BRANCHES.find((b) => b.id === "self")!.nodes[0];
  const list = s.researchContributors(selfNode.id);
  assert.ok(list.every((x) => !x.eligible), "个人科技不应有合格科研人员");
  assert.ok(list.some((x) => x.reason?.includes("主角个人")));
});

test("session: 研究速率含团队加成", () => {
  const s = session();
  const shelterNode = BRANCHES.find((b) => b.id === "shelter")!.nodes[0];

  // 先给同伴技能，使其有贡献
  s.giveCheatMaterials();
  s.runCheat("harem_max_skills");
  // 保证研究效率已授权
  s.setCategoryShare("facility", true);

  const info = s.researchRateFor(shelterNode.id);
  assert.ok(info.canDelegate, "共用科技应可委派");
  assert.ok(info.rate >= info.base);
});

test("session: 个人科技不可委派", () => {
  const s = session();
  const selfNode = BRANCHES.find((b) => b.id === "self")!.nodes[0];
  const info = s.researchRateFor(selfNode.id);
  assert.equal(info.canDelegate, false);
  assert.equal(info.teamBonus, 0);
});

test("session: 有伤同伴不参与研究", () => {
  const s = session();
  const c = s.companion("sister")!;
  c.growth = { ...c.growth, injuries: 2 };

  const shelterNode = BRANCHES.find((b) => b.id === "shelter")!.nodes[0];
  const list = s.researchContributors(shelterNode.id);
  const sister = list.find((x) => x.id === "sister")!;
  assert.equal(sister.eligible, false);
  assert.match(sister.reason ?? "", /有伤/);
});

// ============ 加成授权修正 ============

test("sharing: 研究/制作/材料可授权", async () => {
  const mod = await import("../src/systems/bonusSharing.ts");
  for (const key of ["researchRate", "craftRate", "materialPerDay"]) {
    const def = mod.bonusDef(key)!;
    assert.equal(def.appliesTo, "numeric", `${key} 应可授权`);
  }
});

test("sharing: 已无主角专属项", async () => {
  const mod = await import("../src/systems/bonusSharing.ts");
  const none = mod.BONUS_DEFS.filter((b) => b.appliesTo === "none");
  assert.equal(none.length, 0, "不应再有不可授权的项");
});

test("sharing: 研究效率可被后宫享受", async () => {
  const mod = await import("../src/systems/bonusSharing.ts");
  let st = mod.newShareState();
  st = mod.toggleShare(st, "researchRate");
  if (!mod.isShared(st, "researchRate")) st = mod.toggleShare(st, "researchRate");
  assert.equal(mod.isShared(st, "researchRate"), true);
  const out = mod.companionBonuses({ researchRate: 100 }, st);
  assert.ok(out.researchRate > 0, "后宫应能享受研究效率加成");
});
