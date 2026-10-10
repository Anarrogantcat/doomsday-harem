import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_MAPS, MAIN_MAPS, getMap, getCell, cellAt, neighbor, availableDirs,
  DIR_ARROW, DIR_LABEL, KIND_LABEL, KIND_ICON, KIND_COLOR,
  type ExitDir
} from "../src/systems/maps.ts";
import { COMPANIONS, companionDef } from "../src/systems/companions.ts";
import {
  checkPartnerFate, checkPartnerHistoryLimit, PARTNER_HISTORY_LIMIT
} from "../src/systems/laws.ts";

// ============ 地图数据 ============

test("五张地图齐备，216 格", () => {
  assert.equal(ALL_MAPS.length, 5);
  assert.equal(ALL_MAPS.reduce((a, m) => a + m.cells.length, 0), 216);
});

test("主图三张（城南 / 市中心 / 东部郊野）", () => {
  assert.equal(MAIN_MAPS.length, 3);
  assert.deepEqual(MAIN_MAPS.map((m) => m.id), ["jc_south", "jc_center", "jc_east"]);
});

test("每张图坐标无重叠", () => {
  for (const m of ALL_MAPS) {
    const seen = new Set<string>();
    for (const c of m.cells) {
      const k = c.x + "," + c.y;
      assert.ok(!seen.has(k), `${m.id} 坐标重复：${k}`);
      seen.add(k);
    }
  }
});

test("格子坐标在行列范围内", () => {
  for (const m of ALL_MAPS) {
    for (const c of m.cells) {
      assert.ok(c.x >= 0 && c.x < m.cols, `${m.id}:${c.id} x 越界`);
      assert.ok(c.y >= 0 && c.y < m.rows, `${m.id}:${c.id} y 越界`);
    }
  }
});

test("每张图格 id 唯一", () => {
  for (const m of ALL_MAPS) {
    const ids = m.cells.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, m.id + " 有重复格 id");
  }
});

test("格子的 kind / danger 合法", () => {
  for (const m of ALL_MAPS) {
    for (const c of m.cells) {
      assert.ok(KIND_LABEL[c.kind], `${c.id} kind 无效：${c.kind}`);
      assert.ok(KIND_ICON[c.kind], `${c.id} 缺 icon`);
      assert.ok(KIND_COLOR[c.kind], `${c.id} 缺 color`);
      assert.ok(c.danger >= 0 && c.danger <= 5, `${c.id} danger 越界：${c.danger}`);
    }
  }
});

test("getMap / getCell / cellAt 命中与未命中", () => {
  assert.ok(getMap("jc_south"));
  assert.equal(getMap("nope"), undefined);
  assert.ok(getCell("jc_south", "hero_home"));
  assert.equal(getCell("jc_south", "nope"), undefined);
  const c = getCell("jc_south", "hero_home")!;
  assert.equal(cellAt("jc_south", c.x, c.y)?.id, "hero_home");
  assert.equal(cellAt("jc_south", 99, 99), undefined);
});

// ============ 出口双向性 ============

test("全部连接（exit + sub）双向配对", () => {
  const links: Array<[string, string]> = [];
  for (const m of ALL_MAPS) {
    for (const c of m.cells) {
      const from = m.id + ":" + c.id;
      for (const e of c.exits ?? []) links.push([from, e.toMap + ":" + e.toCell]);
      if (c.sub) links.push([from, c.sub.id + ":" + c.sub.at]);
    }
  }
  const set = new Set(links.map(([a, b]) => a + ">" + b));
  for (const [a, b] of links) {
    assert.ok(set.has(b + ">" + a), `单向连接：${a} → ${b}`);
  }
});

test("出口目标必须存在", () => {
  for (const m of ALL_MAPS) {
    for (const c of m.cells) {
      for (const e of c.exits ?? []) {
        assert.ok(getMap(e.toMap), `${c.id} 出口指向不存在的地图 ${e.toMap}`);
        assert.ok(getCell(e.toMap, e.toCell), `${c.id} 出口指向不存在的格 ${e.toCell}`);
      }
      if (c.sub) {
        assert.ok(getMap(c.sub.id), `${c.id} sub 指向不存在的地图 ${c.sub.id}`);
        assert.ok(getCell(c.sub.id, c.sub.at), `${c.id} sub 指向不存在的格 ${c.sub.at}`);
      }
    }
  }
});

test("出口方向标签齐备", () => {
  for (const d of ["N", "S", "E", "W"] as ExitDir[]) {
    assert.ok(DIR_ARROW[d], d + " 缺箭头");
    assert.ok(DIR_LABEL[d], d + " 缺标签");
  }
});

// ============ 寻路 ============

test("neighbor：同图相邻返回 move", () => {
  const c = getCell("jc_south", "hero_home")!;
  const dirs = availableDirs("jc_south", "hero_home");
  assert.ok(dirs.length > 0);
  for (const d of dirs) {
    const n = neighbor("jc_south", "hero_home", d.dir);
    assert.ok(n, d.dir + " 应可达");
    if (n!.kind === "move") assert.equal(n!.map, "jc_south");
  }
  void c;
});

test("neighbor：越界返回 null", () => {
  // 找一个角落格
  const corner = getCell("jc_south", "nw_hill_view")!;
  if (corner.x === 0 && corner.y === 0) {
    assert.equal(neighbor("jc_south", corner.id, "N"), null);
    assert.equal(neighbor("jc_south", corner.id, "W"), null);
  }
});

