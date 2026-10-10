import { useState } from "react";
import {
  companionDef, PERSONALITY_LABEL, PERSONALITY_TRAITS,
  PART_LABEL, DIRECTION_LABEL, ACT_TIER_LABEL,
  bestJobFor, JOB_LABEL, tierOfScene, describeTier
} from "@doomsday/core";
import { useGame } from "../store/game.ts";
import { Portrait } from "./Portrait.tsx";

type DetailTab = "info" | "acts" | "growth";

export function CompanionDetail({ id }: { id: string | null }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const satisfy = useGame((s) => s.satisfy);
  const refuse = useGame((s) => s.refuse);
  const nightRaid = useGame((s) => s.nightRaid);
  const undress = useGame((s) => s.undress);
  const equipClothing = useGame((s) => s.equipClothing);
  const performSexAct = useGame((s) => s.performSexAct);
  const [tab, setTab] = useState<DetailTab>("info");
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

  const growthSum = session.companionGrowth(c.id);
  const profDetail = session.companionProficiencyDetail(c.id);
  const perks = session.companionPerks(c.id);
  const acts = session.availableSexActs(c.id);

  const usable = acts.filter((a) => a.usable);
  const locked = acts.filter((a) => !a.usable);

  return (
    <div className="detail">
      {/* 立绘 + 基本信息 */}
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
              <span className="tag">羁绊 Lv{c.relationship.bond}</span>
              {growthSum && <span className="tag">成长 {growthSum.level}</span>}
              {c.physiology.pregnant && <span className="tag warn">怀孕</span>}
            </div>
          )}

          <div className="detail-bars compact">
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
        </div>
      </div>

      {traits && <div className="detail-tone">{traits.tone}</div>}

      {/* 三视图 Tab */}
      <div className="detail-tabs">
        <button className={tab === "info" ? "dtab active" : "dtab"} onClick={() => setTab("info")}>
          资料
        </button>
        <button className={tab === "acts" ? "dtab active" : "dtab"} onClick={() => setTab("acts")}>
          亲密
        </button>
        <button className={tab === "growth" ? "dtab active" : "dtab"} onClick={() => setTab("growth")}>
          成长
        </button>
      </div>

      {tab === "info" && (
        <>
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
        </>
      )}

      {tab === "acts" && (
        <>
          <div className="growth-note">
            共 {acts.length} 种行为，当前可用 {usable.length} 种。
            熟练度越高，体力消耗越低、效果越强。
          </div>

          <div className="act-list">
            {usable.map((a) => (
              <button
                key={a.def.id}
                className="act-row"
                onClick={() => performSexAct(c.id, a.def.id)}
                title={a.def.description}
              >
                <span className="act-main">
                  <span className={`act-part p-${a.def.part}`}>{PART_LABEL[a.def.part]}</span>
                  <span className="act-name">{a.def.name}</span>
                </span>
                <span className="act-meta">
                  <span className="act-tier">{ACT_TIER_LABEL[a.def.tier]}</span>
                  <span className="act-cost">体力 {a.def.staminaCost}</span>
                  {a.heroLevel > 0 && <span className="act-lv">熟练 {a.heroLevel}</span>}
                </span>
              </button>
            ))}

            {locked.length > 0 && (
              <>
                <div className="act-divider">条件未满足（{locked.length}）</div>
                {locked.slice(0, 8).map((a) => (
                  <div key={a.def.id} className="act-row locked" title={a.reason}>
                    <span className="act-main">
                      <span className="act-part">{PART_LABEL[a.def.part]}</span>
                      <span className="act-name">{a.def.name}</span>
                    </span>
                    <span className="act-meta">
                      <span className="act-lock">{a.reason}</span>
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {tab === "growth" && (
        <>
          {growthSum && (
            <div className="detail-rows">
              <div><span>成长等级</span><b>{growthSum.level}</b></div>
              <div><span>累计亲密</span><b>{growthSum.totalActs} 次</b></div>
              <div><span>生育</span><b>{growthSum.births} 次</b></div>
              <div><span>被动增益</span><b>{growthSum.perkCount} 项</b></div>
            </div>
          )}

          <div className="detail-line">
            <span className="sub">部位熟练度</span>
            <div className="prof-list">
              {(profDetail ?? []).filter((p) => p.level > 0 || p.acts > 0).map((p) => (
                <div key={p.part} className="prof-row">
                  <span className="prof-name">{p.label}</span>
                  <div className="prof-bar">
                    <div className="prof-fill" style={{ width: `${(p.level / 10) * 100}%` }} />
                  </div>
                  <span className="prof-lv">Lv{p.level}</span>
                  <span className="prof-acts">{p.acts} 次</span>
                </div>
              ))}
              {(profDetail ?? []).every((p) => p.level === 0 && p.acts === 0) && (
                <p className="sub">（尚无熟练度记录）</p>
              )}
            </div>
          </div>

          {perks.length > 0 && (
            <div className="detail-line">
              <span className="sub">被动增益</span>
              <div className="perk-list">
                {perks.map((p) => (
                  <div key={p.id} className="perk-row" title={p.condition}>
                    <span className="perk-name">{p.name}</span>
                    <span className="perk-desc">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {perks.length === 0 && (
            <div className="growth-note">
              通过亲密行为与岗位工作可解锁被动增益。
              首位增益需累计 10 次亲密。
            </div>
          )}
        </>
      )}
    </div>
  );
}
