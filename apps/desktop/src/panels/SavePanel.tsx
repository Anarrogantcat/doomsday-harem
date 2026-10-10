import { useEffect, useState } from "react";
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
  const refreshSlots = useGame((s) => s.refreshSlots);
  const backendInfo = useGame((s) => s.backendInfo);
  const [busy, setBusy] = useState<string>("");
  void version;

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  const stats = slotStats(slots);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="panel">
      <h2>
        存档　<span className="sub">
          已用 {stats.used} / {stats.total}　手动 {stats.byKind.manual.used}/{stats.byKind.manual.total}
          　自动 {stats.byKind.auto.used}/{stats.byKind.auto.total}
        </span>
      </h2>

      {lastSaveMsg && <p className="ok">{lastSaveMsg}</p>}
      <p className="sub">存储后端：{backendInfo()}{busy && `　（${busy}中…）`}</p>

      <div className="controls">
        <button onClick={() => run("自动存档", autoSave)} disabled={!!busy}>立即自动存档</button>
        <button onClick={() => run("快速存档", () => saveToSlot("quick"))} disabled={!!busy}>快速存档</button>
        <button onClick={() => run("刷新", refreshSlots)} disabled={!!busy}>刷新列表</button>
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
                  <button onClick={() => run("保存", () => saveToSlot(def.slot))} disabled={!!busy}>保存</button>
                  {meta && <button onClick={() => run("读取", () => loadFromSlot(def.slot))} disabled={!!busy}>读取</button>}
                  {meta && <button className="danger" onClick={() => run("删除", () => deleteSlot(def.slot))} disabled={!!busy}>删除</button>}
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
        Tauri 环境下存档经 AES-256-GCM 加密 + HMAC 校验后写入应用数据目录；
        浏览器环境降级为 localStorage（明文，仅供开发预览）。
        读取时校验完整性、结构版本与六项不变式，任一失败拒绝加载。
      </p>
    </section>
  );
}