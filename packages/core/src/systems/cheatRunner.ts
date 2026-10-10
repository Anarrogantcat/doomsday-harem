/**
 * 作弊操作的执行器。
 *
 * 与 GameSession 解耦：接收一个「操作接口」而不是直接引用 session，
 * 避免 session.ts 膨胀，也便于测试。
 */

/** session 需要暴露给作弊器的能力 */
export interface CheatHost {
  // 生存
  fillVitals(): void;
  clearLust(): void;
  maxLust(): void;
  healAll(): void;

  // 主角成长
  setHeroLevel(level: number): void;
  addHeroPoints(n: number): void;
  maxHeroAttrs(): void;
  maxHeroSkills(): void;
  addHeroExp(n: number): number;

  // 后宫成长
  setAllCompanionLevel(level: number): void;
  maxAllCompanionSkills(): void;
  maxAllCompanionMood(): void;
  maxAllCompanionStamina(): void;
  unlockAllCompanionPerks(): void;
  maxAllIntimacyTier(): void;
  healAllCompanions(): void;

  // 亲密
  maxHeroProficiency(): void;
  maxCompanionProficiency(): void;
  completeAllAnalPrep(): void;
  clearAllAnalPrep(): void;
  grantAllIntimateItems(): number;

  // 基地科技
  unlockAllTech(): number;
  buildAllFacilities(): number;
  clearBuildQueue(): void;
  grantMaterials(): number;

  // 房车
  installAllMods(): number;
  fillVehicle(): void;
  repairVehicle(): void;

  // 世界
  discoverAll(): void;
  clearAllRegions(): void;
  refillLoot(): void;

  // 战斗
  winCombat(): boolean;
  endCombat(): void;
  grantWeapons(): number;

  // 防御
  maxDefense(): void;
  rescueCaptured(): number;
  cancelRaids(): void;

  // 生育
  impregnateHero(target?: string): void;
  impregnateAll(): number;
  deliverAll(): number;
  clearPregnancies(): void;

  // 主线
  unlockAllCompanions(): number;
  completeAllQuests(): void;
  maxRelations(): void;
  resetRelations(): void;

  // 时间
  advanceHours(hours: number): void;
  setHour(hour: number): void;

  // 共享
  setAllSharing(on: boolean): void;
  resetSharing(): void;

  // 元
  stateSummary(): string;
}

/** 单项作弊的结果 */
export interface CheatResult {
  ok: boolean;
  message: string;
}

/** 需要宿主实现的操作映射 */
type Op = (host: CheatHost, target?: string) => CheatResult;

