import { useMemo, useState } from "react";
import {
  COMPANIONS, CHEAT_ACTIONS, CHEAT_CATEGORIES, CHEAT_CATEGORY_LABEL,
  CHEAT_CATEGORY_ICON, cheatsByCategory, cheatStats,
  type CheatCategory
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 分类下的操作列表 */
function CategoryBlock({ cat, filter }: { cat: CheatCategory; filter: string }) {
  const runCheat = useGame((s) => s.runCheat);
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const actions = useMemo(() => {
    const list = cheatsByCategory(cat);
    if (!filter) return list;
    const q = filter.toLowerCase();
    return list.filter(
      (a) => a.name.toLowerCase().includes(q)
        || a.description.toLowerCase().includes(q)
        || a.id.includes(q)
    );
  }, [cat, filter]);

  if (actions.length === 0) return null;

  return (
    <div className="cheat-cat">
      <div className="cheat-cat-head">
        <span className="cheat-cat-icon">{CHEAT_CATEGORY_ICON[cat]}</span>
        <span className="cheat-cat-name">{CHEAT_CATEGORY_LABEL[cat]}</span>
        <span className="cheat-cat-count">{actions.length}</span>
      </div>
      <div className="cheat-actions">
        {actions.map((a) => (
          <button
            key={a.id}
            className="cheat-btn"
            onClick={() => runCheat(a.id)}
            title={a.description}
          >
            <span className="cheat-btn-name">{a.name}</span>
            <span className="cheat-btn-desc">{a.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheatPanel() {
  const cheat = useGame((s) => s.cheat);
  const setCheat = useGame((s) => s.setCheat);
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const runCheat = useGame((s) => s.runCheat);
  const applyCheatAll = useGame((s) => s.applyCheatAll);
  const [filter, setFilter] = useState("");
  const [lastMsg, setLastMsg] = useState("");
  void version;

  const stats = cheatStats();

  // 当前状态快照
  const snapshot = [
    { label: "主角等级", value: session.hero.growth.level },
    { label: "主角战力", value: session.heroPower() },
    { label: "科技节点", value: session.tech.unlocked.size },
    { label: "基地设施", value: session.base.facilities.filter((f) => f.tier > 0).length },
    { label: "房车改装", value: session.vehicle.mods.length },
    { label: "在队同伴", value: session.joined().length },
    { label: "后代", value: session.offspring.length },
    { label: "探索度", value: session.exploration().percent + "%" }
  ];

  function exec(id: string) {
    setLastMsg(runCheat(id));
  }

  return (
    <div className="cheat-root">
      {/* 主开关 */}
      <section className="cheat-head">
        <label className="chk big">
          <input
            type="checkbox"
            checked={cheat.enabled}
            onChange={(e) => setCheat({ enabled: e.target.checked })}
          />
          启用作弊模式（开启即全开，不设分档）
        </label>

        <fieldset disabled={!cheat.enabled} className="cheat-opts">
          <legend>玩家自选（与主开关解耦）</legend>
          <label className="chk">
            <input type="checkbox" checked={cheat.console}
              onChange={(e) => setCheat({ console: e.target.checked })} />
            启用控制台
          </label>
          <label className="chk">
            <input type="checkbox" checked={cheat.recordAchievements}
              onChange={(e) => setCheat({ recordAchievements: e.target.checked })} />
            记录成就
          </label>
          <label className="chk">
            <input type="checkbox" checked={cheat.markSave}
              onChange={(e) => setCheat({ markSave: e.target.checked })} />
            存档显示 CHEAT 标记
          </label>
        </fieldset>
      </section>

      <fieldset disabled={!cheat.enabled} className="cheat-body">
        <legend>作弊操作（{stats.total} 项，覆盖全部系统）</legend>

        {/* 一键与筛选 */}
        <div className="cheat-toolbar">
          <button className="cheat-all" onClick={applyCheatAll}>
            一键全开（执行全部 {stats.total - 2} 项）
          </button>
          <input
            type="text"
            className="cheat-filter"
            placeholder="筛选操作…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <button className="mini" onClick={() => setFilter("")}>清除</button>
          )}
        </div>

        {lastMsg && <div className="cheat-msg">{lastMsg}</div>}

        {/* 状态快照 */}
        <div className="cheat-snapshot">
          {snapshot.map((s) => (
            <div key={s.label} className="snap-cell">
              <div className="snap-value">{s.value}</div>
              <div className="snap-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 分类操作 */}
        <div className="cheat-grid">
          {CHEAT_CATEGORIES.map((c) => (
            <CategoryBlock key={c} cat={c} filter={filter} />
          ))}
        </div>
      </fieldset>

      <section className="cheat-foot">
        <h3>后宫状态（{session.joined().length} 位）</h3>
        <table className="grid">
          <thead>
            <tr>
              <th>角色</th>
              <th>等级</th>
              <th>好感</th>
              <th>羁绊</th>
              <th>欲情</th>
              <th>亲密度</th>
              <th>增益</th>
              <th>受伤</th>
            </tr>
          </thead>
          <tbody>
            {session.joined().map((c) => (
              <tr key={c.id}>
                <td>{c.identity.name}</td>
                <td>{c.growth.level}</td>
                <td>{Math.round(c.relationship.affection)}</td>
                <td>Lv{c.relationship.bond}</td>
                <td>{Math.round(c.lust.value)}</td>
                <td>T{c.growth.intimacyTier}</td>
                <td>{c.growth.perks.length}</td>
                <td>{c.growth.injuries > 0 ? c.growth.injuries : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>未解锁角色（{COMPANIONS.length - session.joined().length} 位）</h3>
        <p className="sub">
          {COMPANIONS.filter((c) => !session.companion(c.id)).map((c) => c.name).join("、")
            || "（全部已解锁）"}
        </p>
      </section>

      <p className="hint">
        作弊器覆盖全部系统：生存、主角成长、后宫成长、亲密熟练度、
        基地科技、房车、世界、战斗、防御、生育、主线、时间、加成共享。
        游戏不因开作弊封锁任何内容，全部后宫与场景照常可玩。
      </p>
    </div>
  );
}
