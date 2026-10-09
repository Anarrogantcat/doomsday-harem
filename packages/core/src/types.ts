// 基础类型：ID、时间、属性
export type EntityId = string;

/** 游戏内时间：天数从 1 开始，分钟为当天 0-1439 */
export interface GameTime {
  day: number;
  minute: number;
}

export type TimeSlot =
  | "dawn"      // 03:00-06:00 凌晨
  | "morning"   // 06:00-09:00 清晨
  | "forenoon"  // 09:00-12:00 上午
  | "noon"      // 12:00-15:00 午后
  | "evening"   // 15:00-19:00 傍晚
  | "night"     // 19:00-23:00 夜间
  | "lateNight"; // 23:00-03:00 深夜

export const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
  dawn: "凌晨",
  morning: "清晨",
  forenoon: "上午",
  noon: "午后",
  evening: "傍晚",
  night: "夜间",
  lateNight: "深夜"
};

export function slotOf(minute: number): TimeSlot {
  const h = Math.floor(minute / 60) % 24;
  if (h >= 3 && h < 6) return "dawn";
  if (h >= 6 && h < 9) return "morning";
  if (h >= 9 && h < 12) return "forenoon";
  if (h >= 12 && h < 15) return "noon";
  if (h >= 15 && h < 19) return "evening";
  if (h >= 19 && h < 23) return "night";
  return "lateNight";
}

/** 0-100 的钳制数值 */
export type Ratio = number;
export const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));
