import { useState } from "react";
import { ATTR_KEYS, ATTR_LABEL, ATTR_DESC, expForLevel } from "@doomsday/core";
import { useGame } from "../store/game.ts";
import { Portrait } from "./Portrait.tsx";

type DetailTab = "status" | "growth" | "skills";

export function HeroDetail() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const satisfy = useGame((s) => s.satisfy);
  const spendPoint = useGame((s) => s.spendHeroPoint);
  const [tab, setTab] = useState<DetailTab>("status");
  void version;

  const h = session.hero;
  const s = h.survival;
  const g = h.growth;
  const bonuses = session.heroBonuses();
  const attrs = session.heroAttributes();
  const power = session.heroPower();
  const skillTotal = session.heroSkillTotal();
  const progress = session.heroLevelProgress();
  const nextExp = expForLevel(g.level);

  const bars = [
    { label: "体力", v: s.stamina, cls: "stam" },
    { label: "饥饿", v: s.hunger, cls: "hung" },
    { label: "口渴", v: s.thirst, cls: "thir" },
    { label: "精力", v: s.energy, cls: "ener" },
    { label: "心情", v: s.mood, cls: "mood" },
    { label: "欲情", v: h.lust.value, cls: "lust" }
  ];

  return (
    <div className="detail">
      {/* 立绘 + 基本信息 */}
      <div className="detail-head">
        <Portrait
          companionId="hero"
          name={h.identity.name}
          mode="full"
          mood={s.mood}
          lust={h.lust.value}
          pregnant={h.physiology.pregnant}
          pregnancyProgress={h.pregnancy?.progress ?? 0}
          wardrobe={h.wardrobe}
          heightCm={h.identity.heightCm}
          build={0.55}
          cup={6}
          personality="bold"
          futanari
          size={120}
        />
        <div className="detail-meta">
          <div className="detail-name">
            {h.identity.name}
            <span className="hero-tag">主角</span>
          </div>
          {/* 主角不显示「扶她御姐」这类身份标签，避免冗余 */}
          {false && <div className="detail-title">{h.identity.title}</div>}
          <div className="detail-tags">
            <span className="tag">扶她</span>
            <span className="tag">{h.identity.heightCm}cm</span>
            <span className="tag">{h.identity.age}岁</span>
            {h.physiology.virgin && <span className="tag warn">处女</span>}
            {h.physiology.pregnant && <span className="tag warn">怀孕</span>}
          </div>

          {/* 等级与战力 */}
          <div className="hero-level">
            <div className="hl-row">
              <span className="hl-label">等级</span>
              <b className="hl-value">{g.level}</b>
              {g.points > 0 && <span className="hl-points">可加点 {g.points}</span>}
            </div>
            <div className="hl-bar">
              <div className="hl-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="hl-exp">{g.exp} / {nextExp}</div>
          </div>
        </div>
      </div>

      {/* 三视图 Tab */}
      <div className="detail-tabs">
        <button className={tab === "status" ? "dtab active" : "dtab"} onClick={() => setTab("status")}>
          状态
        </button>
        <button className={tab === "growth" ? "dtab active" : "dtab"} onClick={() => setTab("growth")}>
          成长
        </button>
        <button className={tab === "skills" ? "dtab active" : "dtab"} onClick={() => setTab("skills")}>
          技能
        </button>
      </div>

      {tab === "status" && (
        <>
          <div className="detail-bars">
            {bars.map((b) => (
              <div key={b.label} className="dbar">
                <span className="dbar-label">{b.label}</span>
                <div className="dbar-track">
                  <div className={`dbar-fill ${b.cls}`} style={{ width: `${b.v}%` }} />
                </div>
                <span className="dbar-value">{Math.round(b.v)}</span>
              </div>
            ))}
          </div>

          <div className="detail-rows">
            <div><span>战力</span><b>{power}</b></div>
            <div><span>技能</span><b>{skillTotal} 级</b></div>
            <div><span>科技解锁</span><b>{session.tech.unlocked.size}</b></div>
            <div><span>基地设施</span><b>{session.base.facilities.filter((f) => f.tier > 0).length}</b></div>
            <div><span>房车改装</span><b>{session.vehicle.mods.length}</b></div>
            <div><span>在队同伴</span><b>{session.joined().length}</b></div>
            <div><span>后代</span><b>{session.offspring.length}</b></div>
            <div><span>探索</span><b>{session.exploration().percent}%</b></div>
          </div>

          {h.physiology.pregnant && (
            <div className="cpreg">怀孕 {Math.floor(h.pregnancy?.progress ?? 0)}/30 天</div>
          )}

          <div className="detail-line">
            <span className="sub">身份</span>
            <div className="quote">预知能力持有者 · 特殊AI的编写者 · 山体要塞的建造者</div>
          </div>

          <div className="detail-actions">
            <button className="actbtn" onClick={() => satisfy("hero", "active")}>
              <span className="akey">A</span>自我纾解
            </button>
          </div>
        </>
      )}

      {tab === "growth" && (
        <>
          <div className="growth-note">
            强化只来自科技与基地建设，无其他来源。同伴不享受这些加成。
          </div>

          <div className="attr-list">
            {ATTR_KEYS.map((k) => {
              const base = g.attributes[k];
              const bonus = bonuses.attributes[k] ?? 0;
              const total = attrs[k];
              const canSpend = g.points > 0 && base < 50;
              return (
                <div key={k} className="attr-row">
                  <div className="attr-head">
                    <span className="attr-name" title={ATTR_DESC[k]}>{ATTR_LABEL[k]}</span>
                    <span className="attr-val">
                      {total}
                      {bonus > 0 && <span className="attr-bonus">+{bonus}</span>}
                    </span>
                    {canSpend && (
                      <button className="attr-add" onClick={() => spendPoint(k)} title="花费 1 点">
                        +
                      </button>
                    )}
                  </div>
                  <div className="attr-bar">
                    <div className="attr-fill base" style={{ width: `${(base / 50) * 100}%` }} />
                    {bonus > 0 && (
                      <div
                        className="attr-fill bonus"
                        style={{ width: `${(bonus / 50) * 100}%`, left: `${(base / 50) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="detail-rows">
            <div><span>体力上限</span><b>+{bonuses.staminaMax}</b></div>
            <div><span>负重加成</span><b>+{bonuses.carryBonus}</b></div>
            <div><span>近战加成</span><b>+{bonuses.meleeBonus}</b></div>
            <div><span>闪避加成</span><b>+{(bonuses.dodgeBonus * 100).toFixed(1)}%</b></div>
            <div><span>搜刮效率</span><b>×{bonuses.scavengeMult.toFixed(2)}</b></div>
            <div><span>研究效率</span><b>×{bonuses.researchMult.toFixed(2)}</b></div>
            <div><span>夜袭预警</span><b>+{bonuses.alertBonus}</b></div>
          </div>
        </>
      )}

      {tab === "skills" && (
        <div className="skill-list">
          {g.skills.map((sk) => {
            const need = sk.level >= 10 ? 0 : Math.round(50 * Math.pow(1.4, sk.level));
            const pct = sk.level >= 10 ? 1 : need > 0 ? sk.exp / need : 0;
            return (
              <div key={sk.id} className="skill-row" title={sk.description}>
                <div className="skill-head">
                  <span className="skill-name">{sk.name}</span>
                  <span className="skill-lv">Lv{sk.level}</span>
                </div>
                <div className="skill-bar">
                  <div className="skill-fill" style={{ width: `${pct * 100}%` }} />
                </div>
                <div className="skill-exp">
                  {sk.level >= 10 ? "已满" : `${sk.exp} / ${need}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
