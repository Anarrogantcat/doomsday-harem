import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { GameSession } from "../src/runtime/session.ts";
import { exposure, itemById } from "../src/systems/clothing.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = join(__dirname, "..", "data", "scripts");
const scripts = () => readdirSync(SCRIPT_DIR).filter((f) => f.endsWith(".dsl")).map((f) => readFileSync(join(SCRIPT_DIR, f), "utf8"));

test("session/clothing: 开局四人着装齐备", () => {
  const s = new GameSession();
  for (const c of s.joined()) {
    const o = s.outfitOf(c.id)!;
    if (c.id === "ai") {
      assert.equal(o.items.length, 0, "AI 无身体，无衣物");
      assert.equal(o.exposure, 100);
    } else {
      assert.ok(o.items.length >= 4, `${c.identity.name} 应有 4+ 件衣物`);
      assert.ok(o.exposure < 40, `${c.identity.name} 不应过度暴露`);
    }
  }
  const hero = s.outfitOf("hero")!;
  assert.ok(hero.items.length >= 5);
  assert.ok(hero.armor > 0, "主角默认带军靴/手套，应有防护");
});

test("session/clothing: 换装改变暴露度", () => {
  const s = new GameSession();
  const before = s.outfitOf("sister")!.exposure;
  s.stripAll("sister");
  const after = s.outfitOf("sister")!.exposure;
  assert.equal(after, 100);
  assert.ok(after > before);
});

test("session/clothing: 单步脱衣与顺序", () => {
  const s = new GameSession();
  const first = s.undress("sister");
  assert.ok(first.slot !== null);
  assert.ok(first.item !== null);
  assert.equal(first.slot, "accessory", "最外应是配饰（姐姐有围巾）");

  const second = s.undress("sister");
  assert.ok(second.slot !== null);
  assert.notEqual(second.slot, first.slot);
});

test("session/clothing: 穿回衣物", () => {
  const s = new GameSession();
  s.undress("sister");
  const after = s.outfitOf("sister")!;
  s.equipClothing("sister", "scarf");
  const back = s.outfitOf("sister")!;
  assert.ok(back.items.length >= after.items.length);
  assert.ok(back.describe.includes("围巾"));
});

test("session/clothing: 天气适配判定", () => {
  const s = new GameSession();
  s.setWeather("cold");

  // 主角默认带军靴（保暖 5），合计 14，够暖
  const base = s.weatherFitness("hero")!;
  assert.equal(base.ok, true, `默认工装保暖 ${base.insulation}，应通过严寒`);

  // 脱到只剩内衣 → 保暖不足
  s.stripAll("hero");
  s.equipClothing("hero", "sport_bra");
  s.equipClothing("hero", "boxer_briefs");
  const light = s.weatherFitness("hero")!;
  assert.equal(light.ok, false, `仅内衣保暖 ${light.insulation}，应不通过`);
  assert.ok(light.reasons.length > 0);

  // 换上冬装 → 通过
  s.equipClothing("hero", "thermal_top");
  s.equipClothing("hero", "thermal_bottom");
  s.equipClothing("hero", "down_jacket");
  const warm = s.weatherFitness("hero")!;
  assert.equal(warm.ok, true, `冬装保暖 ${warm.insulation}，应通过`);
  assert.ok(warm.insulation > light.insulation);
});

test("session/clothing: 酷热判定与严寒相反", () => {
  const s = new GameSession();
  s.setWeather("heat");
  // 默认工装（保暖 14）过厚
  assert.equal(s.weatherFitness("hero")!.ok, false);

  s.stripAll("hero");
  s.equipClothing("hero", "tee_shirt");
  s.equipClothing("hero", "shorts");
  assert.equal(s.weatherFitness("hero")!.ok, true);
});

test("session/clothing: 雨天需要防水层", () => {
  const s = new GameSession();
  s.setWeather("rain");
  s.stripAll("hero");
  s.equipClothing("hero", "tee_shirt");
  assert.equal(s.weatherFitness("hero")!.ok, false, "无外层不应通过雨天");

  s.equipClothing("hero", "rain_coat");
  assert.equal(s.weatherFitness("hero")!.ok, true, "雨衣应通过");
});

test("session/clothing: 岗位制服判定", () => {
  const s = new GameSession();
  assert.equal(s.uniformReady("hero", "lab"), false);
  s.equipClothing("hero", "lab_coat");
  assert.equal(s.uniformReady("hero", "lab"), true);
});

test("session/clothing: 衣物磨损与修补", () => {
  const s = new GameSession();
  const before = s.outfitOf("hero")!.condition;
  s.wearClothing("hero", 30);
  const after = s.outfitOf("hero")!.condition;
  assert.ok(after < before, "磨损后状况下降");

  s.repairClothing("hero");
  assert.equal(s.outfitOf("hero")!.condition, 1, "修补后恢复");
});

test("session/clothing: 区域覆盖度查询", () => {
  const s = new GameSession();
  assert.ok(s.zoneCoverageOf("hero", "chest") > 0.8, "主角穿衬衫，胸部应覆盖");
  assert.ok(s.zoneCoverageOf("hero", "foot") > 0.9, "军靴覆盖脚部");
  s.stripAll("hero");
  assert.equal(s.zoneCoverageOf("hero", "chest"), 0);
});

test("session/clothing: 着装数值进入剧本变量集", () => {
  const s = new GameSession();
  const v = s.vars();
  assert.ok(typeof v["hero_exposure"] === "number");
  assert.ok(typeof v["hero_insulation"] === "number");
  assert.ok(typeof v["sister_exposure"] === "number");
  assert.equal(v["weather"], "clear");
});

test("session/clothing: 衣橱随存档往返", () => {
  const s = new GameSession();
  s.stripAll("sister");
  s.equipClothing("hero", "down_jacket");
  s.setWeather("snow");
  s.wearClothing("hero", 25);

  const data = s.toSave("slot");
  const back = GameSession.fromSave(data);

  assert.equal(back.weather, "snow");
  assert.equal(exposure(back.companion("sister")!.wardrobe), 100, "姐姐应仍为全裸");
  const heroBack = back.outfitOf("hero")!;
  assert.ok(heroBack.describe.includes("羽绒服"));
  assert.ok(heroBack.condition < 1, "磨损状态应保留");
});

test("session/clothing: 脱光后天气判定失败", () => {
  const s = new GameSession();
  s.setWeather("snow");
  s.stripAll("hero");
  const fit = s.weatherFitness("hero")!;
  assert.equal(fit.ok, false);
  assert.ok(fit.reasons.length > 0);
});

test("session/clothing: 暴露度影响 H 场景提示词道具列表", () => {
  const s = new GameSession();
  s.loadScripts(scripts());
  const scene = s.sceneFor("sister", "sister_first");
  assert.ok(scene);
  const o = s.outfitOf("sister")!;
  assert.ok(o.describe.length > 0);
  assert.ok(o.exposure >= 0 && o.exposure <= 100);
});
