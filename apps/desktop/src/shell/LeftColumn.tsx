/**
 * 左栏（原型 UI 移植）。
 *
 * 严格对应原型 `docs/ui-prototype.html` 的 `.left`，三个一级子元素：
 *   1. `.block` —— 基地核心（`.aicard`：AI 头像 + 名 + 好感/忠诚条）
 *   2. `.block` —— 后宫（`.bhead` 计数 + `.hlist` 卡 + `.lrow` 未解锁）
 *   3. `.qpanel` —— 快捷操作面板（3 页可翻）
 */
import { useMemo, useState } from "react";
import { useGame } from "../store/game.ts";
import { Portrait } from "./Portrait.tsx";

// ============ 快捷面板数据（照抄原型 QPAGES）============

interface QItem { i: string; n: string; k: string }
interface QPage { hint: string; items: QItem[] }

const QPAGES: QPage[] = [
  {
    hint: "面板入口 — 按对应字母键打开",
    items: [
      { i: "🎒", n: "物品", k: "I" }, { i: "📜", n: "主线", k: "N" },
      { i: "🔬", n: "科技", k: "T" }, { i: "🏗", n: "基地", k: "B" },
      { i: "👗", n: "服装", k: "W" }, { i: "💗", n: "后宫", k: "H" },
      { i: "👷", n: "岗位", k: "J" }, { i: "🚐", n: "房车", k: "V" },
      { i: "🗺", n: "地图", k: "M" }, { i: "🛡", n: "防御", k: "D" },
      { i: "🏆", n: "成就", k: "G" }, { i: "🔌", n: "插件", k: "X" }
    ]
  },
  {
    hint: "当前操作 — 随场景变化",
    items: [
      { i: "▲", n: "上一节拍", k: "↑" }, { i: "▼", n: "下一节拍", k: "↓" },
      { i: "♥", n: "亲密", k: "A" }, { i: "💤", n: "休息", k: "R" },
      { i: "🏋", n: "训练", k: "T" }, { i: "💊", n: "治疗", k: "H" },
      { i: "🎁", n: "赠礼", k: "G" }, { i: "🚶", n: "外出", k: "S" },
      { i: "🍖", n: "进食", k: "F" }, { i: "💧", n: "饮水", k: "D" },
      { i: "🧹", n: "打扫", k: "C" }, { i: "🔧", n: "维修", k: "V" }
    ]
  },
  {
    hint: "系统 — 存档与设置",
    items: [
      { i: "💾", n: "存档", k: "S" }, { i: "⚙", n: "设置", k: "C" },
      { i: "📖", n: "序章", k: "Y" }, { i: "📊", n: "状态", k: "O" },
      { i: "🌐", n: "语言", k: "" }, { i: "⌨", n: "快捷键", k: "?" },
      { i: "🎵", n: "音频", k: "" }, { i: "❓", n: "帮助", k: "F1" }
    ]
  }
];

/** 第 1 页按钮 → 面板 tab 映射 */
const PANEL_OF: Record<string, string> = {
  物品: "items", 主线: "quests", 科技: "tech", 基地: "base",
  服装: "wardrobe", 后宫: "harem", 岗位: "jobs", 房车: "vehicle",
  地图: "map", 防御: "defense", 成就: "achievements", 插件: "plugins",
  序章: "prologue", 状态: "status", 存档: "save", 设置: "cheats"
};

// ============ 1. 基地核心（.aicard）============

