import { useState } from "react";
import {
  MODS, VEHICLE_SLOT_LABEL, modsByTier, armorLabel, BASE_STATS,
  type ModTier, type VehicleSlot
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

const TIERS: ModTier[] = [1, 2, 3, 4, 5, 6, 7, 8];

export function VehiclePanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const installVehicleMod = useGame((s) => s.installVehicleMod);
  const uninstallVehicleMod = useGame((s) => s.uninstallVehicleMod);
  const installAllVehicleMods = useGame((s) => s.installAllVehicleMods);
  const refuelVehicle = useGame((s) => s.refuelVehicle);
  const repairVehicle = useGame((s) => s.repairVehicle);
  const cheat = useGame((s) => s.cheat);
  void version;

  const [tierFilter, setTierFilter] = useState<ModTier | 0>(0);
  const [slotFilter, setSlotFilter] = useState<VehicleSlot | "">("");

  const v = session.vehicle;
  const st = session.vehicleStats();
  const prog = session.vehicleProgress();

  const list = MODS.filter(
    (d) => (tierFilter === 0 || d.tier === tierFilter) && (!slotFilter || d.slot === slotFilter)
  );

  return (
    <div className="proto-grid2">
      <section className="proto-panel">
        <h2>
          {v.name}　<span className="proto-sub">改装 {prog.installed}/{prog.total}（{prog.percent}%）</span>
        </h2>

        <h3>当前数值</h3>
        <table className="proto-grid">
          <tbody>
            <tr><td className="proto-sub">最高时速</td><td>{st.topSpeed} km/h（越野 {st.offroadSpeed}）</td></tr>
            <tr><td className="proto-sub">续航</td><td>{st.range} km{st.electricRange > 0 && `　纯电 ${st.electricRange} km`}</td></tr>
            <tr><td className="proto-sub">装甲</td><td className={st.armorLevel >= 4 ? "proto-ok" : ""}>{armorLabel(st.armorLevel)}</td></tr>
            <tr><td className="proto-sub">火力</td><td className={st.firepower > 0 ? "proto-ok" : "proto-sub"}>{st.firepower || "无"}</td></tr>
            <tr><td className="proto-sub">静音</td><td>{st.noiseDb} dB</td></tr>
            <tr><td className="proto-sub">载重 / 座位</td><td>{st.capacity} kg　{st.seats} 座</td></tr>
            <tr><td className="proto-sub">舒适度</td><td>{st.comfort}</td></tr>
            <tr><td className="proto-sub">电力输出</td><td>{st.powerOutput} kWh/日</td></tr>
            <tr><td className="proto-sub">涉水</td><td>{st.wading > 0 ? `${st.wading} mm` : "不可"}</td></tr>
          </tbody>
        </table>

        <h3>状态</h3>
        <div className="proto-meters">
          <div className="proto-meter">
            <span className="proto-meter-label">燃料</span>
            <div className="proto-meter-track">
              <div className="proto-meter-fill" style={{ width: `${(v.fuel / st.fuelCapacity) * 100}%` }} />
            </div>
            <span className="proto-meter-value">{v.fuel.toFixed(0)}</span>
          </div>
          <div className="proto-meter">
            <span className="proto-meter-label">车身</span>
            <div className="proto-meter-track">
              <div className={`proto-meter-fill ${v.hull < 40 ? "proto-danger" : v.hull < 70 ? "proto-warn" : "proto-ok"}`}
                   style={{ width: `${v.hull}%` }} />
            </div>
            <span className="proto-meter-value">{v.hull.toFixed(0)}</span>
          </div>
        </div>

        <div className="proto-controls">
          <button onClick={() => refuelVehicle(100)}>加油 100L</button>
          <button onClick={() => refuelVehicle(-50)}>抽油 50L</button>
          <button onClick={repairVehicle}>修复车身</button>
        </div>

        <h3>能力</h3>
        <p className="proto-sub">
          {session.vehiclePrivateRoom() ? "✓ 私室（远征亲密场景）" : "✗ 无私室"}　
          {session.vehicleCrew()} 座　
          {session.vehicle.mods.includes("drone_rack") ? "✓ 无人机 ×2" : "✗ 无无人机"}　
          {session.vehicle.mods.includes("radar") ? "✓ 雷达" : "✗ 无雷达"}　
          {session.vehicle.mods.includes("comm") ? "✓ 通讯" : "✗ 无通讯"}
        </p>

        <h3>已装改装</h3>
        {session.vehicle.mods.length === 0 ? (
          <p className="proto-sub">（尚未改装，仍是一辆普通房车）</p>
        ) : (
          <table className="proto-grid">
            <thead><tr><th>层</th><th>名称</th><th>槽位</th><th>操作</th></tr></thead>
            <tbody>
              {session.vehicle.mods
                .map((id) => MODS.find((m) => m.id === id))
                .filter((d): d is NonNullable<typeof d> => !!d)
                .sort((a, b) => a.tier - b.tier)
                .map((d) => (
                  <tr key={d.id}>
                    <td>T{d.tier}</td>
                    <td>{d.name}</td>
                    <td className="proto-sub">{VEHICLE_SLOT_LABEL[d.slot]}</td>
                    <td><button className="proto-danger" onClick={() => uninstallVehicleMod(d.id)}>卸下</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {cheat.enabled && (
          <div className="proto-controls">
            <button onClick={installAllVehicleMods}>一键装齐全部改装</button>
          </div>
        )}
      </section>

      <section className="proto-panel">
        <h2>改装清单</h2>

        <div className="proto-controls">
          <button className={tierFilter === 0 ? "proto-tab proto-active" : "proto-tab"} onClick={() => setTierFilter(0)}>全部层</button>
          {TIERS.map((t) => (
            <button key={t} className={tierFilter === t ? "proto-tab proto-active" : "proto-tab"} onClick={() => setTierFilter(t)}>
              T{t}
            </button>
          ))}
        </div>

        <div className="proto-controls">
          <button className={slotFilter === "" ? "proto-tab proto-active" : "proto-tab"} onClick={() => setSlotFilter("")}>全部槽</button>
          {(Object.keys(VEHICLE_SLOT_LABEL) as VehicleSlot[]).map((s) => (
            <button key={s} className={slotFilter === s ? "proto-tab proto-active" : "proto-tab"} onClick={() => setSlotFilter(s)}>
              {VEHICLE_SLOT_LABEL[s]}
            </button>
          ))}
        </div>

        <table className="proto-grid">
          <thead>
            <tr><th>层</th><th>名称</th><th>槽位</th><th>效果</th><th>消耗</th><th>工时</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            {list.map((d) => {
              const check = session.vehicleModCheck(d.id)!;
              const installed = session.vehicle.mods.includes(d.id);
              const status =
                installed ? "已安装"
                : check.reason === "missing-prereq" ? `缺前置：${check.missing.join("、")}`
                : check.reason === "missing-tech" ? `缺科技：${check.missingTech.join("、")}`
                : check.reason === "missing-resource" ? `缺材料：${Object.entries(check.missingResource).map(([k, n]) => `${k}×${n}`).join("、")}`
                : "可安装";
              return (
                <tr key={d.id} className={installed ? "proto-row-ok" : undefined}>
                  <td>T{d.tier}</td>
                  <td>{d.name}</td>
                  <td className="proto-sub">{VEHICLE_SLOT_LABEL[d.slot]}</td>
                  <td className="proto-sub">{d.description}</td>
                  <td className="proto-sub">{Object.entries(d.cost).map(([k, n]) => `${k}×${n}`).join("　")}</td>
                  <td className="proto-sub">{d.hours}h</td>
                  <td className={installed ? "proto-ok" : "proto-sub"}>{status}</td>
                  <td>
                    {!installed && check.ok && <button onClick={() => installVehicleMod(d.id)}>安装</button>}
                    {installed && <button className="proto-danger" onClick={() => uninstallVehicleMod(d.id)}>卸下</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="proto-hint">
          起点是普通 C 型房车（{BASE_STATS.topSpeed}km/h / 续航 {BASE_STATS.range}km / 无装甲 / 无武装）。
          改装按 T1→T8 逐层解锁，每项都有前置与科技要求。房车是远征载具：
          装甲影响遭遇存活，火力影响战斗，私室解锁远征亲密场景，地形套件解锁越野。
        </p>
      </section>
    </div>
  );
}
