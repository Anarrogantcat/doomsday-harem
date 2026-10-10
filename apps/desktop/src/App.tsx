import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderScene, type Scene } from "@doomsday/core";
import { buildSceneContext } from "@doomsday/llm";
import { useGame } from "./store/game.ts";
import { LeftColumn } from "./shell/LeftColumn.tsx";
import { RightColumn } from "./shell/RightColumn.tsx";
import { NarrationPanel, type NarrationEntry } from "./shell/NarrationPanel.tsx";
import { PixelStrip } from "./shell/PixelStrip.tsx";
import { CombatView } from "./shell/CombatView.tsx";
import { StatusStrip, MessageLog } from "./shell/StatusStrip.tsx";
import { Overlay } from "./shell/Overlay.tsx";
import { SettingsPanel } from "./shell/SettingsPanel.tsx";
import { CheatOverlay } from "./shell/CheatOverlay.tsx";
import { MainMenu } from "./shell/MainMenu.tsx";
import { BigMap } from "./shell/GridMap.tsx";
import { FortressSections } from "./shell/FortressSections.tsx";
import { OptionsBar, EventBar, InputBar, type Option, type EventEntry } from "./shell/CenterPieces.tsx";
import { DetailPanel } from "./shell/DetailTabs.tsx";

const KEY_MAP: Record<string, string> = {
  i: "items", n: "quests", t: "tech", b: "base", w: "wardrobe",
  h: "harem", j: "jobs", v: "vehicle", d: "defense", m: "llm",
  s: "save", c: "cheats", r: "roster", k: "canvas", o: "status", l: "mods", g: "achievements", x: "plugins", y: "prologue"
};

/** 中栏只有两个视图（原型 .ctabs：叙事 / 战斗） */
type CenterTab = "narration" | "combat";

/**
 * 大地图弹窗宿主。
 *
 * 从 store 直接取状态，避免把 7 个 prop 一路透传进 App。
 */
