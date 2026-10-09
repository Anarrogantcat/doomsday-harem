import { useState } from "react";
import {
  FACILITIES, LEVEL_LABEL, FACILITY_CATEGORY_LABEL,
  facilitiesByLevel, type BaseLevel, type FacilityCategory
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

const LEVELS: BaseLevel[] = ["surface", "bunker", "resource"];

export function BasePanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const beginBuild = useGame((s) => s.beginBuild);
  const finishBuild = useGame((s) => s.finishBuild);
  const finishAllBuilds = useGame((s) => s.finishAllBuilds);
  const demolishFacility = useGame((s) => s.demolishFacility);
  const cheat = useGame((s) => s.cheat);
  void version;

  const [level, setLevel] = useState<BaseLevel>("surface");
  const [catFilter, setCatFilter] = useState<FacilityCategory | "">("");

  const sum = session.baseSummary();
  const bonuses = session.baseBonuses();
  const list = facilitiesByLevel(level).filter((d) => !catFilter || d.category === catFilter);

  const cats = [...new Set(facilitiesByLevel(level).map((d) => d.category))];

  return (
    <section className="panel">
      <h2>
        基地建造　<span className="sub">
          已建成 {sum.built} / {sum.total}　满级 {sum.maxed}
        </span>
      </h2>

      <p className="sub">
        居住容量 {session.housingCapacity()} 人　
        私密空间 {session.privateUnlocked() ? "已解锁" : "未解锁"}
      </p>

      {sum.building && (
        <p className="warn">
          建造中：{sum.building}（{Math.round(sum.buildingProgress * 100)}%）
        </p>
      )}

      <div className="controls">
        {LEVELS.map((l) => {
          const s = sum.byLevel[l];
          return (
            <button key={l} className={level === l ? "tab active" : "tab"} onClick={() => setLevel(l)}>
              {LEVEL_LABEL[l]} {s.built}/{s.total}
            </button>
          );
        })}
      </div>

      <div className="controls">
        <button className={catFilter === "" ? "tab active" : "tab"} onClick={() => setCatFilter("")}>全部</button>
        {cats.map((c) => (
          <button key={c} className={catFilter === c ? "tab active" : "tab"} onClick={() => setCatFilter(c)}>
            {FACILITY_CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <table className="grid">
        <thead>
          <tr>
            <th>设施</th><th>分类</th><th>等级</th><th>效果</th>
            <th>下一级消耗</th><th>工时</th><th>前置</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {list.map((def) => {
            const tier = session.tierOf(def.id);
            const check = session.buildCheck(def.id)!;
            const status =
              tier >= def.maxTier ? "已满级"
              : session.base.building === def.id ? "建造中"
              : check.reason === "missing-tech" ? `缺科技：${check.missingTech.join("、")}`
              : check.reason === "missing-facility" ? `缺前置：${check.missingFacility.join("、")}`
              : check.reason === "missing-resource" ? `缺材料：${Object.entries(check.missingResource).map(([k, v]) => `${k}×${v}`).join("、")}`
              : check.reason === "building-other" ? "其他设施建造中"
              : "可建造";
            return (
              <tr key={def.id} className={tier > 0 ? "row-ok" : undefined}>
                <td>{def.name}</td>
                <td className="sub">{FACILITY_CATEGORY_LABEL[def.category]}</td>
                <td>{tier > 0 ? `Lv${tier}` : "—"}</td>
                <td className="sub">{tier > 0 ? session.facilityEffect(def.id) : def.description}</td>
                <td className="sub">
                  {tier >= def.maxTier ? "—" : Object.entries(check.cost).map(([k, v]) => `${k}×${v}`).join("　")}
                </td>
                <td className="sub">{tier >= def.maxTier ? "—" : `${check.hours}h`}</td>
                <td className="sub">
                  {[...def.requiresTech, ...def.requiresFacility].join("、") || "—"}
                </td>
                <td>
                  {tier < def.maxTier && check.ok && (
                    <button onClick={() => beginBuild(def.id)}>建造</button>
                  )}
                  {tier < def.maxTier && cheat.enabled && (
                    <button onClick={() => finishBuild(def.id)}>秒建</button>
                  )}
                  {tier > 0 && (
                    <button className="danger" onClick={() => demolishFacility(def.id)}>拆除</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {cheat.enabled && (
        <div className="controls">
          <button onClick={() => finishAllBuilds("surface")}>秒建地表</button>
          <button onClick={() => finishAllBuilds("bunker")}>秒建避难所</button>
          <button onClick={() => finishAllBuilds("resource")}>秒建资源层</button>
          <button onClick={() => finishAllBuilds()}>秒建全部</button>
        </div>
      )}

      <h3>基地加成（生效中）</h3>
      <p className="sub">
        {Object.keys(bonuses).length === 0
          ? "（暂无）"
          : Object.entries(bonuses).map(([k, v]) => `${k}: ${typeof v === "number" ? v.toFixed(2) : v}`).join("　")}
      </p>

      <h3>已建成设施</h3>
      <p className="sub">
        {session.builtFacilities().length === 0
          ? "（尚未建成任何设施）"
          : session.builtFacilities().map((x) => `${x.def.name} Lv${x.tier}`).join("　")}
      </p>

      <p className="hint">
        科技只决定「能否建造」，实际建成需要材料与工时。同时只能建造一个设施，
        岗位中的「装备加工」与「资源统筹」会加速建造。
      </p>
    </section>
  );
}

function statusHint(n: number, sum: ReturnType<ReturnType<typeof useGame.getState>["session"]["baseSummary"]>): string {
  void sum;
  return `本层共 ${n} 个设施`;
}