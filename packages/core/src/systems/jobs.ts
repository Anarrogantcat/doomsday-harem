import type { Job, JobId } from "../components.ts";

export const JOB_LABEL: Record<JobId, string> = {
  lab: "实验室研究",
  medical: "医疗护理",
  kitchen: "厨房伙食",
  greenhouse: "温室种植",
  craft: "装备加工",
  patrol: "巡逻警戒",
  drive: "远征驾驶",
  logistics: "资源统筹",
  morale: "士气与娱乐",
  archive: "档案与知识",
  training: "训练教官"
};

export const ALL_JOBS = Object.keys(JOB_LABEL) as JobId[];

export interface JobAssignment {
  entityId: string;
  job: JobId;
}

/**
 * 岗位效率计算：
 *  base 为该角色专精加成，fatigue 为连续在岗惩罚（超过 7 天开始衰减）。
 */
export function jobEfficiency(job: Job): number {
  const fatigue = job.daysOnJob <= 7 ? 1 : Math.max(0.5, 1 - (job.daysOnJob - 7) * 0.05);
  return job.bonus * fatigue;
}

export function tickJob(job: Job, days: number): Job {
  return { ...job, daysOnJob: job.daysOnJob + days };
}

export function reassign(job: Job, next: JobId | null): Job {
  return { ...job, id: next, daysOnJob: 0 };
}

/** 汇总某岗位的总加成 */
export function totalBonus(assignments: Array<{ entityId: string; job: Job; }>, jobId: JobId): number {
  return assignments
    .filter((a) => a.job.id === jobId)
    .reduce((sum, a) => sum + jobEfficiency(a.job), 0);
}