const OPS: Record<string, Op> = {
  // ===== 生存 =====
  vitals_full: (h) => { h.fillVitals(); return { ok: true, message: "状态全满" }; },
  vitals_zero_lust: (h) => { h.clearLust(); return { ok: true, message: "欲情已清零" }; },
  vitals_max_lust: (h) => { h.maxLust(); return { ok: true, message: "欲情已拉满" }; },
  vitals_heal: (h) => { h.healAll(); return { ok: true, message: "伤病已清除" }; },

  // ===== 主角成长 =====
  hero_max_level: (h) => { h.setHeroLevel(99); return { ok: true, message: "主角等级 99" }; },
  hero_max_points: (h) => { h.addHeroPoints(500); return { ok: true, message: "已给 500 属性点" }; },
  hero_max_attrs: (h) => { h.maxHeroAttrs(); return { ok: true, message: "六维属性全满" }; },
  hero_max_skills: (h) => { h.maxHeroSkills(); return { ok: true, message: "七项技能全满" }; },
  hero_max_exp: (h) => {
    const n = h.addHeroExp(1000000);
    return { ok: true, message: "升级 " + n + " 次" };
  },

  // ===== 后宫成长 =====
  harem_max_level: (h) => { h.setAllCompanionLevel(99); return { ok: true, message: "全员等级 99" }; },
  harem_max_skills: (h) => { h.maxAllCompanionSkills(); return { ok: true, message: "全员技能全满" }; },
  harem_max_mood: (h) => { h.maxAllCompanionMood(); return { ok: true, message: "全员心情 100" }; },
  harem_max_stamina: (h) => { h.maxAllCompanionStamina(); return { ok: true, message: "全员体力全满" }; },
  harem_max_perks: (h) => { h.unlockAllCompanionPerks(); return { ok: true, message: "被动增益已解锁" }; },
  harem_max_tier: (h) => { h.maxAllIntimacyTier(); return { ok: true, message: "亲密度拉满" }; },
  harem_heal: (h) => { h.healAllCompanions(); return { ok: true, message: "全员已治愈" }; },

  // ===== 亲密 =====
  intimacy_max_prof: (h) => { h.maxHeroProficiency(); return { ok: true, message: "主角熟练度全满" }; },
  intimacy_max_comp_prof: (h) => { h.maxCompanionProficiency(); return { ok: true, message: "同伴熟练度全满" }; },
  intimacy_prep_all: (h) => { h.completeAllAnalPrep(); return { ok: true, message: "后庭准备全完成" }; },
  intimacy_clear_prep: (h) => { h.clearAllAnalPrep(); return { ok: true, message: "后庭准备已重置" }; },
  intimacy_toys: (h) => {
    const n = h.grantAllIntimateItems();
    return { ok: true, message: "已给予 " + n + " 种道具" };
  },
  intimacy_unlock_all: (h) => { h.maxHeroProficiency(); return { ok: true, message: "全部行为已解锁" }; },

  // ===== 基地科技 =====
  base_unlock_tech: (h) => {
    const n = h.unlockAllTech();
    return { ok: true, message: "科技解锁 " + n };
  },
  base_build_all: (h) => {
    const n = h.buildAllFacilities();
    return { ok: true, message: "设施建成 " + n + " 座" };
  },
  base_clear_queue: (h) => { h.clearBuildQueue(); return { ok: true, message: "建造队列已清空" }; },
  base_materials: (h) => {
    const n = h.grantMaterials();
    return { ok: true, message: "已给予 " + n + " 种材料" };
  },

  // ===== 房车 =====
  vehicle_all_mods: (h) => {
    const n = h.installAllMods();
    return { ok: true, message: "改装 " + n + " 项" };
  },
  vehicle_full_tank: (h) => { h.fillVehicle(); return { ok: true, message: "燃料电量已加满" }; },
  vehicle_repair: (h) => { h.repairVehicle(); return { ok: true, message: "车况已修复" }; },

  // ===== 世界 =====
  world_discover_all: (h) => { h.discoverAll(); return { ok: true, message: "地图全开" }; },
  world_clear_all: (h) => { h.clearAllRegions(); return { ok: true, message: "全区域已清理" }; },
  world_unlimited_loot: (h) => { h.refillLoot(); return { ok: true, message: "搜刮点已补满" }; },

  // ===== 战斗 =====
  combat_win: (h) => {
    const ok = h.winCombat();
    return ok
      ? { ok: true, message: "战斗已判定胜利" }
      : { ok: false, message: "当前不在战斗中" };
  },
  combat_end: (h) => { h.endCombat(); return { ok: true, message: "已退出战斗" }; },
  combat_weapons: (h) => {
    const n = h.grantWeapons();
    return { ok: true, message: "已给予 " + n + " 种武器弹药" };
  },

  // ===== 防御 =====
  defense_max: (h) => { h.maxDefense(); return { ok: true, message: "防御拉满" }; },
  defense_clear_captured: (h) => {
    const n = h.rescueCaptured();
    return { ok: true, message: "已营救 " + n + " 位" };
  },
  defense_skip_raid: (h) => { h.cancelRaids(); return { ok: true, message: "夜袭已取消" }; },

  // ===== 生育 =====
  pregnancy_hero: (h, t) => { h.impregnateHero(t); return { ok: true, message: "主角已怀孕" }; },
  pregnancy_all: (h) => {
    const n = h.impregnateAll();
    return { ok: true, message: n + " 位已怀孕" };
  },
  pregnancy_deliver: (h) => {
    const n = h.deliverAll();
    return { ok: true, message: "已分娩 " + n + " 位" };
  },
  pregnancy_clear: (h) => { h.clearPregnancies(); return { ok: true, message: "怀孕状态已清除" }; },

  // ===== 主线 =====
  quest_unlock_all: (h) => {
    const n = h.unlockAllCompanions();
    return { ok: true, message: "已解锁 " + n + " 位" };
  },
  quest_complete_all: (h) => { h.completeAllQuests(); return { ok: true, message: "主线已全部完成" }; },
  quest_max_relations: (h) => { h.maxRelations(); return { ok: true, message: "关系已拉满" }; },
  quest_reset_relations: (h) => { h.resetRelations(); return { ok: true, message: "关系已重置" }; },

  // ===== 时间 =====
  time_advance_day: (h) => { h.advanceHours(24); return { ok: true, message: "已推进一天" }; },
  time_advance_week: (h) => { h.advanceHours(24 * 7); return { ok: true, message: "已推进一周" }; },
  time_set_morning: (h) => { h.setHour(7); return { ok: true, message: "时间设为 07:00" }; },
  time_set_night: (h) => { h.setHour(23); return { ok: true, message: "时间设为 23:00" }; },

  // ===== 共享 =====
  sharing_all_on: (h) => { h.setAllSharing(true); return { ok: true, message: "全部授权给后宫" }; },
  sharing_all_off: (h) => { h.setAllSharing(false); return { ok: true, message: "已取消全部授权" }; },
  sharing_reset: (h) => { h.resetSharing(); return { ok: true, message: "授权已恢复默认" }; },

  // ===== 元 =====
  meta_export_state: (h) => ({ ok: true, message: h.stateSummary() })
};

/** 全部可执行的作弊 id */
export function cheatOpIds(): string[] {
  return Object.keys(OPS);
}

/** 执行一条作弊 */
export function runCheatOp(
  host: CheatHost,
  actionId: string,
  target?: string
): CheatResult {
  const op = OPS[actionId];
  if (!op) return { ok: false, message: "未知作弊项：" + actionId };
  try {
    return op(host, target);
  } catch (e) {
    return {
      ok: false,
      message: "执行失败：" + (e instanceof Error ? e.message : String(e))
    };
  }
}

/** 一键全开：执行全部非元操作 */
export function runCheatAll(host: CheatHost): CheatResult {
  const skip = new Set([
    "meta_full_unlock", "meta_export_state",
    "combat_win", "combat_end",
    "time_advance_day", "time_advance_week"
  ]);

  let ok = 0;
  let fail = 0;
  for (const id of cheatOpIds()) {
    if (skip.has(id)) continue;
    const r = runCheatOp(host, id);
    if (r.ok) ok++;
    else fail++;
  }
  return {
    ok: true,
    message: "已执行 " + ok + " 项" + (fail > 0 ? "，失败 " + fail + " 项" : "")
  };
}
