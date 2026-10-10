/**
 * 详情侧栏（原型 UI 移植）。
 *
 * 严格对应原型 `docs/ui-prototype.html` 的 `.detail-side`，5 个一级子元素：
 *   1. .ds-hero    主角段（固定顶部）
 *   2. .ds-divider 分隔（「选中角色」）
 *   3. .ds-head    同伴段头（名 + 角色定位 + ⤢）
 *   4. .ds-body    同伴段体（立绘 + info + 状态条 + 概况）
 *   5. .ds-acts    同伴段操作按钮
 *
 * 立绘走既有接口：
 *   Portrait → rigToDataUri / GenPortrait（外部模型）→ portraitCacheKey
 */
import { useState } from "react";
import { companionDef, PART_LABEL, DIRECTION_LABEL } from "@doomsday/core";
import { useGame } from "../store/game.ts";
import { Portrait } from "./Portrait.tsx";
import { SexStatsBlock } from "./SexStatsBlock.tsx";

/** 一行状态条（原型 .dsb） */
function Bar({ k, v, color }: { k: string; v: number; color: string }) {
  return (
    <div className="dsb">
      <span className="k">{k}</span>
      <div className="t">
        <div className="f" style={{ width: Math.max(0, Math.min(100, v)) + "%", background: color }} />
      </div>
      <span className="v">{Math.round(v)}</span>
    </div>
  );
}

/** 一格概况（原型 .dsg） */
function G({ k, v }: { k: string; v: string | number }) {
  return <div className="dsg"><span className="k">{k}</span><span className="v">{v}</span></div>;
}

