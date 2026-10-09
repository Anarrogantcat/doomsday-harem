import { test } from "node:test";
import assert from "node:assert/strict";

import {
  newI18n, registerBundle, setLocale, t, missingKeys, bundleCoverage,
  defaultI18n, ZH_UI, EN_UI, JA_UI,
  LOCALE_LABEL, DEFAULT_LOCALE,
  type Locale, type TextBundle
} from "../src/i18n/index.ts";

// ============ 基础 ============

test("i18n: 默认状态", () => {
  const s = newI18n();
  assert.equal(s.locale, "zh-CN");
  assert.equal(s.fallback, "zh-CN");
  assert.deepEqual(s.bundles, {});
});

test("i18n: 注册与查表", () => {
  let s = newI18n();
  s = registerBundle(s, "zh-CN", { hello: "你好" });
  assert.equal(t(s, "hello"), "你好");
});

test("i18n: 缺失 key 回退到 fallback", () => {
  let s = newI18n("en-US");
  s = registerBundle(s, "zh-CN", { hello: "你好" });
  assert.equal(t(s, "hello"), "你好", "en 缺失应回退到 zh");
});

test("i18n: 全缺失时回退到 key 本身", () => {
  const s = newI18n();
  assert.equal(t(s, "nonexistent.key"), "nonexistent.key");
});

test("i18n: 切换语言", () => {
  let s = defaultI18n("zh-CN");
  assert.equal(t(s, "tab.harem"), "后宫");
  s = setLocale(s, "en-US");
  assert.equal(t(s, "tab.harem"), "Harem");
  s = setLocale(s, "ja-JP");
  assert.equal(t(s, "tab.harem"), "ハーレム");
});

test("i18n: 占位符替换", () => {
  const s = defaultI18n();
  assert.equal(t(s, "msg.saved", { slot: "manual1" }), "已保存到 manual1");
  assert.equal(t(s, "msg.nightRaid", { kind: "丧尸潮", outcome: "击退" }), "夜袭：丧尸潮（击退）");
});

test("i18n: 多次替换同一占位符", () => {
  let s = newI18n();
  s = registerBundle(s, "zh-CN", { test: "{x} 和 {x}" });
  assert.equal(t(s, "test", { x: "A" }), "A 和 A");
});

test("i18n: 未提供参数时保留占位符", () => {
  const s = defaultI18n();
  assert.equal(t(s, "msg.saved"), "已保存到 {slot}");
});

test("i18n: 数值参数被转字符串", () => {
  let s = newI18n();
  s = registerBundle(s, "zh-CN", { n: "第 {day} 天" });
  assert.equal(t(s, "n", { day: 42 }), "第 42 天");
});

// ============ 语言包完整性 ============

test("i18n: 三种语言都有内置包", () => {
  assert.ok(Object.keys(ZH_UI).length > 50);
  assert.ok(Object.keys(EN_UI).length > 50);
  assert.ok(Object.keys(JA_UI).length > 50);
});

test("i18n: 英文包无缺失", () => {
  const s = defaultI18n();
  const missing = missingKeys(s, "en-US");
  assert.deepEqual(missing, [], `英文缺失：${missing.join(", ")}`);
});

test("i18n: 日文包无缺失", () => {
  const s = defaultI18n();
  const missing = missingKeys(s, "ja-JP");
  assert.deepEqual(missing, [], `日文缺失：${missing.join(", ")}`);
});

test("i18n: 覆盖率 100%", () => {
  const s = defaultI18n();
  assert.equal(bundleCoverage(s, "en-US"), 1);
  assert.equal(bundleCoverage(s, "ja-JP"), 1);
});

test("i18n: 覆盖率计算", () => {
  let s = newI18n();
  s = registerBundle(s, "zh-CN", { a: "1", b: "2", c: "3", d: "4" });
  s = registerBundle(s, "en-US", { a: "1", b: "2" });
  assert.equal(bundleCoverage(s, "en-US"), 0.5);
});

test("i18n: 无参考包时覆盖率视为 1", () => {
  const s = newI18n();
  assert.equal(bundleCoverage(s, "en-US"), 1);
});

test("i18n: 语言标签完整", () => {
  for (const l of ["zh-CN", "en-US", "ja-JP"] as Locale[]) {
    assert.ok(LOCALE_LABEL[l], `缺少 ${l} 标签`);
  }
  assert.equal(DEFAULT_LOCALE, "zh-CN");
});

// ============ 内容一致性 ============

test("i18n: 三个语言包 key 集合一致", () => {
  const zhKeys = Object.keys(ZH_UI).sort();
  const enKeys = Object.keys(EN_UI).sort();
  const jaKeys = Object.keys(JA_UI).sort();
  assert.deepEqual(enKeys, zhKeys);
  assert.deepEqual(jaKeys, zhKeys);
});

test("i18n: 无空文案", () => {
  for (const [name, bundle] of [["zh", ZH_UI], ["en", EN_UI], ["ja", JA_UI]] as Array<[string, TextBundle]>) {
    for (const [k, v] of Object.entries(bundle)) {
      assert.ok(v.length > 0, `${name} 的 ${k} 为空`);
    }
  }
});

test("i18n: 占位符在三语言中一致", () => {
  const extract = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
  for (const k of Object.keys(ZH_UI)) {
    const zh = extract(ZH_UI[k]);
    if (zh.length === 0) continue;
    assert.deepEqual(extract(EN_UI[k]), zh, `${k} 英文占位符不一致`);
    assert.deepEqual(extract(JA_UI[k]), zh, `${k} 日文占位符不一致`);
  }
});

test("i18n: 性格标签三语言齐备", () => {
  const personalities = [
    "bold", "shy", "reserved", "warm", "proud",
    "devout", "artistic", "practical", "neutral", "ai"
  ];
  for (const p of personalities) {
    const key = `personality.${p}`;
    assert.ok(ZH_UI[key], `中文缺 ${key}`);
    assert.ok(EN_UI[key], `英文缺 ${key}`);
    assert.ok(JA_UI[key], `日文缺 ${key}`);
  }
});

test("i18n: 全部标签页有文案", () => {
  const tabs = [
    "status", "map", "canvas", "vehicle", "quests", "defense",
    "harem", "roster", "jobs", "tech", "base", "wardrobe",
    "items", "scenes", "llm", "save", "cheats"
  ];
  for (const tab of tabs) {
    const key = `tab.${tab}`;
    assert.ok(ZH_UI[key], `缺 ${key}`);
  }
});

test("i18n: 注册可增量合并", () => {
  let s = defaultI18n();
  s = registerBundle(s, "zh-CN", { "custom.new": "自定义" });
  assert.equal(t(s, "custom.new"), "自定义");
  assert.equal(t(s, "tab.harem"), "后宫", "原有文案不受影响");
});

test("i18n: 覆盖已有 key", () => {
  let s = defaultI18n();
  s = registerBundle(s, "zh-CN", { "tab.harem": "后宫们" });
  assert.equal(t(s, "tab.harem"), "后宫们");
});
