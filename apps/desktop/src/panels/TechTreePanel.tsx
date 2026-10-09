import { useMemo, useState } from "react";
import {
  BRANCHES, BRANCH_NAMES, branchView, branchProgress, allNodes,
  type BranchId
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function TechTreePanel() {
  const { tech, unlockTech, unlockBranch, unlockEverything, techFx } = useGame();
  const [branch, setBranch] = useState<BranchId>("shelter");

  const view = useMemo(() => branchView(tech, branch), [tech, branch]);
  const progress = useMemo(() => branchProgress(tech), [tech]);
  const fx = techFx();
  const nodes = useMemo(() => allNodes(), []);

  const current = progress.find((p) => p.branch === branch)!;

  return (
    <section className="panel">
      <h2>
        科技树
        <span className="sub">　总进度 {progress.reduce((s, p) => s + p.unlocked, 0)} 节点</span>
      </h2>

      <div className="branchbar">
        {BRANCHES.map((b) => {
          const p = progress.find((x) => x.branch === b.id)!;
          return (
            <button
              key={b.id}
              className={branch === b.id ? "tab active" : "tab"}
              onClick={() => setBranch(b.id)}
              title={b.description}
            >
              {BRANCH_NAMES[b.id]} <span className="sub">{p.unlocked}/{p.total}</span>
            </button>
          );
        })}
      </div>

      <div className="controls">
        <span className="sub">
          {current.name}：{current.unlocked}/{current.total} 已解锁 · 最高 T{current.maxTier} · {current.percent}%
        </span>
        <button onClick={() => unlockBranch(branch, 8)}>解锁本分支至 T8</button>
        <button onClick={unlockEverything}>解锁全部科技</button>
      </div>

      <table className="grid">
        <thead>
          <tr>
            <th>层级</th><th>节点</th><th>效果</th><th>前置</th><th>消耗</th><th>状态</th>
          </tr>
        </thead>
        <tbody>
          {view.map(({ node, unlocked, available }) => (
            <tr key={node.id} className={unlocked ? "row-done" : available ? undefined : "row-locked"}>
              <td>T{node.tier}</td>
              <td>{node.name}</td>
              <td className="sub">{node.effect}</td>
              <td className="sub">
                {node.requires.length === 0
                  ? "—"
                  : node.requires.map((r) => nodes.find((x) => x.id === r)?.name ?? r).join(" / ")}
              </td>
              <td className="sub">
                {Object.entries(node.cost).map(([k, v]) => `${k}×${v}`).join(" ")}
              </td>
              <td>
                {unlocked ? (
                  <span className="ok">已解锁</span>
                ) : (
                  <button
                    disabled={!available && !fx?.unlockAllTech}
                    onClick={() => unlockTech(node.id)}
                  >
                    {available || fx?.unlockAllTech ? "解锁" : "锁定"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        科技与主线完全独立；扶她药与生育调控位于制药分支，寿命科技位于寿命分支。
      </p>
    </section>
  );
}
