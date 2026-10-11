import { useState } from "react";
import {
  CLOTHING, SLOT_LABEL, ZONE_LABEL, SENSITIVE_ZONES, WEATHER_LABEL,
  itemsBySlot, itemById, exposure,
  type ClothingSlot, type BodyZone, type Weather
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

const WEATHERS: Weather[] = ["clear", "rain", "snow", "heat", "cold", "storm"];
const SLOTS: ClothingSlot[] = [
  "accessory", "harness", "head", "face", "hands", "feet",
  "outer", "legs", "torso", "underwear_top", "underwear_bottom"
];

export function WardrobePanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const equipClothing = useGame((s) => s.equipClothing);
  const unequipClothing = useGame((s) => s.unequipClothing);
  const undress = useGame((s) => s.undress);
  const stripAll = useGame((s) => s.stripAll);
  const setWeather = useGame((s) => s.setWeather);
  const repairClothing = useGame((s) => s.repairClothing);
  void version;

  const [who, setWho] = useState<string>("hero");
  const [slotFilter, setSlotFilter] = useState<ClothingSlot | "">("");

  const targets = [
    { id: "hero", label: `主角（${session.hero.identity.name}）` },
    ...session.joined().filter((c) => c.id !== "ai").map((c) => ({ id: c.id, label: c.identity.name }))
  ];

  const outfit = session.outfitOf(who);
  const fit = session.weatherFitness(who);
  const targetName = who === "hero" ? "主角" : session.companion(who)?.identity.name ?? who;

  const list = slotFilter ? itemsBySlot(slotFilter) : CLOTHING;

  return (
    <section className="proto-panel">
      <h2>服装　<span className="proto-sub">天气：{WEATHER_LABEL[session.weather]}</span></h2>

      <div className="proto-controls">
        {targets.map((t) => (
          <button key={t.id} className={who === t.id ? "proto-tab proto-active" : "proto-tab"} onClick={() => setWho(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="proto-controls">
        {WEATHERS.map((w) => (
          <button key={w} className={session.weather === w ? "proto-tab proto-active" : "proto-tab"} onClick={() => setWeather(w)}>
            {WEATHER_LABEL[w]}
          </button>
        ))}
      </div>

      {outfit && (
        <>
          <h3>当前着装</h3>
          <p className="proto-sub">{outfit.describe}</p>

          <div className="proto-meters">
            <div className="proto-meter">
              <span className="proto-meter-label">暴露</span>
              <div className="proto-meter-track"><div className="proto-meter-fill proto-danger" style={{ width: `${outfit.exposure}%` }} /></div>
              <span className="proto-meter-value">{outfit.exposure}</span>
            </div>
            <div className="proto-meter">
              <span className="proto-meter-label">保暖</span>
              <div className="proto-meter-track"><div className="proto-meter-fill" style={{ width: `${Math.min(100, outfit.insulation * 6)}%` }} /></div>
              <span className="proto-meter-value">{outfit.insulation}</span>
            </div>
            <div className="proto-meter">
              <span className="proto-meter-label">防护</span>
              <div className="proto-meter-track"><div className="proto-meter-fill" style={{ width: `${Math.min(100, outfit.armor * 6)}%` }} /></div>
              <span className="proto-meter-value">{outfit.armor}</span>
            </div>
            <div className="proto-meter">
              <span className="proto-meter-label">魅力</span>
              <div className="proto-meter-track"><div className="proto-meter-fill" style={{ width: `${Math.min(100, outfit.charm * 5)}%` }} /></div>
              <span className="proto-meter-value">{outfit.charm}</span>
            </div>
          </div>

          {fit && !fit.ok && <p className="proto-warn">⚠ 天气不适：{fit.reasons.join("；")}</p>}

          <div className="proto-controls">
            <button onClick={() => undress(who)}>脱一层</button>
            <button onClick={() => stripAll(who)}>脱光</button>
            <button onClick={() => repairClothing(who)}>修补衣物</button>
          </div>

          <table className="proto-grid">
            <thead><tr><th>槽位</th><th>衣物</th><th>耐久</th><th>操作</th></tr></thead>
            <tbody>
              {outfit.items.map((it) => (
                <tr key={it.slot}>
                  <td>{SLOT_LABEL[it.slot]}</td>
                  <td>{it.name}</td>
                  <td>{it.durability}</td>
                  <td><button onClick={() => unequipClothing(who, it.slot)}>脱下</button></td>
                </tr>
              ))}
              {outfit.items.length === 0 && (
                <tr><td colSpan={4} className="proto-sub">（未着衣物）</td></tr>
              )}
            </tbody>
          </table>

          <h3>身体覆盖</h3>
          <div className="proto-jobgrid">
            {SENSITIVE_ZONES.map((z) => (
              <div key={z} className="proto-jobcard">
                <h3>{ZONE_LABEL[z]}</h3>
                <div className="proto-meter-track">
                  <div className="proto-meter-fill" style={{ width: `${Math.round((outfit.coverage[z] ?? 0) * 100)}%` }} />
                </div>
                <span className="proto-sub">{Math.round((outfit.coverage[z] ?? 0) * 100)}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h3>衣物目录 <span className="proto-sub">{list.length} 件</span></h3>
      <div className="proto-controls">
        <button className={slotFilter === "" ? "proto-tab proto-active" : "proto-tab"} onClick={() => setSlotFilter("")}>全部</button>
        {SLOTS.map((s) => (
          <button key={s} className={slotFilter === s ? "proto-tab proto-active" : "proto-tab"} onClick={() => setSlotFilter(s)}>
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>

      <table className="proto-grid">
        <thead>
          <tr><th>名称</th><th>槽位</th><th>保暖</th><th>防护</th><th>魅力</th><th>隐蔽</th><th>标签</th><th>操作</th></tr>
        </thead>
        <tbody>
          {list.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="proto-sub">{SLOT_LABEL[item.slot]}</td>
              <td>{item.insulation}</td>
              <td>{item.armor}</td>
              <td>{item.charm}</td>
              <td>{item.stealth}</td>
              <td className="proto-sub">{item.tags.join(" ") || "—"}</td>
              <td><button onClick={() => equipClothing(who, item.id)}>穿上</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="proto-hint">
        覆盖度决定暴露度（敏感区域未覆盖的平均值）。脱衣由外到内：配饰 → 头面手 → 外套 → 下身 → 上身 → 内衣 → 束具。
        天气影响保暖判定，岗位制服影响工作加成。
      </p>
    </section>
  );
}
