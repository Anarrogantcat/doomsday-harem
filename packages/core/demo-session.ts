/**
 * 端到端演示 —— 验证 GameSession 把所有系统真正串起来。
 *   node packages/core/demo-session.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GameSession } from "./src/runtime/session.ts";
import { renderScene } from "./src/text/engine.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(__dirname, "data", "scripts");

function allScripts(): string[] {
  return readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl"))
    .map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8"));
}

const bar = (s: string) => console.log("\n" + "=".repeat(64) + "\n" + s + "\n" + "=".repeat(64));
const scenesOf = (s: GameSession) => s.availableScenes();

const s = new GameSession({ resources: { "铜线": 40, "磁铁": 20, "水泥": 60, "钢筋": 40 } });
s.loadScripts(allScripts());

bar("开局");
const sum = s.summary();
console.log(`时间：${sum.time}（${sum.slot}）`);
console.log(`主角：${s.hero.identity.name} / ${s.hero.identity.title} / ${s.hero.identity.heightCm}cm / ${s.hero.physiology.sex}`);
console.log(`生存：饥饿 ${s.hero.survival.hunger.toFixed(0)}　口渴 ${s.hero.survival.thirst.toFixed(0)}　体力 ${s.hero.survival.stamina.toFixed(0)}`);
for (const c of s.joined()) {
  console.log(`同伴：${c.identity.name.padEnd(6)} 好感${String(c.relationship.affection).padStart(3)} 羁绊Lv${c.relationship.bond} 欲情${String(c.lust.value).padStart(3)} 冷落${c.lust.daysSinceIntimacy}天`);
}
console.log(`科技：${sum.techUnlocked} / ${sum.techTotal} 节点`);

bar("推进时间：工作 8 小时");
const out = s.advance(8, "work");
console.log(`→ ${s.summary().time}`);
console.log(`生存：饥饿 ${s.hero.survival.hunger.toFixed(1)}　体力 ${s.hero.survival.stamina.toFixed(1)}`);
console.log(`警告：${out.warnings.length ? out.warnings.join("；") : "无"}`);

bar("科技：开始研究「电力基础」");
console.log(`资源前：${Object.entries(s.resources).map(([k, v]) => `${k}×${v}`).join("　")}`);
const r = s.beginResearch("shelter_power");
console.log(`开始研究：${r.ok ? "成功（资源已扣除）" : "失败（" + r.reason + "）"}`);
console.log(`资源后：${Object.entries(s.resources).map(([k, v]) => `${k}×${v}`).join("　")}`);
s.advance(5, "work");
console.log(`推进 5 小时：${s.has("shelter_power") ? "已完成 ✓" : "研究中"}`);

console.log("\n继续研究「加固结构」（需前置）");
s.forceComplete("shelter_power");
const r2 = s.beginResearch("shelter_reinforce");
console.log(`${r2.ok ? "成功" : "失败：" + r2.reason}`);
s.advance(10, "work");
console.log(`加成生效：${JSON.stringify(s.bonuses())}`);

bar("科技树进度");
for (const b of s.techProgress()) {
  const filled = Math.round(b.percent / 5);
  console.log(`${b.name.padEnd(12)} ${"█".repeat(filled)}${"░".repeat(20 - filled)} ${b.unlocked}/${b.total}`);
}

bar("场景解锁 —— 条件驱动的实时筛选");
const listScenes = (label: string) => {
  const sc = scenesOf(s);
  console.log(`\n【${label}】可触发 ${sc.length} 个：`);
  for (const x of sc) console.log(`  · ${x.title.padEnd(18)} [${x.participants.join(" × ")}]　${x.beats.length} 节拍`);
};
listScenes("开局状态");

console.log("\n→ 与姐姐亲密（触发破处标记）");
s.satisfyCompanion("sister", "active");
s.setFlag("sister_first_done", true);
listScenes("破处后");

console.log("\n→ 提升母亲好感至 80");
s.gainAffection("mother", 30, 20);
listScenes("母亲好感提升后");

console.log("\n→ 妹妹好感提升至 65");
s.gainAffection("sister2", 25, 10);
listScenes("妹妹好感提升后");

console.log("\n→ 让姐姐冷落 12 天（欲情将达夜袭阈值）");
s.companion("sister")!.lust = { value: 92, daysSinceIntimacy: 12, forced: false };
listScenes("姐姐冷落后");

bar("渲染一场：姐姐互相破处（简洁档）");
// 破处场景要求 virgin，用独立会话演示
const fresh = new GameSession();
fresh.loadScripts(allScripts());
const sisterScene = fresh.sceneFor("sister", "sister_first");
if (sisterScene) console.log(renderScene(sisterScene, { detail: "brief", showLayerTags: false }));

bar("差分效果 —— 欲情高低改变同一节拍的文本量");
const highLust = new GameSession();
highLust.loadScripts(allScripts());
highLust.companion("sister")!.lust = { value: 92, daysSinceIntimacy: 0, forced: false };
const bHigh = highLust.sceneFor("sister", "sister_first")?.beats.find((b) => b.id === "b2");
const highLines = bHigh?.lines.length ?? 0;

const lowLust = new GameSession();
lowLust.loadScripts(allScripts());
lowLust.companion("sister")!.lust = { value: 40, daysSinceIntimacy: 0, forced: false };
const bLow = lowLust.sceneFor("sister", "sister_first")?.beats.find((b) => b.id === "b2");
const lowLines = bLow?.lines.length ?? 0;

console.log(`欲情 92（>80）时 b2 节拍：${highLines} 行`);
console.log(`欲情 40 时 b2 节拍：${lowLines} 行`);
console.log(`差分生效：${highLines > lowLines ? "✓" : "✗"}`);
if (bHigh) {
  console.log("\n高欲情版本的 b2 全部行：");
  for (const l of bHigh.lines) console.log(`  [${l.layer}] ${l.text}`);
}

bar("羁绊差分 —— bond >= 4 追加台词");
const highBond = new GameSession();
highBond.loadScripts(allScripts());
highBond.companion("sister")!.relationship = { ...highBond.companion("sister")!.relationship, bond: 5 };
highBond.companion("sister")!.lust = { value: 40, daysSinceIntimacy: 0, forced: false };
const b4 = highBond.sceneFor("sister", "sister_first")?.beats.find((b) => b.id === "b4");
console.log(`羁绊 Lv5 时 b4 节拍：${b4?.lines.length ?? 0} 行`);
if (b4) for (const l of b4.lines) console.log(`  [${l.layer}] ${l.text}`);

bar("关系：亲密 / 拒绝 / 夜袭");
const sis = s.companion("sister")!;
console.log(`亲密前：好感 ${sis.relationship.affection}　忠诚 ${sis.relationship.loyalty}　欲情 ${sis.lust.value}`);
s.satisfyCompanion("sister", "active");
console.log(`亲密后：好感 ${sis.relationship.affection}　忠诚 ${sis.relationship.loyalty}　欲情 ${sis.lust.value}`);
console.log(`处女：姐姐 ${sis.physiology.virgin ? "是" : "已破"}　主角 ${s.hero.physiology.virgin ? "是" : "已破"}`);

const mom = s.companion("mother")!;
const a0 = mom.relationship.affection, l0 = mom.lust.value;
s.refuseCompanion("mother");
console.log(`\n拒绝母亲：好感 ${a0} → ${mom.relationship.affection}（不变）　欲情 ${l0} → ${mom.lust.value}（+10）`);

s.companion("sister2")!.lust = { value: 95, daysSinceIntimacy: 11, forced: false };
console.log(`\n待夜袭：${s.pendingNightRaids().map((c) => c.identity.name).join("、")}`);
s.nightRaid("sister2");
console.log(`夜袭后妹妹欲情：${s.companion("sister2")!.lust.value}（无拒绝选项）`);

bar("岗位：实验室加速研究");
s.setJob("ai", "lab", 0.35);
for (const c of s.joined()) {
  console.log(`  ${c.identity.name.padEnd(8)} → ${(c.job.id ?? "空闲").padEnd(12)}${c.job.bonus ? "+" + Math.round(c.job.bonus * 100) + "%" : ""}`);
}

bar("怀孕 → 分娩（后代必为女性，INV-4）");
s.startHeroPregnancy("sister");
console.log(`怀孕开始（父方 sister），孕期 30 天`);
s.sleep(15);
console.log(`15 天后：进度 ${s.hero.pregnancy?.progress.toFixed(0)} / 30（${s.hero.pregnancy && s.hero.pregnancy.progress >= 11 ? "孕中期" : "孕早期"}）`);
s.sleep(16);
console.log(`分娩完成：后代 ${s.offspring.length} 人`);
for (const o of s.offspring) {
  console.log(`  · ${o.name}　性别 ${o.sex}　出生于第 ${o.bornDay} 天　成年日第 ${o.maturityDay} 天`);
}
console.log(`主角怀孕状态已清除：${s.hero.pregnancy === null ? "✓" : "✗"}`);

bar("存档往返");
const data = s.toSave("demo");
console.log(`存档：第 ${data.time.day} 天　${data.entities.length} 实体　${data.relations.length} 关系　${data.tech.length} 科技条目`);
const back = GameSession.fromSave(data);
console.log(`还原：第 ${back.time.day} 天　同伴 ${back.joined().length} 人　科技 ${back.tech.unlocked.size} 节点　后代 ${back.offspring.length} 人`);
console.log(`研究中状态：${back.tech.researching?.nodeId ?? "（无）"}`);
console.log(`一致性：${back.time.day === s.time.day && back.offspring.length === s.offspring.length ? "✓" : "✗"}`);

bar("最终摘要");
console.log(JSON.stringify(s.summary(), null, 2));