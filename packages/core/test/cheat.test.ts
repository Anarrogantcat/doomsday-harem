import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { GameSession } from "../src/runtime/session.ts";
import {
  CHEAT_ACTIONS, CHEAT_CATEGORIES, cheatActionDef, cheatsByCategory,
  cheatStats, CHEAT_CATEGORY_LABEL, CHEAT_CATEGORY_ICON,
  CONSOLE_HELP, parseCommand, CheatConsole, effectsFor, saveBadge,
  DEFAULT_CHEAT
} from "../src/systems/cheat.ts";
import { cheatOpIds, runCheatOp, runCheatAll } from "../src/systems/cheatRunner.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(dirname(dirname(__dirname)), "core", "data", "scripts");

function session(): GameSession {
  const s = new GameSession();
  s.loadScripts(readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl"))
    .map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8")));
  return s;
}

// ============ 目录完整性 ============

test("cheat: 操作数量充足", () => {
  assert.ok(CHEAT_ACTIONS.length >= 40, `应有 40+ 操作，实际 ${CHEAT_ACTIONS.length}`);
});

test("cheat: id 唯一", () => {
  const ids = new Set(CHEAT_ACTIONS.map((a) => a.id));
  assert.equal(ids.size, CHEAT_ACTIONS.length);
});

test("cheat: 字段完整", () => {
  for (const a of CHEAT_ACTIONS) {
    assert.ok(a.name.length > 0, `${a.id} 缺名称`);
    assert.ok(a.description.length > 0, `${a.id} 缺说明`);
    assert.ok(CHEAT_CATEGORIES.includes(a.category), `${a.id} 分类无效`);
  }
});

test("cheat: 全部 14 个分类都有操作", () => {
  for (const c of CHEAT_CATEGORIES) {
    assert.ok(cheatsByCategory(c).length >= 1, `${c} 分类为空`);
    assert.ok(CHEAT_CATEGORY_LABEL[c], `缺少分类标签 ${c}`);
    assert.ok(CHEAT_CATEGORY_ICON[c], `缺少分类图标 ${c}`);
  }
});

test("cheat: 每个操作都有实现", () => {
  const impl = new Set(cheatOpIds());
  for (const a of CHEAT_ACTIONS) {
    if (a.id === "meta_full_unlock") continue; // 由 runCheatAll 处理
    assert.ok(impl.has(a.id), `${a.id} 没有实现`);
  }
});

test("cheat: 统计", () => {
  const s = cheatStats();
  assert.equal(s.total, CHEAT_ACTIONS.length);
  assert.equal(Object.keys(s.byCategory).length, CHEAT_CATEGORIES.length);
});

test("cheat: 按 id 查询", () => {
  assert.ok(cheatActionDef("vitals_full"));
  assert.ok(cheatActionDef("hero_max_level"));
  assert.equal(cheatActionDef("nonexistent"), undefined);
});

// ============ 覆盖新系统 ============

test("cheat: 覆盖主角成长", () => {
  const ids = cheatsByCategory("hero").map((a) => a.id);
  assert.ok(ids.includes("hero_max_level"));
  assert.ok(ids.includes("hero_max_attrs"));
  assert.ok(ids.includes("hero_max_skills"));
});

test("cheat: 覆盖后宫成长", () => {
  const ids = cheatsByCategory("harem").map((a) => a.id);
  assert.ok(ids.includes("harem_max_level"));
  assert.ok(ids.includes("harem_max_skills"));
  assert.ok(ids.includes("harem_max_perks"));
  assert.ok(ids.includes("harem_max_tier"));
});

test("cheat: 覆盖亲密与熟练度", () => {
  const ids = cheatsByCategory("intimacy").map((a) => a.id);
  assert.ok(ids.includes("intimacy_max_prof"));
  assert.ok(ids.includes("intimacy_prep_all"), "应能一键完成后庭准备");
  assert.ok(ids.includes("intimacy_toys"));
});

test("cheat: 覆盖加成共享", () => {
  const ids = cheatsByCategory("sharing").map((a) => a.id);
  assert.ok(ids.includes("sharing_all_on"));
  assert.ok(ids.includes("sharing_all_off"));
});

// ============ 实际执行 ============

test("cheat: 状态全满", () => {
  const s = session();
  const r = s.runCheat("vitals_full");
  assert.equal(r.ok, true);
  assert.equal(s.hero.survival.stamina, 100);
  assert.equal(s.hero.survival.hunger, 100);
  assert.equal(s.hero.survival.mood, 100);
});

test("cheat: 主角等级拉满", () => {
  const s = session();
  s.runCheat("hero_max_level");
  assert.equal(s.hero.growth.level, 99);
});

test("cheat: 主角属性全满", () => {
  const s = session();
  s.runCheat("hero_max_attrs");
  const a = s.hero.growth.attributes;
  assert.equal(a.strength, 50);
  assert.equal(a.charisma, 50);
});

test("cheat: 主角技能全满", () => {
  const s = session();
  s.runCheat("hero_max_skills");
  assert.ok(s.hero.growth.skills.every((sk) => sk.level === 10));
});

test("cheat: 后宫等级拉满", () => {
  const s = session();
  s.runCheat("harem_max_level");
  assert.ok(s.companions.every((c) => c.growth.level === 99));
});

test("cheat: 后宫技能全满", () => {
  const s = session();
  s.runCheat("harem_max_skills");
  assert.ok(s.companions.every((c) => c.growth.skills.every((sk) => sk.level === 10)));
});

test("cheat: 后宫被动增益全解锁", () => {
  const s = session();
  s.runCheat("harem_max_perks");
  // 至少有一位获得了增益
  const total = s.companions.reduce((n, c) => n + c.growth.perks.length, 0);
  assert.ok(total > 0, "应有同伴获得被动增益");
});

test("cheat: 亲密度拉满", () => {
  const s = session();
  s.runCheat("harem_max_tier");
  assert.ok(s.companions.every((c) => c.growth.intimacyTier >= 4));
});

test("cheat: 主角熟练度全满", () => {
  const s = session();
  s.runCheat("intimacy_max_prof");
  const p = s.hero.proficiency;
  assert.ok(Object.values(p.parts).some((v) => (v ?? 0) >= 8), "应有部位达到高熟练度");
});

test("cheat: 后庭准备全完成", () => {
  const s = session();
  s.runCheat("intimacy_prep_all");
  for (const c of s.companions) {
    assert.ok(s.analPrepLevel(c.id) > 0, `${c.id} 的准备应已完成`);
  }
});

test("cheat: 重置后庭准备", () => {
  const s = session();
  s.runCheat("intimacy_prep_all");
  s.runCheat("intimacy_clear_prep");
  assert.equal(s.analPrepLevel("sister"), 0);
});

test("cheat: 道具全给", () => {
  const s = session();
  const r = s.runCheat("intimacy_toys");
  assert.equal(r.ok, true);
  // 应有灌肠器具
  const have = s.hasSexToy();
  assert.equal(have, true);
});

test("cheat: 科技全解锁", () => {
  const s = session();
  const r = s.runCheat("base_unlock_tech");
  assert.equal(r.ok, true);
  assert.ok(s.tech.unlocked.size > 100);
});

test("cheat: 基地全建成", () => {
  const s = session();
  s.runCheat("base_build_all");
  const built = s.base.facilities.filter((f) => f.tier > 0).length;
  assert.ok(built > 30, `应建成 30+ 座，实际 ${built}`);
});

test("cheat: 房车改装全装", () => {
  const s = session();
  s.runCheat("vehicle_all_mods");
  assert.ok(s.vehicle.mods.length > 15);
});

test("cheat: 地图全开", () => {
  const s = session();
  s.runCheat("world_discover_all");
  const discovered = Object.values(s.world.regions).filter((r) => r.discovered).length;
  assert.ok(discovered >= 15);
});

test("cheat: 解锁全部后宫", () => {
  const s = session();
  s.runCheat("quest_unlock_all");
  assert.ok(s.joined().length >= 10);
});

test("cheat: 关系拉满", () => {
  const s = session();
  s.runCheat("quest_max_relations");
  assert.ok(s.companions.every((c) => c.relationship.affection === 100));
});

test("cheat: 共享全部授权", () => {
  const s = session();
  s.runCheat("sharing_all_on");
  const st = s.shareStats();
  assert.ok(st.shared > 20, `应授权 20+ 项，实际 ${st.shared}`);
});

test("cheat: 共享全部取消", () => {
  const s = session();
  s.runCheat("sharing_all_off");
  assert.equal(s.shareStats().shared, 0);
});

test("cheat: 状态摘要", () => {
  const s = session();
  const r = s.runCheat("meta_export_state");
  assert.equal(r.ok, true);
  assert.match(r.message, /时间/);
  assert.match(r.message, /主角/);
  assert.match(r.message, /科技/);
});

test("cheat: 未知项被拒", () => {
  const s = session();
  const r = s.runCheat("nonexistent_action");
  assert.equal(r.ok, false);
  assert.match(r.message, /未知/);
});

test("cheat: 一键全开", () => {
  const s = session();
  const r = s.runCheatAll();
  assert.equal(r.ok, true);
  // 验证关键状态
  assert.equal(s.hero.growth.level, 99);
  assert.ok(s.tech.unlocked.size > 100);
  assert.ok(s.base.facilities.filter((f) => f.tier > 0).length > 30);
  assert.ok(s.vehicle.mods.length > 15);
  assert.ok(s.joined().length >= 10);
});

test("cheat: 战斗胜利（无战斗时安全返回）", () => {
  const s = session();
  const r = s.runCheat("combat_win");
  assert.equal(r.ok, false, "不在战斗中应返回失败");
  assert.match(r.message, /不在战斗/);
});

test("cheat: 战斗胜利（有战斗时生效）", () => {
  const s = session();
  s.beginCombat("strays", 3);
  const r = s.runCheat("combat_win");
  assert.equal(r.ok, true);
  assert.equal(s.combat, null, "战斗应已结束");
});

test("cheat: 生育操作", () => {
  const s = session();
  s.runCheat("pregnancy_all");
  const pregnant = s.companions.filter((c) => c.physiology.pregnant).length;
  assert.ok(pregnant > 0, "应有同伴怀孕");
  s.runCheat("pregnancy_clear");
  assert.equal(s.companions.filter((c) => c.physiology.pregnant).length, 0);
});

// ============ 选项与效果 ============

test("cheat: 主开关关闭时无效果", () => {
  assert.equal(effectsFor(DEFAULT_CHEAT), null);
});

test("cheat: 主开关开启时全开", () => {
  const e = effectsFor({ ...DEFAULT_CHEAT, enabled: true });
  assert.ok(e);
  assert.equal(e!.infiniteVitals, true);
  assert.equal(e!.godMode, true);
  assert.equal(e!.unlockAllTech, true);
});

test("cheat: 存档角标", () => {
  assert.equal(saveBadge({ ...DEFAULT_CHEAT, enabled: false }), null);
  assert.equal(saveBadge({ ...DEFAULT_CHEAT, enabled: true, markSave: false }), null);
  assert.equal(saveBadge({ ...DEFAULT_CHEAT, enabled: true, markSave: true }), "CHEAT");
});

test("cheat: 命令解析", () => {
  assert.deepEqual(parseCommand("/help"), { cmd: "help", args: [] });
  assert.deepEqual(parseCommand("/act sister oral_give"), { cmd: "act", args: ["sister", "oral_give"] });
  assert.equal(parseCommand("no slash"), null);
});

test("cheat: 控制台未启用时拒绝", () => {
  const c = new CheatConsole({ ...DEFAULT_CHEAT, enabled: false });
  assert.match(c.exec("/help"), /未启用/);
});

test("cheat: 控制台启用后可执行", () => {
  const c = new CheatConsole({ ...DEFAULT_CHEAT, enabled: true, console: true });
  c.registerHelp();
  const out = c.exec("/help");
  assert.match(out, /act/);
  assert.match(out, /enema/);
});

test("cheat: 控制台未知命令", () => {
  const c = new CheatConsole({ ...DEFAULT_CHEAT, enabled: true, console: true });
  assert.match(c.exec("/unknown"), /未知命令/);
});

test("cheat: 帮助文本覆盖主要命令", () => {
  const cmds = CONSOLE_HELP.map((h) => h.cmd);
  assert.ok(cmds.some((c) => c.startsWith("/act")));
  assert.ok(cmds.some((c) => c.startsWith("/enema")));
  assert.ok(cmds.some((c) => c.startsWith("/share")));
});
