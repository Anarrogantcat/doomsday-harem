/**
 * 主菜单（原型 UI 移植）。
 *
 * 严格对应原型 `#menu`：
 *   .mstack > .mtitle(h1 + p) + .mlist(.mbtn > .k + .l + .r) + .mfoot
 *
 * 原型 7 个按钮：新游戏 N / 继续游戏 C / 读取存档 L / 设置 S
 *               插件 P / 关于 A / 退出 Q
 */
import { useEffect, useState } from "react";
import { VERSION, formatSlotTime, type SlotList } from "@doomsday/core";
import { useGame } from "../store/game.ts";

export interface MainMenuProps {
  onEnter: () => void;
  onPanel: (tab: string) => void;
}

export function MainMenu({ onEnter, onPanel }: MainMenuProps) {
  const session = useGame((s) => s.session);
  const slots = useGame((s) => s.slots);
  const refreshSlots = useGame((s) => s.refreshSlots);
  const newGame = useGame((s) => s.newGame);
  const loadFromSlot = useGame((s) => s.loadFromSlot);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void refreshSlots(); }, [refreshSlots]);

  const metas = slots.metas ?? [];
  const latest = metas.length > 0
    ? metas.slice().sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0]
    : null;

  const prologue = session.prologueInfo();
  const dayText = prologue.done
    ? `第 ${prologue.daysLeft > 0 ? prologue.daysLeft : 1} 天`
    : `末日前 ${prologue.daysLeft} 天`;

  const run = async (fn: () => void | Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div id="menu" className="on">
      <div className="mstack">
        <div className="mtitle">
          <h1>末日生存 · 后宫</h1>
          <p>DOOMSDAY HAREM</p>
        </div>

        <div className="mlist">
          <button
            className="mbtn"
            disabled={busy}
            onClick={() => run(async () => { await newGame(); onEnter(); })}
          >
            <span className="k">N</span>
            <span className="l">新游戏</span>
            <span className="r">{dayText}</span>
          </button>

          <button
            className="mbtn"
            disabled={busy || !latest}
            onClick={() => latest && run(async () => { await loadFromSlot(latest.slot); onEnter(); })}
            title={latest ? `最近存档：${formatSlotTime(latest)}` : "暂无存档"}
          >
            <span className="k">C</span>
            <span className="l">继续游戏</span>
            <span className="r">{latest ? `第 ${latest.day} 天` : "暂无存档"}</span>
          </button>

          <button
            className="mbtn"
            disabled={busy}
            onClick={() => run(() => { onPanel("save"); })}
          >
            <span className="k">L</span>
            <span className="l">读取存档</span>
            <span className="r">{metas.length} 个存档</span>
          </button>

          <button className="mbtn" disabled={busy} onClick={() => onPanel("cheats")}>
            <span className="k">S</span>
            <span className="l">设置</span>
          </button>

          <button className="mbtn" disabled={busy} onClick={() => onPanel("plugins")}>
            <span className="k">P</span>
            <span className="l">插件</span>
          </button>

          <button className="mbtn" disabled={busy} onClick={() => onPanel("about")}>
            <span className="k">A</span>
            <span className="l">关于</span>
          </button>

          <button
            className="mbtn"
            disabled={busy}
            onClick={() => { void useGame.getState().quitApp?.(); }}
          >
            <span className="k">Q</span>
            <span className="l">退出</span>
          </button>
        </div>

        <div className="mfoot">
          v{VERSION}<br />
          本游戏完全免费 · 禁止售卖 · 禁止商用 · 禁止直播录播<br />
          内容含成人元素，请确认您已满 18 岁
        </div>
      </div>
    </div>
  );
}
