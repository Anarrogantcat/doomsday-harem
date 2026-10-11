import { useState } from "react";
import {
  BRANCH_NAMES, BRANCHES, SCOPE_LABEL, SCOPE_ICON, SCOPE_DESC,
  COMPANION_RESEARCH_CAP,
  type BranchId, type TechScope
} from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 科研人员列表（仅共用科技可见） */
function ResearchTeam({ nodeId }: { nodeId: string }) {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  void version;

  const info = session.researchRateFor(nodeId);
  const list = session.researchContributors(nodeId);

  if (!info.canDelegate) {
    return (
      <div className="proto-research-note proto-personal">
        该科技为主角个人专属，后宫科研人员无法参与。
      </div>
    );
  }

  return (
    <div className="research-team">
      <div className="rt-head">
        <span>科研人员</span>
        <span className="rt-rate">
          总速率 ×{info.rate.toFixed(2)}
          {info.teamBonus > 0 && (
            <span className="rt-bonus">（团队 +{(info.teamBonus * 100).toFixed(0)}%）</span>
          )}
        </span>
      </div>
      <div className="rt-list">
        {list.map((c) => (
          <div key={c.id} className={`rt-row ${c.eligible ? "proto-on" : "proto-off"}`} title={c.reason}>
            <span className="rt-name">{c.name}</span>
            <span className="rt-skills">
              制作 {c.craftLevel}　医护 {c.medicalLevel}
            </span>
            <span className="rt-contrib">
              {c.eligible
                ? "+" + (c.contribution * 100).toFixed(0) + "%"
                : c.reason ?? "无贡献"}
            </span>
          </div>
        ))}
      </div>
      <p className="proto-hint" style={{ marginTop: "0.3em" }}>
        贡献度由制作/医护技能与岗位决定，单人上限 {(COMPANION_RESEARCH_CAP * 100).toFixed(0)}%。
        需在「设置 → 共享」中授权「研究效率」后才会生效。
      </p>
    </div>
  );
}

export function TechTreePanel() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const beginResearch = useGame((s) => s.beginResearch);
  const forceComplete = useGame((s) => s.forceComplete);
  const cheat = useGame((s) => s.cheat);
  const [branch, setBranch] = useState<BranchId>("shelter");
  const [scopeFilter, setScopeFilter] = useState<TechScope | "all">("all");
  const [showTeam, setShowTeam] = useState<string | null>(null);
  void version;

  const progress = session.techProgress();
  const branchDef = BRANCHES.find((b) => b.id === branch)!;
  const researching = session.tech.researching;
  const scopeStats = session.techScopeStats();

  const nodes = branchDef.nodes
    .slice()
    .sort((a, b) => a.tier - b.tier)
    .filter((n) => {
      if (scopeFilter === "all") return true;
      return session.techScopeOf(n.id) === scopeFilter;
    });

  return (
    <section className="proto-panel">
      <h2>
        科技树　<span className="proto-sub">
          已解锁 {session.tech.unlocked.size} / {progress.reduce((s, b) => s + b.total, 0)} 节点
          　·　共用 {scopeStats.shared}　个人 {scopeStats.personal}
        </span>
      </h2>

      <div className="proto-controls">
        {BRANCHES.map((b) => {
          const p = progress.find((x) => x.branch === b.id)!;
          const bs = scopeStats.byBranch[b.id];
          const isShared = bs && bs.shared > 0;
          return (
            <button
              key={b.id}
              className={branch === b.id ? "proto-tab proto-active" : "proto-tab"}
              onClick={() => setBranch(b.id)}
              title={isShared ? "含共用科技" : "主角个人科技"}
            >
              {BRANCH_NAMES[b.id]} {p.unlocked}/{p.total}
              <span className={`proto-scope-dot ${isShared ? "proto-shared" : "proto-personal"}`}>
                {isShared ? SCOPE_ICON.shared : SCOPE_ICON.personal}
              </span>
            </button>
          );
        })}
      </div>

      <div className="proto-controls">
        <span className="proto-sub">筛选</span>
        <button className={scopeFilter === "all" ? "proto-mini proto-active" : "proto-mini"}
          onClick={() => setScopeFilter("all")}>全部</button>
        <button className={scopeFilter === "shared" ? "proto-mini proto-active" : "proto-mini"}
          onClick={() => setScopeFilter("shared")}>
          {SCOPE_ICON.shared} 共用（{scopeStats.shared}）
        </button>
        <button className={scopeFilter === "personal" ? "proto-mini proto-active" : "proto-mini"}
          onClick={() => setScopeFilter("personal")}>
          {SCOPE_ICON.personal} 个人（{scopeStats.personal}）
        </button>
      </div>

      <p className="proto-hint" style={{ marginTop: 0 }}>
        {SCOPE_DESC.shared}；{SCOPE_DESC.personal}。
      </p>

      {researching && (
        <p className="proto-warn">
          研究中：{researching.nodeId}（已投入 {researching.hours.toFixed(1)} 小时）
        </p>
      )}

      <table className="proto-grid">
        <thead>
          <tr>
            <th>层</th>
            <th>节点</th>
            <th>归属</th>
            <th>效果</th>
            <th>消耗</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => {
            const av = session.availability(node.id);
            const unlocked = session.has(node.id);
            const isResearching = researching?.nodeId === node.id;
            const scope = session.techScopeOf(node.id) ?? "shared";
            const rate = session.researchRateFor(node.id);

            const status = unlocked
              ? "已解锁"
              : isResearching
              ? "研究中"
              : av.reason === "missing-prereq"
              ? `缺前置：${av.missingPrereqs.join("、")}`
              : av.reason === "missing-resource"
              ? `缺材料：${av.missingResources.join("、")}`
              : "可研究";

            return (
              <tr
                key={node.id}
                className={
                  unlocked ? "proto-row-ok"
                  : isResearching ? "proto-row-warn"
                  : av.ok ? "" : "proto-row-dim"
                }
              >
                <td>T{node.tier}</td>
                <td>
                  <span className="proto-node-name">{node.name}</span>
                  {showTeam === node.id && <ResearchTeam nodeId={node.id} />}
                </td>
                <td>
                  <span className={`proto-scope-badge ${scope}`} title={SCOPE_DESC[scope]}>
                    {SCOPE_ICON[scope]} {SCOPE_LABEL[scope]}
                  </span>
                </td>
                <td className="proto-sub">{node.effect}</td>
                <td className="proto-sub">
                  {Object.entries(node.cost)
                    .map(([k, v]) => `${k}×${v}`)
                    .join(" ")}
                </td>
                <td>{status}</td>
                <td>
                  {!unlocked && av.ok && !isResearching && (
                    <button onClick={() => beginResearch(node.id)}>
                      研究{rate.teamBonus > 0 && rate.canDelegate
                        ? ` ×${rate.rate.toFixed(2)}`
                        : ""}
                    </button>
                  )}
                  {rate.canDelegate && (
                    <button
                      className="proto-mini"
                      onClick={() => setShowTeam(showTeam === node.id ? null : node.id)}
                      title="查看科研人员"
                    >
                      {showTeam === node.id ? "收起" : "科研"}
                    </button>
                  )}
                  {cheat.enabled && !unlocked && (
                    <button className="proto-mini" onClick={() => forceComplete(node.id)}>
                      秒完成
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
