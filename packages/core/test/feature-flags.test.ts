import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURE_FLAGS, FLAG_CATEGORY_LABEL, flagDef, flagsByCategory,
  defaultFlags, mergeFlags, isFlagOn, shadowedFlags, setFlag, setFlags,
  enableAll, resetFlags, flagsForLaw, flagStats,
  flagsToJSON, flagsFromJSON, FLAGS_FORMAT_VERSION,
  loadFlags, saveFlags,
  type FlagState
} from "../src/systems/featureFlags.ts";

test("开关表非空且 key 唯一", () => {
  assert.ok(FEATURE_FLAGS.length >= 20);
  const keys = FEATURE_FLAGS.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length, "key 不可重复");
});

test("所有 key 带 dh- 前缀（与既有约定一致）", () => {
  for (const f of FEATURE_FLAGS) {
    assert.match(f.key, /^dh-/, f.key + " 缺少 dh- 前缀");
  }
});

test("每条开关字段完整", () => {
  for (const f of FEATURE_FLAGS) {
    assert.ok(f.name, f.key + " 缺 name");
    assert.ok(f.desc, f.key + " 缺 desc");
    assert.ok(FLAG_CATEGORY_LABEL[f.category], f.key + " 分类无效");
    assert.equal(typeof f.def, "boolean", f.key + " def 必须为布尔");
  }
});

test("requires 指向的父键必须存在", () => {
  for (const f of FEATURE_FLAGS) {
    for (const p of f.requires ?? []) {
      assert.ok(flagDef(p), `${f.key} 依赖不存在的 ${p}`);
    }
  }
});

test("依赖链无环", () => {
  for (const f of FEATURE_FLAGS) {
    const seen = new Set<string>([f.key]);
    let cur = f.requires ?? [];
    let guard = 0;
    while (cur.length > 0 && guard++ < 50) {
      const next: string[] = [];
      for (const p of cur) {
        assert.ok(!seen.has(p), `依赖成环：${f.key} → ${p}`);
        seen.add(p);
        next.push(...(flagDef(p)?.requires ?? []));
      }
      cur = next;
    }
  }
});

test("laws 字段指向的铁律必须存在于注册表", async () => {
  const { lawDef } = await import("../src/systems/laws.ts");
  for (const f of FEATURE_FLAGS) {
    for (const l of f.laws ?? []) {
      // INV-5 / S-11 这类非 L 编号不校验
      if (/^[A-Z]{3,}-d+$/.test(l) || /^[A-Z]-d+$/.test(l)) {
        if (l.startsWith("L-")) assert.ok(lawDef(l), `${f.key} 引用不存在的铁律 ${l}`);
      }
    }
  }
});

test("defaultFlags 覆盖全部键", () => {
  const d = defaultFlags();
  assert.equal(Object.keys(d).length, FEATURE_FLAGS.length);
});

test("mergeFlags：补全缺失键，保留已存在值", () => {
  const merged = mergeFlags({ "dh-nsfw": false, "dh-tts": true });
  assert.equal(merged["dh-nsfw"], false, "已存在的值应保留");
  assert.equal(merged["dh-tts"], true);
  assert.equal(Object.keys(merged).length, FEATURE_FLAGS.length);
});

test("mergeFlags：null 得到默认值", () => {
  assert.deepEqual(mergeFlags(null), defaultFlags());
});

test("isFlagOn：总开关关闭时子项全灭", () => {
  let s = defaultFlags();
  s = setFlag(s, "dh-nsfw", false);
  assert.equal(isFlagOn(s, "dh-nsfw-marks"), false, "淫纹随总开关关闭");
  assert.equal(isFlagOn(s, "dh-nsfw-training"), false, "调教随总开关关闭");
  assert.equal(isFlagOn(s, "dh-nsfw"), false);
  // 但底层数据没有被改写
  assert.equal(s["dh-nsfw-marks"], true, "底层数据应保留，仅读取时求值");
});

test("isFlagOn：父项恢复后子项自动恢复", () => {
  let s = defaultFlags();
  s = setFlag(s, "dh-nsfw", false);
  assert.equal(isFlagOn(s, "dh-nsfw-marks"), false);
  s = setFlag(s, "dh-nsfw", true);
  assert.equal(isFlagOn(s, "dh-nsfw-marks"), true, "父项恢复后子项应自动恢复");
});

test("isFlagOn：三级依赖", () => {
  let s = defaultFlags();
  s = setFlag(s, "dh-nsfw-enemy", false);
  assert.equal(isFlagOn(s, "dh-nsfw-enemy-preg"), false);
  s = setFlag(s, "dh-nsfw-enemy", true);
  assert.equal(isFlagOn(s, "dh-nsfw-enemy-preg"), true);
});

