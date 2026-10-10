import { useEffect, useRef } from "react";
import { RAID_LABEL, type RaidKind } from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 血条 */
function HpBar({ hp, max, side }: { hp: number; max: number; side: "player" | "enemy" }) {
  const pct = max > 0 ? Math.max(0, (hp / max) * 100) : 0;
  const tone = pct > 60 ? "ok" : pct > 30 ? "warn" : "danger";
  return (
    <div className={`hpbar hpbar-${side}`}>
      <div className={`hpbar-fill ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CombatView() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const combatAttack = useGame((s) => s.combatAttack);
  const combatCharm = useGame((s) => s.combatCharm);
  const combatDefend = useGame((s) => s.combatDefend);
  const combatFlee = useGame((s) => s.combatFlee);
  const endCombat = useGame((s) => s.endCombat);
  void version;

  const logRef = useRef<HTMLDivElement | null>(null);
  const c = session.combat;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [c?.log.length]);

  if (!c) {
    return (
      <div className="combat">
        <div className="combat-idle">
          <p className="sub">当前不在战斗中。</p>
          <p className="sub">可从「防御」面板触发事件，或在下方直接进入模拟战斗。</p>
          <div className="controls" style={{ justifyContent: "center" }}>
            {(["strays", "horde", "bandits", "mutant"] as RaidKind[]).map((k) => (
              <button key={k} className="actbtn" onClick={() => session.beginCombat(k, k === "horde" ? 5 : 3)}>
                遭遇{RAID_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const alive = c.enemies.filter((e) => e.hp > 0);

  return (
    <div className="combat">
      {/* 敌我布阵 */}
      <div className="combat-field">
        <div className="combat-side enemies">
          <div className="side-label">敌方（{alive.length}）</div>
          <div className="units">
            {c.enemies.map((e) => (
              <button
                key={e.id}
                className={`unit enemy ${e.hp <= 0 ? "dead" : ""} ${e.status.length > 0 ? "statused" : ""}`}
                onClick={() => combatAttack(e.id)}
                disabled={e.hp <= 0}
                title={`${e.name}　HP ${Math.round(e.hp)}/${e.hpMax}${e.humanoid ? "　（人形，可魅惑）" : ""}`}
              >
                <div className="unit-shape enemy-shape" />
                <div className="unit-name">{e.name}</div>
                <HpBar hp={e.hp} max={e.hpMax} side="enemy" />
                <div className="unit-hp">{Math.max(0, Math.round(e.hp))}/{e.hpMax}</div>
                {e.status.some((s) => s.kind === "charm") && <span className="unit-tag">魅惑</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="combat-round">
          <span>第 {c.round} 回合</span>
        </div>

        <div className="combat-side allies">
          <div className="side-label">我方</div>
          <div className="units">
            <div className={`unit player ${c.player.hp <= 0 ? "dead" : ""}`}>
              <div className="unit-shape player-shape" />
              <div className="unit-name">{c.player.name}</div>
              <HpBar hp={c.player.hp} max={c.player.hpMax} side="player" />
              <div className="unit-hp">{Math.max(0, Math.round(c.player.hp))}/{c.player.hpMax}</div>
            </div>
            {c.allies.map((a) => (
              <div key={a.id} className={`unit ally ${a.hp <= 0 ? "dead" : ""}`}>
                <div className="unit-shape ally-shape" />
                <div className="unit-name">{a.name}</div>
                <HpBar hp={a.hp} max={a.hpMax} side="player" />
                <div className="unit-hp">{Math.max(0, Math.round(a.hp))}/{a.hpMax}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 日志 */}
      <div className="combat-log" ref={logRef}>
        {c.log.slice(-30).map((l, i) => (
          <div key={i} className="combat-logline">{l}</div>
        ))}
      </div>

      {/* 操作 */}
      <div className="combat-actions">
        <span className="sub">点击敌人攻击</span>
        <button className="actbtn" onClick={combatDefend}>
          <span className="akey">D</span>防御
        </button>
        <button
          className="actbtn"
          onClick={() => {
            const target = alive.find((e) => e.humanoid);
            if (target) combatCharm(target.id);
          }}
          disabled={!alive.some((e) => e.humanoid)}
        >
          <span className="akey">C</span>魅惑（人形）
        </button>
        <button className="actbtn" onClick={combatFlee}>
          <span className="akey">F</span>逃跑
        </button>
        <button className="actbtn danger" onClick={endCombat}>
          结束战斗
        </button>
      </div>
    </div>
  );
}
