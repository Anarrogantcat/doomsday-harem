import { create } from "zustand";
import {
  World, DEFAULT_RELATIONSHIP, DEFAULT_LUST,
  effectsFor, saveBadge, DEFAULT_CHEAT,
  newTechState, unlock as techUnlock, unlockBranchToTier, unlockAll as techUnlockAll,
  type CheatOptions, type CheatEffects, type TechState,
  type Relationship, type Lust, type Survival, type BranchId,
} from "@doomsday/core";

export interface CompanionState {
  id: string;
  name: string;
  title: string;
  relationship: Relationship;
  lust: Lust;
  jobId: string | null;
  jobBonus: number;
}

export interface GameState {
  world: World;
  day: number;
  minute: number;
  hero: { survival: Survival; identity: { name: string; title: string; heightCm: number } };
  companions: CompanionState[];
  tech: TechState;
  cheat: CheatOptions;
  setCheat: (patch: Partial<CheatOptions>) => void;
  cheatEffects: () => CheatEffects | null;
  cheatBadge: () => string | null;
  satisfyCompanion: (id: string) => void;
  unlockTech: (id: string) => void;
  unlockBranch: (branch: BranchId, tier: number) => void;
  unlockEverything: () => void;
  techFx: () => CheatEffects | null;
}

const world = new World();
world.create("hero");

const seed: CompanionState[] = [
  { id: "mother", name: "母亲", title: "单亲母亲", relationship: { ...DEFAULT_RELATIONSHIP, affection: 50, loyalty: 40, bond: 3, role: "family" }, lust: { ...DEFAULT_LUST, value: 40 }, jobId: "kitchen", jobBonus: 0.2 },
  { id: "sister", name: "姐姐", title: "项目经理", relationship: { ...DEFAULT_RELATIONSHIP, affection: 60, loyalty: 50, bond: 3, role: "family" }, lust: { ...DEFAULT_LUST, value: 92, daysSinceIntimacy: 11 }, jobId: "logistics", jobBonus: 0.15 },
  { id: "sister2", name: "妹妹", title: "大学生", relationship: { ...DEFAULT_RELATIONSHIP, affection: 40, loyalty: 30, bond: 2, role: "family" }, lust: { ...DEFAULT_LUST, value: 85, daysSinceIntimacy: 8 }, jobId: "greenhouse", jobBonus: 0.1 },
  { id: "ai", name: "特殊AI", title: "基地核心", relationship: { ...DEFAULT_RELATIONSHIP, affection: 85, loyalty: 80, bond: 4, role: "ai" }, lust: { ...DEFAULT_LUST, value: 30 }, jobId: "archive", jobBonus: 0.2 }
];

export const useGame = create<GameState>((set, get) => ({
  world,
  day: 1,
  minute: 22 * 60,
  hero: {
    survival: { hunger: 80, thirst: 70, stamina: 90, energy: 85, mood: 60 },
    identity: { name: "主角", title: "扶她御姐", heightCm: 178 }
  },
  companions: seed,
  tech: newTechState(),

  setCheat: (patch) => set((s) => ({ cheat: { ...s.cheat, ...patch } })),
  cheatEffects: () => effectsFor(get().cheat),
  cheatBadge: () => saveBadge(get().cheat),
  techFx: () => effectsFor(get().cheat),

  satisfyCompanion: (id) =>
    set((s) => ({
      companions: s.companions.map((c) =>
        c.id === id
          ? {
              ...c,
              relationship: {
                ...c.relationship,
                affection: Math.min(100, c.relationship.affection + 3),
                loyalty: Math.min(100, c.relationship.loyalty + 2)
              },
              lust: { ...c.lust, value: 0, daysSinceIntimacy: 0, forced: false }
            }
          : c
      )
    })),

  unlockTech: (id) => set((s) => ({ tech: techUnlock(s.tech, id) })),
  unlockBranch: (branch, tier) => set((s) => ({ tech: unlockBranchToTier(s.tech, branch, tier) })),
  unlockEverything: () => set((s) => ({ tech: techUnlockAll(s.tech) }))
}));

export { DEFAULT_CHEAT };