function AiCard() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;
  const ai = session.companion("ai");
  /**
   * AI 未觉醒兜底（原型左栏**永远**有「基地核心」）。
   *
   * 序章 ai_birth 阶段之前，特殊 AI 还没被写出来，
   * 此时显示「未觉醒」状态而不是整块消失——否则左栏顶部会空一块。
   */
  if (!ai) {
    return (
      <div className="proto-block">
        <div className="proto-bhead">基地核心</div>
        <div className="proto-aicard">
          <div className="proto-aiface">AI</div>
          <div className="proto-hinfo">
            <div className="proto-hname">
              特殊AI
              <span className="proto-tag" style={{ background: "var(--dim)", color: "#000" }}>未觉醒</span>
            </div>
            <div className="proto-hsub">尚无载体 · 等待第一行代码</div>
            <div className="proto-bars">
              <div className="proto-brow">
                <span className="proto-blabel">好感</span>
                <div className="proto-btrack"><div className="proto-bfill proto-aff" style={{ width: "0%" }} /></div>
                <span className="proto-bval">—</span>
              </div>
              <div className="proto-brow">
                <span className="proto-blabel">忠诚</span>
                <div className="proto-btrack"><div className="proto-bfill proto-loy" style={{ width: "0%" }} /></div>
                <span className="proto-bval">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const r = ai.relationship;
  return (
    <div className="proto-block">
      <div className="proto-bhead">基地核心</div>
      <div className="proto-aicard">
        <div className="proto-aiface">AI</div>
        <div className="proto-hinfo">
          <div className="proto-hname">
            {ai.identity.name}
            <span className="proto-tag" style={{ background: "var(--info)", color: "#000" }}>核心</span>
          </div>
          <div className="proto-hsub">T{ai.growth ? 6 : 6} · 已有移动载体</div>
          <div className="proto-bars">
            <div className="proto-brow">
              <span className="proto-blabel">好感</span>
              <div className="proto-btrack"><div className="proto-bfill proto-aff" style={{ width: r.affection + "%" }} /></div>
              <span className="proto-bval">{Math.round(r.affection)}</span>
            </div>
            <div className="proto-brow">
              <span className="proto-blabel">忠诚</span>
              <div className="proto-btrack"><div className="proto-bfill proto-loy" style={{ width: r.loyalty + "%" }} /></div>
              <span className="proto-bval">{Math.round(r.loyalty)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 2. 后宫名册（.hlist）============

function HaremBlock({ selected, onSelect, onOpen }: { selected: string | null; onSelect: (id: string) => void; onOpen: (tab: string) => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const joined = useMemo(
    () => session.joined().filter((c) => c.id !== "ai"),
    [session, version]
  );
  const [expand, setExpand] = useState(false);
  const shown = expand ? joined : joined.slice(0, 5);
  const hidden = Math.max(0, joined.length - shown.length);

  return (
    <div className="proto-block">
      <div className="proto-bhead">
        后宫<span className="proto-cnt">{joined.length} / 20</span>
      </div>
      <div className="proto-hlist">
        {shown.map((c) => {
          const r = c.relationship;
          return (
            <div
              key={c.id}
              className={"proto-hitem" + (selected === c.id ? " proto-sel" : "")}
              data-id={c.id}
              onClick={() => onSelect(c.id)}
              onDoubleClick={() => { onSelect(c.id); onOpen("roster"); }}
              title="单击查看 · 双击打开完整资料"
            >
              <Portrait
                name={c.identity.name}
                mood={70}
                pregnant={c.physiology.pregnant}
                size={38}
                active={selected === c.id}
              />
              <div className="proto-hi">
                <div className="proto-hn">
                  {c.identity.name}
                  <span className="proto-lv">Lv{c.growth ? (c.growth.level ?? 3) : 3}</span>
                </div>
                <div className="proto-hj">{c.job.id ?? "待分配"}</div>
                <div className="proto-bars">
                  <div className="proto-brow">
                    <span className="proto-blabel">好感</span>
                    <div className="proto-btrack"><div className="proto-bfill proto-aff" style={{ width: r.affection + "%" }} /></div>
                    <span className="proto-bval">{Math.round(r.affection)}</span>
                  </div>
                  <div className="proto-brow">
                    <span className="proto-blabel">欲情</span>
                    <div className="proto-btrack"><div className="proto-bfill proto-lust" style={{ width: c.lust.value + "%" }} /></div>
                    <span className="proto-bval">{Math.round(c.lust.value)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hidden > 0 || expand ? (
        <div className="proto-lrow" onClick={() => setExpand((v) => !v)}>
          {expand ? "收起 ▴" : `未解锁 ${hidden} 位 ▾`}
        </div>
      ) : null}
    </div>
  );
}

// ============ 3. 快捷操作面板（.qpanel）============

function QuickPanel({ onOpen }: { onOpen: (tab: string) => void }) {
  const [idx, setIdx] = useState(0);
  const page = QPAGES[idx];

  const pick = (name: string) => {
    const tab = PANEL_OF[name];
    if (tab) onOpen(tab);
  };

  return (
    <div className="proto-qpanel">
      <div className="proto-qhead">
        <button className="proto-qarrow" onClick={() => setIdx((i) => (i - 1 + QPAGES.length) % QPAGES.length)}>‹</button>
        <span className="proto-qtitle">快捷操作</span>
        <span className="proto-qpage"><b>{idx + 1}</b>/{QPAGES.length}</span>
        <button className="proto-qarrow" onClick={() => setIdx((i) => (i + 1) % QPAGES.length)}>›</button>
      </div>
      <div className="proto-qgrid">
        {page.items.map((it) => (
          <button
            key={it.n}
            className="proto-qbtn"
            title={it.n + (it.k ? `（快捷键 ${it.k}）` : "")}
            onClick={() => pick(it.n)}
          >
            <span className="proto-qi">{it.i}</span>
            <span className="proto-qn">{it.n}</span>
            {it.k ? <span className="proto-qk">{it.k}</span> : null}
          </button>
        ))}
      </div>
      <div className="proto-qdots">
        {QPAGES.map((_, i) => (
          <i key={i} className={i === idx ? "proto-on" : ""} onClick={() => setIdx(i)} />
        ))}
      </div>
      <div className="proto-qfoot">{page.hint}</div>
    </div>
  );
}

// ============ 左栏总装 ============

export interface LeftColumnProps {
  selected: string | null;
  onSelect: (id: string) => void;
  /** 打开弹窗（由 App 提供，overlay 状态在 App 本地） */
  onOpen: (tab: string) => void;
}

export function LeftColumn({ selected, onSelect, onOpen }: LeftColumnProps) {
  return (
    <>
      <AiCard />
      <HaremBlock selected={selected} onSelect={onSelect} onOpen={onOpen} />
      <QuickPanel onOpen={onOpen} />
    </>
  );
}
