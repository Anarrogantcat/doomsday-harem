import { allSlots, formatSlotTime, describeMeta, slotStats } from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function SavePanel() {
  const slots = useGame((s) => s.slots);
  const version = useGame((s) => s.version);
  const saveToSlot = useGame((s) => s.saveToSlot);
  const loadFromSlot = useGame((s) => s.loadFromSlot);
  const deleteSlot = useGame((s) => s.deleteSlot);
  const autoSave = useGame((s) => s.autoSave);
  const lastSaveMsg = useGame((s) => s.lastSaveMsg);
  const session = useGame((s) => s.session);
  void version;

  const stats = slotStats(slots);

  return (
    <section className="panel">
      <h2>
        存档　<span className="sub">
          已用 {stats.used} / {stats.total}　手动 {stats.byKind.manual.used}/{stats.byKind.manual.total}
          　自动 {stats.byKind.auto.used}/{stats.byKind.auto.total}
        </span>
      </h2>

      {lastSaveMsg && <p className="ok">{lastSaveMsg}</p>}

      <div className="controls">
        <button onClick={autoSave}>立即自动存档</button>
        <button onClick={() => saveToSlot("quick")}>快速存档</button>
      </div>

      <table className="grid">
        <thead>
          <tr><th>槽位</th><th>类型</th><th>内容</th><th>大小</th><th>操作</th></tr>
        </thead>
        <tbody>
          {allSlots().map((def) => {
            const meta = slots.metas.find((m) => m.slot === def.slot) ?? null;
            return (
              <tr key={def.slot} className={meta ? "row-ok" : undefined}>
                <td>{def.label}<span className="sub"> {def.slot}</span></td>
                <td className="sub">
                  {def.kind === "manual" ? "手动" : def.kind === "auto" ? "自动" : "快速"}
                </td>
                <td className="sub">
                  {meta ? describeMeta(meta) : "（空）"}
                </td>
                <td className="sub">
                  {meta ? `${(meta.bytes / 1024).toFixed(1)} KB` : "—"}
                </td>
                <td>
                  <button onClick={() => saveToSlot(def.slot)}>保存</button>
                  {meta && <button onClick={() => loadFromSlot(def.slot)}>读取</button>}
                  {meta && <button className="danger" onClick={() => deleteSlot(def.slot)}>删除</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>当前进度（即将写入的内容）</h3>
      <p className="sub">
        第 {session.time.day} 天　同伴 {session.joined().length} 人　
        科技 {session.tech.unlocked.size} 节点　
        设施 {session.base.facilities.filter((f) => f.tier > 0).length} 座　
        房车改装 {session.vehicle.mods.length} 项　
        主线完成 {Object.values(session.quests).filter((q) => q.completed).length} 条
      </p>

      {stats.latest && (
        <p className="sub">
          最近存档：{stats.latest.slot}　{formatSlotTime(stats.latest)}
        </p>
      )}

      <p className="hint">
        存档实际落盘由 Tauri 后端负责（AES-256-GCM 加密 + HMAC 校验），
        本界面负责槽位语义与元数据。校验失败会拒绝加载（结构版本不符或不变式违规）。
      </p>
    </section>
  );
}
