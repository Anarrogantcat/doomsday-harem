import { useGame } from "../store/game.ts";

export function HaremPanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const satisfy = useGame((s) => s.satisfy);
  const refuse = useGame((s) => s.refuse);
  const nightRaid = useGame((s) => s.nightRaid);
  const cheatEffects = useGame((s) => s.cheatEffects);
  void version;

  const fx = cheatEffects();
  const companions = session.joined();
  const raids = new Set(session.pendingNightRaids().map((c) => c.id));

  return (
    <section className="panel">
      <h2>
        后宫　<span className="sub">已解锁 {companions.length} / 21</span>
      </h2>
      <table className="grid">
        <thead>
          <tr>
            <th>角色</th><th>好感</th><th>忠诚</th><th>羁绊</th><th>欲情</th><th>冷落</th><th>岗位</th><th>状态</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {companions.map((c) => {
            const lust = c.lust.value;
            const raid = raids.has(c.id);
            const stage = session.lustStageOf(c.id);
            const stageLabel: Record<string, string> = {
              none: "—", hint: "主动暗示", invite: "主动邀约", nightRaid: "夜袭阈值", forced: "强制触发"
            };
            return (
              <tr key={c.id} className={raid ? "row-warn" : undefined}>
                <td>
                  {c.identity.name}
                  <span className="sub"> {c.identity.title}</span>
                </td>
                <td>{Math.round(c.relationship.affection)}</td>
                <td>{Math.round(c.relationship.loyalty)}</td>
                <td>Lv{c.relationship.bond}</td>
                <td>{Math.round(lust)}</td>
                <td>{c.lust.daysSinceIntimacy} 天</td>
                <td>{c.job.id ?? "空闲"}</td>
                <td>
                  {stageLabel[stage]}
                  {raid && <span className="warn"> ⚠</span>}
                </td>
                <td>
                  <button onClick={() => satisfy(c.id, "active")}>亲密</button>
                  <button onClick={() => refuse(c.id)}>拒绝</button>
                  {raid && <button className="danger" onClick={() => nightRaid(c.id)}>夜袭</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="hint">
        好感与忠诚只升不降；拒绝不会扣减任何关系数值，只增加欲情。
        欲情 ≥90 且冷落 ≥10 天时触发夜袭 —— 无拒绝选项。
        {fx && <span className="warn">　（作弊器生效中）</span>}
      </p>
    </section>
  );
}
