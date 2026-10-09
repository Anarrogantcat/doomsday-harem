import { useGame, DEFAULT_CHEAT } from "../store/game.ts";

export function CheatPanel() {
  const { cheat, setCheat } = useGame();

  return (
    <section className="panel">
      <h2>设置 · 作弊模式</h2>
      <label className="chk big">
        <input type="checkbox" checked={cheat.enabled} onChange={(e) => setCheat({ enabled: e.target.checked })} />
        启用作弊模式（开启即全开）
      </label>

      <fieldset disabled={!cheat.enabled}>
        <legend>玩家自选</legend>
        <label className="chk">
          <input type="checkbox" checked={cheat.console} onChange={(e) => setCheat({ console: e.target.checked })} />
          启用控制台
        </label>
        <label className="chk">
          <input type="checkbox" checked={cheat.recordAchievements} onChange={(e) => setCheat({ recordAchievements: e.target.checked })} />
          记录成就
        </label>
        <label className="chk">
          <input type="checkbox" checked={cheat.markSave} onChange={(e) => setCheat({ markSave: e.target.checked })} />
          存档显示 CHEAT 标记
        </label>
      </fieldset>

      {cheat.enabled && (
        <div className="cheatlist">
          <h3>已生效</h3>
          <ul>
            <li>生存与资源：无限饱食／口渴／体力／精力／物资／燃油</li>
            <li>角色与属性：无敌／一击必杀／属性拉满／预知无冷却／隐身／加速／负重无限</li>
            <li>科技树：解锁全部／指定层级／秒完成／重置</li>
            <li>后宫与关系：好感／忠诚／欲情／亲密度全满，一键解锁 21 人</li>
            <li>成人内容：全部场景／回放库／扶她药无限／立即怀孕／立即分娩／强制夜袭</li>
            <li>时间与世界：快进／暂停／天气／跳过夜晚／清空威胁／手动触发事件</li>
            <li>基地与建造：秒建／免费／全解锁／岗位自动最优／防御满级／耐久不减</li>
            <li>调试工具：传送／状态查看／事件日志／存档快照／帧率／碰撞显示／跳过战斗</li>
          </ul>
        </div>
      )}
      <p className="hint">默认关闭。三项自选开关与主开关解耦：{JSON.stringify(DEFAULT_CHEAT)}</p>
    </section>
  );
}
