import { useCallback, useEffect, useMemo, useState } from "react";
import { renderScene, type Scene } from "@doomsday/core";
import { buildSceneContext } from "@doomsday/llm";
import { useGame } from "./store/game.ts";
import { HaremRoster } from "./shell/HaremRoster.tsx";
import { FortressSection } from "./shell/FortressSection.tsx";
import { CombatView } from "./shell/CombatView.tsx";
import { CompanionDetail } from "./shell/CompanionDetail.tsx";
import { NarrationPanel, type NarrationEntry } from "./shell/NarrationPanel.tsx";
import { StatusStrip, MessageLog } from "./shell/StatusStrip.tsx";
import { Overlay } from "./shell/Overlay.tsx";

const KEY_MAP: Record<string, string> = {
  i: "items", n: "quests", t: "tech", b: "base", w: "wardrobe",
  h: "harem", j: "jobs", v: "vehicle", d: "defense", m: "llm",
  s: "save", c: "cheats", r: "roster", k: "canvas", o: "status"
};

type CenterTab = "narration" | "fortress" | "combat";

export function App() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const log = useGame((s) => s.log);
  const pipeline = useGame((s) => s.pipeline);
  const narrator = useGame((s) => s.narrator);

  const [overlay, setOverlay] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [centerTab, setCenterTab] = useState<CenterTab>("narration");
  const [entries, setEntries] = useState<NarrationEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const counter = useMemo(() => ({ n: 0 }), []);

  // 启动时加载预生成文本库存
  useEffect(() => {
    void useGame.getState().loadStock();
  }, []);

  // 默认选中好感最高的同伴
  useEffect(() => {
    if (selected) return;
    const joined = session.joined();
    if (joined.length === 0) return;
    const top = [...joined].sort((a, b) => b.relationship.affection - a.relationship.affection)[0];
    setSelected(top.id);
  }, [session, selected, version]);

  // 日志 → 叙事条目
  useEffect(() => {
    if (log.length === 0) return;
    const latest = log[0];
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

  const current = entries[index];
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
      if (KEY_MAP[k]) {
        e.preventDefault();
        setOverlay((cur) => (cur === KEY_MAP[k] ? null : KEY_MAP[k]));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entries.length]);

  return (
    <div className="game">
      <div className="game-body">
        <HaremRoster selected={selected} onSelect={setSelected} />

        <main className="stage">
          <div className="stage-tabs">
            <button
              className={centerTab === "narration" ? "stagetab active" : "stagetab"}
              onClick={() => setCenterTab("narration")}
            >
              叙事（Tab 切换）
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
        </main>

        <aside className="rightcol">
          <CompanionDetail id={selected} />
        </aside>
      </div>

      <StatusStrip />
      <MessageLog />
      <Overlay tab={overlay} onClose={() => setOverlay(null)} />

      <div className="keyhint">
        Tab 切换　I 物品　N 主线　T 科技　B 基地　W 服装　H 后宫　M 模型　S 存档　←/→ 翻页　Esc 关闭
      </div>
    </div>
  );
}