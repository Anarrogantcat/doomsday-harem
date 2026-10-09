import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TRACKS, trackDef, tracksByChannel, tracksByTag, bgmForTags, ambientForTags,
  defaultAudioSettings, newAudioState, effectiveVolume,
  setMaster, setChannelVolume, toggleMute,
  playBgm, setAmbient, applySceneAudio, finishFade, playSfx,
  describeAudio, CHANNEL_LABEL,
  type AudioChannel
} from "../src/audio/index.ts";

// ============ 目录 ============

test("audio: 音轨目录非空且 id 唯一", () => {
  assert.ok(TRACKS.length >= 20, `应有 20+ 音轨，实际 ${TRACKS.length}`);
  const ids = new Set(TRACKS.map((x) => x.id));
  assert.equal(ids.size, TRACKS.length);
});

test("audio: 音轨字段合法", () => {
  for (const t of TRACKS) {
    assert.ok(t.name.length > 0, `${t.id} 缺名称`);
    assert.ok(t.description.length > 0, `${t.id} 缺描述`);
    assert.ok(CHANNEL_LABEL[t.channel], `${t.id} 通道未知`);
    assert.ok(t.durationSec >= 0);
    assert.ok(t.tags.length > 0, `${t.id} 缺标签`);
  }
});

test("audio: 四个通道都有音轨", () => {
  for (const ch of ["bgm", "ambient", "sfx", "voice"] as AudioChannel[]) {
    assert.ok(tracksByChannel(ch).length > 0, `通道 ${ch} 无音轨`);
  }
});

test("audio: BGM 全部循环", () => {
  for (const t of tracksByChannel("bgm")) {
    if (t.id === "bgm_victory") continue; // 胜利音是一次性
    assert.equal(t.loop, true, `${t.id} 应循环`);
  }
});

test("audio: 按标签查询", () => {
  assert.ok(tracksByTag("h").length >= 2);
  assert.ok(tracksByTag("battle").length >= 2);
  assert.ok(tracksByTag("base").length >= 3);
});

test("audio: 按场景标签选 BGM", () => {
  assert.equal(bgmForTags(["base", "day"])?.id, "bgm_base_calm");
  assert.equal(bgmForTags(["battle"])?.id, "bgm_tension");
  assert.equal(bgmForTags(["scene", "h"])?.id, "bgm_intimate");
  assert.equal(bgmForTags(["nonexistent"]), null);
});

test("audio: 按场景标签选环境音", () => {
  const amb = ambientForTags(["weather:rain"]);
  assert.equal(amb.length, 1);
  assert.equal(amb[0].id, "amb_rain");

  const multi = ambientForTags(["base", "fire"]);
  assert.ok(multi.length >= 1);
});

test("audio: 未知音轨", () => {
  assert.equal(trackDef("nonexistent"), undefined);
});

// ============ 设置 ============

test("audio: 默认设置", () => {
  const s = defaultAudioSettings();
  assert.equal(s.master, 0.7);
  assert.equal(s.crossfadeMs, 800);
  for (const ch of ["bgm", "ambient", "sfx", "voice"] as AudioChannel[]) {
    assert.ok(s.channels[ch]);
    assert.equal(s.channels[ch].muted, false);
  }
});

test("audio: 有效音量 = 主 × 通道", () => {
  const s = newAudioState();
  // 0.7 × 0.6 = 0.42
  assert.ok(Math.abs(effectiveVolume(s, "bgm") - 0.42) < 0.001);
  assert.ok(Math.abs(effectiveVolume(s, "voice") - 0.7) < 0.001);
});

test("audio: 静音时有效音量为 0", () => {
  let s = newAudioState();
  s = toggleMute(s, "bgm");
  assert.equal(effectiveVolume(s, "bgm"), 0);
  assert.ok(effectiveVolume(s, "sfx") > 0, "其他通道不受影响");
});

test("audio: 主音量调整", () => {
  let s = newAudioState();
  s = setMaster(s, 0.5);
  assert.equal(s.settings.master, 0.5);
  assert.ok(Math.abs(effectiveVolume(s, "bgm") - 0.3) < 0.001);
});

test("audio: 主音量钳制到 0-1", () => {
  let s = newAudioState();
  assert.equal(setMaster(s, 5).settings.master, 1);
  assert.equal(setMaster(s, -1).settings.master, 0);
});

test("audio: 通道音量调整与钳制", () => {
  let s = newAudioState();
  s = setChannelVolume(s, "sfx", 0.2);
  assert.equal(s.settings.channels.sfx.volume, 0.2);
  assert.equal(setChannelVolume(s, "sfx", 9).settings.channels.sfx.volume, 1);
});

