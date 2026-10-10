import { useState } from "react";
import {
  TRAVEL_MODES,
  type TravelMode
} from "@doomsday/core";
import { useGame } from "../store/game.ts";
import { MiniMap, CellInfo } from "./GridMap.tsx";

/**
 * 右栏标签。
 *
 * 严格照原型 .rtabs：只有「地图」是切页，
 * 「基地」「房车」是**打开弹窗**（原型 onclick="openFortress()/openVehicle()"）。
 */
type RightTab = "map";

const TABS: Array<{ id: "map" | "base" | "vehicle"; label: string; modal?: string }> = [
  { id: "map", label: "地图" },
  { id: "base", label: "基地", modal: "fortress" },
  { id: "vehicle", label: "房车", modal: "vehicle" }
];

/** 地图视图（原型 UI：网格地图 + 方向键 + 当前格） */
function MapView() {
  const session = useGame((s) => s.session);
  const mapId = useGame((s) => s.mapId);
  const cellId = useGame((s) => s.cellId);
  const explored = useGame((s) => s.explored);
  const mapMove = useGame((s) => s.mapMove);
  const mapCycle = useGame((s) => s.mapCycle);
  const openBigMap = useGame((s) => s.openBigMap);

  const advanceHours = useGame((s) => s.advanceHours);
  const lootCurrent = useGame((s) => s.lootCurrent);
  const travelMode = useGame((s) => s.session.travelMode);
  const setTravelMode = useGame((s) => s.setTravelMode);

  // 当前主线目标（原型 .obj）—— 取序章进度
  const prologue = session.prologueInfo();
  const goal = prologue.done ? null : {
    title: prologue.label,
    desc: prologue.desc,
    percent: Math.round(prologue.progress * 100),
    step: Math.round(prologue.progress * 100),
    total: 100
  };

  return (
    <div className="proto-rpane">
      {/* 当前目标（原型 .obj） */}
      {goal ? (
        <div className="proto-obj">
          <div className="proto-objh">当前目标</div>
          <div className="proto-objt">{goal.title}</div>
          <div className="proto-objd">{goal.desc}</div>
          <div className="proto-objp">
            <div className="proto-objbar">
              <div className="proto-objfill" style={{ width: goal.percent + "%" }} />
            </div>
            <span className="proto-objpct">{goal.step}/{goal.total}</span>
          </div>
        </div>
      ) : null}

      {goal ? <div className="proto-dvd" /> : null}

      {/* 小地图 */}
      <MiniMap
        mapId={mapId}
        cellId={cellId}
        explored={explored}
        onMove={mapMove}
        onCycleMap={mapCycle}
        onOpenBig={() => openBigMap(true)}
      />

      {/* 当前格 */}
      <CellInfo mapId={mapId} cellId={cellId} />

      <div className="proto-dvd" />

      {/* 外出行动（原型 .actlist） */}
      <div className="proto-sec">外出行动</div>
      <div className="proto-actlist">
        <button className="proto-act-btn" onClick={() => openBigMap(true)}>
          <span className="proto-ai">🚶</span>
          <span className="proto-an">远征</span>
          <span className="proto-ad">选目的地 · 定队伍</span>
        </button>
        <button className="proto-act-btn" onClick={() => advanceHours(2, "patrol")}>
          <span className="proto-ai">🛡</span>
          <span className="proto-an">巡逻</span>
          <span className="proto-ad">绕据点 · 遇敌</span>
        </button>
        <button className="proto-act-btn" onClick={lootCurrent}>
          <span className="proto-ai">🎒</span>
          <span className="proto-an">搜刮</span>
          <span className="proto-ad">翻当前区域物资</span>
        </button>
        <button className="proto-act-btn" onClick={() => advanceHours(1, "expedition")}>
          <span className="proto-ai">🔭</span>
          <span className="proto-an">侦查</span>
          <span className="proto-ad">探明相邻未知格</span>
        </button>
      </div>

      <div className="proto-dvd" />

      {/* 交通方式 */}
      <div className="proto-sec">交通方式</div>
      <div className="proto-modes">
        {(["walk", "bike", "car", "apc"] as TravelMode["id"][]).map((m) => (
          <button
            key={m}
            className={"proto-imode" + (travelMode === m ? " proto-on" : "")}
            onClick={() => setTravelMode(m)}
            title={TRAVEL_MODES[m].label}
          >
            {TRAVEL_MODES[m].label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RightColumn({ onOpen }: { onOpen: (tab: string) => void }) {
  const [tab, setTab] = useState<RightTab>("map");

  return (
    <div className="proto-rpane">
      <div className="proto-rtabs">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={"proto-rtab" + (tab === t.id ? " proto-on" : "")}
            onClick={() => {
              // 基地 / 房车：打开弹窗（不切页）
              if (t.modal) { onOpen(t.modal); return; }
              setTab("map");
            }}
          >
            {t.label}
          </div>
        ))}
      </div>
      <div className="proto-rbody">
        <MapView />
      </div>
    </div>
  );
}