test("isFlagOn：未知 key 返回 false", () => {
  assert.equal(isFlagOn(defaultFlags(), "dh-nope"), false);
});

test("shadowedFlags：列出被父项遮住的开关", () => {
  let s = defaultFlags();
  assert.deepEqual(shadowedFlags(s), []);
  s = setFlag(s, "dh-nsfw", false);
  const sh = shadowedFlags(s);
  assert.ok(sh.includes("dh-nsfw-marks"));
  assert.ok(sh.includes("dh-nsfw-training"));
  assert.ok(!sh.includes("dh-nsfw"), "父项自身不算被遮");
});

test("setFlag：未知 key 不改动", () => {
  const s = defaultFlags();
  assert.deepEqual(setFlag(s, "dh-nope", true), s);
});

test("setFlag 不可变", () => {
  const s = defaultFlags();
  const s2 = setFlag(s, "dh-tts", true);
  assert.equal(s["dh-tts"], false, "原对象不得被修改");
  assert.equal(s2["dh-tts"], true);
});

test("enableAll / resetFlags", () => {
  const all = enableAll(defaultFlags());
  for (const f of FEATURE_FLAGS) {
    assert.equal(all[f.key], true, f.key + " 应被开启");
  }
  assert.deepEqual(resetFlags(), defaultFlags());
});

test("flagsForLaw：按铁律查出关联开关", () => {
  const l15 = flagsForLaw("L-15");
  assert.ok(l15.some((f) => f.key === "dh-nsfw-marks"));
  const l7 = flagsForLaw("L-7");
  assert.ok(l7.some((f) => f.key === "dh-nsfw-enemy"));
  assert.deepEqual(flagsForLaw("L-99"), []);
});

test("flagStats 统计正确", () => {
  const s = defaultFlags();
  const st = flagStats(s);
  assert.equal(st.total, FEATURE_FLAGS.length);
  assert.equal(st.on + st.off, st.total);
  assert.equal(st.shadowed, 0);
  const sum = Object.values(st.byCategory).reduce((a, c) => a + c.total, 0);
  assert.equal(sum, st.total);
});

test("flagStats：关闭总开关后 shadowed 增加", () => {
  const st = flagStats(setFlag(defaultFlags(), "dh-nsfw", false));
  assert.ok(st.shadowed > 0);
  assert.ok(st.on < FEATURE_FLAGS.length);
});

test("JSON 往返无损", () => {
  const s = setFlags(defaultFlags(), { "dh-nsfw": false, "dh-tts": true, "dh-fog": false });
  const back = flagsFromJSON(flagsToJSON(s));
  assert.deepEqual(back, s);
});

test("JSON 往返：版本不符回落默认", () => {
  const j = flagsToJSON(defaultFlags());
  assert.deepEqual(flagsFromJSON({ v: 99, on: j.on }), defaultFlags());
  assert.deepEqual(flagsFromJSON(null), defaultFlags());
});

test("JSON 往返：带依赖求值一致", () => {
  const s = setFlag(defaultFlags(), "dh-nsfw", false);
  const back = flagsFromJSON(flagsToJSON(s));
  assert.equal(isFlagOn(back, "dh-nsfw-marks"), isFlagOn(s, "dh-nsfw-marks"));
});

test("loadFlags / saveFlags：内存 storage 往返", () => {
  const mem = new Map<string, string>();
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); }
  };
  const s = setFlags(defaultFlags(), { "dh-nsfw": false, "dh-audio-bgm": true });
  saveFlags(storage, s);
  const back = loadFlags(storage);
  assert.equal(back["dh-nsfw"], false);
  assert.equal(back["dh-audio-bgm"], true);
  assert.equal(Object.keys(back).length, FEATURE_FLAGS.length);
});

test("loadFlags：空 storage 得到默认值", () => {
  const storage = { getItem: () => null, setItem: () => {} };
  assert.deepEqual(loadFlags(storage), defaultFlags());
});

test("既有键保持兼容（dh-inputbar）", () => {
  assert.ok(flagDef("dh-inputbar"), "v0.51.0 的输入栏开关必须保留");
  assert.equal(flagDef("dh-inputbar")?.def, true);
});

test("淫纹开关存在且默认开（L-15 裁决：可关）", () => {
  const f = flagDef("dh-nsfw-marks");
  assert.ok(f);
  assert.equal(f.def, true);
  assert.ok(f.requires?.includes("dh-nsfw"));
});
