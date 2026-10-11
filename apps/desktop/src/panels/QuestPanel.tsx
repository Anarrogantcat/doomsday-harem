import { QUESTS, RECRUIT_TEMPLATES, type QuestStage } from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function QuestPanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const advanceQuest = useGame((s) => s.advanceQuest);
  const pauseQuest = useGame((s) => s.pauseQuest);
  const resumeQuest = useGame((s) => s.resumeQuest);
  const tryRecruitHere = useGame((s) => s.tryRecruitHere);
  void version;

  const sum = session.questSummary();

  return (
    <div className="proto-grid2">
      <section className="proto-panel">
        <h2>
          主线　<span className="proto-sub">
            完成 {sum.completed}/{sum.total}　进行中 {sum.started}　暂停 {sum.paused}
          </span>
        </h2>
        <p className="proto-sub">已完成解锁后宫 {sum.unlockedCompanions} 人</p>

        <table className="proto-grid">
          <thead>
            <tr><th>主线</th><th>目标</th><th>进度</th><th>当前步骤</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            {sum.list.map(({ def, state }) => {
              const check = session.questCheck(def.id);
              const step = def.steps.find((s) => s.stage === state.stage + 1);
              const status =
                state.completed ? "已完成"
                : state.paused ? "已暂停"
                : check?.reason === "wrong-region" ? `需前往 ${step?.region ?? "?"}`
                : check?.reason === "missing-items" ? `缺 ${Object.keys(check.missingItems).join("、")}`
                : check?.reason === "low-affection" ? `需好感 ${check.needAffection}`
                : check?.reason === "missing-flag" ? `需前置 ${check.missingFlags.join("、")}`
                : check?.ok ? "可推进"
                : "未开始";
              return (
                <tr key={def.id} className={state.completed ? "proto-row-ok" : undefined}>
                  <td>{def.title}</td>
                  <td className="proto-sub">{def.companionName}</td>
                  <td>{state.stage}/{def.steps.length}</td>
                  <td className="proto-sub">{step?.name ?? "—"}</td>
                  <td className={state.completed ? "proto-ok" : check?.ok ? "proto-warn" : "proto-sub"}>{status}</td>
                  <td>
                    {!state.completed && check?.ok && (
                      <button onClick={() => advanceQuest(def.id)}>推进</button>
                    )}
                    {!state.completed && state.started && !state.paused && (
                      <button onClick={() => pauseQuest(def.id)}>暂停</button>
                    )}
                    {state.paused && (
                      <button onClick={() => resumeQuest(def.id)}>继续</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="proto-hint">
          主线只用于解锁后宫，与科技树完全独立。每条 3-5 步，可随时暂停后续接。
          主线不是唯一途径 —— 随机遭遇也能招募到后宫。
        </p>
      </section>

      <section className="proto-panel">
        <h2>主线详情</h2>
        {sum.list.filter((x) => x.state.started && !x.state.completed).map(({ def, state }) => {
          const step = def.steps.find((s) => s.stage === state.stage + 1);
          return (
            <div key={def.id} className="proto-jobcard" style={{ marginBottom: 10 }}>
              <h3>{def.title} <span className="proto-sub">— {def.companionName}</span></h3>
              <p className="proto-sub">{def.summary}</p>
              {step && (
                <>
                  <p><strong>第 {step.stage} 步：{step.name}</strong></p>
                  <p className="proto-sub">{step.description}</p>
                  {step.region && <p className="proto-sub">地点：{step.region}</p>}
                  {step.requiresItems && (
                    <p className="proto-sub">
                      需要：{Object.entries(step.requiresItems).map(([k, v]) => `${k}×${v}`).join("、")}
                    </p>
                  )}
                </>
              )}
              <p className="proto-sub">完成奖励：{def.rewards.join("、")}</p>
            </div>
          );
        })}
        {sum.list.filter((x) => x.state.started && !x.state.completed).length === 0 && (
          <p className="proto-sub">（暂无进行中的主线。到达对应区域并满足条件即可推进。）</p>
        )}

        <h3>随机遭遇招募</h3>
        <p className="proto-sub">当前区域：{session.here()?.name ?? "?"}</p>
        <div className="proto-controls">
          <button onClick={tryRecruitHere}>搜索附近幸存者</button>
        </div>

        <h3>招募类型库（{RECRUIT_TEMPLATES.length} 种）</h3>
        <table className="proto-grid">
          <thead><tr><th>类型</th><th>身份</th><th>特长</th><th>出现区域</th></tr></thead>
          <tbody>
            {RECRUIT_TEMPLATES.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td className="proto-sub">{t.title}</td>
                <td className="proto-sub">{t.trait}</td>
                <td className="proto-sub">{t.regions.join("、")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
