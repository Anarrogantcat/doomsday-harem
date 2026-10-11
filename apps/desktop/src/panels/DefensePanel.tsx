import { RAIDS, RAID_LABEL, OUTCOME_LABEL } from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function DefensePanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const triggerRaid = useGame((s) => s.triggerRaid);
  const rescueCaptured = useGame((s) => s.rescueCaptured);
  const repairWall = useGame((s) => s.repairWall);
  const rollRaid = useGame((s) => s.rollRaid);
  void version;

  const lvl = session.defenseLevel();
  const d = session.defense;
  const history = session.raidHistory();

  return (
    <div className="proto-grid2">
      <section className="proto-panel">
        <h2>
          防御　<span className="proto-sub">等级 {lvl.label}（综合 {lvl.total}）</span>
        </h2>

        <div className="proto-meters">
          <div className="proto-meter">
            <span className="proto-meter-label">安全</span>
            <div className="proto-meter-track">
              <div className={`proto-meter-fill ${lvl.safety > 70 ? "proto-ok" : lvl.safety > 40 ? "proto-warn" : "proto-danger"}`}
                   style={{ width: `${lvl.safety}%` }} />
            </div>
            <span className="proto-meter-value">{lvl.safety}</span>
          </div>
          <div className="proto-meter">
            <span className="proto-meter-label">名声</span>
            <div className="proto-meter-track">
              <div className="proto-meter-fill proto-warn" style={{ width: `${d.reputation}%` }} />
            </div>
            <span className="proto-meter-value">{d.reputation.toFixed(0)}</span>
          </div>
          <div className="proto-meter">
            <span className="proto-meter-label">血腥</span>
            <div className="proto-meter-track">
              <div className="proto-meter-fill proto-danger" style={{ width: `${d.blood}%` }} />
            </div>
            <span className="proto-meter-value">{d.blood.toFixed(0)}</span>
          </div>
        </div>

        <table className="proto-grid">
          <tbody>
            <tr><td className="proto-sub">夜间遇袭概率</td><td>{(lvl.raidChance * 100).toFixed(1)}%</td></tr>
            <tr><td className="proto-sub">可抵御强度</td><td>{lvl.withstand}</td></tr>
            <tr><td className="proto-sub">围墙破损</td><td className={d.wallDamage > 0 ? "proto-warn" : "proto-ok"}>{d.wallDamage}</td></tr>
            <tr><td className="proto-sub">待营救</td><td className={d.captured.length > 0 ? "proto-warn" : "proto-sub"}>{d.captured.length}</td></tr>
            <tr><td className="proto-sub">历史事件</td><td>{history.length}</td></tr>
          </tbody>
        </table>

        <h3>防御分解</h3>
        <table className="proto-grid">
          <tbody>
            {Object.entries(lvl.breakdown).map(([k, v]) => (
              <tr key={k}><td className="proto-sub">{k}</td><td>{typeof v === "number" ? v.toFixed(1) : v}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="proto-controls">
          <button onClick={rollRaid}>判定今晚</button>
          <button onClick={repairWall}>修复围墙</button>
        </div>

        {d.captured.length > 0 && (
          <>
            <h3>待营救同伴</h3>
            <div className="proto-controls">
              {d.captured.map((id) => (
                <button key={id} onClick={() => rescueCaptured(id)}>
                  营救 {session.companion(id)?.identity.name ?? id}
                </button>
              ))}
            </div>
          </>
        )}

        <h3>手动触发事件（测试用）</h3>
        <div className="proto-controls">
          {RAIDS.map((r) => (
            <button key={r.kind} onClick={() => triggerRaid(r.kind)}>
              {RAID_LABEL[r.kind]}
            </button>
          ))}
        </div>
      </section>

      <section className="proto-panel">
        <h2>事件类型（{RAIDS.length} 种）</h2>
        <table className="proto-grid">
          <thead>
            <tr><th>类型</th><th>起始天</th><th>强度</th><th>数量</th><th>可谈判</th><th>可威慑</th></tr>
          </thead>
          <tbody>
            {RAIDS.map((r) => (
              <tr key={r.kind} className={session.day >= r.minDay ? undefined : "proto-row-dim"}>
                <td>{RAID_LABEL[r.kind]}</td>
                <td>{r.minDay}</td>
                <td className={r.strength >= 70 ? "proto-warn" : ""}>{r.strength}</td>
                <td className="proto-sub">{r.count[0]}-{r.count[1]}</td>
                <td>{r.negotiable ? "✓" : "—"}</td>
                <td>{r.deterrable ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>事件历史</h3>
        {history.length === 0 ? (
          <p className="proto-sub">（尚无事件）</p>
        ) : (
          <table className="proto-grid">
            <thead><tr><th>天</th><th>事件</th><th>结果</th></tr></thead>
            <tbody>
              {[...history].reverse().slice(0, 30).map((h, i) => (
                <tr key={i}>
                  <td>第 {h.day} 天</td>
                  <td>{RAID_LABEL[h.kind]}</td>
                  <td className={h.outcome === "repelled" ? "proto-ok" : h.outcome === "breached" ? "proto-warn" : "proto-sub"}>
                    {OUTCOME_LABEL[h.outcome]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="proto-hint">
          防御等级由基地设施（围墙/壕沟/掩体/哨戒枪/炮塔/无人机/护盾）、
          巡逻岗位同伴、AI 监控与主角战斗属性共同决定。名声越高越容易引来匪帮，
          血腥值越高越容易引来丧尸。防御不足时会被突破，同伴可能被掳走。
        </p>
      </section>
    </div>
  );
}
