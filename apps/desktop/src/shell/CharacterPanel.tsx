import { useMemo } from "react";
import { TIME_SLOT_LABEL, tierOfScene } from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 用 SVG 画一个随角色状态变化的剪影（无美术资源时的占位） */
function Portrait({ name, mood, pregnant }: { name: string; mood: number; pregnant: boolean }) {
  // 按名字散列出一个稳定的色相
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const skin = `hsl(${hue}, 22%, 72%)`;
  const cloth = `hsl(${(hue + 40) % 360}, 45%, 42%)`;
  const hair = `hsl(${(hue + 200) % 360}, 35%, 26%)`;

  return (
    <svg viewBox="0 0 120 170" className="portrait">
      <defs>
        <linearGradient id={`bg-${name}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1f33" />
          <stop offset="100%" stopColor="#15101c" />
        </linearGradient>
      </defs>
      <rect width="120" height="170" fill={`url(#bg-${name})`} />
      {/* 头 */}
      <ellipse cx="60" cy="42" rx="21" ry="25" fill={skin} />
      {/* 头发 */}
      <path d="M39 40 Q60 8 81 40 Q82 26 74 18 Q60 6 46 18 Q38 26 39 40 Z" fill={hair} />
      {/* 颈 */}
      <rect x="54" y="62" width="12" height="10" fill={skin} />
      {/* 躯干 */}
      <path d="M60 72 Q42 76 38 100 L38 132 L82 132 L82 100 Q78 76 60 72 Z" fill={cloth} />
      {/* 胸（随体型） */}
      <ellipse cx="50" cy="92" rx="10" ry="9" fill={cloth} opacity="0.9" />
      <ellipse cx="70" cy="92" rx="10" ry="9" fill={cloth} opacity="0.9" />
      {/* 怀孕隆起 */}
      {pregnant && <ellipse cx="60" cy="118" rx="20" ry="16" fill={cloth} opacity="0.95" />}
      {/* 腿 */}
      <rect x="44" y="132" width="12" height="30" fill={cloth} />
      <rect x="64" y="132" width="12" height="30" fill={cloth} />
      {/* 心情影响表情 */}
      <circle cx="52" cy="40" r="2.2" fill="#1a1420" />
      <circle cx="68" cy="40" r="2.2" fill="#1a1400" fillOpacity="1" />
      <path
        d={mood > 60 ? "M53 50 Q60 55 67 50" : mood > 30 ? "M53 51 L67 51" : "M53 54 Q60 49 67 54"}
        stroke="#1a1420" strokeWidth="1.6" fill="none" strokeLinecap="round"
      />
    </svg>
  );
}

function Bar({ label, value, max = 100, tone }: { label: string; value: number; max?: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="cbar">
      <span className="cbar-label">{label}</span>
      <div className="cbar-track">
        <div className={`cbar-fill ${tone ?? ""}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="cbar-value">{typeof value === "number" ? Math.round(value) : value}</span>
    </div>
  );
}

const SHORTCUTS: Array<{ key: string; label: string; tab: string }> = [
  { key: "I", label: "物品", tab: "items" },
  { key: "N", label: "主线", tab: "quests" },
  { key: "T", label: "科技", tab: "tech" },
  { key: "B", label: "基地", tab: "base" },
  { key: "W", label: "服装", tab: "wardrobe" },
  { key: "H", label: "后宫", tab: "harem" },
  { key: "J", label: "岗位", tab: "jobs" },
  { key: "V", label: "房车", tab: "vehicle" },
  { key: "D", label: "防御", tab: "defense" },
  { key: "M", label: "模型", tab: "llm" },
  { key: "S", label: "存档", tab: "save" },
  { key: "C", label: "设置", tab: "cheats" }
];

export function CharacterPanel({ onOpen }: { onOpen: (tab: string) => void }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const h = session.hero;
  const s = h.survival;
  const lvl = useMemo(() => {
    // 用科技 + 设施 + 羁绊总和当作「级别」
    const tech = session.tech.unlocked.size;
    const base = session.base.facilities.filter((f) => f.tier > 0).length;
    const bonds = session.joined().reduce((a, c) => a + c.relationship.bond, 0);
    return Math.max(1, Math.floor((tech + base * 2 + bonds * 3) / 8));
  }, [session]);

  const exp = session.tech.unlocked.size * 1000 + session.world.totalKm * 100 + session.offspring.length * 5000;

  return (
    <aside className="charpanel">
      <div className="cname">{h.identity.name}</div>
      <div className="ctitle">{h.identity.title}</div>

      <div className="cportrait-wrap">
        <Portrait
          name={h.identity.name}
          mood={s.mood}
          pregnant={h.physiology.pregnant}
        />
        <div className="cportrait-badge">{h.identity.heightCm}cm</div>
      </div>

      <div className="clevel">
        <span className="clevel-label">级别</span>
        <span className="clevel-value">{lvl}</span>
      </div>
      <div className="cexp">{exp.toLocaleString()}</div>

      <Bar label="体力" value={s.stamina} tone={s.stamina < 30 ? "danger" : ""} />
      <Bar label="饥饿" value={s.hunger} tone={s.hunger < 30 ? "warn" : ""} />
      <Bar label="口渴" value={s.thirst} tone={s.thirst < 30 ? "warn" : ""} />
      <Bar label="精力" value={s.energy} />
      <Bar label="心情" value={s.mood} />
      <Bar label="欲情" value={h.lust.value} tone="accent" />

      <div className="cinfo">
        <div><span>地点</span><b>{session.here()?.name ?? "?"}</b></div>
        <div><span>同伴</span><b>{session.joined().length}</b></div>
        <div><span>后代</span><b>{session.offspring.length}</b></div>
        <div><span>防御</span><b>{session.defenseLevel().label}</b></div>
        <div><span>房车</span><b>{session.vehicle.mods.length} 改</b></div>
        <div><span>探索</span><b>{session.exploration().percent}%</b></div>
      </div>

      {h.physiology.pregnant && (
        <div className="cpreg">
          怀孕 {Math.floor(h.pregnancy?.progress ?? 0)}/30 天
        </div>
      )}

      <div className="cshortcuts">
        {SHORTCUTS.map((sc) => (
          <button key={sc.key} className="cbtn" onClick={() => onOpen(sc.tab)} title={sc.label}>
            <span className="ckey">{sc.key}</span>
            <span className="clabel">{sc.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
