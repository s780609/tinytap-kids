import { T, GRID_N, SUB, MAP_PX, BASE_RECT, BULLET_SIZE } from "./constants.ts";
import type { Bullet, Rect } from "./constants.ts";

/** 基地外圈 8 個子格 [欄, 列] */
export const BASE_RING: readonly (readonly [number, number])[] = [
  [11, 23], [12, 23], [13, 23], [14, 23],
  [11, 24], [14, 24],
  [11, 25], [14, 25],
];

function overlaps(ax: number, ay: number, aw: number, ah: number, b: Rect): boolean {
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}

/** 矩形會不會被地形/邊界/基地擋住（半開區間，相接不算） */
export function rectBlocksTank(grid: Uint8Array, x: number, y: number, w: number, h: number): boolean {
  if (x < 0 || y < 0 || x + w > MAP_PX || y + h > MAP_PX) return true;
  if (overlaps(x, y, w, h, BASE_RECT)) return true;
  const c0 = Math.floor(x / SUB);
  const c1 = Math.ceil((x + w) / SUB) - 1;
  const r0 = Math.floor(y / SUB);
  const r1 = Math.ceil((y + h) / SUB) - 1;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const v = grid[r * GRID_N + c];
      if (v === T.BRICK || v === T.STEEL || v === T.WATER) return true;
    }
  }
  return false;
}

/**
 * 子彈目前位置與地形的碰撞。null = 繼續飛；"brick"/"steel" = 子彈消失。
 * 打到時破壞「行進方向最先碰到的那排子格」中與 [中心-8, 中心+8) 有交集者。
 */
export function bulletTerrainHit(grid: Uint8Array, b: Bullet): "brick" | "steel" | null {
  const s = BULLET_SIZE;
  if (b.x < 0 || b.y < 0 || b.x + s > MAP_PX || b.y + s > MAP_PX) return "steel";
  const c0 = Math.floor(b.x / SUB);
  const c1 = Math.ceil((b.x + s) / SUB) - 1;
  const r0 = Math.floor(b.y / SUB);
  const r1 = Math.ceil((b.y + s) / SUB) - 1;
  const vertical = b.dir === 0 || b.dir === 2;
  // 找出碰到的實心子格中，最靠子彈尾端（最先碰到）的那一排/欄
  let front = -1;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const v = grid[r * GRID_N + c];
      if (v !== T.BRICK && v !== T.STEEL) continue;
      const line = vertical ? r : c;
      if (front === -1) front = line;
      else if (b.dir === 0 || b.dir === 3) front = Math.max(front, line);
      else front = Math.min(front, line);
    }
  }
  if (front === -1) return null;

  const center = vertical ? b.x + s / 2 : b.y + s / 2;
  const lo = Math.max(0, Math.floor((center - 8) / SUB));
  const hi = Math.min(GRID_N - 1, Math.ceil((center + 8) / SUB) - 1);
  let brick = false;
  for (let k = lo; k <= hi; k++) {
    const idx = vertical ? front * GRID_N + k : k * GRID_N + front;
    const v = grid[idx];
    if (v === T.BRICK) {
      grid[idx] = T.EMPTY;
      brick = true;
    } else if (v === T.STEEL && b.breaksSteel) {
      grid[idx] = T.EMPTY;
    }
  }
  return brick ? "brick" : "steel";
}

/** 把基地外圈 8 子格鋪成 material；被 occupiedRects 壓住的子格不寫 */
export function applyBaseRing(grid: Uint8Array, material: number, occupiedRects: readonly Rect[]): void {
  for (const [c, r] of BASE_RING) {
    const x = c * SUB;
    const y = r * SUB;
    if (occupiedRects.some((o) => overlaps(x, y, SUB, SUB, o))) continue;
    grid[r * GRID_N + c] = material;
  }
}
