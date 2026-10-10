import { useEffect, useMemo, useRef, useState } from "react";
import {
  REGIONS, neighbors, effectiveDanger, TERRAIN_LABEL, DANGER_LABEL,
  TRAVEL_MODES, type DangerLevel, type TravelMode
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 地形符号（无美术资源时用符号代替瓦片） */
const TERRAIN_GLYPH: Record<string, string> = {
  base: "⌂", urban: "▤", residential: "▦", industrial: "⚙",
  forest: "♣", mountain: "▲", road: "═", rural: "≡",
  coast: "≈", lab: "⚗", military: "✦"
};

const MODES: TravelMode["id"][] = ["walk", "bike", "car", "apc"];

/** 生成稳定布局：按区域在邻接图中的位置排布 */
function layout(w: number, h: number): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  // 以 home 为中心做 BFS 分层
  const dist = new Map<string, number>();
  const queue: string[] = ["home"];
  dist.set("home", 0);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    const def = REGIONS.find((r) => r.id === cur);
    if (!def) continue;
    for (const link of def.links) {
      if (dist.has(link.to)) continue;
      dist.set(link.to, d + 1);
      queue.push(link.to);
    }
  }
  // 未连通的孤立区域放最外圈
  for (const r of REGIONS) if (!dist.has(r.id)) dist.set(r.id, 4);

  const rings = new Map<number, string[]>();
  for (const [id, d] of dist) {
    if (!rings.has(d)) rings.set(d, []);
    rings.get(d)!.push(id);
  }

  const cx = w / 2;
  const cy = h / 2;
  // 边距，避免节点与标签出界
  const padX = 70;
  const padY = 46;
  const maxRx = Math.max(60, w / 2 - padX);
  const maxRy = Math.max(50, h / 2 - padY);
  const maxRing = Math.max(1, ...[...rings.keys()]);

  for (const [ring, ids] of rings) {
    if (ring === 0) {
      out.set(ids[0], { x: cx, y: cy });
      continue;
    }
    void 0;
    // 半径按环号线性分配，并受可用空间限制
    const t = ring / maxRing;
    const rx = maxRx * Math.min(1, 0.42 + t * 0.58);
    const ry = maxRy * Math.min(1, 0.42 + t * 0.58);
    ids.forEach((id, i) => {
      const angle = (i / ids.length) * Math.PI * 2 - Math.PI / 2 + ring * 0.4;
      // 钳制到安全区，保证节点与下方标签都不出界
      const x = Math.max(padX, Math.min(w - padX, cx + Math.cos(angle) * rx));
      const y = Math.max(padY, Math.min(h - padY - 20, cy + Math.sin(angle) * ry));
      out.set(id, { x, y });
    });
  }
  return out;
}

