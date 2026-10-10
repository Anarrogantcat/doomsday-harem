import { useMemo } from "react";
import {
  FACILITIES, facilityDef, LEVEL_LABEL,
  type BaseLevel
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 三层要塞的视觉分组 */
const LEVEL_ROWS: Array<{ level: BaseLevel; label: string; hint: string }> = [
  { level: "surface", label: "地表", hint: "安全屋 · 伪装成普通民居" },
  { level: "bunker", label: "山内", hint: "避难所 · 真正的核心" },
  { level: "resource", label: "深层", hint: "资源层 · 能源与出口" }
];

/** 设施在剖面里的简笔图标 */
const FACILITY_GLYPH: Record<string, string> = {
  power_basic: "⚡", water_basic: "◉", vent_basic: "≈", storage_room: "▤",
  kitchen: "▬", dining: "▭", living_room: "▢", bedroom: "▣", garage: "▥",
  armory: "◆", comm_room: "◈", security_gate: "◐",
  elevator: "⇕", bunker_power: "⚡", bunker_water: "◉", greenhouse: "♣",
  medical_bay: "✚", lab: "⚗", training_room: "◎", workshop: "⚙",
  ammo_press: "◘", bunker_storage: "▤", harem_dorm: "♥", private_room: "▩",
  bathhouse: "≈", cryo_bay: "❄", clone_lab: "⌬",
  fence: "▮", trench: "▽", watchtower: "⌂", sandbag: "▬", turret: "✦",
  drone_bay: "◈", robot_bay: "▣", energy_shield: "◎",
  deep_well: "◉", geo_plant: "⚡", mine: "⛏", escape_tunnel: "⇱", fusion_plant: "☢",
  air_filter: "≈"
};

export function FortressSection({ onOpenBase }: { onOpenBase: () => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const summary = session.baseSummary();

  const byLevel = useMemo(() => {
    const out: Record<BaseLevel, Array<{ id: string; name: string; tier: number; building: boolean; max: number }>> = {
      surface: [], bunker: [], resource: []
    };
    for (const def of FACILITIES) {
      const tier = session.tierOf(def.id);
      const building = session.base.building === def.id;
      out[def.level].push({
        id: def.id, name: def.name, tier,
        building, max: def.maxTier
      });
    }
    return out;
  }, [session, version]);

  return (
    <section className="fortress">
      <header className="fortress-head">
        <span className="fortress-title">山体要塞</span>
        <span className="sub">
          已建成 {summary.built}/{summary.total}　满级 {summary.maxed}
        </span>
      </header>

      {session.base.building && (
        <div className="fortress-building">
          建造中：{facilityDef(session.base.building)?.name ?? session.base.building}
          （{Math.round(summary.buildingProgress * 100)}%）
        </div>
      )}

      <div className="fortress-body">
        {LEVEL_ROWS.map((row) => {
          const list = byLevel[row.level];
          const built = list.filter((x) => x.tier > 0).length;
          return (
            <div key={row.level} className={`flevel flevel-${row.level}`}>
              <div className="flevel-head">
                <span className="flevel-name">{row.label}</span>
                <span className="flevel-hint">{row.hint}</span>
                <span className="flevel-count">{built}/{list.length}</span>
              </div>
              <div className="fgrid">
                {list.map((f) => (
                  <button
                    key={f.id}
                    className={`fcell ${f.tier > 0 ? "built" : "empty"} ${f.building ? "building" : ""}`}
                    onClick={onOpenBase}
                    title={`${f.name}${f.tier > 0 ? ` Lv${f.tier}/${f.max}` : "（未建成）"}`}
                  >
                    <span className="fglyph">{FACILITY_GLYPH[f.id] ?? "□"}</span>
                    <span className="fname">{f.name}</span>
                    {f.tier > 0 && <span className="ftier">Lv{f.tier}</span>}
                    {f.building && <span className="fbuild">建</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
