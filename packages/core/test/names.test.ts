/**
 * 名字生成系统测试。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NAME_POOLS, SURNAMES_SINGLE, SURNAMES_COMPOUND, SURNAMES_MAIDEN,
  namePoolStats, poolOf, splitName, surnameOf, shortSurname,
  generateName, generateGivenName, familyNames, offspringName, randomName, seedOf
} from "../src/systems/names.ts";

test("names: 池子规模充足", () => {
  const st = namePoolStats();
  assert.ok(st.styles >= 5, "至少 5 种风格");
  assert.ok(st.single >= 100, "单字名 ≥ 100");
  assert.ok(st.double >= 100, "双字名 ≥ 100");
  assert.ok(st.total >= 250, "名字合计 ≥ 250");
  assert.ok(SURNAMES_SINGLE.length >= 80, "单姓 ≥ 80");
  assert.ok(SURNAMES_COMPOUND.length >= 10, "复姓 ≥ 10");
  assert.ok(SURNAMES_MAIDEN.length >= 20, "娘家姓池 ≥ 20");
});

test("names: 无空池、无重复", () => {
  for (const p of NAME_POOLS) {
    assert.ok(p.single.length > 0, p.style + " 单字名非空");
    assert.ok(p.double.length > 0, p.style + " 双字名非空");
    assert.equal(new Set(p.single).size, p.single.length, p.style + " 单字名不重复");
    assert.equal(new Set(p.double).size, p.double.length, p.style + " 双字名不重复");
  }
  assert.equal(new Set(SURNAMES_SINGLE).size, SURNAMES_SINGLE.length, "单姓不重复");
});

test("names: 拆名支持单姓/复姓/英文/空", () => {
  assert.deepEqual(splitName("林晓"), { surname: "林", given: "晓", compound: false });
  assert.deepEqual(splitName("欧阳娜娜"), { surname: "欧阳", given: "娜娜", compound: true });
  assert.equal(splitName("John Smith").surname, "Smith");
  assert.equal(splitName("").surname, "林", "空输入回落默认姓");
  assert.equal(splitName("  林晓  ").surname, "林", "忽略空白");
  assert.equal(splitName("苏").given, "", "只有姓时名为空");
});

test("names: 短姓（复姓取第二字）", () => {
  assert.equal(shortSurname("林晓"), "林");
  assert.equal(shortSurname("欧阳雪"), "阳", "复姓取第二字");
  assert.equal(surnameOf("司马光"), "司马");
});

test("names: 生成的名字带指定姓", () => {
  for (const style of ["onee","youth","matron","ai","feminine"] as const) {
    const n = generateName(style, seedOf("test" + style), { surname: "林" });
    assert.ok(n.startsWith("林"), style + " 应带指定姓，实际 " + n);
    assert.ok(n.length >= 2, style + " 名字长度合理");
  }
});

test("names: 同一 seed 结果一致（确定性）", () => {
  const a = generateName("onee", 12345, { surname: "林" });
  const b = generateName("onee", 12345, { surname: "林" });
  assert.equal(a, b, "同 seed 应一致");
  const c = generateName("onee", 99999, { surname: "林" });
  assert.notEqual(a, c, "不同 seed 通常不同");
});

test("names: exclude 生效避免重名", () => {
  const used: string[] = [];
  for (let i = 0; i < 8; i++) {
    const n = generateName("feminine", seedOf("x" + i), { surname: "林", exclude: used });
    assert.ok(!used.includes(n), "不应重复：" + n);
    used.push(n);
  }
  assert.equal(new Set(used).size, used.length);
});

test("names: 家人命名遵守既定规则", () => {
  const f = familyNames("林晓");
  assert.equal(f.hero, "林晓");
  assert.equal(f.surname, "林");
  assert.ok(f.sister.startsWith("林"), "姐姐随主角姓");
  assert.ok(f.sister2.startsWith("林"), "妹妹随主角姓");
  assert.ok(f.ai.startsWith("林"), "AI 随主角姓");
  assert.ok(!f.mother.startsWith("林"), "母亲不随主角姓（保留娘家姓）");
  assert.ok(SURNAMES_MAIDEN.includes(f.motherSurname) || f.motherSurname.length >= 1);
  assert.ok(f.mother.startsWith(f.motherSurname), "母亲名以娘家姓开头");
});

test("names: 家人命名确定性 + 不重名", () => {
  const a = familyNames("苏沐");
  const b = familyNames("苏沐");
  assert.deepEqual(a, b, "同输入结果一致");
  const names = [a.sister, a.sister2, a.mother, a.ai];
  assert.equal(new Set(names).size, names.length, "家人之间不重名");
});

test("names: 复姓主角的家人也用复姓", () => {
  const f = familyNames("欧阳雪");
  assert.equal(f.surname, "欧阳");
  assert.ok(f.sister.startsWith("欧阳"), "姐姐用复姓");
  assert.ok(f.ai.startsWith("欧阳"), "AI 用复姓");
});

test("names: 可指定母亲娘家姓与 AI 名", () => {
  const f = familyNames("林晓", { motherSurname: "温", aiGiven: "昭" });
  assert.equal(f.motherSurname, "温");
  assert.ok(f.mother.startsWith("温"));
  assert.equal(f.ai, "林昭");
});

test("names: 后代随主角姓且恒为女性名", () => {
  const females = new Set<string>();
  for (const p of NAME_POOLS) if (p.style !== "enemy") { p.single.forEach((x) => females.add(x)); p.double.forEach((x) => females.add(x)); }
  for (let i = 0; i < 5; i++) {
    const n = offspringName("林晓", i);
    assert.ok(n.startsWith("林"), "后代随主角姓");
    const given = n.slice(1);
    assert.ok(females.has(given), "后代名为女性名池里的：" + given);
  }
});

test("names: 空输入有兜底不崩", () => {
  assert.doesNotThrow(() => familyNames(""));
  assert.doesNotThrow(() => familyNames("   "));
  const f = familyNames("");
  assert.ok(f.hero.length > 0);
  assert.ok(f.sister.length > 0);
});

test("names: NPC 随机命名可用", () => {
  for (const style of ["feminine","enemy"] as const) {
    const n = randomName(seedOf("npc" + style), style);
    assert.ok(n.length >= 2, style + " NPC 名长度合理");
  }
});
