import { test } from "node:test";
import assert from "node:assert/strict";

import {
  defaultSettings, patchDisplay, patchGameplay, patchContent, patchAudio, patchCheat, patchLang,
  compareVersion, checkUpdate, newUpdateResult,
  SETTINGS_TAB_LABEL, RENDER_STYLE_LABEL, INTENSITY_LABEL, TIME_SCALE_LABEL,
  ABOUT, ABOUT_INTRO, ABOUT_FEATURES, ABOUT_NOTICES, CHANGELOG,
  type SettingsTab, type RenderStyle, type ContentIntensity
} from "../src/systems/settings.ts";

// ============ 默认值与补丁 ============

test("settings: 默认值", () => {
  const s = defaultSettings();
  assert.equal(s.display.renderStyle, "pixel");
  assert.equal(s.display.detail, "detailed");
  assert.equal(s.display.fontSize, 14);
  assert.equal(s.gameplay.timeScale, "normal");
  assert.equal(s.gameplay.autoSave, true);
  assert.equal(s.content.adultEnabled, true);
  assert.equal(s.content.intensity, "explicit");
  assert.equal(s.content.generationMode, "minor");
  assert.equal(s.lang.locale, "zh-CN");
  assert.equal(s.cheat.enabled, false);
  assert.equal(s.adultAcknowledged, false);
});

test("settings: 显示补丁不污染原对象", () => {
  const a = defaultSettings();
  const b = patchDisplay(a, { fontSize: 18 });
  assert.equal(a.display.fontSize, 14, "原对象不变");
  assert.equal(b.display.fontSize, 18);
  assert.equal(b.display.renderStyle, "pixel", "其他字段保留");
});

test("settings: 各分类补丁独立", () => {
  let s = defaultSettings();
  s = patchGameplay(s, { timeScale: "fast" });
  s = patchContent(s, { intensity: "unrestrained" });
  s = patchAudio(s, { master: 0.3 });
  s = patchCheat(s, { enabled: true });
  s = patchLang(s, { locale: "en-US" });

  assert.equal(s.gameplay.timeScale, "fast");
  assert.equal(s.content.intensity, "unrestrained");
  assert.equal(s.audio.master, 0.3);
  assert.equal(s.cheat.enabled, true);
  assert.equal(s.lang.locale, "en-US");
  assert.equal(s.display.renderStyle, "pixel", "未改动的分类保持默认");
});

// ============ 版本比较 ============

