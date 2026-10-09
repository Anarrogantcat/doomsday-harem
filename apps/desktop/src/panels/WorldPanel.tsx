import {
  REGIONS, TERRAIN_LABEL, DANGER_LABEL, TRAVEL_MODES, neighbors, effectiveDanger,
  type TravelMode, type DangerLevel
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

const MODES: TravelMode["id"][] = ["walk", "bike", "car", "apc"];

export function WorldPanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const travelTo = useGame((s) => s.travelTo);
  const setTravelMode = useGame((s) => s.setTravelMode);
  const lootCurrent = useGame((s) => s.lootCurrent);
  const clearCurrent = useGame((s) => s.clearCurrent);
  void version;

  const here = session.here();
  const ns = neighbors(session.world);
  const prog = session.exploration();

  return (
    <div className="grid2">
      <section className="panel">
        <h2>
          世界　<span className="sub">
            探索 {prog.discovered}/{prog.total}（{prog.percent}%）　里程 {session.world.totalKm} km
          </span>
        </h2>

        <p>
          <strong>{here?.name}</strong>
          <span className="sub">　{here ? TERRAIN_LABEL[here.terrain] : ""}　
          危险 {here ? DANGER_LABEL[effectiveDanger(session.world, here.id) as DangerLevel] : "?"}</span>
        </p>
        <p className="sub">{here?.description}</p>
        <p className="sub">{here?.arrival}</p>

        <h3>交通方式</h3>
        <div className="controls">
          {MODES.map((m) => {
            const mode = TRAVEL_MODES[m];
            const disabled = (m === "car" || m === "apc") && !session.vehicleAvailable();
            return (
              <button
                key={m}
                className={session.travelMode === m ? "tab active" : "tab"}
                onClick={() => setTravelMode(m)}
                disabled={disabled}
                title={disabled ? "需要车库" : `${mode.speed}km/h`}
              >
                {mode.label} {mode.speed}km/h
              </button>
            );
          })}
        </div>
        <p className="sub">
          燃料储备 {session.fuel()}　体力 {Math.round(session.hero.survival.stamina)}
          　{!session.vehicleAvailable() && "（无车库，车辆不可用）"}
        </p>

        <h3>当地行动</h3>
        <div className="controls">
          <button onClick={lootCurrent}>搜刮（剩余 {session.world.regions[session.world.current]?.nodesLeft ?? 0} 点）</button>
          <button onClick={clearCurrent}>清理区域</button>
        </div>

        <h3>当前区域状态</h3>
        <p className="sub">
          已搜刮 {session.world.regions[session.world.current]?.looted ?? 0} 次　
          清理 {session.world.regions[session.world.current]?.cleared ?? 0} 级　
          进度 {Math.round((session.world.regions[session.world.current]?.progress ?? 0) * 100)}%
        </p>
      </section>

      <section className="panel">
        <h2>可达区域</h2>
        <table className="grid">
          <thead>
            <tr><th>区域</th><th>地形</th><th>距离</th><th>危险</th><th>搜刮点</th><th>预计</th><th>操作</th></tr>
          </thead>
          <tbody>
            {ns.map((n) => {
              const st = session.world.regions[n.def.id];
              const plan = session.planTravelTo(n.def.id);
              const danger = effectiveDanger(session.world, n.def.id);
              return (
                <tr key={n.def.id} className={!st?.discovered ? "row-dim" : undefined}>
                  <td>
                    {n.def.name}
                    {!st?.discovered && <span className="sub"> （未发现）</span>}
                  </td>
                  <td className="sub">{TERRAIN_LABEL[n.def.terrain]}</td>
                  <td>{n.km} km</td>
                  <td className={danger >= 4 ? "warn" : "sub"}>
                    {DANGER_LABEL[danger as DangerLevel]}
                  </td>
                  <td>{st?.nodesLeft ?? 0}/{n.def.lootNodes}</td>
                  <td className="sub">
                    {plan.hours.toFixed(1)}h　体力-{plan.staminaCost.toFixed(1)}
                    {plan.fuelCost > 0 && `　油-${plan.fuelCost.toFixed(1)}`}
                  </td>
                  <td>
                    <button
                      onClick={() => travelTo(n.def.id)}
                      disabled={!plan.reachable}
                      title={plan.reason ?? ""}
                    >
                      前往
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3>全部区域（已发现）</h3>
        <table className="grid">
          <thead><tr><th>区域</th><th>地形</th><th>危险</th><th>状态</th></tr></thead>
          <tbody>
            {REGIONS.filter((r) => session.world.regions[r.id]?.discovered).map((r) => {
              const st = session.world.regions[r.id];
              const danger = effectiveDanger(session.world, r.id);
              return (
                <tr key={r.id} className={r.id === session.world.current ? "row-ok" : undefined}>
                  <td>{r.name}</td>
                  <td className="sub">{TERRAIN_LABEL[r.terrain]}</td>
                  <td className={danger >= 4 ? "warn" : "sub"}>{DANGER_LABEL[danger as DangerLevel]}</td>
                  <td className="sub">
                    {r.id === session.world.current ? "当前位置" : st?.visited ? "已访问" : "未访问"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="hint">
          移动消耗时间与体力，房车更快更省力但耗油。旅行途中可能发现相邻区域并遭遇敌人。
          危险度可通过清理区域降低（最多三级）。搜刮点耗尽后该区域无产出。
        </p>
      </section>
    </div>
  );
}
