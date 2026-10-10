/**
 * 两个专用弹窗（原型 UI 移植）。
 *
 * 对应原型：
 *   #solo-panel  自慰子页（80 行）
 *   #anal-prep   后庭准备（33 行 + ENEMA_STEPS 5 步）
 */
import { useState } from "react";
import { ENEMA_STEPS, ACTS, type ActDef } from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 弹窗外壳（原型 .modal > .mbox > .mhead + .dbody + .acts） */
export function Modal({
  title,
  onClose,
  children,
  acts,
  width = "min(48em,94vw)"
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  acts?: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="modal on" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mbox" style={{ width }}>
        <div className="mhead">
          <span className="mtitle">{title}</span>
          <button className="mclose" onClick={onClose}>✕</button>
        </div>
        <div className="dbody">{children}</div>
        {acts ? <div className="acts">{acts}</div> : null}
      </div>
    </div>
  );
}

// ============ 自慰子页（#solo-panel）============

/** 单人行为（原型 solo-panel 里的模式 + 部位 + 道具 三段） */
const SOLO_MODES = ["快速解决", "慢慢来", "沉浸式"];
const SOLO_PARTS = ["手", "口", "胸", "道具"];

export function SoloPanel({ onClose }: { onClose: () => void }) {
  const session = useGame((s) => s.session);
  const [mode, setMode] = useState(0);
  const [part, setPart] = useState(0);
  const [useToy, setUseToy] = useState(false);

  // 单人行为：core 里 direction === "solo" 的项（当前 ACTS 暂无，用部位推导）
  const soloActs = ACTS.filter((a: ActDef) => a.direction === "solo");
  const cost = 8 + mode * 4 + (useToy ? 6 : 0);

  return (
    <Modal
      title="自慰"
      onClose={onClose}
      acts={
        <>
          <button
            className="abtn primary"
            onClick={() => {
              // core 尚无单人行为 API（S-11 待办），此处先耗体力与时间
              useGame.getState().advanceHours(1, "idle");
              useGame.getState().pushLog(`独处了一段时间（${SOLO_MODES[mode]} · ${SOLO_PARTS[part]}，体力 -${cost}）`);
              useGame.getState().refresh();
              onClose();
            }}
          >开始（体力 -{cost}）</button>
          <button className="abtn" onClick={onClose}>取消</button>
        </>
      }
    >
      <div className="sec">方式</div>
      <div className="mode-grid">
        {SOLO_MODES.map((m, i) => (
          <button key={m} className={"mode-btn" + (i === mode ? " on" : "")} onClick={() => setMode(i)}>{m}</button>
        ))}
      </div>

      <div className="sec">部位</div>
      <div className="part-grid">
        {SOLO_PARTS.map((p, i) => (
          <button key={p} className={"part-btn" + (i === part ? " on" : "")} onClick={() => setPart(i)}>{p}</button>
        ))}
      </div>

      <div className="sec">道具</div>
      <div className="toy-grid">
        <button className={"toy-btn" + (useToy ? " on" : "")} onClick={() => setUseToy((v) => !v)}>
          🧸 使用玩具{useToy ? "（已选）" : ""}
        </button>
      </div>
      <div className="hint-line">道具需持有；使用后计入性爱统计的「道具」次数</div>

      {soloActs.length > 0 ? (
        <>
          <div className="sec">可用单人行为</div>
          <div className="dgrid">
            {soloActs.map((a) => (
              <div className="dcell" key={a.id}>
                <span className="k">{a.name}</span><span className="v">可用</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="cost-box">
        <div className="cb-row"><span>体力消耗</span><b>-{cost}</b></div>
        <div className="cb-row"><span>欲情下降</span><b>-{12 + mode * 6}</b></div>
        <div className="cb-row"><span>熟练度</span><b>{SOLO_PARTS[part]} +1</b></div>
      </div>
    </Modal>
  );
}

// ============ 后庭准备（#anal-prep）============

export function AnalPrepPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const c = session.companion(id);
  const steps = session.analPrepSteps(id);
  const level = session.analPrepLevel(id);
  const done = level >= ENEMA_STEPS.length;

  if (!c) return null;

  return (
    <Modal
      title={`${c.identity.name} · 后庭准备`}
      onClose={onClose}
      acts={
        <>
          <button
            className="abtn primary"
            disabled={done}
            onClick={() => {
              const next = steps.find((x) => x.available && !x.done);
              if (!next) { useGame.getState().pushLog("没有可进行的步骤"); return; }
              const r = session.performEnemaStep(id, next.id);
              useGame.getState().pushLog(
                r.ok ? `${c.identity.name}：${next.name} 完成（${r.nextLevel}/${ENEMA_STEPS.length}）` : (r.reason ?? "无法继续")
              );
              useGame.getState().refresh();
            }}
          >{done ? "已就绪" : "进行下一步"}</button>
          <button className="abtn" onClick={onClose}>关闭</button>
        </>
      }
    >
      <div className="hint-line">
        完成后才能进行后庭行为。共 {ENEMA_STEPS.length} 步，当前 {level}/{ENEMA_STEPS.length}。
      </div>

      <div className="steps">
        {steps.map((s) => (
          <div key={s.id} className={"step" + (s.done ? " done" : s.available ? " now" : "")}>
            <span className="sn">{s.name}</span>
            <span className="sd">{s.description ?? ""}</span>
          </div>
        ))}
      </div>

      <div className="cost-box">
        <div className="cb-row"><span>当前等级</span><b>{level} / {ENEMA_STEPS.length}</b></div>
        <div className="cb-row"><span>已完成步骤</span><b>{session.analPrepSteps(id).filter((x) => x.done).length}</b></div>
        <div className="cb-row"><span>状态</span><b style={{ color: done ? "var(--ok)" : "var(--dim)" }}>{done ? "已就绪" : "未完成"}</b></div>
      </div>
    </Modal>
  );
}
