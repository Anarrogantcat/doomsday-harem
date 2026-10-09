import { useGame } from "../store/game.ts";

export function HaremPanel() {
  const { companions, satisfyCompanion, cheatEffects } = useGame();
  const fx = cheatEffects();

  return (
    <section className="panel">
      <h2>后宫　<span className="sub">已解锁 {companions.length} / 21</span></h2>
      <table className="grid">
        <thead>
          <tr>
            <th>角色</th><th>好感</th><th>忠诚</th><th>羁绊</th><th>欲情</th><th>冷落</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {companions.map((c) => {
            const lust = fx?.maxAffection ? 0 : c.lust.value;
            const raid = lust >= 90 && c.lust.daysSinceIntimacy >= 10;
            return (
              <tr key={c.id} className={raid ? "row-warn" : undefined}>
                <td>{c.name}<span className="sub"> {c.title}</span></td>
                <td>{fx?.maxAffection ? 100 : Math.round(c.relationship.affection)}</td>
                <td>{fx?.maxLoyalty ? 100 : Math.round(c.relationship.loyalty)}</td>
                <td>Lv{c.relationship.bond}</td>
                <td>{Math.round(lust)}</td>
                <td>{c.lust.daysSinceIntimacy} 天</td>
                <td>
                  <button onClick={() => satisfyCompanion(c.id)}>满足</button>
                  {raid && <span className="warn"> 今晚可能夜袭</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hint">好感与忠诚只升不降；拒绝不会扣减任何关系数值。</p>
    </section>
  );
}
