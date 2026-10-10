/**
 * 网格地图组件（原型 UI 移植）。
 *
 * 对应原型 `docs/ui-prototype.html` 的 `.mgrid` / `.biggrid` 两处。
 * 数据源：`@doomsday/core` 的 systems/maps.ts（5 张图 / 216 格）。
 *
 * 三块界面：
 *   1. MiniMap —— 5x5 局部视野 + 方向键盘
 *   2. BigMap  —— 全图弹窗 + 地图标签切换
 *   3. CellInfo —— 当前格：在场的人 / 可搜刮 / 可进行
 */
import { useMemo, useState } from "react";
import {
  ALL_MAPS,
  MAIN_MAPS,
  getMap,
  getCell,
  availableDirs,
  DIR_LABEL,
  DIR_ARROW,
  KIND_LABEL,
  KIND_ICON,
  KIND_COLOR,
  type MapCellData,
  type ExitDir
} from "@doomsday/core";

/** 已探索格：地图 id → 格 id 集合 */
export type ExploredState = Record<string, Set<string>>;

/** 初始探索度（与原型一致：生活圈 + 自建要塞） */
export const INITIAL_EXPLORED: Record<string, string[]> = {
  jc_south: [
    "hero_home", "home_block", "univ_neigh", "south_park", "park_lake",
    "mountain_foot", "hillside_road", "metro_south", "clin_neigh",
    "res_blocks", "street_east", "middle_school", "res_west",
    "shoemaker", "vegetable_market", "south_plaza"
  ],
  jc_center: ["center_gate_n", "central_plaza"],
  jc_east: ["e_gate_n", "e_farm_main"],
  beiling: [
    "mt_foot_camp", "mt_trail", "mt_stream", "mt_ledge", "mt_rv_park",
    "mt_fortress_out", "mt_fortress_side", "mt_fortress", "mt_gate_south",
    "mt_garage_out", "mt_workshop_out", "mt_tunnel_mouth", "mt_water_tank",
    "mt_terraces", "mt_spring_s"
  ]
};

export function buildExplored(): ExploredState {
  const out: ExploredState = {};
  for (const m of ALL_MAPS) {
    // 要塞内部是主角自己建的，全部已探索
    out[m.id] = new Set(m.id === "fortress_inside"
      ? m.cells.map((c) => c.id)
      : (INITIAL_EXPLORED[m.id] ?? []));
  }
  return out;
}

/** 危险度 CSS 后缀（0-5） */
function dangerCls(d: number): string {
  return "proto-dd" + Math.min(5, Math.max(0, d));
}

/** 格子上的人物 / 物品 / 事件标记 */
export interface CellMarkers {
  people?: string[];
  items?: number;
  events?: number;
}

// ============ 小地图 ============

export interface MiniMapProps {
  mapId: string;
  cellId: string;
  explored: ExploredState;
  onMove: (dir: ExitDir) => void;
  onOpenBig: () => void;
  onCycleMap: () => void;
  markers?: Record<string, CellMarkers>;
}

