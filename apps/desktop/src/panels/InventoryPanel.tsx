import { useState } from "react";
import {
  CATEGORY_LABEL, QUALITY_LABEL, RECIPES, ITEMS, itemDef,
  type ItemCategory, type Stack
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

const CATS: ItemCategory[] = [
  "material", "food", "water", "medical", "ammo", "weapon", "tool",
  "toy", "drug", "luxury", "key", "data"
];

function StackTable({
  stacks, onAction, actionLabel, emptyText
}: {
  stacks: Stack[];
  onAction: (itemId: string) => void;
  actionLabel: string;
  emptyText: string;
}) {
  if (stacks.length === 0) return <p className="sub">{emptyText}</p>;
  return (
    <table className="grid">
      <thead><tr><th>物品</th><th>分类</th><th>数量</th><th>品质</th><th>重量</th><th>操作</th></tr></thead>
      <tbody>
        {stacks.map((s, i) => {
          const def = itemDef(s.itemId);
          return (
            <tr key={s.itemId + i}>
              <td>{def?.name ?? s.itemId}</td>
              <td className="sub">{def ? CATEGORY_LABEL[def.category] : "?"}</td>
              <td>{s.count}</td>
              <td className="sub">{QUALITY_LABEL[s.quality]}</td>
              <td className="sub">{((def?.weight ?? 0) * s.count).toFixed(1)}</td>
              <td><button onClick={() => onAction(s.itemId)}>{actionLabel}</button></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function InventoryPanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const loot = useGame((s) => s.loot);
  const useItem = useGame((s) => s.useItem);
  const takeFromStorage = useGame((s) => s.takeFromStorage);
  const putToStorage = useGame((s) => s.putToStorage);
  const craftItem = useGame((s) => s.craftItem);
  void version;

  const [tab, setTab] = useState<"backpack" | "storage" | "craft">("backpack");
  const [catFilter, setCatFilter] = useState<ItemCategory | "">("");

  const sum = session.inventorySummary();
  const filter = (stacks: Stack[]) =>
    catFilter ? stacks.filter((s) => itemDef(s.itemId)?.category === catFilter) : stacks;

  return (
    <section className="panel">
      <h2>物品　<span className="sub">
        背包 {sum.backpack.used.toFixed(1)}/{sum.backpack.max} kg　
        {sum.backpack.slots}/{sum.backpack.maxSlots} 格　
        仓库 {sum.storage.items} 件 / {sum.storage.kinds} 种
      </span></h2>

      <div className="controls">
        <button className={tab === "backpack" ? "tab active" : "tab"} onClick={() => setTab("backpack")}>背包</button>
        <button className={tab === "storage" ? "tab active" : "tab"} onClick={() => setTab("storage")}>仓库</button>
        <button className={tab === "craft" ? "tab active" : "tab"} onClick={() => setTab("craft")}>合成</button>
      </div>

      {tab !== "craft" && (
        <>
          <div className="controls">
            <button className={catFilter === "" ? "tab active" : "tab"} onClick={() => setCatFilter("")}>全部</button>
            {CATS.map((c) => (
              <button key={c} className={catFilter === c ? "tab active" : "tab"} onClick={() => setCatFilter(c)}>
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>

          <h3>搜刮（按当前时间取种子，结果可复现）</h3>
          <div className="controls">
            {["ruins", "pharmacy", "workshop", "military", "lab", "residential", "adult_shop"].map((t) => (
              <button key={t} onClick={() => loot(t)}>搜刮 {t}</button>
            ))}
          </div>

          {tab === "backpack" ? (
            <>
              <h3>背包</h3>
              <StackTable
                stacks={filter(session.backpack.stacks)}
                onAction={(id) => { useItem(id); }}
                actionLabel="使用"
                emptyText="（空）"
              />
              <div className="controls">
                <span className="sub">常用操作：</span>
                {session.backpack.stacks.slice(0, 6).map((s) => (
                  <button key={s.itemId} onClick={() => putToStorage(s.itemId, s.count)}>
                    存入 {itemDef(s.itemId)?.name ?? s.itemId}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3>仓库</h3>
              <StackTable
                stacks={filter(session.storage.stacks)}
                onAction={(id) => takeFromStorage(id, 1)}
                actionLabel="取1"
                emptyText="（空）"
              />
              <div className="controls">
                <span className="sub">快速放入背包：</span>
                {session.storage.stacks.slice(0, 8).map((s) => (
                  <button key={s.itemId} onClick={() => takeFromStorage(s.itemId, 5)}>
                    取5 {itemDef(s.itemId)?.name ?? s.itemId}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === "craft" && (
        <>
          <h3>合成台</h3>
          <table className="grid">
            <thead><tr><th>产物</th><th>数量</th><th>材料</th><th>工时</th><th>前置科技</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              {RECIPES.map((r) => {
                const check = session.craftCheck(r.id);
                const out = itemDef(r.output.itemId);
                return (
                  <tr key={r.id}>
                    <td>{out?.name ?? r.output.itemId}</td>
                    <td>{r.output.n}</td>
                    <td className="sub">
                      {Object.entries(r.cost).map(([k, v]) => `${k}×${v}`).join("　")}
                    </td>
                    <td className="sub">{r.hours}h</td>
                    <td className="sub">{(r.requiresTech ?? []).join("、") || "—"}</td>
                    <td className={check.ok ? "ok" : "sub"}>
                      {check.ok ? "可合成" : check.missingTech.length ? "缺科技" : "缺材料"}
                    </td>
                    <td>
                      <button onClick={() => craftItem(r.id)} disabled={!check.ok}>合成</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <p className="hint">
        背包有重量与槽位上限，仓库无上限。科技研发与合成会同时从仓库与背包扣料（仓库优先）。
        搜刮使用游戏内时间作随机种子，同一时刻结果可复现。
      </p>
    </section>
  );
}
