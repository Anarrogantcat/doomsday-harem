import { JOB_LABEL, type JobId } from "@doomsday/core";
import { useGame } from "../store/game.ts";

export function JobBoard() {
  const { companions } = useGame();
  const groups = new Map<string, typeof companions>();
  for (const c of companions) {
    const key = c.jobId ?? "unassigned";
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }

  return (
    <section className="panel">
      <h2>基地岗位分配</h2>
      <div className="jobgrid">
        {[...groups.entries()].map(([job, members]) => (
          <div key={job} className="jobcard">
            <h3>{job === "unassigned" ? "未分配" : JOB_LABEL[job as JobId]}</h3>
            <ul>
              {members.map((m) => (
                <li key={m.id}>{m.name} <span className="sub">+{Math.round(m.jobBonus * 100)}%</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
