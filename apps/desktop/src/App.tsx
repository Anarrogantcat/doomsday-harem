import { useState } from "react";
import { StatusBar } from "./panels/StatusBar.tsx";
import { HaremPanel } from "./panels/HaremPanel.tsx";
import { JobBoard } from "./panels/JobBoard.tsx";
import { TechTreePanel } from "./panels/TechTreePanel.tsx";
import { WardrobePanel } from "./panels/WardrobePanel.tsx";
import { InventoryPanel } from "./panels/InventoryPanel.tsx";
import { BasePanel } from "./panels/BasePanel.tsx";
import { WorldPanel } from "./panels/WorldPanel.tsx";
import { VehiclePanel } from "./panels/VehiclePanel.tsx";
import { QuestPanel } from "./panels/QuestPanel.tsx";
import { DefensePanel } from "./panels/DefensePanel.tsx";
import { CompanionDataPanel } from "./panels/CompanionDataPanel.tsx";
import { CanvasView } from "./panels/CanvasView.tsx";
import { SavePanel } from "./panels/SavePanel.tsx";
import { ScenePlayer } from "./panels/ScenePlayer.tsx";
import { CheatPanel } from "./panels/CheatPanel.tsx";
import { LlmPanel } from "./panels/LlmPanel.tsx";
import { useGame } from "./store/game.ts";

type Tab = "status" | "map" | "canvas" | "vehicle" | "quests" | "defense" | "harem" | "roster" | "jobs" | "tech" | "base" | "wardrobe" | "items" | "scenes" | "llm" | "save" | "cheats";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "status", label: "状态" },
  { id: "map", label: "地图" },
  { id: "canvas", label: "画面" },
  { id: "vehicle", label: "房车" },
  { id: "quests", label: "主线" },
  { id: "defense", label: "防御" },
  { id: "harem", label: "后宫" },
  { id: "roster", label: "角色" },
  { id: "jobs", label: "岗位" },
  { id: "tech", label: "科技" },
  { id: "base", label: "基地" },
  { id: "wardrobe", label: "服装" },
  { id: "items", label: "物品" },
  { id: "scenes", label: "场景" },
  { id: "llm", label: "模型" },
  { id: "save", label: "存档" },
  { id: "cheats", label: "设置" }
];

function CanvasPlayground() {
  const [mode, setMode] = useState<"map" | "battle" | "scene">("map");
  return (
    <section className="panel">
      <h2>画面　<span className="sub">Canvas 渲染后端</span></h2>
      <div className="controls">
        <button className={mode === "map" ? "tab active" : "tab"} onClick={() => setMode("map")}>世界地图</button>
        <button className={mode === "battle" ? "tab active" : "tab"} onClick={() => setMode("battle")}>战斗布阵</button>
        <button className={mode === "scene" ? "tab active" : "tab"} onClick={() => setMode("scene")}>场景像素</button>
      </div>
      <CanvasView mode={mode} />
      <p className="hint">
        渲染后端实现 core 的 View 接口，订阅同一场景状态机。
        切换画风（像素/插画/Live2D）或换用 Phaser 只需替换此组件，上层逻辑不变。
        像素层可完全关闭，文字照常输出。
      </p>
    </section>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>("world");
  const cheatBadge = useGame((s) => s.cheatBadge());
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const h = Math.floor(session.time.minute / 60);
  const m = session.time.minute % 60;

  return (
    <div className="app">
      <header className="topbar">
        <span className="title">Doomsday Harem</span>
        <span className="sub">
          第 {session.time.day} 天 {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
        </span>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "tab active" : "tab"} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        {cheatBadge && <span className="badge">{cheatBadge}</span>}
      </header>

      <main className="content">
        {tab === "status" && <StatusBar />}
        {tab === "map" && <WorldPanel />}
        {tab === "canvas" && <CanvasPlayground />}
        {tab === "vehicle" && <VehiclePanel />}
        {tab === "quests" && <QuestPanel />}
        {tab === "defense" && <DefensePanel />}
        {tab === "harem" && <HaremPanel />}
        {tab === "roster" && <CompanionDataPanel />}
        {tab === "jobs" && <JobBoard />}
        {tab === "tech" && <TechTreePanel />}
        {tab === "base" && <BasePanel />}
        {tab === "wardrobe" && <WardrobePanel />}
        {tab === "items" && <InventoryPanel />}
        {tab === "scenes" && <ScenePlayer />}
        {tab === "llm" && <LlmPanel />}
        {tab === "save" && <SavePanel />}
        {tab === "cheats" && <CheatPanel />}
      </main>
    </div>
  );
}