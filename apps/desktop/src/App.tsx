import { useState } from "react";
import { StatusBar } from "./panels/StatusBar.tsx";
import { HaremPanel } from "./panels/HaremPanel.tsx";
import { JobBoard } from "./panels/JobBoard.tsx";
import { ScenePlayer } from "./panels/ScenePlayer.tsx";
import { CheatPanel } from "./panels/CheatPanel.tsx";
import { useGame } from "./store/game.ts";

type Tab = "world" | "harem" | "jobs" | "scenes" | "cheats";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "world", label: "世界" },
  { id: "harem", label: "后宫" },
  { id: "jobs", label: "岗位" },
  { id: "scenes", label: "场景" },
  { id: "cheats", label: "设置" }
];

export function App() {
  const [tab, setTab] = useState<Tab>("world");
  const cheatBadge = useGame((s) => s.cheatBadge());

  return (
    <div className="app">
      <header className="topbar">
        <span className="title">Doomsday Harem</span>
        <nav>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {cheatBadge && <span className="badge">{cheatBadge}</span>}
      </header>

      <main className="content">
        {tab === "world" && <StatusBar />}
        {tab === "harem" && <HaremPanel />}
        {tab === "jobs" && <JobBoard />}
        {tab === "scenes" && <ScenePlayer />}
        {tab === "cheats" && <CheatPanel />}
      </main>
    </div>
  );
}
