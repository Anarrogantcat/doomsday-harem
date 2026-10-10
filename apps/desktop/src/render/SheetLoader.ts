/**
 * 瓦片图集加载器。
 *
 * 素材：Kenney.nl 的 CC0 图集（见 public/assets/manifest.json）
 * 用法：加载一次后按网格坐标取帧，绘制到 canvas。
 */

export interface SheetSpec {
  /** 图集 URL */
  url: string;
  /** 单格像素尺寸 */
  grid: number;
  /** 可选：缩放倍数 */
  scale?: number;
}

export interface LoadedSheet {
  image: HTMLImageElement;
  grid: number;
  scale: number;
  /** 列数 */
  cols: number;
  /** 行数 */
  rows: number;
}

/** 帧坐标（列, 行） */
export interface Frame {
  col: number;
  row: number;
}

const cache = new Map<string, LoadedSheet>();

/** 加载图集 */
export async function loadSheet(spec: SheetSpec): Promise<LoadedSheet> {
  const key = `${spec.url}@${spec.grid}@${spec.scale ?? 1}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`图集加载失败：${spec.url}`));
    img.src = spec.url;
  });

  const scale = spec.scale ?? 1;
  const loaded: LoadedSheet = {
    image,
    grid: spec.grid,
    scale,
    cols: Math.floor(image.width / spec.grid),
    rows: Math.floor(image.height / spec.grid)
  };
  cache.set(key, loaded);
  return loaded;
}

/** 绘制单帧 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: LoadedSheet,
  frame: Frame,
  x: number,
  y: number,
  size?: number
): void {
  const s = (size ?? sheet.grid) * sheet.scale;
  const sx = frame.col * sheet.grid;
  const sy = frame.row * sheet.grid;
  ctx.drawImage(sheet.image, sx, sy, sheet.grid, sheet.grid, x, y, s, s);
}

/** 绘制多帧瓦片地板（平铺） */
export function drawTileFloor(
  ctx: CanvasRenderingContext2D,
  sheet: LoadedSheet,
  frame: Frame,
  x: number,
  y: number,
  cols: number,
  rows: number,
  size?: number
): void {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      drawFrame(ctx, sheet, frame, x + i * (size ?? sheet.grid) * sheet.scale, y + j * (size ?? sheet.grid) * sheet.scale, size);
    }
  }
}

/** 清空缓存（切换画风时用） */
export function clearSheetCache(): void {
  cache.clear();
}

/** 已加载的图集数 */
export function cacheSize(): number {
  return cache.size;
}

// ============ 预定义帧坐标 ============

/**
 * 从 Kenney 室内图集里挑出的可用帧。
 * 坐标为（列, 行），基于 16×16 网格。
 * 这些是地板与墙体的基础瓦片，用于要塞剖面与房间背景。
 */
export const INDOOR_FRAMES = {
  /** 木地板 */
  floorWood: { col: 0, row: 0 } as Frame,
  /** 石地板 */
  floorStone: { col: 1, row: 0 } as Frame,
  /** 砖墙 */
  wallBrick: { col: 2, row: 0 } as Frame,
  /** 木墙 */
  wallWood: { col: 3, row: 0 } as Frame,
  /** 门 */
  door: { col: 4, row: 0 } as Frame,
  /** 窗 */
  window: { col: 5, row: 0 } as Frame
};

/** RPG 图集里的角色帧（16×16） */
export const RPG_FRAMES = {
  /** 角色 A 站立 */
  actorA: { col: 0, row: 0 } as Frame,
  /** 角色 B 站立 */
  actorB: { col: 1, row: 0 } as Frame,
  /** 箱子 */
  crate: { col: 0, row: 1 } as Frame,
  /** 木桶 */
  barrel: { col: 1, row: 1 } as Frame
};

/** 素材清单路径 */
export const ASSET_MANIFEST = "/assets/manifest.json";
export const SHEET_INDOOR = "/assets/tiles/indoor.png";
export const SHEET_RPG = "/assets/sprites/rpg.png";
