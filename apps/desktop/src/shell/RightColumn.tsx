import { useState } from "react";
import {
  REGIONS, TERRAIN_LABEL, DANGER_LABEL, effectiveDanger, neighbors,
  TRAVEL_MODES, FACILITIES, facilityDef, MODS, modDef, modProgress,
  type DangerLevel, type TravelMode
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

type RightTab = "map" | "base" | "vehicle" | "actions";

const TABS: Array<{ id: RightTab; label: string }> = [
  { id: "map", label: "地图" },
  { id: "base", label: "基地" },
  { id: "vehicle", label: "房车" },
  { id: "actions", label: "行动" }
];

/** 地图视图 */
function MapView() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const travelTo = useGame((s) => s.travelTo);
  const setTravelMode = useGame((s) => s.setTravelMode);
  void version;

  const w = session.world;
  const ns = neighbors(w);
  const here = session.here();
  const danger = effectiveDanger(w, w.current);

  return (
    <div className="right-view">
      <div className="rv-here">
        <b>{here?.name ?? "?"}</b>
        <span className="sub">
          {here ? TERRAIN_LABEL[here.terrain] : ""}　
          <span className={danger >= 4 ? "danger-text" : ""}>{DANGER_LABEL[danger as DangerLevel]}</span>
        </span>
      </div>

      <div className="rv-section">
        <span className="sub">交通方式</span>
        <div className="rv-modes">
          {(["walk", "bike", "car", "apc"] as TravelMode["id"][]).map((m) => {
            const mode = TRAVEL_MODES[m];
            const disabled = (m === "car" || m === "apc") && !session.vehicleAvailable();
            return (
              <button
                key={m}
                className={session.travelMode === m ? "mini active" : "mini"}
                onClick={() => setTravelMode(m)}
                disabled={disabled}
                title={disabled ? "需要车库" : `${mode.speed}km/h`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rv-section">
        <span className="sub">可达区域（{ns.length}）</span>
        <div className="rv-list">
          {ns.map((n) => {
            const plan = session.planTravelTo(n.def.id);
            const st = w.regions[n.def.id];
            const d = effectiveDanger(w, n.def.id);
            return (
              <button
                key={n.def.id}
                className="rv-row"
                onClick={() => travelTo(n.def.id)}
                disabled={!plan.reachable}
                title={plan.reason ?? ""}
              >
                <span className="rv-row-main">
                  {st?.discovered ? n.def.name : "未发现区域"}
                </span>
                <span className="rv-row-meta">
                  {n.km}km · {plan.hours.toFixed(1)}h
                  <span className={`rv-danger d${d}`}>{DANGER_LABEL[d as DangerLevel]}</span>
                </span>
              </button>
            );
          })}
          {ns.length === 0 && <p className="sub">（无可达区域）</p>}
        </div>
      </div>

      <div className="rv-section">
        <span className="sub">已发现区域</span>
        <div className="rv-chips">
          {REGIONS.filter((r) => w.regions[r.id]?.discovered).map((r) => (
            <span key={r.id} className={r.id === w.current ? "chip active" : "chip"}>
              {r.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 基地视图 */
function BaseView({ onOpen }: { onOpen: () => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const summary = session.baseSummary();

  const byLevel = (level: "surface" | "bunker" | "resource") =>
    FACILITIES.filter((f) => f.level === level).map((f) => ({
      def: f,
      tier: session.tierOf(f.id),
      building: session.base.building === f.id
    }));

  const LEVELS = [
    { id: "surface" as const, label: "地表", hint: "安全屋" },
    { id: "bunker" as const, label: "山内", hint: "避难所" },
    { id: "resource" as const, label: "深层", hint: "资源层" }
  ];

  return (
    <div className="right-view">
      <div className="rv-here">
        <b>山体要塞</b>
        <span className="sub">已建成 {summary.built}/{summary.total}　满级 {summary.maxed}</span>
      </div>

      {session.base.building && (
        <div className="rv-building">
          建造中：{facilityDef(session.base.building)?.name}
          （{Math.round(summary.buildingProgress * 100)}%）
        </div>
      )}

      {LEVELS.map((lv) => {
        const list = byLevel(lv.id);
        const built = list.filter((x) => x.tier > 0).length;
        return (
          <div key={lv.id} className="rv-section">
            <span className="sub">{lv.label} · {lv.hint}（{built}/{list.length}）</span>
            <div className="rv-chips">
              {list.filter((x) => x.tier > 0).map((x) => (
                <span key={x.def.id} className="chip built" title={`Lv${x.tier}`}>
                  {x.def.name}
                </span>
              ))}
              {list.filter((x) => x.tier > 0).length === 0 && (
                <span className="sub">（未建成）</span>
              )}
            </div>
          </div>
        );
      })}

      <BuildableList />
      <button className="rv-open" onClick={onOpen}>打开建造面板（B）</button>
    </div>
  );
}

/** 可建造设施快捷列表 */
function BuildableList() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const quickBuild = useGame((s) => s.quickBuild);
  const [showAll, setShowAll] = useState(false);
  void version;

  const list = session.buildableFacilities();
  const ready = list.filter((x) => x.canBuild);
  const shown = showAll ? list : ready.slice(0, 6);

  return (
    <div className="rv-section">
      <span className="sub">
        可建造（{ready.length}）{list.length > ready.length && `　共 ${list.length} 项未满级`}
      </span>
      <div className="rv-list">
        {shown.map((f) => (
          <button
            key={f.id}
            className="rv-row"
            onClick={() => f.canBuild && quickBuild(f.id)}
            disabled={!f.canBuild}
            title={f.description}
          >
            <span className="rv-row-main">
              {f.name}
              <span className="rv-tier">Lv{f.currentTier}→{f.nextTier}</span>
            </span>
            <span className="rv-row-meta">
              {f.hours}h
              {f.canBuild ? (
                <span className="rv-ok">可建</span>
              ) : (
                <span className="rv-lock">{REASON_LABEL[f.reason] ?? f.reason}</span>
              )}
            </span>
          </button>
        ))}
        {shown.length === 0 && <p className="sub">（暂无可建造设施，材料或科技不足）</p>}
      </div>
      {list.length > 6 && (
        <button className="mini" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "只看可建造" : `展开全部 ${list.length} 项`}
        </button>
      )}
    </div>
  );
}

const REASON_LABEL: Record<string, string> = {
  "max-tier": "已满级",
  "building-other": "有在建",
  "missing-tech": "缺科技",
  "missing-facility": "缺前置",
  "missing-resource": "缺材料",
  ok: "可建"
};

/** 房车视图 */
function VehicleView({ onOpen }: { onOpen: () => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const v = session.vehicle;
  const installed = v.mods.map((id) => modDef(id)).filter(Boolean);
  const prog = modProgress(v);

  return (
    <div className="right-view">
      <div className="rv-here">
        <b>武装房车</b>
        <span className="sub">{installed.length}/{MODS.length} 项改装（{prog.percent}%）</span>
      </div>

      <div className="rv-stats">
        <div><span>燃料</span><b>{v.fuel.toFixed(0)} L</b></div>
        <div><span>电量</span><b>{v.battery.toFixed(0)}%</b></div>
        <div><span>车况</span><b>{v.condition.toFixed(0)}%</b></div>
        <div><span>可远征</span><b>{session.vehicleAvailable() ? "是" : "否"}</b></div>
      </div>

      <div className="rv-section">
        <span className="sub">已装改装</span>
        <div className="rv-chips">
          {installed.map((m) => (
            <span key={m!.id} className="chip built" title={m!.description}>
              T{m!.tier} {m!.name}
            </span>
          ))}
          {installed.length === 0 && <span className="sub">（未改装）</span>}
        </div>
      </div>

      <InstallableList />
      <button className="rv-open" onClick={onOpen}>打开改装面板（V）</button>
    </div>
  );
}

/** 可安装改装快捷列表 */
function InstallableList() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const quickInstallMod = useGame((s) => s.quickInstallMod);
  const [showAll, setShowAll] = useState(false);
  void version;

  const list = session.installableMods();
  const ready = list.filter((x) => x.canInstall);
  const shown = showAll ? list : ready.slice(0, 6);

  const MOD_REASON: Record<string, string> = {
    already: "已装",
    "missing-prereq": "缺前置",
    "missing-tech": "缺科技",
    "missing-resource": "缺材料",
    ok: "可装"
  };

  return (
    <div className="rv-section">
      <span className="sub">
        可改装（{ready.length}）{list.length > ready.length && `　共 ${list.length} 项未装`}
      </span>
      <div className="rv-list">
        {shown.map((m) => (
          <button
            key={m.id}
            className="rv-row"
            onClick={() => m.canInstall && quickInstallMod(m.id)}
            disabled={!m.canInstall}
            title={m.description}
          >
            <span className="rv-row-main">
              {m.name}
              <span className="rv-tier">T{m.tier}</span>
            </span>
            <span className="rv-row-meta">
              {m.canInstall ? (
                <span className="rv-ok">可装</span>
              ) : (
                <span className="rv-lock">{MOD_REASON[m.reason] ?? m.reason}</span>
              )}
            </span>
          </button>
        ))}
        {shown.length === 0 && <p className="sub">（暂无可安装改装）</p>}
      </div>
      {list.length > 6 && (
        <button className="mini" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "只看可安装" : `展开全部 ${list.length} 项`}
        </button>
      )}
    </div>
  );
}

/** 行动视图 */
function ActionsView() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const advanceHours = useGame((s) => s.advanceHours);
  const sleepDays = useGame((s) => s.sleepDays);
  const lootCurrent = useGame((s) => s.lootCurrent);
  const clearCurrent = useGame((s) => s.clearCurrent);
  const rollRaid = useGame((s) => s.rollRaid);
  const tryRecruitHere = useGame((s) => s.tryRecruitHere);
  void version;

  const pending = session.pendingNightRaids();

  return (
    <div className="right-view">
      <div className="rv-section">
        <span className="sub">时间</span>
        <div className="rv-actions">
          <button className="rv-btn" onClick={() => advanceHours(1, "idle")}>+1 小时</button>
          <button className="rv-btn" onClick={() => advanceHours(4, "work")}>工作 4 小时</button>
          <button className="rv-btn" onClick={() => sleepDays(1)}>睡一觉</button>
        </div>
      </div>

      <div className="rv-section">
        <span className="sub">区域</span>
        <div className="rv-actions">
          <button className="rv-btn" onClick={lootCurrent}>
            搜刮（{session.world.regions[session.world.current]?.nodesLeft ?? 0}）
          </button>
          <button className="rv-btn" onClick={clearCurrent}>清理区域</button>
          <button className="rv-btn" onClick={tryRecruitHere}>搜索幸存者</button>
        </div>
      </div>

      <div className="rv-section">
        <span className="sub">防御</span>
        <div className="rv-actions">
          <button className="rv-btn warn" onClick={rollRaid}>判定今晚</button>
        </div>
        {pending.length > 0 && (
          <p className="sub warn-text">⚠ {pending.length} 位同伴今晚会夜袭</p>
        )}
      </div>

      <div className="rv-section">
        <span className="sub">当前状态</span>
        <div className="rv-stats">
          <div><span>同伴</span><b>{session.joined().length}</b></div>
          <div><span>防御</span><b>{session.defenseLevel().label}</b></div>
          <div><span>探索</span><b>{session.exploration().percent}%</b></div>
          <div><span>后代</span><b>{session.offspring.length}</b></div>
        </div>
      </div>
    </div>
  );
}

export function RightColumn({ onOpen }: { onOpen: (tab: string) => void }) {
  const [tab, setTab] = useState<RightTab>("map");

  return (
    <aside className="rightcol">
      <nav className="rightcol-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "rtab active" : "rtab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="rightcol-body">
        {tab === "map" && <MapView />}
        {tab === "base" && <BaseView onOpen={() => onOpen("base")} />}
        {tab === "vehicle" && <VehicleView onOpen={() => onOpen("vehicle")} />}
        {tab === "actions" && <ActionsView />}
      </div>
    </aside>
  );
}