export function MainView() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const travelTo = useGame((s) => s.travelTo);
  const setTravelMode = useGame((s) => s.setTravelMode);
  const lootCurrent = useGame((s) => s.lootCurrent);
  const clearCurrent = useGame((s) => s.clearCurrent);
  const advanceHours = useGame((s) => s.advanceHours);
  const sleepDays = useGame((s) => s.sleepDays);
  const rollRaid = useGame((s) => s.rollRaid);
  const tryRecruitHere = useGame((s) => s.tryRecruitHere);
  void version;

  const [hover, setHover] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 620, h: 420 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pos = useMemo(() => layout(size.w, size.h), [size.w, size.h]);
  const w = session.world;
  const ns = neighbors(w);

  const here = session.here();
  const danger = effectiveDanger(w, w.current);

  return (
    <section className="mainview">
      {/* 顶部地点条 */}
      <div className="locationbar">
        <span className="loc-name">{here?.name ?? "?"}</span>
        <span className="loc-sub">
          {here ? TERRAIN_LABEL[here.terrain] : ""}　
          <span className={danger >= 4 ? "danger-text" : ""}>
            {DANGER_LABEL[danger as DangerLevel]}
          </span>
        </span>
      </div>

      {/* 地图 */}
      <div className="mapwrap" ref={wrapRef}>
        <svg width={size.w} height={size.h} className="mapsvg">
          {/* 连线 */}
          {REGIONS.map((r) => {
            const a = pos.get(r.id);
            if (!a) return null;
            const st = w.regions[r.id];
            if (!st?.discovered) return null;
            return r.links.map((link) => {
              const b = pos.get(link.to);
              if (!b) return null;
              if (!w.regions[link.to]?.discovered) return null;
              const active = r.id === w.current || link.to === w.current;
              return (
                <g key={`${r.id}-${link.to}`}>
                  <line
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={active ? "#c8506e" : "#3a3f4a"}
                    strokeWidth={active ? 2.5 : 1.5}
                    strokeDasharray={active ? "none" : "4 3"}
                  />
                  <text
                    x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4}
                    fill="#5a616e" fontSize="9" textAnchor="middle"
                  >
                    {link.km}km
                  </text>
                </g>
              );
            });
          })}

          {/* 节点 */}
          {REGIONS.map((r) => {
            const p = pos.get(r.id);
            if (!p) return null;
            const st = w.regions[r.id];
            const isCur = r.id === w.current;
            const disc = st?.discovered;
            const d = effectiveDanger(w, r.id);
            const color = ["#3a5f45", "#4a6b3f", "#8a7a3a", "#a86a35", "#a0453a", "#6b1f1f"][d] ?? "#3a4048";
            const isHover = hover === r.id;

            return (
              <g
                key={r.id}
                transform={`translate(${p.x},${p.y})`}
                className="mapnode"
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover(null)}
              >
                <circle
                  r={isCur ? 20 : isHover ? 17 : 14}
                  fill={disc ? color : "#1a1d23"}
                  stroke={isCur ? "#fff" : "rgba(255,255,255,.22)"}
                  strokeWidth={isCur ? 3 : 1.4}
                />
                {disc ? (
                  <text y="5" textAnchor="middle" fontSize="14" fill="#e6e9ef">
                    {TERRAIN_GLYPH[r.terrain] ?? "·"}
                  </text>
                ) : (
                  <text y="5" textAnchor="middle" fontSize="13" fill="#4a5058">?</text>
                )}
                {disc && (
                  <text y={isCur ? 34 : 30} textAnchor="middle" fontSize="10"
                    fill={isCur ? "#e6e9ef" : "#8b94a3"}>
                    {r.name}
                  </text>
                )}
                {st?.visited && !isCur && (
                  <circle cx="10" cy="-10" r="3" fill="rgba(255,255,255,.5)" />
                )}
              </g>
            );
          })}
        </svg>

        {/* 悬停信息 */}
        {hover && (() => {
          const def = REGIONS.find((r) => r.id === hover)!;
          const st = w.regions[hover];
          const d = effectiveDanger(w, hover);
          return (
            <div className="maptip">
              <b>{st?.discovered ? def.name : "未发现区域"}</b>
              {st?.discovered && (
                <>
                  <span className="sub">{TERRAIN_LABEL[def.terrain]}　{DANGER_LABEL[d as DangerLevel]}</span>
                  <span className="sub">搜刮点 {st.nodesLeft}/{def.lootNodes}　清理 {st.cleared}</span>
                  <span className="sub">{def.description}</span>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* 交通方式 */}
      <div className="modebar">
        <span className="sub">交通</span>
        {MODES.map((m) => {
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
        <span className="sub">燃料 {session.vehicle.fuel.toFixed(0)}L</span>
      </div>

      {/* 可达区域 + 上下文动作 */}
      <div className="actionbar">
        <div className="actions-left">
          {ns.map((n) => {
            const plan = session.planTravelTo(n.def.id);
            const st = w.regions[n.def.id];
            return (
              <button
                key={n.def.id}
                className="actbtn"
                onClick={() => travelTo(n.def.id)}
                disabled={!plan.reachable}
                title={plan.reason ?? `${plan.hours.toFixed(1)}h`}
              >
                <span className="akey">E</span>
                前往 {n.def.name}
                {!st?.discovered && <span className="sub"> ?</span>}
                <span className="asub">
                  {n.km}km·{plan.hours.toFixed(1)}h
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="actionbar">
        <div className="actions-left">
          <button className="actbtn" onClick={() => advanceHours(1, "idle")}>
            <span className="akey">1</span>+1 小时
          </button>
          <button className="actbtn" onClick={() => advanceHours(4, "work")}>
            <span className="akey">2</span>工作 4 小时
          </button>
          <button className="actbtn" onClick={() => sleepDays(1)}>
            <span className="akey">3</span>睡一觉
          </button>
          <button className="actbtn" onClick={lootCurrent}>
            <span className="akey">4</span>搜刮（{w.regions[w.current]?.nodesLeft ?? 0}）
          </button>
          <button className="actbtn" onClick={clearCurrent}>
            <span className="akey">5</span>清理区域
          </button>
          <button className="actbtn" onClick={rollRaid}>
            <span className="akey">6</span>判定今晚
          </button>
          <button className="actbtn" onClick={tryRecruitHere}>
            <span className="akey">7</span>搜索幸存者
          </button>
        </div>
      </div>
    </section>
  );
}