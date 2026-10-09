import { useState } from "react";
import { StatusBar } from "./panels/StatusBar.tsx";
import { HaremPanel } from "./panels/HaremPanel.tsx";
import { JobBoard } from "./panels/JobBoard.tsx";
import { TechTreePanel } from "./panels/TechTreePanel.tsx";
import { ScenePlayer } from "./panels/ScenePlayer.tsx";
import { CheatPanel } from "./panels/CheatPanel.tsx";
import { LlmPanel } from "./panels/LlmPanel.tsx";
import { useGame } from "./store/game.ts";

type Tab = "world" | "harem" | "jobs" | "tech" | "scenes" | "llm" | "cheats";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "world", label: "世界" },
  { id: "harem", label: "后宫" },
  { id: "jobs", label: "岗位" },
  { id: "tech", label: "科技" },
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
        {tab === "world" && <StatusBar />}
        {tab === "harem" && <HaremPanel />}
        {tab === "jobs" && <JobBoard />}
        {tab === "tech" && <TechTreePanel />}
        {tab === "scenes" && <ScenePlayer />}
        {tab === "llm" && <LlmPanel />}
        {tab === "cheats" && <CheatPanel />}
      </main>
    </div>
  );
}
