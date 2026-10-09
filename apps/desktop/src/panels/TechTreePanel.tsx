import { useState } from "react";
import { BRANCH_NAMES, BRANCHES, type BranchId } from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function TechTreePanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const beginResearch = useGame((s) => s.beginResearch);
  const forceComplete = useGame((s) => s.forceComplete);
  const addResources = useGame((s) => s.addResources);
  const cheat = useGame((s) => s.cheat);
  void version;

  const [branch, setBranch] = useState<BranchId>("shelter");
  const progress = session.techProgress();
  const branchDef = BRANCHES.find((b) => b.id === branch)!;
  const researching = session.tech.researching;

  return (
    <section className="panel">
      <h2>
        科技树　<span className="sub">
          已解锁 {session.tech.unlocked.size} / {progress.reduce((s, b) => s + b.total, 0)} 节点
        </span>
      </h2>

      <div className="controls">
        {BRANCHES.map((b) => {
          const p = progress.find((x) => x.branch === b.id)!;
          return (
            <button
              key={b.id}
              className={branch === b.id ? "tab active" : "tab"}
              onClick={() => setBranch(b.id)}
            >
              {BRANCH_NAMES[b.id]} {p.unlocked}/{p.total}
            </button>
          );
        })}
      </div>

      {researching && (
        <p className="warn">
          研究中：{researching.nodeId}（已投入 {researching.hours.toFixed(1)} 小时）
        </p>
      )}

      <table className="grid">
        <thead>
          <tr><th>层</th><th>节点</th><th>效果</th><th>消耗</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {branchDef.nodes
            .slice()
            .sort((a, b) => a.tier - b.tier)
            .map((node) => {
              const av = session.availability(node.id);
              const unlocked = session.has(node.id);
              const isResearching = researching?.nodeId === node.id;
              const status = unlocked
                ? "已解锁"
                : isResearching
                ? "研究中"
                : av.reason === "missing-prereq"
                ? `缺前置：${av.missingPrereqs.join("、")}`
                : av.reason === "missing-resource"
                ? `缺资源：${av.missingResources.join("、")}`
                : "可研究";
              return (
                <tr key={node.id} className={unlocked ? "row-ok" : undefined}>
                  <td>T{node.tier}</td>
                  <td>{node.name}</td>
                  <td className="sub">{node.effect}</td>
                  <td className="sub">
                    {Object.entries(node.cost).map(([k, v]) => `${k}×${v}`).join("　")}
                  </td>
                  <td className={unlocked ? "ok" : isResearching ? "warn" : "sub"}>{status}</td>
                  <td>
                    {!unlocked && !isResearching && av.ok && (
                      <button onClick={() => beginResearch(node.id)}>研究</button>
                    )}
                    {!unlocked && cheat.enabled && (
                      <button onClick={() => forceComplete(node.id)}>秒完成</button>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      <h3>资源</h3>
      <p className="sub">
        {Object.keys(session.resources).length === 0
          ? "（无）"
          : Object.entries(session.resources)
              .map(([k, v]) => `${k}×${v}`)
              .join("　")}
      </p>
      <div className="controls">
        <button onClick={() => addResources({ "铜线": 20, "磁铁": 10 })}>+铜线20/磁铁10</button>
        <button onClick={() => addResources({ "水泥": 30, "钢筋": 20 })}>+水泥30/钢筋20</button>
        <button onClick={() => addResources({ "PVC管": 20, "滤网": 5 })}>+PVC管20/滤网5</button>
        <button onClick={() => addResources({ "风扇": 5, "管道": 10 })}>+风扇5/管道10</button>
      </div>

      <p className="hint">
        研究需要前置节点与资源。开始研究后资源立即扣除，工时随时间推进累积。
        实验室岗位可加速研究。
      </p>
    </section>
  );
}
