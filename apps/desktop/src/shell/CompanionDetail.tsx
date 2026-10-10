import {
  companionDef, PERSONALITY_LABEL, PERSONALITY_TRAITS,
  bestJobFor, JOB_LABEL, tierOfScene, describeTier
} from "@doomsday/core";
import { useGame } from "../store/game.ts";
import { Portrait } from "./Portrait.tsx";

export function CompanionDetail({ id }: { id: string | null }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const satisfy = useGame((s) => s.satisfy);
  const refuse = useGame((s) => s.refuse);
  const nightRaid = useGame((s) => s.nightRaid);
  const undress = useGame((s) => s.undress);
  const equipClothing = useGame((s) => s.equipClothing);
  void version;

  const c = id ? session.companion(id) : undefined;
  if (!c) {
    return (
      <div className="detail">
        <p className="sub">（从左侧名册选一位同伴查看详情）</p>
      </div>
    );
  }

  const def = companionDef(c.id);
  const traits = def ? PERSONALITY_TRAITS[def.personality] : null;
  const outfit = session.outfitOf(c.id);
  const stage = session.lustStageOf(c.id);
  const raid = stage === "nightRaid" || stage === "forced";
  const questProgress = session.questProgressFor(c.id);
  const scenes = session.scenesFor(c.identity.name);

  return (
    <div className="detail">
      <div className="detail-head">
        <Portrait
          name={c.identity.name}
          mode="full"
          mood={60}
          lust={c.lust.value}
          pregnant={c.physiology.pregnant}
          pregnancyProgress={c.physiology.pregnancyProgress}
          exposure={outfit?.exposure ?? 0}
          wardrobe={c.wardrobe}
          heightCm={c.identity.heightCm}
          build={def?.build ?? 0.5}
          personality={def?.personality}
          size={104}
        />
        <div className="detail-meta">
          <div className="detail-name">{c.identity.name}</div>
          <div className="detail-title">{c.identity.title}</div>
          {def && (
            <div className="detail-tags">
              <span className="tag">{PERSONALITY_LABEL[def.personality]}</span>
              <span className="tag">Lv{c.relationship.bond}</span>
              {c.physiology.pregnant && <span className="tag warn">怀孕</span>}
            </div>
          )}
        </div>
      </div>

      {traits && <div className="detail-tone">{traits.tone}</div>}

      <div className="detail-bars">
        {[
          { label: "好感", v: c.relationship.affection, cls: "aff" },
          { label: "忠诚", v: c.relationship.loyalty, cls: "loy" },
          { label: "欲情", v: c.lust.value, cls: "lust" }
        ].map((b) => (
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
        <div><span>冷落</span><b>{c.lust.daysSinceIntimacy} 天</b></div>
        <div><span>岗位</span><b>{c.job.id ? JOB_LABEL[c.job.id] : "空闲"}</b></div>
        <div><span>专长</span><b>{bestJobFor(c.id) ? JOB_LABEL[bestJobFor(c.id)!] : "—"}</b></div>
        <div><span>暴露</span><b>{c.id === "ai" ? "—" : `${outfit?.exposure ?? 0}%`}</b></div>
        <div><span>主线</span><b>{questProgress}</b></div>
        <div><span>场景</span><b>{scenes.length > 0 ? `${scenes.length} 个可触发` : "条件未满足"}</b></div>
      </div>

      <div className="detail-outfit">
        <span className="sub">着装</span>
        <div className="outfit-text">
          {outfit && outfit.items.length > 0
            ? outfit.describe
            : c.id === "ai"
            ? "（无实体，无着装）"
            : "（未着衣物）"}
        </div>
        {c.id !== "ai" && (
          <div className="controls">
            <button onClick={() => undress(c.id)}>脱一层</button>
            <button onClick={() => equipClothing(c.id, "scarf")}>戴上围巾</button>
          </div>
        )}
      </div>

      {traits && (
        <div className="detail-line">
          <span className="sub">主动时</span>
          <div className="quote">「{traits.approach}」</div>
        </div>
      )}

      <div className="detail-actions">
        <button className="actbtn" onClick={() => satisfy(c.id, "active")}>
          <span className="akey">A</span>亲密（欲情清零）
        </button>
        <button className="actbtn" onClick={() => refuse(c.id)}>
          <span className="akey">R</span>拒绝（好感不变）
        </button>
        {raid && (
          <button className="actbtn danger" onClick={() => nightRaid(c.id)}>
            <span className="akey">!</span>夜袭（无拒绝选项）
          </button>
        )}
      </div>

      {scenes.length > 0 && (
        <div className="detail-scenes">
          <span className="sub">可触发场景</span>
          {scenes.slice(0, 5).map((s) => (
            <div key={s.id} className="sceneline">
              <span className={`tier tier-${tierOfScene(s.id)}`}>{tierOfScene(s.id)}</span>
              {s.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}