test("neighbor：出口优先于同图相邻", () => {
  // 城南出口格应返回 exit
  const hasExit = ALL_MAPS.some((m) => m.cells.some((c) => (c.exits?.length ?? 0) > 0));
  assert.ok(hasExit, "至少应有一个出口格");
});

test("availableDirs 返回结构与顺序", () => {
  const dirs = availableDirs("jc_south", "hero_home");
  for (const d of dirs) {
    assert.ok(d.arrow && d.label && d.name);
    assert.ok(d.kind === "move" || d.kind === "exit");
    assert.ok(d.icon);
  }
});

// ============ 探索度种子（GridMap 用）============

const SEED: Record<string, string[]> = {
  jc_south: ["hero_home", "home_block", "univ_neigh", "south_park", "park_lake",
    "mountain_foot", "hillside_road", "metro_south", "clin_neigh",
    "res_blocks", "street_east", "middle_school", "res_west",
    "shoemaker", "vegetable_market", "south_plaza"],
  jc_center: ["center_gate_n", "central_plaza"],
  jc_east: ["e_gate_n", "e_farm_main"],
  beiling: ["mt_foot_camp", "mt_trail", "mt_stream", "mt_ledge", "mt_rv_park",
    "mt_fortress_out", "mt_fortress_side", "mt_fortress", "mt_gate_south",
    "mt_garage_out", "mt_workshop_out", "mt_tunnel_mouth", "mt_water_tank",
    "mt_terraces", "mt_spring_s"]
};

test("探索度种子全部命中真实格 id", () => {
  for (const [mapId, ids] of Object.entries(SEED)) {
    const m = getMap(mapId);
    assert.ok(m, mapId + " 地图不存在");
    const real = new Set(m!.cells.map((c) => c.id));
    for (const id of ids) {
      assert.ok(real.has(id), `${mapId} 种子格不存在：${id}`);
    }
  }
});

test("要塞内部视为全部已探索（主角自建）", () => {
  const m = getMap("fortress_inside")!;
  assert.equal(m.cells.length, 36);
});

// ============ R-1 / L-4 / L-5 数据修正 ============

test("全部同伴都有相貌字段（R-1 新增）", () => {
  for (const c of COMPANIONS) {
    if (c.id === "ai") continue; // AI 无实体
    assert.ok(c.face, c.id + " 缺 face 字段");
    assert.ok(c.face!.length > 10, c.id + " face 描述过短");
  }
});

test("全部同伴罩杯不低于 C（L-8 全员出众）", () => {
  for (const c of COMPANIONS) {
    if (c.id === "ai") continue;
    const m = /([A-H])-cup/.exec(c.build);
    assert.ok(m, c.id + " build 缺罩杯标注");
    const idx = m![1].charCodeAt(0) - 65; // A=0
    assert.ok(idx >= 2, `${c.id} 罩杯 ${m![1]} 低于 C，违反 L-8`);
  }
});

test("身材描述不含「清瘦 / 疲惫 / 精瘦」等不达标词", () => {
  const bad = ["清瘦", "疲惫", "精瘦", "素净，B", "干练，B"];
  for (const c of COMPANIONS) {
    for (const b of bad) {
      assert.ok(!c.build.includes(b), `${c.id} 身材含「${b}」`);
    }
  }
});

test("有过伴侣者正好 3 人（L-4 / L-5 卡满上限）", () => {
  const list = COMPANIONS.map((c) => ({
    id: c.id, name: c.name, hadPartner: c.hadPartner ?? false
  }));
  assert.deepEqual(checkPartnerHistoryLimit(list), [], "不得超过 3 人");
  const actual = list.filter((x) => x.hadPartner).map((x) => x.id).sort();
  assert.deepEqual(actual, ["mother", "neighbor", "singlemom"], "应正好是这 3 人");
  assert.equal(actual.length, PARTNER_HISTORY_LIMIT);
});

test("有过伴侣者必有不可逆的伴侣结局（L-2）", () => {
  for (const c of COMPANIONS) {
    if (!c.hadPartner) continue;
    assert.ok(c.partnerFate, c.id + " 有过伴侣却缺 partnerFate");
    assert.deepEqual(checkPartnerFate(c.partnerFate!), [], `${c.id} 的措辞可逆`);
  }
});

test("全部同伴的 partnerFate 均不可逆", () => {
  for (const c of COMPANIONS) {
    if (!c.partnerFate) continue;
    assert.deepEqual(checkPartnerFate(c.partnerFate), [], c.id);
  }
});

test("virgin 字段与 hadPartner 一致", () => {
  for (const c of COMPANIONS) {
    if (c.id === "ai") continue;
    if (c.hadPartner) {
      assert.equal(c.virgin, false, `${c.id} 有过伴侣却标为处女`);
    }
  }
});

test("母亲 / 单亲妈妈 / 邻居人妻为仅有的非处女", () => {
  const nonVirgin = COMPANIONS.filter((c) => c.virgin === false).map((c) => c.id).sort();
  assert.deepEqual(nonVirgin, ["mother", "neighbor", "singlemom"]);
});

test("姐姐标记为处女（互相破处的一方）", () => {
  const sister = companionDef("sister")!;
  assert.equal(sister.virgin, true, "她是用自己的处女换走主角的处男，故此刻仍为处女");
});

test("邻居人妻的 title 已改不可逆措辞（L-2）", () => {
  const n = companionDef("neighbor")!;
  assert.ok(!n.title.includes("失踪"), "title 仍含「失踪」：" + n.title);
  assert.ok(n.title.includes("去世") || n.title.includes("已故"), "title 应含不可逆措辞");
});