export function MiniMap(p: MiniMapProps) {
  const [dense, setDense] = useState(false);
  const map = getMap(p.mapId);
  const cell = getCell(p.mapId, p.cellId);

  const view = useMemo(() => {
    if (!map || !cell) return [];
    const R = 2;
    const out: Array<{ key: string; c: MapCellData | null }> = [];
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const c = map.cells.find((v) => v.x === cell.x + dx && v.y === cell.y + dy) ?? null;
        out.push({ key: `${cell.x + dx},${cell.y + dy}`, c });
      }
    }
    return out;
  }, [map, cell]);

  if (!map || !cell) {
    return <div className="proto-sec">地图数据缺失</div>;
  }

  const known = p.explored[p.mapId] ?? new Set<string>();
  const dirOpts = availableDirs(p.mapId, p.cellId);
  const can = (d: ExitDir) => dirOpts.some((o) => o.dir === d);
  const titleOf = (d: ExitDir) => {
    const o = dirOpts.find((x) => x.dir === d);
    return o ? `往${o.label}：${o.name}${o.kind === "exit" ? "（跨图）" : ""}` : "无路";
  };

  return (
    <>
      <div className="proto-sec" style={{ display: "flex", alignItems: "center", gap: ".4em" }}>
        <span style={{ flex: 1 }}>{map.name}</span>
        <span
          style={{ fontSize: ".85em", color: "var(--dim)", cursor: "pointer" }}
          title="切换地图"
          onClick={p.onCycleMap}
        >⇄</span>
        <span className="proto-mzoom" title="切换紧凑/详细" onClick={() => setDense((v) => !v)}>
          {dense ? "▦" : "▤"}
        </span>
        <span
          style={{ fontSize: ".85em", color: "var(--accent-lt)", cursor: "pointer" }}
          title="展开大地图"
          onClick={p.onOpenBig}
        >⤢</span>
      </div>

      <div className="proto-mgrid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {view.map((v) => {
          if (!v.c) return <div key={v.key} className="proto-mcell proto-empty" />;
          const seen = known.has(v.c.id);
          const isCur = v.c.id === p.cellId;
          const mk = p.markers?.[v.c.id];
          return (
            <div
              key={v.key}
              className={
                "proto-mcell " + dangerCls(v.c.danger) +
                (isCur ? " proto-cur" : "") + (seen ? "" : " proto-fog")
              }
              title={seen ? `${v.c.name}（${KIND_LABEL[v.c.kind]}，危险 ${v.c.danger}）` : "未探索"}
            >
              <span className="proto-mc-n">
                {seen ? (dense ? v.c.name.slice(0, 2) : KIND_ICON[v.c.kind]) : "?"}
              </span>
              {seen && (mk?.items ?? 0) > 0 ? <span className="proto-mbadge loot">◆</span> : null}
              {seen && (mk?.events ?? 0) > 0 ? <span className="proto-mbadge ev">!</span> : null}
            </div>
          );
        })}
      </div>

      <div className="proto-dpad">
        <div />
        <button className="proto-dbtn" disabled={!can("N")} onClick={() => p.onMove("N")} title={titleOf("N")}>↑</button>
        <div />
        <button className="proto-dbtn" disabled={!can("W")} onClick={() => p.onMove("W")} title={titleOf("W")}>←</button>
        <button className="proto-dbtn proto-center" title="当前位置">◆</button>
        <button className="proto-dbtn" disabled={!can("E")} onClick={() => p.onMove("E")} title={titleOf("E")}>→</button>
        <div />
        <button className="proto-dbtn" disabled={!can("S")} onClick={() => p.onMove("S")} title={titleOf("S")}>↓</button>
        <div />
      </div>
    </>
  );
}

// ============ 大地图 ============

export interface BigMapProps {
  mapId: string;
  cellId: string;
  explored: ExploredState;
  open: boolean;
  onClose: () => void;
  onSelectMap: (mapId: string) => void;
  onGo: (mapId: string, cellId: string) => void;
  markers?: Record<string, CellMarkers>;
}

