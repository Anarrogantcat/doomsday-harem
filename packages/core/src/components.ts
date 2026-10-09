import type { Ratio } from "./types.ts";

/** 生存属性（主角与同伴共用） */
export interface Survival {
  hunger: Ratio;
  thirst: Ratio;
  stamina: Ratio;
  energy: Ratio;
  mood: Ratio;
}

/** 欲情：只升不降，唯一出路是被满足 */
export interface Lust {
  value: Ratio;
  /** 距上次互动的游戏内天数 */
  daysSinceIntimacy: number;
  /** 是否已达强制触发 */
  forced: boolean;
}

/** 关系：主角 <-> 同伴 */
export interface Relationship {
  affection: Ratio;   // 只升不降
  loyalty: Ratio;     // 只升不降
  bond: 1 | 2 | 3 | 4 | 5;
  role: "family" | "main" | "side" | "ai";
}

/** 后宫两两亲密度 */
export interface Intimacy {
  /** key: 另一个实体 id */
  with: Record<string, Ratio>;
}

/** 性征与生理 */
export interface Physiology {
  sex: "futanari" | "female";
  virgin: boolean;
  pregnant: boolean;
  pregnancyProgress: number; // 0-30 天
  fertileWindow: boolean;
}

/** 岗位 */
export type JobId =
  | "lab" | "medical" | "kitchen" | "greenhouse" | "craft"
  | "patrol" | "drive" | "logistics" | "morale" | "archive" | "training";

export interface Job {
  id: JobId | null;
  /** 该岗位的效率加成（0.1 = +10%） */
  bonus: number;
  /** 连续在岗天数，用于疲劳 */
  daysOnJob: number;
}

/** 身份标签 */
export interface Identity {
  name: string;
  title: string;
  age: number;
  heightCm: number;
  tags: string[];
}

/** AI 特有 */
export interface AiCore {
  level: number;              // 2..10
  hasBody: boolean;
  hasProjection: boolean;
  possessesRobot: string | null;
}