/** 主角段（.ds-hero，固定顶部） */
function HeroSection({ onOpen }: { onOpen: (tab: string) => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;
  const h = session.hero;
  const sv = h.survival;

  return (
    <div className="ds-hero">
      <div className="ds-head hero">
        <span className="ds-name">{h.identity.name}</span>
        <button className="ds-expand" title="查看完整资料" onClick={() => onOpen("hero-detail")}>⤢</button>
      </div>
      <div className="ds-body">
        <div className="ds-portrait">
          <Portrait
            name={h.identity.name}
            mood={sv.mood}
            pregnant={h.physiology.pregnant}
            size={56}
            active
          />
          <div className="ds-info">
            <div className="ds-title">{h.identity.title}</div>
            <div className="ds-tags">
              <span className="ds-tag">{h.identity.heightCm}cm</span>
              <span className="ds-tag ok">预知能力</span>
            </div>
            <div className="ds-lvl">
              <b>{h.growth.level}</b>
              <div className="eb"><div className="ef" style={{ width: "45%" }} /></div>
              <span className="et">{h.growth.exp ?? 0}</span>
            </div>
          </div>
        </div>

        {/* 6 条状态条（原型 .ds-bars） */}
        <div className="ds-bars">
          <Bar k="体力" v={sv.stamina} color="var(--ok)" />
          <Bar k="饥饿" v={sv.hunger} color="var(--energy)" />
          <Bar k="口渴" v={sv.thirst} color="var(--info)" />
          <Bar k="精力" v={sv.energy} color="var(--accent-lt)" />
          <Bar k="心情" v={sv.mood} color="var(--warn)" />
          <Bar k="欲情" v={h.lust.value} color="var(--lust)" />
        </div>

        <div className="ds-grid">
          <G k="同伴" v={session.joined().length} />
          <G k="科技" v={session.tech.unlocked.size} />
          <G k="设施" v={session.baseSummary().built} />
          <G k="可加点" v={h.growth.points ?? 0} />
        </div>
      </div>
    </div>
  );
}

/** 同伴段（.ds-head + .ds-body + .ds-acts） */
function CompanionSection({ id, onOpen }: { id: string; onOpen: (tab: string) => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const c = id ? session.companion(id) : null;
  const sexView = id ? session.companionSexStatsView(id) : null;

  if (!c) {
    return (
      <>
        <div className="ds-divider">选中角色</div>
        <div className="ds-head">
          <span className="ds-name">未选中</span>
        </div>
        <div className="ds-body" style={{ padding: ".6em", color: "var(--dim)", fontSize: ".8em" }}>
          点击左栏角色卡查看详情，双击打开完整资料。
        </div>
      </>
    );
  }

  const def = companionDef(c.id);
  const r = c.relationship;
  const roleText = r.role === "family" ? "家人" : r.role === "ai" ? "AI" : r.role === "main" ? "主线" : "支线";

  return (
    <>
      <div className="ds-divider">选中角色</div>
      <div className="ds-head">
        <span className="ds-name">{c.identity.name}</span>
        <span className="ds-role">{roleText}</span>
        <button className="ds-expand" title="查看完整资料" onClick={() => onOpen("detail")}>⤢</button>
      </div>

      <div className="ds-body">
        <div className="ds-portrait">
          <Portrait
            name={c.identity.name}
            mood={70}
            pregnant={c.physiology.pregnant}
            size={52}
            active
          />
          <div className="ds-info">
            <div className="ds-title">{c.identity.title}</div>
            <div className="ds-tags">
              {def?.build ? <span className="ds-tag">{def.build.split("，")[0]}</span> : null}
              <span className="ds-tag">{c.identity.heightCm}cm</span>
              <span className={"ds-tag" + (c.physiology.virgin ? "" : " ok")}>
                {c.physiology.virgin ? "处女" : "已破处"}
              </span>
            </div>
            <div className="ds-lvl">
              <b>{c.growth.level ?? 1}</b>
              <div className="eb"><div className="ef" style={{ width: "60%" }} /></div>
              <span className="et">{c.growth.exp ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="ds-bars">
          <Bar k="好感" v={r.affection} color="var(--accent-lt)" />
          <Bar k="忠诚" v={r.loyalty} color="var(--info)" />
          <Bar k="欲情" v={c.lust.value} color="var(--lust)" />
          <Bar k="羁绊" v={r.bond * 20} color="var(--ok)" />
        </div>

        <div className="ds-grid">
          <G k="岗位" v={c.job.id ?? "待分配"} />
          <G k="冷落" v={(c.lust.daysSinceIntimacy ?? 0) + " 天"} />
          <G k="亲密" v={"T" + r.bond} />
          <G k="增益" v={c.growth.perks.length + " 项"} />
        </div>

        {sexView ? (
          <div className="ds-grid" style={{ marginTop: ".3em" }}>
            <G k="累计亲密" v={sexView.total + " 次"} />
            <G k="内射" v={sexView.shotInside + " 次"} />
            <G k="被内射" v={sexView.inside + " 次"} />
            <G k="后庭" v={"Lv" + sexView.analLevel} />
          </div>
        ) : null}
      </div>

      <div className="ds-acts">
        <button className="abtn" onClick={() => onOpen("detail")}>完整资料</button>
        <button className="abtn primary" onClick={() => onOpen("status")}>亲密</button>
        <button className="abtn" onClick={() => onOpen("anal-prep")}>后庭准备</button>
      </div>
    </>
  );
}

export function DetailPanel({ kind, id, onOpen }: {
  kind: "hero" | "companion";
  id?: string;
  onOpen?: (tab: string) => void;
}) {
  const open = onOpen ?? (() => { /* 无回调时不动作 */ });
  const target = kind === "companion" && id ? id : "";
  return (
    <>
      <HeroSection onOpen={open} />
      <CompanionSection id={target} onOpen={open} />
    </>
  );
}


// ============ 弹窗版：完整 6 标签资料（原型 #hero-detail / #detail）============

type DetailTabId = "status" | "acts" | "sex" | "growth" | "wear" | "skill";

const COMPANION_TABS: Array<{ id: DetailTabId; label: string }> = [
  { id: "status", label: "状态" },
  { id: "acts", label: "亲密" },
  { id: "sex", label: "性爱统计" },
  { id: "growth", label: "成长" },
  { id: "wear", label: "着装" },
  { id: "skill", label: "技能" }
];

const HERO_TABS: Array<{ id: DetailTabId; label: string }> = [
  { id: "status", label: "状态" },
  { id: "sex", label: "性爱统计" },
  { id: "growth", label: "成长" },
  { id: "wear", label: "着装" },
  { id: "skill", label: "技能" },
  { id: "acts", label: "亲密" }
];

/** 弹窗版完整资料（原型 6 标签） */
export function DetailTabs({ kind, id }: { kind: "hero" | "companion"; id?: string }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const [tab, setTab] = useState<DetailTabId>("status");
  void version;

  const tabs = kind === "hero" ? HERO_TABS : COMPANION_TABS;
  const c = kind === "companion" && id ? session.companion(id) : null;
  const sexView = kind === "hero" ? session.heroSexStatsView() : (id ? session.companionSexStatsView(id) : null);

  return (
    <>
      <div className="dtabs">
        {tabs.map((t) => (
          <div key={t.id} className={"dtab" + (t.id === tab ? " on" : "")} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === "sex" && sexView ? (
        <SexStatsBlock v={sexView} name={kind === "hero" ? "主角" : c?.identity.name ?? "该角色"} />
      ) : null}

      {tab === "status" ? (
        <div className="dgrid">
          {kind === "hero" ? (
            <>
              <div className="dcell"><span className="k">生理性别</span><span className="v">扶她</span></div>
              <div className="dcell"><span className="k">身高</span><span className="v">{session.hero.identity.heightCm}cm</span></div>
              <div className="dcell"><span className="k">等级</span><span className="v">{session.hero.growth.level}</span></div>
              <div className="dcell"><span className="k">体力</span><span className="v">{Math.round(session.hero.survival.stamina)}</span></div>
            </>
          ) : c ? (
            <>
              <div className="dcell"><span className="k">身份</span><span className="v">{c.identity.title}</span></div>
              <div className="dcell"><span className="k">身高</span><span className="v">{c.identity.heightCm}cm</span></div>
              <div className="dcell"><span className="k">处女</span><span className="v">{c.physiology.virgin ? "是" : "否"}</span></div>
              <div className="dcell"><span className="k">伴侣履历</span><span className="v">{c.hadPartner ? "有过伴侣" : "无"}</span></div>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "acts" && c ? (
        <div className="dgrid">
          {session.availableSexActs(c.id).map((a) => (
            <div className="dcell" key={a.def.id}>
              <span className="k">{a.def.name} · {PART_LABEL[a.def.part]}{DIRECTION_LABEL[a.def.direction]}</span>
              <span className="v" style={{ color: a.usable ? "var(--ok)" : "var(--dim)" }}>
                {a.usable ? "可用" : a.reason ?? "未解锁"}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "growth" ? (
        <div className="dgrid">
          {c ? (
            <>
              <div className="dcell"><span className="k">岗位</span><span className="v">{c.job.id ?? "待分配"}</span></div>
              <div className="dcell"><span className="k">在岗天数</span><span className="v">{c.job.daysOnJob}</span></div>
              <div className="dcell"><span className="k">被动增益</span><span className="v">{c.growth.perks.length} 项</span></div>
              <div className="dcell"><span className="k">技能数</span><span className="v">{c.growth.skills.length}</span></div>
            </>
          ) : (
            <div className="dcell"><span className="k">等级</span><span className="v">{session.hero.growth.level}</span></div>
          )}
        </div>
      ) : null}

      {tab === "wear" ? (
        <div className="dgrid">
          {(c ?? session.hero) ? (
            <div className="dcell">
              <span className="k">已装备</span>
              <span className="v">
                {Object.keys((c ?? session.hero).wardrobe.equipped).length} / 11 槽
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "skill" ? (
        <div className="dgrid">
          {c ? c.growth.skills.map((sk) => (
            <div className="dcell" key={sk.id}>
              <span className="k">{sk.name}</span><span className="v">Lv{sk.level}</span>
            </div>
          )) : <div className="dcell"><span className="k">主角技能</span><span className="v">见属性页</span></div>}
        </div>
      ) : null}
    </>
  );
}