test("audio: 静音开关可逆", () => {
  let s = newAudioState();
  s = toggleMute(s, "voice");
  assert.equal(s.settings.channels.voice.muted, true);
  s = toggleMute(s, "voice");
  assert.equal(s.settings.channels.voice.muted, false);
});

// ============ 播放调度 ============

test("audio: 初始无播放", () => {
  const s = newAudioState();
  assert.equal(s.currentBgm, null);
  assert.equal(s.currentAmbient.length, 0);
  assert.equal(s.fadingOut, null);
});

test("audio: 切换 BGM", () => {
  let s = newAudioState();
  s = playBgm(s, "bgm_base_calm", 0);
  assert.equal(s.currentBgm, "bgm_base_calm");
  assert.equal(s.fadingOut, null, "首次播放无淡出");
});

test("audio: 再次切换触发淡出", () => {
  let s = newAudioState();
  s = playBgm(s, "bgm_base_calm", 0);
  s = playBgm(s, "bgm_tension", 100);
  assert.equal(s.currentBgm, "bgm_tension");
  assert.equal(s.fadingOut, "bgm_base_calm");
});

test("audio: 同曲不重复切换", () => {
  let s = newAudioState();
  s = playBgm(s, "bgm_base_calm", 0);
  const before = s.history.length;
  s = playBgm(s, "bgm_base_calm", 100);
  assert.equal(s.history.length, before, "不应产生新历史");
});

test("audio: 非 BGM 音轨被拒", () => {
  const s = newAudioState();
  const after = playBgm(s, "sfx_gunshot");
  assert.equal(after.currentBgm, null, "音效不能作为 BGM");
});

test("audio: 停止 BGM", () => {
  let s = newAudioState();
  s = playBgm(s, "bgm_base_calm");
  s = playBgm(s, null);
  assert.equal(s.currentBgm, null);
});

test("audio: 环境音集合", () => {
  let s = newAudioState();
  s = setAmbient(s, ["amb_rain", "amb_fire"]);
  assert.deepEqual(s.currentAmbient, ["amb_rain", "amb_fire"]);
});

test("audio: 非环境音被过滤", () => {
  let s = newAudioState();
  s = setAmbient(s, ["amb_rain", "sfx_gunshot", "bgm_tension"]);
  assert.deepEqual(s.currentAmbient, ["amb_rain"]);
});

test("audio: 场景音轨一键应用", () => {
  let s = newAudioState();
  s = applySceneAudio(s, ["base", "day", "fire"]);
  assert.equal(s.currentBgm, "bgm_base_calm");
  assert.ok(s.currentAmbient.includes("amb_fire"));
});

test("audio: 场景切换更新音轨", () => {
  let s = newAudioState();
  s = applySceneAudio(s, ["base", "day"], 0);
  assert.equal(s.currentBgm, "bgm_base_calm");

  s = applySceneAudio(s, ["battle"], 100);
  assert.equal(s.currentBgm, "bgm_tension");
  assert.equal(s.fadingOut, "bgm_base_calm");
});

test("audio: 淡出完成", () => {
  let s = newAudioState();
  s = playBgm(s, "bgm_base_calm");
  s = playBgm(s, "bgm_tension");
  assert.ok(s.fadingOut);
  s = finishFade(s);
  assert.equal(s.fadingOut, null);
});

test("audio: 播放音效记录历史", () => {
  let s = newAudioState();
  s = playSfx(s, "sfx_gunshot", 10);
  assert.equal(s.history.length, 1);
  assert.equal(s.history[0].track, "sfx_gunshot");
});

test("audio: 音效不改变 BGM", () => {
  let s = newAudioState();
  s = playBgm(s, "bgm_base_calm");
  s = playSfx(s, "sfx_build");
  assert.equal(s.currentBgm, "bgm_base_calm");
});

test("audio: 非法音效被忽略", () => {
  const s = newAudioState();
  assert.equal(playSfx(s, "bgm_tension").history.length, 0);
  assert.equal(playSfx(s, "nonexistent").history.length, 0);
});

test("audio: 历史有上限", () => {
  let s = newAudioState();
  for (let i = 0; i < 100; i++) s = playSfx(s, "sfx_ui_click", i);
  assert.ok(s.history.length <= 50);
});

// ============ 描述 ============

test("audio: 描述文本", () => {
  let s = newAudioState();
  s = applySceneAudio(s, ["base", "day", "fire"]);
  const txt = describeAudio(s);
  assert.match(txt, /主音量：70%/);
  assert.match(txt, /据点·日常/);
  assert.match(txt, /炉火/);
});

test("audio: 无播放时的描述", () => {
  const txt = describeAudio(newAudioState());
  assert.match(txt, /BGM：（无）/);
  assert.match(txt, /环境音：（无）/);
});
