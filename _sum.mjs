import { BRANCHES } from "./packages/core/src/tech/branches.ts";
import { DRONE_DEFS } from "./packages/core/src/systems/droneCombat.ts";
import { ALL_MAPS, MAIN_MAPS } from "./packages/core/src/systems/maps.ts";

let tech = 0;
const br = [];
for (const b of BRANCHES) { tech += b.nodes.length; br.push(b.name + " " + b.nodes.length); }
console.log("科技树: " + tech + " 节点");
console.log("  " + br.join(" / "));
console.log("");
let cells = 0;
for (const m of ALL_MAPS) cells += m.cells.length;
console.log("地图: " + ALL_MAPS.length + " 张，共 " + cells + " 格");
for (const m of ALL_MAPS) console.log("  " + m.name + " " + m.cols + "x" + m.rows + " = " + m.cells.length);
console.log("");
console.log("无人机: " + DRONE_DEFS.length + " 种");
