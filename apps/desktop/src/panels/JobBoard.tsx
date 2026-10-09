import { JOB_LABEL, ALL_JOBS, type JobId } from "@doomsday/core";
import { useGame } from "../store/game.ts";

/** 各岗位的推荐加成（与设计文档一致） */
const DEFAULT_BONUS: Record<JobId, number> = {
  lab: 0.35, medical: 0.40, kitchen: 0.25, greenhouse: 0.15, craft: 0.35,
  patrol: 0.30, drive: 0.15, logistics: 0.20, morale: 0.30, archive: 0.20, training: 0.25
};

export function JobBoard() {
  const session = useGame((s) => s.session);
  const version = useGame((s) => s.version);
  const setJob = useGame((s) => s.setJob);
  void version;

  const companions = session.joined();
  const groups = new Map<string, typeof companions>();
  for (const c of companions) {
    const key = c.job.id ?? "unassigned";
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }

  const assigned = companions.filter((c) => c.job.id !== null).length;

  return (
    <section className="panel">
      <h2>
        基地岗位分配　<span className="sub">已分配 {assigned} / {companions.length}</span>
      </h2>

      <div className="jobgrid">
        {ALL_JOBS.map((job) => {
          const members = groups.get(job) ?? [];
          const total = members.reduce((s, c) => s + c.job.bonus, 0);
          return (
            <div key={job} className="jobcard">
              <h3>
                {JOB_LABEL[job]}
                {total > 0 && <span className="sub"> +{Math.round(total * 100)}%</span>}
              </h3>
              <ul>
                {members.length === 0 && <li className="sub">（空位）</li>}
                {members.map((m) => (
                  <li key={m.id}>
                    {m.identity.name}
                    <span className="sub"> +{Math.round(m.job.bonus * 100)}%</span>
                    <button onClick={() => setJob(m.id, null)}>撤下</button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <h3>未分配</h3>
      <div className="controls">
        {companions.filter((c) => c.job.id === null).map((c) => (
          <span key={c.id} className="sub">{c.identity.name}</span>
        ))}
        {companions.every((c) => c.job.id !== null) && <span className="sub">（无）</span>}
      </div>

      <h3>调岗</h3>
      <table className="grid">
        <thead>
          <tr><th>角色</th><th>当前岗位</th><th>改为</th></tr>
        </thead>
        <tbody>
          {companions.map((c) => (
            <tr key={c.id}>
              <td>{c.identity.name}</td>
              <td>{c.job.id ? JOB_LABEL[c.job.id] : "空闲"}</td>
              <td>
                <select
                  value={c.job.id ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) setJob(c.id, null);
                    else setJob(c.id, v as JobId, DEFAULT_BONUS[v as JobId]);
                  }}
                >
                  <option value="">空闲</option>
                  {ALL_JOBS.map((j) => (
                    <option key={j} value={j}>{JOB_LABEL[j]}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="hint">
        同岗位加成累加。实验室岗位直接加速科技研究，其他岗位影响后续系统。
        长期在岗会产生疲劳，效率逐日衰减。
      </p>
    </section>
  );
}
