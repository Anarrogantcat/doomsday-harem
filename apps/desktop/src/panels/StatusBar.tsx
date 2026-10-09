import { TIME_SLOT_LABEL, slotOf } from "@doomsday/core";
import { useGame } from "../store/game.ts";

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <span className="meter-label">{label}</span>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="meter-value">{Math.round(value)}</span>
    </div>
  );
}

export function StatusBar() {
  const { day, minute, hero } = useGame();
  const s = hero.survival;
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const slot = TIME_SLOT_LABEL[slotOf(minute)];

  return (
    <section className="panel">
      <h2>状态</h2>
      <p className="sub">
        第 {day} 天 {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")} · {slot}
      </p>
      <div className="meters">
        <Meter label="饥饿" value={s.hunger} />
        <Meter label="口渴" value={s.thirst} />
        <Meter label="体力" value={s.stamina} />
        <Meter label="精力" value={s.energy} />
        <Meter label="心情" value={s.mood} />
      </div>
      <p className="hint">全天候：任意时段均可发起亲密互动，时段只影响演出基调。</p>
    </section>
  );
}
