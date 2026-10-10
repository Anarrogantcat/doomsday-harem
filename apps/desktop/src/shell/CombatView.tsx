import { useEffect, useMemo, useRef, useState } from "react";
import {
  RAID_LABEL, COMBAT_SKILLS, STANCE_LABEL, STANCE_DESC, STANCE_MODS,
  COMBAT_TERRAIN_LABEL, COMBAT_TERRAIN_DESC,
  initExtended, setStance, useSkill, tickCooldowns, canUseSkill,
  effectiveStats, combatSummary, settleCombat,
  type CombatTerrain, type Stance, type ExtendedCombat, type RaidKind
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 血条 */
function Bar({ value, max, tone }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.max(0, (value / max) * 100) : 0;
  const cls = pct > 60 ? "ok" : pct > 30 ? "warn" : "danger";
  return (
    <div className="cbar-track">
      <div className={`cbar-fill ${tone ?? cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 单个单位卡 */
function UnitCard({
  unit, side, selected, onClick, stance, cooldowns, isActive
}: {
  unit: { id: string; name: string; hp: number; hpMax: number; stamina: number; staminaMax: number; status: Array<{ kind: string; turns: number }> };
  side: "player" | "enemy";
  selected?: boolean;
  onClick?: () => void;
  stance?: Stance;
  cooldowns?: Record<string, number>;
  isActive?: boolean;
}) {
  const dead = unit.hp <= 0;
  const statuses = unit.status.filter((s) => s.turns > 0);

  return (
    <button
      className={`cunit ${side} ${dead ? "dead" : ""} ${selected ? "selected" : ""} ${isActive ? "active" : ""}`}
      onClick={onClick}
      disabled={dead || side === "enemy" && !onClick}
      title={dead ? "已倒下" : `${unit.name}　HP ${Math.round(unit.hp)}/${unit.hpMax}`}
    >
      <div className="cunit-top">
        <span className="cunit-name">{unit.name}</span>
        {stance && <span className="cunit-stance">{STANCE_LABEL[stance]}</span>}
      </div>

      <div className="cunit-bars">
        <div className="cunit-bar">
          <span className="cunit-bar-label">HP</span>
          <Bar value={unit.hp} max={unit.hpMax} />
          <span className="cunit-bar-val">{Math.max(0, Math.round(unit.hp))}</span>
        </div>
        <div className="cunit-bar">
          <span className="cunit-bar-label">SP</span>
          <Bar value={unit.stamina} max={unit.staminaMax} tone="energy" />
          <span className="cunit-bar-val">{Math.max(0, Math.round(unit.stamina))}</span>
        </div>
      </div>

      {statuses.length > 0 && (
        <div className="cunit-status">
          {statuses.map((s, i) => (
            <span key={i} className={`cst cst-${s.kind}`}>
              {({ stun: "眩", bleed: "血", poison: "毒", charm: "魅", buff: "增" } as Record<string, string>)[s.kind] ?? "?"}
              {s.turns}
            </span>
          ))}
        </div>
      )}

      {cooldowns && Object.keys(cooldowns).length > 0 && (
        <div className="cunit-cd">
          {Object.entries(cooldowns).slice(0, 3).map(([k, v]) => (
            <span key={k} className="cd-chip">{k.slice(0, 4)}:{v}</span>
          ))}
        </div>
      )}
    </button>
  );
}

export function CombatView() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const refresh = useGame((s) => s.refresh);
  const pushLog = useGame((s) => s.pushLog);
  void version;

  const [ext, setExt] = useState<ExtendedCombat | null>(null);
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [settled, setSettled] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  // 从 session 同步战斗状态
  useEffect(() => {
    const c = session.combat;
    if (!c) { setExt(null); return; }
    setExt((prev) => {
      if (prev && prev.base === c) return prev;
      const terrain = (session as unknown as { combatTerrain?: () => CombatTerrain })
        .combatTerrain?.() ?? "open";
      return initExtended(c, terrain);
    });
  }, [session, version]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log.length]);

  const summary = ext ? combatSummary(ext) : null;

  const playerStats = useMemo(
    () => (ext ? effectiveStats(ext, ext.base.player.id, "player") : null),
    [ext]
  );

  function push(lines: string[]) {
    setLog((l) => [...l, ...lines].slice(-60));
  }

  /** 使用技能 */
  function doSkill(skillId: string) {
    if (!ext) return;
    const skill = COMBAT_SKILLS.find((s) => s.id === skillId);
    if (!skill) return;

    const needsTarget = skill.kind === "damage" || skill.kind === "debuff" || skill.kind === "charm";
    const alive = ext.base.enemies.filter((e) => e.hp > 0);
    const target = needsTarget
      ? (selectedEnemy && alive.some((e) => e.id === selectedEnemy)
          ? selectedEnemy
          : alive[0]?.id ?? null)
      : null;

    if (needsTarget && !target) {
      push(["没有可选目标"]);
      return;
    }

    const r = useSkill(ext, ext.base.player.id, skillId, target, Math.random);
    push(r.log);

    // 同步回 session，让敌方行动
    session.combat = r.combat.base;
    session.combatEnemyTurn();

    const c = session.combat;
    if (!c) {
      // 战斗结束
      setExt(r.combat);
      finish();
      return;
    }

    setExt(tickCooldowns({ ...r.combat, base: c }));
    refresh();
  }

  /** 普通攻击 */
  function doAttack(enemyId: string) {
    if (!ext) return;
    const name = ext.base.enemies.find((e) => e.id === enemyId)?.name ?? "";
    session.combatPlayerAttack(enemyId);
    push([`普通攻击 ${name}`]);

    const c = session.combat;
    if (!c) {
      finish();
      return;
    }
    setExt((prev) => (prev ? tickCooldowns({ ...prev, base: c }) : null));
    refresh();
  }

  /** 防御 */
  function doDefend() {
    if (!ext) return;
    session.combatDefend();
    const c = session.combat;
    if (!c) { finish(); return; }
    setExt((prev) => (prev ? tickCooldowns({ ...prev, base: c }) : null));
    push(["防御，减少受到的伤害"]);
    refresh();
  }

  /** 逃跑 */
  function doFlee() {
    if (!ext) return;
    const r = session.combatFlee();
    push([r.ok ? "成功脱离战斗" : "逃跑失败"]);
    if (r.ok || !session.combat) { finish(); return; }
    setExt((prev) => (prev ? { ...prev, base: session.combat! } : null));
    refresh();
  }

  /** 结算 */
  function finish() {
    if (!ext || settled) return;
    const s = settleCombat(ext, Math.random);
    if (s.exp > 0) {
      session.giveHeroExp(s.exp);
      for (const l of s.loot) session.addToStorage(l.itemId, l.count);
      push([
        `战斗结束：经验 +${s.exp}`,
        ...s.loot.map((l) => `获得 ${l.itemId} ×${l.count}`)
      ]);
    }
    setSettled(true);
    session.endCombat();
    refresh();
  }

  // 不在战斗中
  if (!ext) {
    return (
      <div className="combat">
        <div className="combat-idle">
          <p className="sub">当前不在战斗中。</p>
          <p className="sub">可从「防御」面板触发事件，或直接进入模拟战斗。</p>
          <div className="controls" style={{ justifyContent: "center" }}>
            {(["strays", "horde", "bandits", "mutant", "wildlife", "military"] as RaidKind[]).map((k) => (
              <button
                key={k}
                className="actbtn"
                onClick={() => {
                  session.beginCombat(k, k === "horde" ? 5 : 3);
                  setSettled(false);
                  setLog([]);
                  refresh();
                }}
              >
                遭遇{RAID_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const player = ext.base.player;
  const playerUnit = ext.units[player.id];
  const aliveEnemies = ext.base.enemies.filter((e) => e.hp > 0);

  return (
    <div className="combat">
      {/* 顶部：地形与回合 */}
      <div className="combat-top">
        <span className="ct-round">第 {summary?.round} 回合</span>
        <span className="ct-terrain" title={summary?.terrainDesc}>
          {summary?.terrain}
        </span>
        <span className="ct-count">
          敌 {summary?.enemiesAlive}/{summary?.enemiesTotal}　友 {summary?.alliesAlive}
        </span>
        <button className="mini" onClick={finish} disabled={settled}>结束战斗</button>
      </div>

      {/* 战场 */}
      <div className="combat-field">
        {/* 敌方 */}
        <div className="combat-side">
          <div className="side-label">敌方（{aliveEnemies.length}）</div>
          <div className="units">
            {ext.base.enemies.map((e) => (
              <UnitCard
                key={e.id}
                unit={e}
                side="enemy"
                selected={selectedEnemy === e.id}
                isActive={selectedEnemy === e.id}
                onClick={() => setSelectedEnemy(e.id)}
                cooldowns={ext.units[e.id]?.cooldowns}
              />
            ))}
          </div>
        </div>

        {/* 我方 */}
        <div className="combat-side">
          <div className="side-label">我方</div>
          <div className="units">
            <UnitCard
              unit={player}
              side="player"
              stance={playerUnit?.stance}
              cooldowns={playerUnit?.cooldowns}
              isActive
            />
            {ext.base.allies.map((a) => (
              <UnitCard
                key={a.id}
                unit={a}
                side="player"
                stance={ext.units[a.id]?.stance}
                cooldowns={ext.units[a.id]?.cooldowns}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 日志 */}
      <div className="combat-log" ref={logRef}>
        {log.length === 0 && <div className="combat-logline sub">（等待行动）</div>}
        {log.map((l, i) => (
          <div key={i} className="combat-logline">{l}</div>
        ))}
      </div>

      {/* 姿态切换 */}
      <div className="combat-stance">
        <span className="sub">姿态</span>
        {(["aggressive", "balanced", "defensive"] as Stance[]).map((s) => (
          <button
            key={s}
            className={playerUnit?.stance === s ? "mini active" : "mini"}
            onClick={() => setExt((prev) => prev ? setStance(prev, player.id, s) : null)}
            title={STANCE_DESC[s]}
          >
            {STANCE_LABEL[s]}
          </button>
        ))}
        {playerStats && (
          <span className="sub">
            攻 {Math.round(playerStats.attack)}　
            防 {Math.round(playerStats.defense)}　
            闪 {(playerStats.dodge * 100).toFixed(0)}%　
            暴 {(playerStats.critRate * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* 技能栏 */}
      <div className="combat-skills">
        <span className="sub">技能</span>
        {COMBAT_SKILLS.map((sk) => {
          const check = canUseSkill(ext, player.id, sk.id);
          const cd = ext.units[player.id]?.cooldowns[sk.id] ?? 0;
          return (
            <button
              key={sk.id}
              className={`cskill ${check.ok ? "" : "locked"} ${cd > 0 ? "cooling" : ""}`}
              onClick={() => doSkill(sk.id)}
              disabled={!check.ok}
              title={`${sk.description}　（体力 ${sk.cost}，冷却 ${sk.cooldown}）`}
            >
              <span className="cskill-name">{sk.name}</span>
              <span className="cskill-cost">{sk.cost}</span>
              {cd > 0 && <span className="cskill-cd">{cd}</span>}
            </button>
          );
        })}
      </div>

      {/* 基础操作 */}
      <div className="combat-actions">
        <button
          className="actbtn"
          onClick={() => selectedEnemy && doAttack(selectedEnemy)}
          disabled={!selectedEnemy || !aliveEnemies.some((e) => e.id === selectedEnemy)}
        >
          <span className="akey">A</span>
          普通攻击{selectedEnemy ? `（${aliveEnemies.find((e) => e.id === selectedEnemy)?.name ?? ""}）` : "（先选目标）"}
        </button>
        <button className="actbtn" onClick={doDefend}>
          <span className="akey">D</span>防御
        </button>
        <button className="actbtn" onClick={doFlee}>
          <span className="akey">F</span>逃跑
        </button>
      </div>
    </div>
  );
}