export function BigMap(p: BigMapProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const map = getMap(p.mapId);
  if (!p.open) return null;

  const known = p.explored[p.mapId] ?? new Set<string>();
  const pickedCell = picked ? map?.cells.find((c) => c.id === picked) ?? null : null;

  return (
    <div
      className="proto-modal proto-on"
      onClick={(e) => { if (e.target === e.currentTarget) p.onClose(); }}
    >
      <div className="proto-mbox" style={{ width: "min(74em,97vw)", maxWidth: "97vw" }}>
        <div className="proto-mhead">
          <span className="proto-mtitle">{map?.name ?? "地图"}</span>
          <button className="proto-mclose" onClick={p.onClose}>✕</button>
        </div>

        <div className="proto-dbody" style={{ gap: ".6em" }}>
          <div className="proto-maptabs">
            {ALL_MAPS.map((m) => (
              <div
                key={m.id}
                className={
                  "proto-maptab" + (m.id === p.mapId ? " proto-on" : "") +
                  (m.kind === "sub" ? " proto-subtab" : "")
                }
                onClick={() => { p.onSelectMap(m.id); setPicked(null); }}
              >
                {m.kind === "sub" ? "↧ " + m.name : m.name}
              </div>
            ))}
          </div>

          <div
            className="proto-biggrid"
            style={map ? { gridTemplateColumns: `repeat(${map.cols},1fr)` } : undefined}
          >
            {map?.cells.map((c) => {
              const seen = known.has(c.id);
              const isCur = c.id === p.cellId;
              const mk = p.markers?.[c.id];
              const exit = c.exits?.[0];
              return (
                <div
                  key={c.id}
                  className={
                    "proto-bgc " + dangerCls(c.danger) +
                    (isCur ? " proto-cur" : "") +
                    (c.id === picked ? " picked" : "") +
                    (seen ? "" : " proto-fog")
                  }
                  onClick={() => setPicked(c.id)}
                  title={seen ? c.name : "未探索"}
                >
                  <span className="proto-bn">{seen ? c.name : "?"}</span>
                  {seen && exit ? <span className="proto-bbadge proto-exit">{DIR_ARROW[exit.dir]}</span> : null}
                  {seen && (mk?.people?.length ?? 0) > 0 ? (
                    <span className="proto-mdots">
                      {mk!.people!.slice(0, 3).map((_, i) => <i key={i} />)}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="proto-curcell">
            {pickedCell ? (
              <>
                <div className="proto-cc-n">{pickedCell.name}</div>
                <div className="proto-cc-d">{pickedCell.desc || "暂无描述"}</div>
                <div className="proto-cc-t">
                  <span className={"proto-cc-tag " + dangerCls(pickedCell.danger)}>
                    {pickedCell.danger === 0 ? "安全" : "危险 " + pickedCell.danger}
                  </span>
                  <span className="proto-cc-tag" style={{ color: KIND_COLOR[pickedCell.kind] }}>
                    {KIND_ICON[pickedCell.kind]} {KIND_LABEL[pickedCell.kind]}
                  </span>
                  {pickedCell.exits?.map((e, i) => (
                    <span key={i} className="proto-cc-tag">
                      {DIR_LABEL[e.dir]} → {e.label}
                    </span>
                  ))}
                  {pickedCell.sub ? (
                    <span className="proto-cc-tag">可进入 {pickedCell.sub.label}</span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="proto-cc-n">点击格子查看详情</div>
            )}
          </div>
        </div>

        <div className="proto-acts" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <button
            className="proto-abtn primary"
            style={{ justifyContent: "center" }}
            disabled={!picked}
            onClick={() => { if (picked) { p.onGo(p.mapId, picked); p.onClose(); } }}
          >前往选中格</button>
          <button className="proto-abtn" style={{ justifyContent: "center" }} disabled>自动寻路</button>
          <button className="proto-abtn" style={{ justifyContent: "center" }} onClick={p.onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

// ============ 当前格信息 ============

export interface CellInfoProps {
  mapId: string;
  cellId: string;
  markers?: CellMarkers;
  onEnterSub?: (subId: string, at: string, label: string) => void;
  onExit?: (mapId: string, cellId: string, label: string) => void;
}

export function CellInfo(p: CellInfoProps) {
  const cell = getCell(p.mapId, p.cellId);
  if (!cell) return null;
  const mk = p.markers;
  const hasPeople = (mk?.people?.length ?? 0) > 0;
  const hasItems = (mk?.items ?? 0) > 0;

  return (
    <div className="proto-curcell">
      <div className="proto-cc-n">{cell.name}</div>
      <div className="proto-cc-d">{cell.desc || "暂无描述"}</div>
      <div className="proto-cc-t">
        <span className={"proto-cc-tag " + dangerCls(cell.danger)}>
          {cell.danger === 0 ? "安全" : "危险 " + cell.danger}
        </span>
        <span className="proto-cc-tag" style={{ color: KIND_COLOR[cell.kind] }}>
          {KIND_ICON[cell.kind]} {KIND_LABEL[cell.kind]}
        </span>
      </div>

      {hasPeople || hasItems ? (
        <>
          <div className="proto-sec">在场</div>
          <div className="proto-dgrid">
            {mk?.people?.map((n, i) => (
              <div key={i} className="proto-dcell">
                <span className="k">人物</span><span className="v">{n}</span>
              </div>
            ))}
            {hasItems ? (
              <div className="proto-dcell">
                <span className="k">可搜刮</span><span className="v">{mk?.items} 处</span>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {cell.loot.length > 0 ? (
        <>
          <div className="proto-sec">可搜刮</div>
          <div className="proto-dgrid">
            {cell.loot.slice(0, 6).map((l, i) => (
              <div key={i} className="proto-dcell">
                <span className="k">物资</span><span className="v">{l}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="proto-actlist">
        {cell.exits?.map((e, i) => (
          <button
            key={i}
            className="proto-abtn primary"
            onClick={() => p.onExit?.(e.toMap, e.toCell, e.label)}
          >{DIR_LABEL[e.dir]} · {e.label}</button>
        ))}
        {cell.sub ? (
          <button
            className="proto-abtn primary"
            onClick={() => p.onEnterSub?.(cell.sub!.id, cell.sub!.at, cell.sub!.label)}
          >{cell.sub.label}</button>
        ) : null}
      </div>
    </div>
  );
}
