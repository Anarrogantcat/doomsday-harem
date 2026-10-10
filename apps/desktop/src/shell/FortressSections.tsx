/**
 * 要塞剖面（原型 UI 移植）。
 *
 * 对应原型 `docs/ui-prototype.html` 的 `#fortress-view`：
 *   - 折叠控制条（全部展开 / 全部收起 / 区块计数）
 *   - 6 格概要（设施总数 / 已建成 / 建造中 / 层数 / 个人房间 / 床位）
 *   - 按**分类**分区块，每个区块可单独折叠
 *   - 区块内是设施格（已建 / 建造中 / 未解锁 三态）
 *
 * 与旧 FortressSection 的区别：
 *   旧版按 level（地表/山内/深层）平铺，无折叠；
 *   本版按 category 分 8 区块 + 折叠，与原型一致。
 */
import { useMemo, useState } from "react";
import {
  FACILITIES,
  FACILITY_CATEGORY_LABEL,
  LEVEL_LABEL,
  effectText,
  type FacilityDef,
  type FacilityCategory,
  type BaseLevel
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 区块内的一格 */
interface Cell {
  def: FacilityDef;
  tier: number;
  building: boolean;
  progress: number;
  locked: boolean;
  lockReason?: string;
}

const CATEGORY_ORDER: FacilityCategory[] = [
  "defense", "utility", "production", "living",
  "medical", "research", "storage", "special"
];

/** 分类图标 */
const CAT_ICON: Record<FacilityCategory, string> = {
  defense: "🛡", utility: "⚡", production: "🏭", living: "🛏",
  medical: "💊", research: "🔬", storage: "📦", special: "★"
};

/** 分类配色键（对应 CSS .fsec-h.def 等） */
const CAT_KEY: Record<FacilityCategory, string> = {
  defense: "def", utility: "util", production: "prod", living: "live",
  medical: "med", research: "res", storage: "sto", special: "spc"
};

export function FortressSections({ onOpenBase }: { onOpenBase?: () => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [allState, setAllState] = useState<null | boolean>(null);

  const sections = useMemo(() => {
    const byCat = new Map<FacilityCategory, Cell[]>();
    for (const def of FACILITIES) {
      const tier = session.tierOf(def.id);
      const building = session.base.building === def.id;
      const chk = session.buildCheck(def.id);
      const cell: Cell = {
        def,
        tier,
        building,
        progress: building ? Math.round((session.baseSummary().buildingProgress ?? 0) * 100) : 0,
        locked: chk ? !chk.ok : false,
        lockReason: chk && !chk.ok ? chk.reason : undefined
      };
      const arr = byCat.get(def.category) ?? [];
      arr.push(cell);
      byCat.set(def.category, arr);
    }
    return CATEGORY_ORDER
      .filter((c) => byCat.has(c))
      .map((c) => ({ cat: c, cells: byCat.get(c)! }));
  }, [session, version]);

  const summary = session.baseSummary();
  const stats = useMemo(() => {
    let built = 0, building = 0, maxTier = 0;
    for (const s of sections) {
      for (const c of s.cells) {
        if (c.tier > 0) built++;
        if (c.building) building++;
        if (c.tier > maxTier) maxTier = c.tier;
      }
    }
    return { built, building, total: FACILITIES.length };
  }, [sections]);

  const isCollapsed = (cat: string) => {
    if (allState !== null) return !allState;
    return collapsed[cat] === true;
  };
  const toggle = (cat: string) => {
    setAllState(null);
    setCollapsed((v) => ({ ...v, [cat]: !v[cat] }));
  };

  return (
    <div className="proto-fortress">
      <div className="proto-foldbar">
        <span className="proto-fbt">{sections.length} 个区块</span>
        <button className="proto-fb" onClick={() => { setAllState(null); setCollapsed({}); }}>全部展开</button>
        <button className="proto-fb" onClick={() => { setAllState(null); const o: Record<string, boolean> = {}; sections.forEach((s) => { o[s.cat] = true; }); setCollapsed(o); }}>全部收起</button>
        <span className="proto-fbd">点区块标题可单独折叠</span>
      </div>

      <div className="proto-eq-sum" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="proto-c"><div className="n">{stats.total}</div><div className="l">设施总数</div></div>
        <div className="proto-c"><div className="n">{summary.built}</div><div className="l">已建成</div></div>
        <div className="proto-c"><div className="n">{stats.building}</div><div className="l">建造中</div></div>
        <div className="proto-c"><div className="n">3</div><div className="l">层数</div></div>
        <div className="proto-c"><div className="n">{summary.built}</div><div className="l">个人房间</div></div>
        <div className="proto-c"><div className="n">{summary.built + " / " + summary.total}</div><div className="l">建成 / 总数</div></div>
      </div>

      {sections.map((s) => {
        const built = s.cells.filter((c) => c.tier > 0).length;
        return (
          <div key={s.cat} className={"proto-fsec" + (isCollapsed(s.cat) ? " collapsed" : "")}>
            <div
              className={"proto-fsec-h " + CAT_KEY[s.cat]}
              onClick={() => toggle(s.cat)}
            >
              <span className="proto-fl">{CAT_ICON[s.cat]} {FACILITY_CATEGORY_LABEL[s.cat]}</span>
              <span className="proto-fd">已建成 {built} / {s.cells.length}</span>
              <span className="proto-farrow">▼</span>
            </div>
            <div className="proto-fsec-body">
              <div className="proto-defgrid">
                {s.cells.map((c) => {
                  const cls = c.building ? "build" : c.tier > 0 ? "built" : c.locked ? "lock" : "";
                  return (
                    <div
                      key={c.def.id}
                      className={"proto-fcell " + cls}
                      title={[
                        c.def.name,
                        c.def.description,
                        c.tier > 0 ? `Lv${c.tier} / ${c.def.maxTier}` : "未建造",
                        c.tier > 0 ? effectText(session.base, c.def) : "",
                        c.lockReason ?? ""
                      ].filter(Boolean).join("\n")}
                      onClick={() => {
                        if (c.tier === 0 && !c.building && !c.locked) {
                          session.beginBuild(c.def.id);
                          useGame.getState().refresh();
                        }
                      }}
                    >
                      <span className="proto-fn">{c.def.name}</span>
                      <span className="proto-fs">
                        {c.building ? c.progress + "%" : c.tier > 0 ? "Lv" + c.tier : c.locked ? "🔒" : "—"}
                      </span>
                      <span className="proto-flv">{LEVEL_LABEL[c.def.level as BaseLevel].slice(0, 2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {onOpenBase ? (
        <div className="proto-acts" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button className="proto-abtn primary" onClick={onOpenBase}>打开基地面板</button>
          <button className="proto-abtn" onClick={() => { useGame.getState().session.finishAllBuilds(); useGame.getState().refresh(); }}>一键建成</button>
        </div>
      ) : null}
    </div>
  );
}
