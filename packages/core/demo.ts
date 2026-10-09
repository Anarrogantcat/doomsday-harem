import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { World } from "./src/ecs.ts";
import { formatTime, advance } from "./src/time.ts";
import { tickSurvival } from "./src/systems/survival.ts";
import { tickLust, DEFAULT_RELATIONSHIP, DEFAULT_LUST } from "./src/systems/relationship.ts";
import { renderScene, type Scene } from "./src/text/engine.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scene: Scene = JSON.parse(
  readFileSync(join(__dirname, "data", "scenes", "sister_first.json"), "utf8")
);

const world = new World();
world.create("hero");
world.create("sister");
world.create("mother");
world.create("sister2");

world.add("hero", "survival", { hunger: 80, thirst: 70, stamina: 90, energy: 85, mood: 60 });
world.add("hero", "identity", { name: "主角", title: "扶她御姐", age: 28, heightCm: 178, tags: ["futanari"] });
world.add("sister", "relationship", { ...DEFAULT_RELATIONSHIP, affection: 60, bond: 3, role: "family" });
world.add("sister", "lust", { ...DEFAULT_LUST, value: 92, daysSinceIntimacy: 11 });

let t = { day: 1, minute: 22 * 60 };
console.log("== 状态 ==");
console.log(formatTime(t), "主角:", world.get("hero", "identity"));
const l = world.get<{value:number;daysSinceIntimacy:number;forced:boolean}>("sister", "lust");
console.log("姐姐欲情:", l.value, "冷落天数:", l.daysSinceIntimacy);
const stage = tickLust(l, 0, 0).stage;
console.log("触发阶段:", stage);

t = advance(t, 120);
console.log("两小时后:", formatTime(t));
console.log("生存:", tickSurvival(world.get("hero", "survival"), 2, "idle"));

console.log("\n== 场景文本（详细）==");
console.log(renderScene(scene, { detail: "detailed", showLayerTags: false }));
