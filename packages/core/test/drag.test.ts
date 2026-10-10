import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * 拖拽逻辑的纯函数测试。
 *
 * useDraggable 的 DOM 部分需要浏览器，但核心判定逻辑可以独立验证：
 *  - 边界钳制
 *  - 点击/拖拽阈值判定
 *  - 位移计算
 */

/** 与 useDraggable 内一致的钳制逻辑 */
function clampPos(
  p: { x: number; y: number },
  w: number, h: number,
  viewport: { w: number; h: number },
  margin = 8
): { x: number; y: number } {
  const maxX = Math.max(margin, viewport.w - w - margin);
  const maxY = Math.max(margin, viewport.h - h - margin);
  return {
    x: Math.max(margin, Math.min(maxX, p.x)),
    y: Math.max(margin, Math.min(maxY, p.y))
  };
}

/** 与 useDraggable 内一致的拖拽判定 */
function isDrag(moved: number, threshold: number): boolean {
  return moved >= threshold;
}

const VP = { w: 1600, h: 900 };

// ============ 边界钳制 ============

test("drag: 正常位置不变", () => {
  const p = clampPos({ x: 300, y: 200 }, 200, 150, VP);
  assert.deepEqual(p, { x: 300, y: 200 });
});

test("drag: 超出左边界被拉回", () => {
  const p = clampPos({ x: -50, y: 200 }, 200, 150, VP);
  assert.equal(p.x, 8, "应钳制到 margin");
});

test("drag: 超出上边界被拉回", () => {
  const p = clampPos({ x: 300, y: -100 }, 200, 150, VP);
  assert.equal(p.y, 8);
});

test("drag: 超出右边界被拉回", () => {
  const p = clampPos({ x: 1500, y: 200 }, 200, 150, VP);
  assert.equal(p.x, VP.w - 200 - 8);
});

test("drag: 超出下边界被拉回", () => {
  const p = clampPos({ x: 300, y: 850 }, 200, 150, VP);
  assert.equal(p.y, VP.h - 150 - 8);
});

test("drag: 元素大于视口时不产生负坐标", () => {
  const p = clampPos({ x: 100, y: 100 }, 2000, 1200, VP);
  assert.ok(p.x >= 8, "x 不应为负");
  assert.ok(p.y >= 8, "y 不应为负");
});

test("drag: 自定义 margin", () => {
  const p = clampPos({ x: -50, y: -50 }, 200, 150, VP, 20);
  assert.equal(p.x, 20);
  assert.equal(p.y, 20);
});

test("drag: 视口缩小时仍钳制", () => {
  const small = { w: 800, h: 600 };
  const p = clampPos({ x: 700, y: 500 }, 200, 150, small);
  assert.equal(p.x, 800 - 200 - 8);
  assert.equal(p.y, 600 - 150 - 8);
});

// ============ 点击/拖拽判定 ============

test("drag: 微小位移视为点击", () => {
  assert.equal(isDrag(0, 4), false);
  assert.equal(isDrag(1, 4), false);
  assert.equal(isDrag(3, 4), false);
});

test("drag: 达到阈值视为拖拽", () => {
  assert.equal(isDrag(4, 4), true);
  assert.equal(isDrag(10, 4), true);
});

test("drag: 自定义阈值", () => {
  assert.equal(isDrag(2, 3), false);
  assert.equal(isDrag(3, 3), true);
});

test("drag: 各方向位移累加判定", () => {
  // 斜向小幅移动：dx=2, dy=2 → moved=4
  const dx = 2, dy = 2;
  const moved = Math.abs(dx) + Math.abs(dy);
  assert.equal(isDrag(moved, 4), true, "斜向位移应累加");
});

test("drag: 反向位移也计入", () => {
  const moved = Math.abs(-5) + Math.abs(0);
  assert.equal(isDrag(moved, 4), true);
});

// ============ 位置计算 ============

test("drag: 位移叠加到初始位置", () => {
  const origin = { x: 100, y: 100 };
  const dx = 50, dy = -30;
  const next = { x: origin.x + dx, y: origin.y + dy };
  assert.deepEqual(next, { x: 150, y: 70 });
});

test("drag: 连续拖拽以起点为基准", () => {
  // 模拟：按下 → 移动 → 移动 → 抬起
  const origin = { x: 100, y: 100 };
  const start = { x: 200, y: 200 };

  // 第一次移动
  const p1 = clampPos(
    { x: origin.x + (250 - start.x), y: origin.y + (220 - start.y) },
    200, 150, VP
  );
  assert.deepEqual(p1, { x: 150, y: 120 });

  // 第二次移动（仍以同一 start 为基准，避免累积误差）
  const p2 = clampPos(
    { x: origin.x + (300 - start.x), y: origin.y + (180 - start.y) },
    200, 150, VP
  );
  assert.deepEqual(p2, { x: 200, y: 80 });
});

// ============ 持久化 ============

test("drag: 位置可序列化往返", () => {
  const pos = { x: 123.5, y: 456.75 };
  const json = JSON.stringify(pos);
  const back = JSON.parse(json);
  assert.deepEqual(back, pos);
});

test("drag: 损坏数据被忽略", () => {
  const bad = ["{not json", "null", "{}", '{"x":"a","y":2}', '{"x":1}', "[1,2]"];
  for (const raw of bad) {
    let ok = false;
    try {
      const p = JSON.parse(raw);
      ok = !!p && typeof p.x === "number" && typeof p.y === "number"
        && Number.isFinite(p.x) && Number.isFinite(p.y);
    } catch {
      ok = false;
    }
    assert.equal(ok, false, `${raw} 应被拒绝`);
  }
});

test("drag: 合法数据被接受", () => {
  const good = ['{"x":1,"y":2}', '{"x":-5,"y":100.5}'];
  for (const raw of good) {
    const p = JSON.parse(raw);
    const ok = !!p && typeof p.x === "number" && typeof p.y === "number"
      && Number.isFinite(p.x) && Number.isFinite(p.y);
    assert.equal(ok, true, `${raw} 应被接受`);
  }
});

// ============ 悬浮窗不超出视口 ============

test("drag: 窗口尺寸与视口的关系", () => {
  // 窗口为 min(46em, 82vw) × min(40em, 78vh)
  const em = 14;
  const winW = Math.min(46 * em, VP.w * 0.82);
  const winH = Math.min(40 * em, VP.h * 0.78);
  assert.ok(winW < VP.w, "窗口宽度应小于视口");
  assert.ok(winH < VP.h, "窗口高度应小于视口");
});

test("drag: 小视口下窗口仍可完整显示", () => {
  const small = { w: 640, h: 480 };
  const em = 14;
  const winW = Math.min(46 * em, small.w * 0.82);
  const winH = Math.min(40 * em, small.h * 0.78);
  assert.ok(winW <= small.w);
  assert.ok(winH <= small.h);
});
