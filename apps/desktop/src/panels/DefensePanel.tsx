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
    <div className="grid2">
      <section className="panel">
        <h2>
          防御　<span className="sub">等级 {lvl.label}（综合 {lvl.total}）</span>
        </h2>

        <div className="meters">
          <div className="meter">
            <span className="meter-label">安全</span>
            <div className="meter-track">
              <div className={`meter-fill ${lvl.safety > 70 ? "ok" : lvl.safety > 40 ? "warn" : "danger"}`}
                   style={{ width: `${lvl.safety}%` }} />
            </div>
            <span className="meter-value">{lvl.safety}</span>
          </div>
          <div className="meter">
            <span className="meter-label">名声</span>
            <div className="meter-track">
              <div className="meter-fill warn" style={{ width: `${d.reputation}%` }} />
            </div>
            <span className="meter-value">{d.reputation.toFixed(0)}</span>
          </div>
          <div className="meter">
            <span className="meter-label">血腥</span>
            <div className="meter-track">
              <div className="meter-fill danger" style={{ width: `${d.blood}%` }} />
            </div>
            <span className="meter-value">{d.blood.toFixed(0)}</span>
          </div>
        </div>

        <table className="grid">
          <tbody>
            <tr><td className="sub">夜间遇袭概率</td><td>{(lvl.raidChance * 100).toFixed(1)}%</td></tr>
            <tr><td className="sub">可抵御强度</td><td>{lvl.withstand}</td></tr>
            <tr><td className="sub">围墙破损</td><td className={d.wallDamage > 0 ? "warn" : "ok"}>{d.wallDamage}</td></tr>
            <tr><td className="sub">待营救</td><td className={d.captured.length > 0 ? "warn" : "sub"}>{d.captured.length}</td></tr>
            <tr><td className="sub">历史事件</td><td>{history.length}</td></tr>
          </tbody>
        </table>

        <h3>防御分解</h3>
        <table className="grid">
          <tbody>
            {Object.entries(lvl.breakdown).map(([k, v]) => (
              <tr key={k}><td className="sub">{k}</td><td>{typeof v === "number" ? v.toFixed(1) : v}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="controls">
          <button onClick={rollRaid}>判定今晚</button>
          <button onClick={repairWall}>修复围墙</button>
        </div>

        {d.captured.length > 0 && (
          <>
            <h3>待营救同伴</h3>
            <div className="controls">
              {d.captured.map((id) => (
                <button key={id} onClick={() => rescueCaptured(id)}>
                  营救 {session.companion(id)?.identity.name ?? id}
                </button>
              ))}
            </div>
          </>
        )}

        <h3>手动触发事件（测试用）</h3>
        <div className="controls">
          {RAIDS.map((r) => (
            <button key={r.kind} onClick={() => triggerRaid(r.kind)}>
              {RAID_LABEL[r.kind]}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>事件类型（{RAIDS.length} 种）</h2>
        <table className="grid">
          <thead>
            <tr><th>类型</th><th>起始天</th><th>强度</th><th>数量</th><th>可谈判</th><th>可威慑</th></tr>
          </thead>
          <tbody>
            {RAIDS.map((r) => (
              <tr key={r.kind} className={session.day >= r.minDay ? undefined : "row-dim"}>
                <td>{RAID_LABEL[r.kind]}</td>
                <td>{r.minDay}</td>
                <td className={r.strength >= 70 ? "warn" : ""}>{r.strength}</td>
                <td className="sub">{r.count[0]}-{r.count[1]}</td>
                <td>{r.negotiable ? "✓" : "—"}</td>
                <td>{r.deterrable ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>事件历史</h3>
        {history.length === 0 ? (
          <p className="sub">（尚无事件）</p>
        ) : (
          <table className="grid">
            <thead><tr><th>天</th><th>事件</th><th>结果</th></tr></thead>
            <tbody>
              {[...history].reverse().slice(0, 30).map((h, i) => (
                <tr key={i}>
                  <td>第 {h.day} 天</td>
                  <td>{RAID_LABEL[h.kind]}</td>
                  <td className={h.outcome === "repelled" ? "ok" : h.outcome === "breached" ? "warn" : "sub"}>
                    {OUTCOME_LABEL[h.outcome]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="hint">
          防御等级由基地设施（围墙/壕沟/掩体/哨戒枪/炮塔/无人机/护盾）、
          巡逻岗位同伴、AI 监控与主角战斗属性共同决定。名声越高越容易引来匪帮，
          血腥值越高越容易引来丧尸。防御不足时会被突破，同伴可能被掳走。
        </p>
      </section>
    </div>
  );
}
