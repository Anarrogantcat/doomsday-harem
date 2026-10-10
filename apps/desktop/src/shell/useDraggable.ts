import { useCallback, useEffect, useRef, useState } from "react";

export interface Point {
  x: number;
  y: number;
}

export interface DragOptions {
  /** 初始位置 */
  initial: Point;
  /** 持久化键（localStorage） */
  storageKey?: string;
  /** 拖拽手柄元素（不传则整个元素可拖） */
  handleRef?: React.RefObject<HTMLElement | null>;
  /** 是否把位置钳制在视口内 */
  clampToViewport?: boolean;
  /** 距离视口边缘的最小留白 */
  margin?: number;
  /** 判定为拖拽的最小位移（px），小于此值视为点击 */
  dragThreshold?: number;
  /** 点击回调（位移小于阈值时触发） */
  onClick?: () => void;
}

/**
 * 拖拽 Hook。
 *
 * 要点（针对拖拽常见问题）：
 *  1. 用 Pointer Events，同时支持鼠标/触摸/触控笔
 *  2. setPointerCapture：拖出元素范围也不丢失事件
 *  3. 位移阈值：区分「点击」与「拖拽」，避免轻微抖动误触发点击
 *  4. 边界钳制：拖出视口时自动拉回，且考虑窗口缩放
 *  5. 位置持久化：刷新后保持
 *  6. 拖拽中禁用文本选择与过渡动画（避免跟手迟滞）
 */
export function useDraggable(opts: DragOptions) {
  const {
    initial, storageKey, handleRef,
    clampToViewport = true, margin = 8,
    dragThreshold = 4, onClick
  } = opts;

  const [pos, setPos] = useState<Point>(() => {
    if (storageKey && typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const p = JSON.parse(raw) as Point;
          if (typeof p.x === "number" && typeof p.y === "number") return p;
        }
      } catch { /* 忽略损坏数据 */ }
    }
    return initial;
  });

  const [dragging, setDragging] = useState(false);
  const elRef = useRef<HTMLElement | null>(null);
  const state = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: 0,
    pointerId: -1
  });

  /** 钳制到视口 */
  const clamp = useCallback((p: Point, w: number, h: number): Point => {
    if (!clampToViewport || typeof window === "undefined") return p;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);
    return {
      x: Math.max(margin, Math.min(maxX, p.x)),
      y: Math.max(margin, Math.min(maxY, p.y))
    };
  }, [clampToViewport, margin]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // 只响应主键
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const target = e.currentTarget as HTMLElement;
    state.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: 0,
      pointerId: e.pointerId
    };

    // 捕获指针：拖出元素范围也能收到事件
    try {
      target.setPointerCapture(e.pointerId);
    } catch { /* 某些环境不支持 */ }

    setDragging(true);
    e.preventDefault();
  }, [pos.x, pos.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = state.current;
    if (!s.active) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    s.moved = Math.max(s.moved, Math.abs(dx) + Math.abs(dy));

    const el = elRef.current;
    const w = el?.offsetWidth ?? 0;
    const h = el?.offsetHeight ?? 0;

    setPos(clamp({ x: s.originX + dx, y: s.originY + dy }, w, h));
  }, [clamp]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const s = state.current;
    if (!s.active) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(s.pointerId);
    } catch { /* 忽略 */ }

    const wasDrag = s.moved >= dragThreshold;
    s.active = false;
    setDragging(false);

    // 位移小于阈值 → 视为点击
    if (!wasDrag && onClick) onClick();
  }, [dragThreshold, onClick]);

  // 窗口缩放时重新钳制，避免元素跑到视口外
  useEffect(() => {
    if (!clampToViewport || typeof window === "undefined") return;
    const onResize = () => {
      const el = elRef.current;
      setPos((p) => clamp(p, el?.offsetWidth ?? 0, el?.offsetHeight ?? 0));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp, clampToViewport]);

  // 位置持久化
  useEffect(() => {
    if (!storageKey || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch { /* 忽略配额错误 */ }
  }, [pos, storageKey]);

  /** 重置到初始位置 */
  const reset = useCallback(() => setPos(initial), [initial]);

  return {
    pos,
    setPos,
    dragging,
    elRef,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp
    }
  };
}
