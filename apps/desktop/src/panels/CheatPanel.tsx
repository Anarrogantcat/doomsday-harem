import { COMPANIONS } from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function CheatPanel() {
  const cheat = useGame((s) => s.cheat);
  const setCheat = useGame((s) => s.setCheat);
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const applyCheatAll = useGame((s) => s.applyCheatAll);
  const cheatMaxRelations = useGame((s) => s.cheatMaxRelations);
  const cheatClearLust = useGame((s) => s.cheatClearLust);
  const cheatMaxLust = useGame((s) => s.cheatMaxLust);
  const cheatImpregnate = useGame((s) => s.cheatImpregnate);
  const cheatHeroPregnant = useGame((s) => s.cheatHeroPregnant);
  const cheatDeliver = useGame((s) => s.cheatDeliver);
  const cheatUnlockAll = useGame((s) => s.cheatUnlockAll);
  void version;

  return (
    <div className="grid2">
      <section className="panel">
        <h2>设置 · 作弊模式</h2>

        <label className="chk big">
          <input
            type="checkbox"
            checked={cheat.enabled}
            onChange={(e) => setCheat({ enabled: e.target.checked })}
          />
          启用作弊模式（开启即全开）
        </label>

        <fieldset disabled={!cheat.enabled}>
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

        <h3>当前状态</h3>
        <table className="grid">
          <tbody>
            <tr><td className="sub">科技解锁</td><td>{session.tech.unlocked.size}</td></tr>
            <tr><td className="sub">基地设施</td><td>{session.base.facilities.filter((f) => f.tier > 0).length}</td></tr>
            <tr><td className="sub">房车改装</td><td>{session.vehicle.mods.length}</td></tr>
            <tr><td className="sub">在队同伴</td><td>{session.joined().length}</td></tr>
            <tr><td className="sub">后代</td><td>{session.offspring.length}</td></tr>
          </tbody>
        </table>

        <h3>存档标记</h3>
        <p className="sub">
          {cheat.enabled && cheat.markSave ? "存档将显示 [CHEAT] 角标" : "存档不显示作弊标记"}
        </p>
      </section>

      <section className="panel">
        <h2>作弊操作</h2>
        <p className="sub">开启主开关后全部功能可用，无需逐档解锁。</p>

        <fieldset disabled={!cheat.enabled}>
          <legend>一键</legend>
          <div className="controls">
            <button onClick={applyCheatAll}>全开（科技+基地+房车+物资）</button>
            <button onClick={cheatUnlockAll}>解锁全部 21 位后宫</button>
          </div>
        </fieldset>

        <fieldset disabled={!cheat.enabled}>
          <legend>关系</legend>
          <div className="controls">
            <button onClick={cheatMaxRelations}>好感/忠诚/羁绊拉满</button>
            <button onClick={cheatClearLust}>欲情清零</button>
            <button onClick={cheatMaxLust}>欲情拉满</button>
          </div>
        </fieldset>

        <fieldset disabled={!cheat.enabled}>
          <legend>生育</legend>
          <div className="controls">
            <button onClick={cheatHeroPregnant}>主角立即怀孕</button>
            <button onClick={cheatDeliver}>立即分娩</button>
          </div>
          <div className="controls">
            <span className="sub">指定同伴怀孕：</span>
            {session.joined().slice(0, 6).map((c) => (
              <button key={c.id} onClick={() => cheatImpregnate(c.id)}>{c.identity.name}</button>
            ))}
          </div>
        </fieldset>

        <h3>全开后同伴状态</h3>
        <table className="grid">
          <thead><tr><th>角色</th><th>好感</th><th>忠诚</th><th>羁绊</th><th>欲情</th></tr></thead>
          <tbody>
            {session.joined().map((c) => (
              <tr key={c.id}>
                <td>{c.identity.name}</td>
                <td>{Math.round(c.relationship.affection)}</td>
                <td>{Math.round(c.relationship.loyalty)}</td>
                <td>Lv{c.relationship.bond}</td>
                <td>{Math.round(c.lust.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>未解锁角色（{COMPANIONS.length - session.joined().length} 位）</h3>
        <p className="sub">
          {COMPANIONS.filter((c) => !session.companion(c.id)).map((c) => c.name).join("、") || "（全部已解锁）"}
        </p>

        <p className="hint">
          作弊器与主开关解耦的三项（控制台/成就/存档标记）均为玩家自选。
          游戏不因开作弊封锁任何内容，全部后宫与场景照常可玩。
        </p>
      </section>
    </div>
  );
}