test("version: 比较", () => {
  assert.equal(compareVersion("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersion("1.0.1", "1.0.0"), 1);
  assert.equal(compareVersion("1.0.0", "1.0.1"), -1);
  assert.equal(compareVersion("2.0.0", "1.9.9"), 1);
  assert.equal(compareVersion("0.27.0", "0.9.0"), 1, "按数值比较而非字符串");
});

test("version: 位数不同时补零", () => {
  assert.equal(compareVersion("1.0", "1.0.0"), 0);
  assert.equal(compareVersion("1.1", "1.0.9"), 1);
  assert.equal(compareVersion("1", "1.0.0"), 0);
});

test("version: 非法输入当 0", () => {
  assert.equal(compareVersion("abc", "0.0.0"), 0);
  assert.equal(compareVersion("1.x.0", "1.0.0"), 0);
});

// ============ 更新检查 ============

test("update: 无更新源时返回提示", async () => {
  const r = await checkUpdate("0.27.0", null);
  assert.equal(r.checked, true);
  assert.equal(r.hasUpdate, false);
  assert.match(r.error ?? "", /未配置更新源/);
});

test("update: 发现新版本", async () => {
  const fake = async () => ({
    ok: true, status: 200,
    json: async () => ({ version: "0.28.0", notes: ["新场景", "修复 bug"], url: "https://example.com" })
  }) as Response;

  const r = await checkUpdate("0.27.0", "https://example.com/version.json", fake as never);
  assert.equal(r.checked, true);
  assert.equal(r.hasUpdate, true);
  assert.equal(r.latestVersion, "0.28.0");
  assert.deepEqual(r.notes, ["新场景", "修复 bug"]);
  assert.equal(r.url, "https://example.com");
});

test("update: 已是最新", async () => {
  const fake = async () => ({
    ok: true, status: 200,
    json: async () => ({ version: "0.27.0", notes: [] })
  }) as Response;

  const r = await checkUpdate("0.27.0", "https://example.com/v.json", fake as never);
  assert.equal(r.hasUpdate, false);
  assert.equal(r.latestVersion, "0.27.0");
});

test("update: 服务端错误", async () => {
  const fake = async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response;
  const r = await checkUpdate("0.27.0", "https://example.com/v.json", fake as never);
  assert.match(r.error ?? "", /500/);
});

test("update: 格式不正确", async () => {
  const fake = async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response;
  const r = await checkUpdate("0.27.0", "https://example.com/v.json", fake as never);
  assert.match(r.error ?? "", /格式不正确/);
});

test("update: 网络异常被捕获", async () => {
  const fake = async () => { throw new Error("ECONNREFUSED"); };
  const r = await checkUpdate("0.27.0", "https://x/v.json", fake as never);
  assert.equal(r.checked, true);
  assert.match(r.error ?? "", /ECONNREFUSED/);
});

test("update: newUpdateResult 初始态", () => {
  const r = newUpdateResult("1.0.0");
  assert.equal(r.checked, false);
  assert.equal(r.hasUpdate, false);
  assert.equal(r.currentVersion, "1.0.0");
  assert.equal(r.latestVersion, null);
});

// ============ 关于内容 ============

test("about: 基本信息完整", () => {
  assert.ok(ABOUT.name.length > 0);
  assert.ok(ABOUT.tagline.length > 0);
  assert.match(ABOUT.version, /^\d+\.\d+\.\d+$/);
  assert.ok(ABOUT.engine.length > 0);
  assert.ok(ABOUT.license.length > 0);
});

test("about: 介绍段落", () => {
  assert.ok(ABOUT_INTRO.length >= 5, `介绍应至少 5 段，实际 ${ABOUT_INTRO.length}`);
  for (const p of ABOUT_INTRO) assert.ok(p.length > 5, "每段应有实质内容");
});

test("about: 玩法要点", () => {
  assert.ok(ABOUT_FEATURES.length >= 5);
  for (const f of ABOUT_FEATURES) {
    assert.ok(f.title.length > 0);
    assert.ok(f.body.length > 10);
  }
});

test("about: 声明覆盖必要条目", () => {
  const titles = ABOUT_NOTICES.map((n) => n.title);
  for (const need of ["成人内容", "虚构声明", "数据与隐私", "第三方素材"]) {
    assert.ok(titles.includes(need), `缺少声明：${need}`);
  }
});

test("about: 成人内容声明提到年龄", () => {
  const adult = ABOUT_NOTICES.find((n) => n.title === "成人内容")!;
  assert.match(adult.body, /18/, "应声明 18 岁以上");
  assert.match(adult.body, /成年/, "应说明角色均为成年");
});

test("about: 隐私声明说明不联网", () => {
  const privacy = ABOUT_NOTICES.find((n) => n.title === "数据与隐私")!;
  assert.match(privacy.body, /不联网|不上传/);
});

test("about: 素材声明提到 CC0", () => {
  const assets = ABOUT_NOTICES.find((n) => n.title === "第三方素材")!;
  assert.match(assets.body, /CC0/);
  assert.match(assets.body, /Kenney/);
});

test("about: 更新日志非空且版本递减", () => {
  assert.ok(CHANGELOG.length >= 5);
  for (let i = 1; i < CHANGELOG.length; i++) {
    assert.ok(
      compareVersion(CHANGELOG[i - 1].version, CHANGELOG[i].version) >= 0,
      "更新日志应按版本降序"
    );
  }
  for (const c of CHANGELOG) {
    assert.ok(c.items.length > 0, `${c.version} 应有条目`);
    assert.ok(c.date.length > 0);
  }
});

// ============ 标签完整性 ============

test("settings: 全部标签有文案与图标", async () => {
  const mod = await import("../src/systems/settings.ts");
  const tabs: SettingsTab[] = ["display", "gameplay", "content", "audio", "lang", "cheat", "about"];
  for (const t of tabs) {
    assert.ok(mod.SETTINGS_TAB_LABEL[t], `缺少标签文案 ${t}`);
    assert.ok(mod.SETTINGS_TAB_ICON[t], `缺少标签图标 ${t}`);
  }
});

test("settings: 枚举标签完整", () => {
  for (const s of ["text", "pixel", "illustration", "live2d"] as RenderStyle[]) {
    assert.ok(RENDER_STYLE_LABEL[s]);
  }
  for (const i of ["tasteful", "explicit", "unrestrained"] as ContentIntensity[]) {
    assert.ok(INTENSITY_LABEL[i]);
  }
  for (const t of ["slow", "normal", "fast"] as const) {
    assert.ok(TIME_SCALE_LABEL[t]);
  }
});
