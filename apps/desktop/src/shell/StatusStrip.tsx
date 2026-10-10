import { TIME_SLOT_LABEL } from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function StatusStrip() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const stockStats = useGame((s) => s.stockStats);
  void version;
  const stock = (() => {
    try { return stockStats(); } catch { return null; }
  })();

  const h = Math.floor(session.time.minute / 60);
  const m = session.time.minute % 60;
  const s = session.hero.survival;
  const prog = session.exploration();

  const slotTone = (() => {
    const slot = session.slot;
    if (slot === "morning" || slot === "forenoon") return "day";
    if (slot === "noon") return "day";
    if (slot === "evening") return "dusk";
    return "night";
  })();

  return (
    <div className="statusstrip">
      <span className={`ss-time ss-${slotTone}`}>
        第 {session.time.day} 天　{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
        　{TIME_SLOT_LABEL[session.slot]}
      </span>
      <span className="ss-sep" />
      <span className="ss-item" title="体力">体力 <b>{Math.round(s.stamina)}</b></span>
      <span className="ss-item" title="饥饿">饥饿 <b>{Math.round(s.hunger)}</b></span>
      <span className="ss-item" title="口渴">口渴 <b>{Math.round(s.thirst)}</b></span>
      <span className="ss-item" title="精力">精力 <b>{Math.round(s.energy)}</b></span>
      <span className="ss-item" title="心情">心情 <b>{Math.round(s.mood)}</b></span>
      <span className="ss-item accent" title="欲情">欲情 <b>{Math.round(session.hero.lust.value)}</b></span>
      <span className="ss-sep" />
      <span className="ss-item">同伴 <b>{session.joined().length}</b></span>
      <span className="ss-item">防御 <b>{session.defenseLevel().label}</b></span>
      <span className="ss-item">探索 <b>{prog.percent}%</b></span>
      <span className="ss-item">房车 <b>{session.vehicle.mods.length} 改</b></span>
      {session.offspring.length > 0 && <span className="ss-item">后代 <b>{session.offspring.length}</b></span>}
      <span className="ss-sep" />
      <span className="ss-item" title="房车燃料">燃料 <b>{session.vehicle.fuel.toFixed(0)}L</b></span>
      {stock && stock.total > 0 && (
        <span className="ss-item" title={`预生成文本 ${stock.total} 条 / ${stock.totalChars.toLocaleString()} 字`}>
          库存 <b>{stock.total}</b>
        </span>
      )}
      <span className="ss-item" title="待处理">
        {session.pendingNightRaids().length > 0
          ? <b className="ss-alert">夜袭预警 {session.pendingNightRaids().length}</b>
          : session.defense.captured.length > 0
          ? <b className="ss-alert">待营救 {session.defense.captured.length}</b>
          : "无异常"}
      </span>
    </div>
  );
}

/** 右下角消息日志（参考图里的小通知） */
export function MessageLog() {
  const log = useGame((s) => s.log);
  const version = useGame((s) => s.version);
  void version;

  const shown = log.slice(0, 4);
  if (shown.length === 0) return null;

  return (
    <div className="msgbog">
      {shown.map((line, i) => (
        <div key={i} className={i === 0 ? "msgline latest" : "msgline"}>
          {line}
        </div>
      ))}
    </div>
  );
}