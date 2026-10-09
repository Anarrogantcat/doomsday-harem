import type { GameTime, TimeSlot } from "./types.ts";
import { slotOf } from "./types.ts";

export const MINUTES_PER_DAY = 1440;

export function makeTime(day = 1, minute = 8 * 60): GameTime {
  return { day, minute };
}

export function advance(t: GameTime, minutes: number): GameTime {
  let total = t.day * MINUTES_PER_DAY + t.minute + minutes;
  const day = Math.floor(total / MINUTES_PER_DAY);
  const minute = total % MINUTES_PER_DAY;
  return { day, minute };
}

export function slot(t: GameTime): TimeSlot {
  return slotOf(t.minute);
}

export function formatTime(t: GameTime): string {
  const h = Math.floor(t.minute / 60);
  const m = t.minute % 60;
  return `第${t.day}天 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isNight(t: GameTime): boolean {
  const s = slot(t);
  return s === "night" || s === "lateNight" || s === "dawn";
}
