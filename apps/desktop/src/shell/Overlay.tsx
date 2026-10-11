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
import { FortressSections } from "./FortressSections.tsx";
import { DetailTabs } from "./DetailTabs.tsx";
import { SoloPanel, AnalPrepPanel } from "./SpecialModals.tsx";

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
  prologue: "序章",
  fortress: "山体要塞 · 剖面图",
  "hero-detail": "主角完整资料",
  detail: "角色完整资料",
  solo: "自慰",
  "anal-prep": "后庭准备"
};

export function Overlay({ tab, onClose, detailId }: { tab: string | null; onClose: () => void; detailId?: string }) {
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
      case "fortress": return <FortressSections onOpenBase={() => { /* 已在弹窗内 */ }} />;
      case "hero-detail": return <DetailTabs kind="hero" />;
      case "detail": return <DetailTabs kind="companion" id={detailId} />;
      case "solo": return <SoloPanel onClose={onClose} />;
      case "anal-prep": return <AnalPrepPanel id={detailId ?? "sister"} onClose={onClose} />;
      default: return <p className="proto-sub">（未知面板）</p>;
    }
  })();

  return (
    <div className="proto-modal proto-on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="proto-mbox" style={{ width: "min(72em,96vw)", maxWidth: "96vw" }}>
        <div className="proto-mhead">
          <span className="proto-mtitle">{OVERLAY_TITLES[tab] ?? tab}</span>
          <button className="proto-mclose" onClick={onClose}>✕</button>
        </div>
        <div className="proto-dbody">{body}</div>
      </div>
    </div>
  );
}