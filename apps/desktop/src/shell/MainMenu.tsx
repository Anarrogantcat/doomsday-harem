import { useEffect, useState } from "react";
import { formatSlotTime } from "@doomsday/core";
import { useGame } from "../store/game.ts";

/**
 * 主菜单。
 *
 * 启动时的第一个画面。整块内容（标题 + 菜单 + 声明）始终垂直水平居中，
 * 窗口再小也能滚动查看，不会挤压变形。
 */

export interface MainMenuProps {
  /** 选择「新游戏」或「继续」后进入游戏 */
  onEnter: () => void;
  /** 打开某个面板（save / settings / plugins / about） */
  onPanel: (tab: string) => void;
}

export function MainMenu({ onEnter, onPanel }: MainMenuProps) {
  const session = useGame((s) => s.session);
  const slots = useGame((s) => s.slots);
  const version = useGame((s) => s.version);
  const refreshSlots = useGame((s) => s.refreshSlots);
  const loadFromSlot = useGame((s) => s.loadFromSlot);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  void version;

  // 读取存档列表
  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  const metas = slots.metas ?? [];
  // 按真实时间倒序，取最近一个
  const latest = metas.length > 0
    ? metas.slice().sort((a, b) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0]
    : null;

  const prologue = session.prologueInfo();
  const dayText = prologue.done
    ? `第 ${prologue.daysLeft > 0 ? prologue.daysLeft : 1} 天`
    : `末日前 ${prologue.daysLeft} 天`;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
      onEnter();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="main-menu">
      <div className="mm-stack">
        <div className="mm-title">
          <h1>末日生存 · 后宫</h1>
          <p>DOOMSDAY HAREM</p>
        </div>

        <div className="mm-list">
          <button className="mm-btn" disabled={busy} onClick={onEnter}>
            <span className="mm-key">N</span>
            <span className="mm-label">新游戏</span>
            <span className="mm-right">{dayText}</span>
          </button>

          <button
            className="mm-btn"
            disabled={busy || !latest}
            onClick={() => latest && run(() => loadFromSlot(latest.slot))}
            title={latest ? `最近存档：${formatSlotTime(latest.savedAt)}` : "暂无存档"}
          >
            <span className="mm-key">C</span>
            <span className="mm-label">继续游戏</span>
            <span className="mm-right">
              {latest ? `第 ${latest.day} 天` : "暂无存档"}
            </span>
          </button>

          <button className="mm-btn" disabled={busy} onClick={() => onPanel("save")}>
            <span className="mm-key">L</span>
            <span className="mm-label">读取存档</span>
            <span className="mm-right">{metas.length} 个存档</span>
          </button>

          <button className="mm-btn" onClick={() => onPanel("settings")}>
            <span className="mm-key">S</span>
            <span className="mm-label">设置</span>
          </button>

          <button className="mm-btn" onClick={() => onPanel("plugins")}>
            <span className="mm-key">P</span>
            <span className="mm-label">插件</span>
          </button>

          <button className="mm-btn" onClick={() => onPanel("about")}>
            <span className="mm-key">A</span>
            <span className="mm-label">关于</span>
          </button>

          <button
            className="mm-btn"
            onClick={() => {
              // Tauri 环境下关闭窗口；浏览器下无效
              const w = window as unknown as { __TAURI__?: unknown };
              if (w.__TAURI__) window.close();
            }}
          >
            <span className="mm-key">Q</span>
            <span className="mm-label">退出</span>
          </button>
        </div>

        {err && <div className="mm-err">{err}</div>}

        <div className="mm-foot">
          <div>v0.44.0</div>
          <div>本游戏完全免费 · 禁止售卖 · 禁止商用 · 禁止直播录播</div>
          <div>内容含成人元素，请确认您已满 18 岁</div>
        </div>
      </div>
    </div>
  );
}
