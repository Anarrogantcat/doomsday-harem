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
import { ScenePlayer } from "./panels/ScenePlayer.tsx";
import { CheatPanel } from "./panels/CheatPanel.tsx";
import { LlmPanel } from "./panels/LlmPanel.tsx";
import { useGame } from "./store/game.ts";

type Tab = "status" | "map" | "vehicle" | "harem" | "jobs" | "tech" | "base" | "wardrobe" | "items" | "scenes" | "llm" | "cheats";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "status", label: "状态" },
  { id: "map", label: "地图" },
  { id: "vehicle", label: "房车" },
  { id: "harem", label: "后宫" },
  { id: "jobs", label: "岗位" },
  { id: "tech", label: "科技" },
  { id: "base", label: "基地" },
  { id: "wardrobe", label: "服装" },
  { id: "items", label: "物品" },
  { id: "scenes", label: "场景" },
  { id: "llm", label: "模型" },
  { id: "cheats", label: "设置" }
];

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
        {tab === "vehicle" && <VehiclePanel />}
        {tab === "harem" && <HaremPanel />}
        {tab === "jobs" && <JobBoard />}
        {tab === "tech" && <TechTreePanel />}
        {tab === "base" && <BasePanel />}
        {tab === "wardrobe" && <WardrobePanel />}
        {tab === "items" && <InventoryPanel />}
        {tab === "scenes" && <ScenePlayer />}
        {tab === "llm" && <LlmPanel />}
        {tab === "cheats" && <CheatPanel />}
      </main>
    </div>
  );
}