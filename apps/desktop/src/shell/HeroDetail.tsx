import { useGame } from "../store/game.ts";
import { Portrait } from "./Portrait.tsx";

export function HeroDetail() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const satisfy = useGame((s) => s.satisfy);
  void version;

  const h = session.hero;
  const s = h.survival;

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
      <div className="detail-head">
        <Portrait
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
          <div className="detail-title">{h.identity.title}</div>
          <div className="detail-tags">
            <span className="tag">扶她</span>
            <span className="tag">{h.identity.heightCm}cm</span>
            <span className="tag">{h.identity.age}岁</span>
            {h.physiology.virgin && <span className="tag warn">处女</span>}
            {h.physiology.pregnant && <span className="tag warn">怀孕</span>}
          </div>
        </div>
      </div>

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
        <div><span>科技解锁</span><b>{session.tech.unlocked.size}</b></div>
        <div><span>基地设施</span><b>{session.base.facilities.filter((f) => f.tier > 0).length}</b></div>
        <div><span>房车改装</span><b>{session.vehicle.mods.length}</b></div>
        <div><span>在队同伴</span><b>{session.joined().length}</b></div>
        <div><span>后代</span><b>{session.offspring.length}</b></div>
        <div><span>探索</span><b>{session.exploration().percent}%</b></div>
      </div>

      {h.physiology.pregnant && (
        <div className="cpreg">
          怀孕 {Math.floor(h.pregnancy?.progress ?? 0)}/30 天
        </div>
      )}

      <div className="detail-line">
        <span className="sub">身份</span>
        <div className="quote">
          预知能力持有者 · 特殊AI的编写者 · 山体要塞的建造者
        </div>
      </div>

      <div className="detail-actions">
        <button className="actbtn" onClick={() => satisfy("hero", "active")}>
          <span className="akey">A</span>自我纾解
        </button>
      </div>
    </div>
  );
}
