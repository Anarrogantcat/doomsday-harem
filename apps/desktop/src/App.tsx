import { useCallback, useEffect, useMemo, useState } from "react";
import { renderScene, type Scene } from "@doomsday/core";
import { buildSceneContext } from "@doomsday/llm";
import { useGame } from "./store/game.ts";
import { HaremRoster } from "./shell/HaremRoster.tsx";
import { RightColumn } from "./shell/RightColumn.tsx";
import { CompanionDetail } from "./shell/CompanionDetail.tsx";
import { HeroDetail } from "./shell/HeroDetail.tsx";
import { NarrationPanel, type NarrationEntry } from "./shell/NarrationPanel.tsx";
import { PixelStrip } from "./shell/PixelStrip.tsx";
import { FortressSection } from "./shell/FortressSection.tsx";
import { CombatView } from "./shell/CombatView.tsx";
import { StatusStrip, MessageLog } from "./shell/StatusStrip.tsx";
import { Overlay } from "./shell/Overlay.tsx";
import { SettingsPanel } from "./shell/SettingsPanel.tsx";
import { CheatOverlay } from "./shell/CheatOverlay.tsx";
import { MainMenu } from "./shell/MainMenu.tsx";

const KEY_MAP: Record<string, string> = {
  i: "items", n: "quests", t: "tech", b: "base", w: "wardrobe",
  h: "harem", j: "jobs", v: "vehicle", d: "defense", m: "llm",
  s: "save", c: "cheats", r: "roster", k: "canvas", o: "status", l: "mods", g: "achievements", x: "plugins", y: "prologue"
};

type CenterTab = "narration" | "fortress" | "combat";

