import { test } from "node:test";
import assert from "node:assert/strict";

import {
  StockIndex, emptyStore, entryKey, indexFromJson,
  type GeneratedStore, type GeneratedEntry
} from "../src/text/stock.ts";

function entry(over: Partial<GeneratedEntry> = {}): GeneratedEntry {
  return {
    key: "t__a",
    templateId: "t",
    companionIds: ["a"],
    location: "bedroom",
    time: "night",
    tier: "minor",
    text: "文本内容",
    beatCount: 5,
    chars: 400,
    model: "m",
    latencyMs: 20000,
    ...over
  };
}

function store(entries: GeneratedEntry[]): GeneratedStore {
  return { generatedAt: "2026-01-01T00:00:00Z", model: "m", entries };
}

test("stock: 空库存", () => {
  const idx = new StockIndex();
  assert.equal(idx.size, 0);
  assert.equal(idx.get("t", ["a"]), null);
  assert.equal(idx.meta.generatedAt, null);
});

test("stock: key 生成与脚本一致", () => {
  assert.equal(entryKey("morning_wake", ["sister"]), "morning_wake__sister");
  assert.equal(entryKey("bath_shared", ["mother", "sister"]), "bath_shared__mother+sister");
});

test("stock: 精确查找", () => {
  const idx = new StockIndex(store([entry({ key: "t__a", templateId: "t", companionIds: ["a"] })]));
  const hit = idx.get("t", ["a"]);
  assert.ok(hit);
  assert.equal(hit!.text, "文本内容");
});

test("stock: 未命中返回 null", () => {
  const idx = new StockIndex(store([entry()]));
  assert.equal(idx.get("other", ["a"]), null);
});

test("stock: 模糊查找（角色顺序不敏感）", () => {
  const idx = new StockIndex(store([
    entry({ key: "bath__mother+sister", templateId: "bath", companionIds: ["mother", "sister"] })
  ]));
  const hit = idx.find("bath", ["sister", "mother"]);
  assert.ok(hit, "顺序不同也应命中");
});

test("stock: 模糊查找（子集）", () => {
  const idx = new StockIndex(store([
    entry({ key: "bath__mother+sister", templateId: "bath", companionIds: ["mother", "sister"] })
  ]));
  const hit = idx.find("bath", ["sister"]);
  assert.ok(hit, "单人查询应命中多人条目");
});

test("stock: 模糊查找兜底", () => {
  const idx = new StockIndex(store([
    entry({ key: "bath__x", templateId: "bath", companionIds: ["x"] })
  ]));
  const hit = idx.find("bath", ["y"]);
  assert.ok(hit, "同模板应有兜底");
});

test("stock: 按角色索引", () => {
  const idx = new StockIndex(store([
    entry({ key: "t1__a", templateId: "t1", companionIds: ["a"] }),
    entry({ key: "t2__a+b", templateId: "t2", companionIds: ["a", "b"] }),
    entry({ key: "t3__b", templateId: "t3", companionIds: ["b"] })
  ]));
  assert.equal(idx.forCompanion("a").length, 2);
  assert.equal(idx.forCompanion("b").length, 2);
  assert.equal(idx.forCompanion("c").length, 0);
});

test("stock: 按模板索引", () => {
  const idx = new StockIndex(store([
    entry({ key: "t__a", templateId: "t", companionIds: ["a"] }),
    entry({ key: "t__b", templateId: "t", companionIds: ["b"] })
  ]));
  assert.equal(idx.forTemplate("t").length, 2);
  assert.equal(idx.forTemplate("x").length, 0);
});

test("stock: 统计", () => {
  const idx = new StockIndex(store([
    entry({ key: "t1__a", templateId: "t1", companionIds: ["a"], chars: 400, latencyMs: 20000 }),
    entry({ key: "t2__b", templateId: "t2", companionIds: ["b"], chars: 600, latencyMs: 30000 })
  ]));
  const s = idx.stats();
  assert.equal(s.total, 2);
  assert.equal(s.totalChars, 1000);
  assert.equal(s.templates, 2);
  assert.equal(s.companions, 2);
  assert.equal(s.avgChars, 500);
  assert.equal(s.avgLatencyMs, 25000);
});

test("stock: 回填新条目", () => {
  const idx = new StockIndex(store([entry({ key: "t__a", templateId: "t", companionIds: ["a"] })]));
  assert.equal(idx.size, 1);
  idx.put(entry({ key: "t__b", templateId: "t", companionIds: ["b"] }));
  assert.equal(idx.size, 2);
  assert.ok(idx.get("t", ["b"]));
});

test("stock: 导出", () => {
  const idx = new StockIndex(store([entry()]));
  const out = idx.export();
  assert.equal(out.entries.length, 1);
  assert.equal(out.model, "m");
});

test("stock: 从 JSON 构建", () => {
  const json = JSON.stringify(store([entry({ key: "t__a" })]));
  const idx = indexFromJson(json);
  assert.equal(idx.size, 1);
});

test("stock: 非法 JSON 返回空索引", () => {
  assert.equal(indexFromJson("not json").size, 0);
  assert.equal(indexFromJson("{}").size, 0);
  assert.equal(indexFromJson('{"entries": null}').size, 0);
});

test("stock: 空库存的统计", () => {
  const s = new StockIndex().stats();
  assert.equal(s.total, 0);
  assert.equal(s.avgChars, 0);
  assert.equal(s.avgLatencyMs, 0);
});

test("stock: emptyStore", () => {
  const s = emptyStore();
  assert.equal(s.entries.length, 0);
  assert.equal(s.generatedAt, null);
});
