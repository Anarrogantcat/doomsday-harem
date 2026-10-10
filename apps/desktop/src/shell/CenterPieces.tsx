/**
 * 中栏三件套（原型 UI 移植）。
 *
 * 对应原型 `docs/ui-prototype.html` 的：
 *   - `.obar`      选项区（每节拍结束后的选择，数字键 1-9）
 *   - `.eventbar`  事件记录（可拖动高度、可折叠）
 *   - `.ibar`      输入栏（可选关闭）
 *
 * 三者的显示顺序与原型一致：选项 → 事件 → 输入。
 */
import { useEffect, useRef, useState } from "react";

// ============ 选项区 ============

export interface Option {
  /** 图标（▶ / 💬 / 🤔 / ✍ / 🔒） */
  icon: string;
  /** 选项文字 */
  text: string;
  /** 右侧提示（如「空格」「好感 +2」） */
  hint?: string;
  /** 主选项高亮 */
  primary?: boolean;
  /** 禁用（锁定） */
  locked?: boolean;
  onPick?: () => void;
}

export interface OptionsBarProps {
  options: Option[];
  /** 标题，默认「选择回应」 */
  label?: string;
}

export function OptionsBar(p: OptionsBarProps) {
  // 数字键 1-9 快速选择
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const o = p.options[n - 1];
      if (o && !o.locked) { o.onPick?.(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.options]);

  if (p.options.length === 0) return null;

  return (
    <div className="obar">
      <div className="ohint">
        <span className="ohl">{p.label ?? "选择回应"}</span>
        <span className="ohk">数字键 1-9 快速选择 · 空格继续</span>
      </div>
      <div className="olist">
        {p.options.map((o, i) => (
          <button
            key={i}
            className={
              "opt" + (o.primary ? " go" : "") + (o.locked ? " lock" : "")
            }
            disabled={o.locked}
            onClick={() => o.onPick?.()}
          >
            <span className="oi">{o.icon}</span>
            <span className="ot">{o.text}</span>
            <span className="ok">{o.hint ?? String(i + 1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ 事件栏 ============

export interface EventEntry {
  id: number;
  text: string;
  kind?: "ok" | "alert" | "info";
  /** 游戏内日期标签（原型 .eb-day） */
  day?: string;
}

export interface EventBarProps {
  entries: EventEntry[];
}

const EB_KEY = "dh-eventbar-h";

export function EventBar(p: EventBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y: number; h: number } | null>(null);

  // 恢复上次高度
  useEffect(() => {
    try {
      const saved = localStorage.getItem(EB_KEY);
      if (saved) setHeight(Number(saved));
    } catch { /* 忽略 */ }
  }, []);

  // 拖动调节高度
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const next = Math.max(80, Math.min(480, d.h - (e.clientY - d.y)));
      setHeight(next);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setHeight((h) => {
        if (h !== null) { try { localStorage.setItem(EB_KEY, String(h)); } catch { /* 忽略 */ } }
        return h;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    dragRef.current = { y: e.clientY, h: height ?? barRef.current?.offsetHeight ?? 160 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  return (
    <div
      className={"eventbar" + (collapsed ? " collapsed" : "")}
      ref={barRef}
      style={height && !collapsed ? { height } : undefined}
    >
      <div className="eb-grip" onPointerDown={startDrag} title="拖动调节高度" />
      <div className="eb-head">
        <span className="eb-title">事件记录</span>
        <span className="eb-count">{p.entries.length}</span>
        <button
          className="eb-btn"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "展开" : "折叠"}
        >{collapsed ? "▸" : "▾"}</button>
      </div>
      {!collapsed ? (
        <div className="eb-list">
          {p.entries.map((e) => (
            <div key={e.id} className={"eb-entry" + (e.kind && e.kind !== "info" ? " " + e.kind : "")}>
              {e.day ? <span className="eb-day">{e.day}</span> : null}
              <span className="eb-text">{e.text}</span>
            </div>
          ))}
          {p.entries.length === 0 ? <div className="eb-entry dim">（暂无事件）</div> : null}
        </div>
      ) : null}
    </div>
  );
}

// ============ 输入栏 ============

export interface InputBarProps {
  /** 三种模式：日间对话 / H 场景内 / 生成 H 场景 */
  mode?: "daily" | "scene" | "generate";
  onMode?: (m: "daily" | "scene" | "generate") => void;
  onSubmit?: (text: string) => void;
  busy?: boolean;
  hint?: string;
}

const MODES: Array<{ id: "daily" | "scene" | "generate"; label: string; hint: string }> = [
  { id: "daily", label: "日间对话", hint: "跟同伴闲聊、下达指令" },
  { id: "scene", label: "场景内", hint: "在 H 场景中插入自定义行动" },
  { id: "generate", label: "生成场景", hint: "让模型按你的描述写一段" }
];

const INPUTBAR_KEY = "dh-inputbar";

export function InputBar(p: InputBarProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"daily" | "scene" | "generate">(p.mode ?? "daily");
  const [open, setOpen] = useState(true);

  // 开关持久化（与既有 dh-inputbar 约定一致）
  useEffect(() => {
    try {
      const v = localStorage.getItem(INPUTBAR_KEY);
      if (v === "0") setOpen(false);
    } catch { /* 忽略 */ }
  }, []);

  const toggle = () => {
    setOpen((v) => {
      try { localStorage.setItem(INPUTBAR_KEY, v ? "0" : "1"); } catch { /* 忽略 */ }
      return !v;
    });
  };

  if (!open) {
    return (
      <div className="ibar-collapsed">
        <button className="itoggle" onClick={toggle} title="显示输入栏">▴ 输入栏</button>
      </div>
    );
  }

  const cur = MODES.find((m) => m.id === mode)!;

  return (
    <div className="ibar">
      <div className="imodes">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={"imode" + (m.id === mode ? " on" : "")}
            title={m.hint}
            onClick={() => { setMode(m.id); p.onMode?.(m.id); }}
          >{m.label}</button>
        ))}
        <button className="itoggle" onClick={toggle} title="隐藏输入栏">▾</button>
      </div>
      <div className="ibody">
        <div className="irow">
          <input
            className="iinput"
            value={text}
            placeholder={cur.hint}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) { p.onSubmit?.(text.trim()); setText(""); }
              }
            }}
            disabled={p.busy}
          />
          <button
            className="isend"
            disabled={p.busy || !text.trim()}
            onClick={() => { if (text.trim()) { p.onSubmit?.(text.trim()); setText(""); } }}
          >{p.busy ? "生成中…" : "发送"}</button>
        </div>
      </div>
      <div className="ihint">{p.hint ?? cur.hint}　·　Enter 发送</div>
    </div>
  );
}
