import { useMemo, useState } from "react";
import {
  ACHIEVEMENTS, ACH_CATEGORIES, ACH_CATEGORY_LABEL, ACH_CATEGORY_ICON,
  RARITY_LABEL, RARITY_COLOR, achievementsByCategory, unlockedCount,
  rarityStats, completion, achStats,
  type AchievementCategory, type Rarity
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function AchievementPanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const achievements = useGame((s) => s.achievements);
  const [cat, setCat] = useState<AchievementCategory | "all">("all");
  const [showLocked, setShowLocked] = useState(true);
  void session;
  void version;

  const total = ACHIEVEMENTS.length;
  const unlocked = unlockedCount(achievements);
  const pct = Math.round(completion(achievements) * 100);
  const rarities = rarityStats(achievements);
  const stats = achStats();

  const list = useMemo(() => {
    const arr = cat === "all" ? ACHIEVEMENTS : achievementsByCategory(cat);
    return arr.filter((a) => showLocked || achievements.progress[a.id]?.unlocked);
  }, [cat, showLocked, achievements]);

  return (
    <section className="proto-panel">
      <h2>
        成就　<span className="proto-sub">{unlocked} / {total}（{pct}%）</span>
      </h2>

      {/* 总进度 */}
      <div className="proto-ach-progress">
        <div className="proto-ach-bar">
          <div className="proto-ach-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="proto-ach-pct">{pct}%</span>
      </div>

      {/* 稀有度统计 */}
      <div className="proto-ach-rarities">
        {(["common", "uncommon", "rare", "epic", "legendary"] as Rarity[]).map((r) => (
          <span key={r} className="proto-ach-rarity-chip" style={{ borderColor: RARITY_COLOR[r], color: RARITY_COLOR[r] }}>
            {RARITY_LABEL[r]} {rarities[r].unlocked}/{rarities[r].total}
          </span>
        ))}
      </div>

      {/* 分类筛选 */}
      <div className="proto-controls">
        <button className={cat === "all" ? "proto-mini proto-active" : "proto-mini"} onClick={() => setCat("all")}>
          全部（{stats.total}）
        </button>
        {ACH_CATEGORIES.map((c) => {
          const n = stats.byCategory[c] ?? 0;
          const u = achievementsByCategory(c).filter((a) => achievements.progress[a.id]?.unlocked).length;
          return (
            <button key={c} className={cat === c ? "proto-mini proto-active" : "proto-mini"} onClick={() => setCat(c)}>
              {ACH_CATEGORY_ICON[c]} {ACH_CATEGORY_LABEL[c]} {u}/{n}
            </button>
          );
        })}
        <label className="proto-chk">
          <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
          显示未解锁
        </label>
      </div>

      {/* 成就列表 */}
      <div className="proto-ach-list">
        {list.map((a) => {
          const p = achievements.progress[a.id];
          const isUnlocked = p?.unlocked ?? false;
          const isProgress = a.target !== undefined && a.target > 1;
          const prog = isProgress ? Math.min(1, (p?.current ?? 0) / (a.target ?? 1)) : 0;

          return (
            <div
              key={a.id}
              className={`proto-ach-card ${isUnlocked ? "unlocked" : "proto-locked"} ${p?.cheated ? "cheated" : ""}`}
              style={{ borderLeftColor: RARITY_COLOR[a.rarity] }}
            >
              <div className="proto-ach-head">
                <span className="proto-ach-icon">
                  {isUnlocked ? ACH_CATEGORY_ICON[a.category] : "○"}
                </span>
                <span className="proto-ach-name">{a.name}</span>
                <span className="proto-ach-rarity" style={{ color: RARITY_COLOR[a.rarity] }}>
                  {RARITY_LABEL[a.rarity]}
                </span>
                {isUnlocked && p?.unlockedAtDay !== null && (
                  <span className="ach-day">第 {p.unlockedAtDay} 天</span>
                )}
                {p?.cheated && <span className="ach-cheat">作弊</span>}
              </div>

              <div className="proto-ach-desc">
                {a.hidden && !isUnlocked ? "？？？" : a.description}
              </div>

              {isProgress && (
                <div className="proto-ach-progress-row">
                  <div className="proto-ach-mini-bar">
                    <div className="proto-ach-mini-fill" style={{ width: `${prog * 100}%` }} />
                  </div>
                  <span className="proto-ach-prog-text">
                    {p?.current ?? 0} / {a.target}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="proto-hint">
        成就是可选的正反馈，不解锁任何游戏内容。
        开启作弊时仍会记录（可关闭），但会标注「作弊」角标。
      </p>
    </section>
  );
}
