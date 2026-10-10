import { useEffect } from "react";
import { StatusBar } from "../panels/StatusBar.tsx";
import { HaremPanel } from "../panels/HaremPanel.tsx";
import { JobBoard } from "../panels/JobBoard.tsx";
import { TechTreePanel } from "../panels/TechTreePanel.tsx";
import { WardrobePanel } from "../panels/WardrobePanel.tsx";
import { InventoryPanel } from "../panels/InventoryPanel.tsx";
import { BasePanel } from "../panels/BasePanel.tsx";
import { WorldPanel } from "../panels/WorldPanel.tsx";
import { VehiclePanel } from "../panels/VehiclePanel.tsx";
import { QuestPanel } from "../panels/QuestPanel.tsx";
import { DefensePanel } from "../panels/DefensePanel.tsx";
import { CompanionDataPanel } from "../panels/CompanionDataPanel.tsx";
import { SavePanel } from "../panels/SavePanel.tsx";
import { SettingsPanel } from "./SettingsPanel.tsx";
import { ModPanel } from "../panels/ModPanel.tsx";
import { AchievementPanel } from "../panels/AchievementPanel.tsx";
import { PluginPanel } from "../panels/PluginPanel.tsx";
import { ProloguePanel } from "../panels/ProloguePanel.tsx";
import { LlmPanel } from "../panels/LlmPanel.tsx";
import { CanvasView } from "../panels/CanvasView.tsx";

export const OVERLAY_TITLES: Record<string, string> = {
  status: "状态详情",
  items: "物品与合成",
  quests: "主线与招募",
  tech: "科技树",
  base: "基地建造",
  wardrobe: "服装",
  harem: "后宫",
  roster: "角色数据",
  jobs: "岗位分配",
  vehicle: "房车改装",
  defense: "防御与事件",
  map: "世界地图",
  canvas: "画面渲染",
  llm: "本地模型",
  save: "存档",
  cheats: "设置",
  mods: "Mod",
  achievements: "成就",
  plugins: "插件",
  prologue: "序章"
};

export function Overlay({ tab, onClose }: { tab: string | null; onClose: () => void }) {
  // Esc 关闭
  useEffect(() => {
    if (!tab) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, onClose]);

  if (!tab) return null;

  const body = (() => {
    switch (tab) {
      case "status": return <StatusBar />;
      case "items": return <InventoryPanel />;
      case "quests": return <QuestPanel />;
      case "tech": return <TechTreePanel />;
      case "base": return <BasePanel />;
      case "wardrobe": return <WardrobePanel />;
      case "harem": return <HaremPanel />;
      case "roster": return <CompanionDataPanel />;
      case "jobs": return <JobBoard />;
      case "vehicle": return <VehiclePanel />;
      case "defense": return <DefensePanel />;
      case "map": return <WorldPanel />;
      case "canvas": return <CanvasView mode="scene" />;
      case "llm": return <LlmPanel />;
      case "save": return <SavePanel />;
      case "cheats": return <SettingsPanel />;
      case "mods": return <ModPanel />;
      case "achievements": return <AchievementPanel />;
      case "plugins": return <PluginPanel />;
      case "prologue": return <ProloguePanel />;
      default: return <p className="sub">（未知面板）</p>;
    }
  })();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-box" onClick={(e) => e.stopPropagation()}>
        <header className="overlay-head">
          <span className="overlay-title">{OVERLAY_TITLES[tab] ?? tab}</span>
          <button className="navbtn" onClick={onClose}>✕ 关闭（Esc）</button>
        </header>
        <div className="overlay-body">{body}</div>
      </div>
    </div>
  );
}