export function App() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const log = useGame((s) => s.log);
  const pipeline = useGame((s) => s.pipeline);
  const narrator = useGame((s) => s.narrator);

  const settings = useGame((s) => s.settings);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>("hero");
  const [centerTab, setCenterTab] = useState<CenterTab>("narration");
  const [showStrip, setShowStrip] = useState(true);
  const [entries, setEntries] = useState<NarrationEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const counter = useMemo(() => ({ n: 0 }), []);

  // 主菜单：启动时显示，选择后进入游戏
  const [inMenu, setInMenu] = useState(true);

  // 启动时加载预生成文本库存
  useEffect(() => {
    void useGame.getState().loadStock();
  }, []);

  // 启动时加载 Mod 剧本（仅 Tauri 环境有效）
  useEffect(() => {
    void useGame.getState().loadMods();
  }, []);

  // 序章未完成时，自动打开序章面板作为引导
  useEffect(() => {
    const s = useGame.getState().session;
    if (!s.prologueDone()) setOverlay("prologue");
  }, []);

  // 日志 → 叙事条目（过滤系统噪音）
  // 系统噪音：这些不进叙事流，避免覆盖剧情
  const NOISE = /文本库存|已载入|存档|设置已|自动存档|已保存|已读取|交通方式|调岗为|换上了|脱下了|开始研究|秒完成|获得物资|睡了一觉/;
  useEffect(() => {
    if (log.length === 0) return;
    const latest = log[0];
    if (NOISE.test(latest)) return;
    setEntries((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].text === latest) return prev;
      const next = [...prev, { id: ++counter.n, kind: "event" as const, title: "事件", text: latest }];
      setIndex(next.length - 1);
      return next.slice(-200);
    });
  }, [log, counter]);

  // 可触发场景 → 叙事条目
  useEffect(() => {
    const scenes = session.availableScenes();
    if (scenes.length === 0) return;
    const scene = scenes[0];
    setEntries((prev) => {
      if (prev.some((e) => e.scene?.id === scene.id && e.kind === "narration")) return prev;
      const text = renderScene(scene, { detail: "standard", showLayerTags: false });
      const next = [...prev, {
        id: ++counter.n,
        kind: "narration" as const,
        title: scene.title,
        meta: `${scene.participants.join(" × ")}　${scene.tone}`,
        text,
        scene
      }];
      return next.slice(-200);
    });
  }, [session, version, counter]);

  const current = entries[index] ?? entries[entries.length - 1];
  const canGenerate = !!current?.scene && !!narrator;

  const doGenerate = useCallback(async () => {
    if (!current?.scene) return;
    const scene: Scene = current.scene;
    setGenerating(true);
    setStreamText("");
    const partnerName = scene.participants.find((p) => p !== "主角") ?? "";
    const partner = session.findCompanion(partnerName);
    const ctx = buildSceneContext(session, {
      scene,
      dominant: partner?.id,
      props: (() => {
        const p = ["双头龙", "娱乐型扶她药"];
        if (partner) {
          const o = session.outfitOf(partner.id);
          if (o) p.push(`着装：${o.describe}（暴露度 ${o.exposure}）`);
        }
        return p;
      })(),
      beatCount: 3
    });

    try {
      const r = await pipeline.getSceneStream(scene.id, scene, ctx, (d) => setStreamText((t) => t + d));
      const text = renderScene(r.scene, { detail: "detailed", showLayerTags: false });
      setEntries((prev) => {
        const next = [...prev, {
          id: ++counter.n,
          kind: r.source === "model" ? ("generated" as const) : ("system" as const),
          title: `${scene.title}（${r.source === "model" ? "模型生成" : "手写兜底"}）`,
          meta: r.tierNote,
          text,
          scene: r.scene
        }];
        setIndex(next.length - 1);
        return next.slice(-200);
      });
    } catch (e) {
      setEntries((prev) => [...prev, {
        id: ++counter.n, kind: "system" as const,
        title: "生成失败", text: e instanceof Error ? e.message : String(e)
      }]);
    } finally {
      setGenerating(false);
      setStreamText("");
    }
  }, [current, session, pipeline, counter]);

  // 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === "escape") { setOverlay(null); return; }
      if (k === "arrowleft") { setIndex((i) => Math.max(0, i - 1)); return; }
      if (k === "arrowright") { setIndex((i) => Math.min(entries.length - 1, i + 1)); return; }
      if (k === "tab") {
        e.preventDefault();
        setCenterTab((c) => (c === "narration" ? "fortress" : c === "fortress" ? "combat" : "narration"));
        return;
      }
      if (k === "p") { setShowStrip((v) => !v); return; }
      if (KEY_MAP[k]) {
        e.preventDefault();
        setOverlay((cur) => (cur === KEY_MAP[k] ? null : KEY_MAP[k]));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entries.length]);

  // 根字号随设置变化（所有尺寸用 em，因此整体缩放）
  const rootStyle = {
    "--fs": `${settings.display.fontSize}px`
  } as React.CSSProperties;

  // 主菜单：未进入游戏时只显示菜单
  if (inMenu) {
    return (
      <MainMenu
        onEnter={() => setInMenu(false)}
        onPanel={(tab) => {
          if (tab === "save") {
            // 读档面板从菜单打开时不进入游戏，读完再进
            setInMenu(false);
            setOverlay("save");
          } else {
            setInMenu(false);
            setOverlay(tab);
          }
        }}
      />
    );
  }

  return (
    <div className={`game ${settings.gameplay.compactRoster ? "compact" : ""}`} style={rootStyle}>
      <div className="game-body">
        {/* 左：后宫名册（主角与 AI 置顶） */}
        <HaremRoster selected={selected} onSelect={setSelected} />

        {/* 中：舞台 + 下侧像素条 */}
        <main className="stage">
          <div className="stage-tabs">
            <button
              className={centerTab === "narration" ? "stagetab active" : "stagetab"}
              onClick={() => setCenterTab("narration")}
            >
              叙事
            </button>
            <button
              className={centerTab === "fortress" ? "stagetab active" : "stagetab"}
              onClick={() => setCenterTab("fortress")}
            >
              要塞剖面
            </button>
            <button
              className={centerTab === "combat" ? "stagetab active" : "stagetab"}
              onClick={() => setCenterTab("combat")}
            >
              战斗{session.inCombat() ? "（进行中）" : ""}
            </button>
            <span className="sub">
              {session.here()?.name}　第 {session.time.day} 天
            </span>
            <button
              className="stagetab"
              onClick={() => setShowStrip((v) => !v)}
              title="切换像素条（P）"
            >
              {showStrip ? "隐藏画面" : "显示画面"}
            </button>
          </div>

          <div className="stage-body">
            {centerTab === "combat" ? (
              <CombatView />
            ) : centerTab === "narration" ? (
              <NarrationPanel
                entries={entries}
                index={index}
                onIndex={setIndex}
                onGenerate={doGenerate}
                generating={generating}
                streamText={streamText}
                embedded
              />
            ) : (
              <FortressSection onOpenBase={() => setOverlay("base")} />
            )}
          </div>

          {/* 下侧栏：像素场景条 */}
          {showStrip && <PixelStrip height={148} />}
        </main>

        {/* 右：地图 / 基地 / 房车 / 行动 */}
        <RightColumn onOpen={setOverlay} />

        {/* 最右：详情（主角或同伴） */}
        <aside className="detailcol">
          {selected === "hero" || !selected ? (
            <HeroDetail />
          ) : (
            <CompanionDetail id={selected} />
          )}
        </aside>
      </div>

      <StatusStrip />
      <MessageLog />
      <Overlay tab={overlay} onClose={() => setOverlay(null)} />
      <CheatOverlay />

      <div className="keyhint">
        Tab 切换视图　P 画面　I 物品　N 主线　T 科技　B 基地　W 服装　M 模型　L Mod　S 存档　←/→ 翻页　Esc 关闭
      </div>
    </div>
  );
}