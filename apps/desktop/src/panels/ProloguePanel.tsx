import { useState } from "react";
import {
  PROLOGUE_ORDER, PROLOGUE_LABEL, PROLOGUE_DESC, PROLOGUE_DAYS,
  TUTORIAL_STEPS,
  type PrologueStage
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

/**
 * 序章与教程面板。
 *
 * 序章期间显示倒计时与当前场景；结束后显示教程进度。
 */
export function ProloguePanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const refresh = useGame((s) => s.refresh);
  const pushLog = useGame((s) => s.pushLog);
  const [expanded, setExpanded] = useState<string | null>(null);
  void version;

  const info = session.prologueInfo();
  const stage = session.prologueStage();
  const done = session.tutorialDone();

  function advance() {
    const cur = session.currentPrologueScene();
    if (cur) pushLog("【" + cur.title + "】已完成");
    const next = session.advancePrologue();
    pushLog("序章推进：" + PROLOGUE_LABEL[next]);
    refresh();
  }

  return (
    <section className="panel prologue-panel">
      <h2>
        序章　<span className="sub">
          {info.done ? "已结束（生存开始）" : PROLOGUE_LABEL[stage]}
        </span>
      </h2>

      {/* 倒计时 */}
      <div className="prog-countdown">
        {info.done ? (
          <div className="prog-done">已进入主游戏</div>
        ) : info.daysLeft >= 0 ? (
          <>
            <div className="prog-days">
              {info.daysLeft === 0 ? "今天" : "还剩 " + info.daysLeft + " 天"}
            </div>
            <div className="prog-sub">距离末日</div>
          </>
        ) : (
          <div className="prog-days">末日已至</div>
        )}
      </div>

      {/* 进度条 */}
      <div className="prog-bar-wrap">
        <div className="prog-bar">
          <div className="prog-fill" style={{ width: (info.progress * 100) + "%" }} />
        </div>
        <span className="prog-pct">{Math.round(info.progress * 100)}%</span>
      </div>

      {/* 当前场景 */}
      {info.scene && (
        <div className="prog-current">
          <div className="prog-cur-head">
            <span className="prog-cur-tag">当前</span>
            <span className="prog-cur-title">{info.scene.title}</span>
          </div>
          <div className="prog-cur-desc">{PROLOGUE_DESC[info.scene.stage]}</div>
          <div className="prog-cur-meta">
            {info.scene.beats.length} 个节拍
            {info.scene.skippable && "　（可跳过）"}
          </div>
          <div className="controls">
            <button className="actbtn" onClick={advance}>完成这一幕，继续</button>
          </div>
        </div>
      )}

      {/* 阶段列表 */}
      <h3>序章流程</h3>
      <div className="prog-stages">
        {PROLOGUE_ORDER.map((st, i) => {
          const curIdx = PROLOGUE_ORDER.indexOf(stage);
          const isPast = i < curIdx;
          const isCurrent = i === curIdx;
          return (
            <div
              key={st}
              className={"prog-stage " + (isPast ? "past" : isCurrent ? "current" : "future")}
            >
              <span className="prog-stage-dot">{isPast ? "✓" : isCurrent ? "●" : "○"}</span>
              <div className="prog-stage-body">
                <div className="prog-stage-name">{PROLOGUE_LABEL[st]}</div>
                <div className="prog-stage-desc">{PROLOGUE_DESC[st]}</div>
                {PROLOGUE_DAYS[st] >= 0 && (
                  <div className="prog-stage-day">末日前 {PROLOGUE_DAYS[st]} 天</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 教程 */}
      <h3>
        教程　<span className="sub">{done.length} / {TUTORIAL_STEPS.length}</span>
      </h3>
      <div className="tut-list">
        {TUTORIAL_STEPS.map((t, i) => {
          const isDone = done.includes(t.id);
          const isNext = !isDone && done.length === i;
          return (
            <div
              key={t.id}
              className={"tut-item " + (isDone ? "done" : isNext ? "next" : "todo")}
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            >
              <span className="tut-num">{isDone ? "✓" : i + 1}</span>
              <div className="tut-body">
                <div className="tut-title">{t.title}</div>
                {expanded === t.id && (
                  <>
                    <div className="tut-text">{t.body}</div>
                    {t.action && <div className="tut-action">操作：{t.action}</div>}
                    {!isDone && (
                      <button
                        className="mini"
                        onClick={(e) => {
                          e.stopPropagation();
                          session.completeTutorial(t.id);
                          pushLog("教程完成：" + t.title);
                          refresh();
                        }}
                      >
                        标记完成
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="hint">
        序章讲的是末日前的三十天：觉醒、写 AI、筹备、建房、末日降临。
        序章结束后才进入生存与主线。
      </p>
    </section>
  );
}
