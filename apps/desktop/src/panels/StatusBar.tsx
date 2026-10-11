import { TIME_SLOT_LABEL, type Activity } from "@doomsday/core";
import { useGame } from "../store/game.ts";

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct < 20 ? "proto-danger" : pct < 45 ? "proto-warn" : "proto-ok";
  return (
    <div className="proto-meter">
      <span className="proto-meter-label">{label}</span>
      <div className="proto-meter-track">
        <div className={`proto-meter-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="proto-meter-value">{Math.round(value)}</span>
    </div>
  );
}

const ACTIVITIES: Array<{ id: Activity; label: string }> = [
  { id: "idle", label: "休息" },
  { id: "work", label: "工作" },
  { id: "patrol", label: "巡逻" },
  { id: "expedition", label: "远征" }
];

export function StatusBar() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const advanceHours = useGame((s) => s.advanceHours);
  const sleepDays = useGame((s) => s.sleepDays);
  const log = useGame((s) => s.log);
  void version;

  const s = session.hero.survival;
  const h = Math.floor(session.time.minute / 60);
  const m = session.time.minute % 60;
  const bonuses = session.bonuses();

  return (
    <div className="proto-grid2">
      <section className="proto-panel">
        <h2>状态</h2>
        <p className="proto-sub">
          第 {session.time.day} 天 {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")} · {TIME_SLOT_LABEL[session.slot]}
          　·　同伴 {session.joined().length} 人
          　·　后代 {session.offspring.length} 人
        </p>

        <div className="proto-meters">
          <Meter label="饥饿" value={s.hunger} />
          <Meter label="口渴" value={s.thirst} />
          <Meter label="体力" value={s.stamina} />
          <Meter label="精力" value={s.energy} />
          <Meter label="心情" value={s.mood} />
          <Meter label="欲情" value={session.hero.lust.value} />
        </div>

        {session.hero.pregnancy && (
          <p className="proto-warn">
            ⚠ 怀孕中：第 {Math.floor(session.hero.pregnancy.progress)} / 30 天
            （父方 {session.hero.pregnancy.fatherId}）
          </p>
        )}

        <h3>推进时间</h3>
        <div className="proto-controls">
          <button onClick={() => advanceHours(1, "idle")}>+1 小时</button>
          <button onClick={() => advanceHours(4, "work")}>+4 小时（工作）</button>
          <button onClick={() => advanceHours(8, "work")}>+8 小时</button>
          <button onClick={() => sleepDays(1)}>睡一觉（1 天）</button>
          <button onClick={() => sleepDays(7)}>+7 天</button>
        </div>

        <div className="proto-controls">
          {ACTIVITIES.map((a) => (
            <button key={a.id} onClick={() => advanceHours(2, a.id)}>
              2h · {a.label}
            </button>
          ))}
        </div>

        <h3>科技加成（生效中）</h3>
        <p className="proto-sub">
          {Object.keys(bonuses).length === 0
            ? "（暂无）"
            : Object.entries(bonuses).map(([k, v]) => `${k}: ${typeof v === "number" ? v.toFixed(2) : v}`).join("　")}
        </p>
      </section>

      <section className="proto-panel">
        <h2>日志 <span className="proto-sub">{log.length} 条</span></h2>
        {log.length === 0 ? (
          <p className="proto-sub">（暂无事件。推进时间或与同伴互动。）</p>
        ) : (
          <ul className="proto-loglist">
            {log.slice(0, 40).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
