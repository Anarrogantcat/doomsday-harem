import { useCallback, useEffect, useState } from "react";
import {
  CHEAT_CATEGORIES, CHEAT_CATEGORY_LABEL, CHEAT_CATEGORY_ICON,
  cheatStats, cheatsByCategory, CHEAT_ACTIONS,
  type CheatCategory
} from "@doomsday/core";
import { useGame } from "../store/game.ts";
import { useDraggable } from "./useDraggable.ts";

/**
 * 作弊悬浮按钮 + 可拖拽窗口。
 *
 * 仅在设置里启用作弊模式后出现。
 * 按钮与窗口都可拖拽，位置分别持久化。
 */

/** 悬浮按钮 */
function FloatingButton({ onOpen, hidden, active }: {
  onOpen: () => void; hidden: boolean; active?: boolean;
}) {
  const cheat = useGame((s) => s.cheat);
  const { pos, dragging, elRef, handlers } = useDraggable({
    initial: { x: 24, y: 140 },
    storageKey: "dh-cheat-btn-pos",
    dragThreshold: 5,
    onClick: onOpen
  });

  if (!cheat.enabled || hidden) return null;

  return (
    <button
      ref={elRef as React.RefObject<HTMLButtonElement>}
      className={`cheat-fab ${dragging ? "dragging" : ""} ${active ? "active" : ""}`}
      style={{ left: pos.x, top: pos.y }}
      title="作弊器（可拖动，点击开合）"
      {...handlers}
    >
      <span className="fab-icon">{active ? "✕" : "⌘"}</span>
      <span className="fab-label">{active ? "关闭" : "作弊"}</span>
    </button>
  );
}

/** 可拖拽的作弊窗口 */
function CheatWindow({ onClose }: { onClose: () => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const runCheat = useGame((s) => s.runCheat);
  const applyCheatAll = useGame((s) => s.applyCheatAll);
  const [cat, setCat] = useState<string>("all");
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");
  void version;

  // 窗口拖拽（仅标题栏为手柄）
  const { pos, dragging, elRef, reset, handlers } = useDraggable({
    initial: { x: 300, y: 80 },
    storageKey: "dh-cheat-win-pos-v2",
    dragThreshold: 3
  });

  const stats = cheatStats();
  const snapshot = [
    { label: "等级", value: session.hero.growth.level },
    { label: "战力", value: session.heroPower() },
    { label: "科技", value: session.tech.unlocked.size },
    { label: "设施", value: session.base.facilities.filter((f) => f.tier > 0).length },
    { label: "改装", value: session.vehicle.mods.length },
    { label: "同伴", value: session.joined().length }
  ];

  const actions = cat === "all"
    ? CHEAT_ACTIONS
    : cheatsByCategory(cat as CheatCategory);

  const shown = filter
    ? actions.filter((a) =>
        a.name.includes(filter) || a.description.includes(filter) || a.id.includes(filter))
    : actions;

  function exec(id: string) {
    setMsg(runCheat(id));
  }

  return (
    <div
      ref={elRef as React.RefObject<HTMLDivElement>}
      className={`cheat-win ${dragging ? "dragging" : ""}`}
      style={{ left: pos.x, top: pos.y }}
    >
      {/* 标题栏 = 拖拽手柄 */}
      <header className="cw-head" {...handlers}>
        <span className="cw-title">⌘ 作弊器</span>
        <span className="cw-sub">{stats.total} 项</span>
        <div className="cw-btns">
          <button className="cw-all" onClick={(e) => { e.stopPropagation(); reset(); }}
            title="把窗口移回初始位置">复位</button>
          <button className="cw-all" onClick={(e) => { e.stopPropagation(); applyCheatAll(); }}>
            一键全开
          </button>
          <button className="cw-close" onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="关闭（Esc）">✕</button>
        </div>
      </header>

      {/* 状态快照 */}
      <div className="cw-snap">
        {snapshot.map((s) => (
          <div key={s.label} className="cw-snap-cell">
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {msg && <div className="cw-msg">{msg}</div>}

      {/* 分类 */}
      <nav className="cw-cats">
        <button className={cat === "all" ? "cw-cat active" : "cw-cat"}
          onClick={() => setCat("all")}>全部</button>
        {CHEAT_CATEGORIES.map((c) => (
          <button key={c} className={cat === c ? "cw-cat active" : "cw-cat"}
            onClick={() => setCat(c)} title={CHEAT_CATEGORY_LABEL[c]}>
            {CHEAT_CATEGORY_ICON[c]}
          </button>
        ))}
      </nav>

      <input className="cw-filter" type="text" placeholder="筛选…"
        value={filter} onChange={(e) => setFilter(e.target.value)} />

      {/* 操作区 */}
      <div className="cw-body">
        {shown.map((a) => (
          <button
            key={a.id}
            className="cw-act"
            onClick={() => exec(a.id)}
            title={a.description}
          >
            <span className="cw-act-name">{a.name}</span>
            <span className="cw-act-desc">{a.description}</span>
          </button>
        ))}
        {shown.length === 0 && <p className="sub">（无匹配操作）</p>}
      </div>
    </div>
  );
}

/** 挂载点 */
export function CheatOverlay() {
  const cheat = useGame((s) => s.cheat);
  const [open, setOpen] = useState(true);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 关闭作弊模式时自动收起
  useEffect(() => {
    if (!cheat.enabled) setOpen(false);
  }, [cheat.enabled]);

  if (!cheat.enabled) return null;

  return (
    <>
      <FloatingButton onOpen={() => setOpen((v) => !v)} hidden={false} active={open} />
      {open && <CheatWindow onClose={() => setOpen(false)} />}
    </>
  );
}