function BigMapHost() {
  const mapId = useGame((s) => s.mapId);
  const cellId = useGame((s) => s.cellId);
  const explored = useGame((s) => s.explored);
  const open = useGame((s) => s.bigMapOpen);
  const setMapId = useGame((s) => s.setMapId);
  const mapTravel = useGame((s) => s.mapTravel);
  const openBigMap = useGame((s) => s.openBigMap);
  return (
    <BigMap
      mapId={mapId}
      cellId={cellId}
      explored={explored}
      open={open}
      onClose={() => openBigMap(false)}
      onSelectMap={setMapId}
      onGo={(m, c) => mapTravel(m, c, "前往")}
    />
  );
}

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

  /**
   * 选项区（原型 .obar）。
   * 四个常驻选项 + 当前场景相关的动态项。
   */
  const options: Option[] = useMemo(() => {
    const out: Option[] = [
      { icon: "▶", text: "继续", hint: "空格", primary: true, onPick: () => setIndex((i) => Math.min(i + 1, entries.length - 1)) }
    ];
    if (current?.scene) {
      out.push({
        icon: "💬", text: "与" + (current.scene.participants.find((x) => x !== "主角") ?? "对方") + "对话",
        hint: "好感 +2",
        onPick: () => {
          const partner = session.findCompanion(current.scene!.participants.find((x) => x !== "主角") ?? "");
          if (partner) {
            session.gainAffection?.(partner.id, 2);
            useGame.getState().pushLog(`与 ${partner.identity.name} 交谈（好感 +2）`);
            useGame.getState().refresh();
          }
        }
      });
      out.push({ icon: "🤔", text: "观察她的反应", hint: "判定" });
      out.push({ icon: "✍", text: "自由行动", hint: "输入" });
    } else {
      out.push({ icon: "💤", text: "休息到下一时段", hint: "R", onPick: () => { useGame.getState().advanceHours(6); } });
      out.push({ icon: "🔍", text: "搜刮当前地点", hint: "L", onPick: () => { useGame.getState().lootCurrent(); } });
    }
    out.push({ icon: "🔒", text: "锁定（暂不可用）", hint: "—", locked: true });
    return out;
  }, [current, entries.length, session]);

  /** 事件栏条目（原型 .eventbar）：从 log 取最近 40 条 */
  const eventEntries: EventEntry[] = useMemo(
    () => log.slice(0, 40).map((text, i) => ({
      id: i,
      text,
      kind: /失败|无法|不足|危险|被|损失/.test(text) ? "alert" : /获得|完成|成功|升级/.test(text) ? "ok" : "info"
    })),
    [log]
  );
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
        // 中栏只有两个视图（原型 .ctabs）
        setCenterTab((c) => (c === "narration" ? "combat" : "narration"));
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

  // ---------- 栏宽拖动（对应原型 3 个 .splitter）----------
  const [colWidths, setColWidths] = useState<{ left: number; right: number; detail: number }>(() => {
    try {
      const raw = localStorage.getItem("dh-col-widths");
      if (raw) {
        const v = JSON.parse(raw) as { left: number; right: number; detail: number };
        if (v && typeof v.left === "number") return v;
      }
    } catch { /* 忽略 */ }
    return { left: 19, right: 24, detail: 21 };
  });

  const dragRef = useRef<{ which: "left" | "right" | "detail"; x: number; w: number } | null>(null);

  /** 拖动开始（3 个 splitter 共用） */
  const startDrag = useCallback((e: React.PointerEvent, which: "left" | "right" | "detail") => {
    dragRef.current = { which, x: e.clientX, w: colWidths[which] };
    (e.currentTarget as HTMLElement).classList.add("dragging");
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* 合成事件无 capture */ }
  }, [colWidths]);

  // 拖动中 / 结束（全局监听，避免指针移出 splitter 后丢失）
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const deltaEm = (dx / (settings.display.fontSize || 14));
      // 左栏向右拖变宽；右栏向右拖也变宽；详情栏向右拖变窄
      const next = d.which === "detail" ? d.w - deltaEm : d.w + deltaEm;
      const limits: Record<string, [number, number]> = {
        left: [9, 34], right: [13, 44], detail: [11, 34]
      };
      const [lo, hi] = limits[d.which];
      setColWidths((v) => ({ ...v, [d.which]: Math.max(lo, Math.min(hi, Math.round(next))) }));
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.querySelectorAll(".splitter.dragging").forEach((x) => x.classList.remove("dragging"));
      setColWidths((v) => {
        try { localStorage.setItem("dh-col-widths", JSON.stringify(v)); } catch { /* 忽略 */ }
        return v;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [settings.display.fontSize]);

  /** 双击 splitter 复位该栏 */
  const resetCol = useCallback((which: "left" | "right" | "detail") => {
    const def = { left: 19, right: 24, detail: 21 };
    setColWidths((v) => ({ ...v, [which]: def[which] }));
  }, []);

  // 根字号随设置变化（所有尺寸用 em，因此整体缩放）
  const rootStyle = {
    "--fs": `${settings.display.fontSize}px`,
    "--c-left": colWidths.left + "em",
    "--c-right": colWidths.right + "em",
    "--c-detail": colWidths.detail + "em"
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
    <div id="game" style={rootStyle} className={settings.gameplay.compactRoster ? "compact" : ""}>
      {/* ═══ 左栏：特殊AI + 后宫名册 + 快捷面板 ═══ */}
      <div className="left">
        <LeftColumn selected={selected} onSelect={setSelected} onOpen={setOverlay} />
      </div>

      <div className="splitter" onPointerDown={(e) => startDrag(e, "left")} onDoubleClick={() => resetCol("left")} title="拖动调节宽度 · 双击复位" />

      {/* ═══ 中栏：舞台 + 选项 + 事件 + 输入 ═══ */}
      <div className="center">
        <div className="ctabs">
          {([
            ["narration", "叙事"],
            ["combat", "战斗"]
          ] as Array<[CenterTab, string]>).map(([id, label]) => (
            <button
              key={id}
              className={"ctab" + (centerTab === id ? " on" : "")}
              onClick={() => setCenterTab(id)}
            >
              {label}{id === "combat" && session.inCombat() ? " ●" : ""}
            </button>
          ))}
          <span className="chint">视图随操作自动切换</span>
        </div>

        {/* 舞台 */}
        <div className="stage">
          {centerTab === "combat" ? (
            <CombatView />
          ) : (
            <NarrationPanel
              entries={entries}
              index={index}
              onIndex={setIndex}
              onGenerate={doGenerate}
              generating={generating}
              streamText={streamText}
              embedded
            />
          )}
        </div>

        {/* 选项区（原型 .obar） */}
        <OptionsBar options={options} />

        {/* 事件栏（原型 .eventbar） */}
        <EventBar entries={eventEntries} />

        {/* 输入栏（原型 .ibar） */}
        <InputBar
          busy={generating}
          onSubmit={(t) => {
            setEntries((prev) => [...prev, {
              id: ++counter.n, kind: "event", title: "你的行动", text: t
            } as NarrationEntry].slice(-200));
          }}
        />
      </div>

      <div className="splitter" onPointerDown={(e) => startDrag(e, "right")} onDoubleClick={() => resetCol("right")} title="拖动调节宽度 · 双击复位" />

      {/* ═══ 右栏：地图 / 基地 / 房车 / 行动 ═══ */}
      <div className="right">
        <RightColumn onOpen={setOverlay} />
      </div>

      <div className="splitter" onPointerDown={(e) => startDrag(e, "detail")} onDoubleClick={() => resetCol("detail")} title="拖动调节宽度 · 双击复位" />

      {/* ═══ 详情栏：主角段 + 分隔 + 同伴段 ═══ */}
      <div className="detail-side">
        <DetailPanel
          kind={selected === "hero" || !selected ? "hero" : "companion"}
          id={selected ?? undefined}
        />
      </div>

      {/* ═══ 底条 ═══ */}
      {showStrip ? <div className="strip"><PixelStrip height={44} /></div> : null}

      <StatusStrip />
      <MessageLog />
      <Overlay tab={overlay} onClose={() => setOverlay(null)} />
      <CheatOverlay />
      <BigMapHost />

      <div className="keyhint">
        Tab 切换视图　P 画面　I 物品　N 主线　T 科技　B 基地　W 服装　M 模型　L Mod　S 存档　←/→ 翻页　Esc 关闭
      </div>
    </div>
  );
}