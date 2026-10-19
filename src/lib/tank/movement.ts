import { DX, DY, TANK_SIZE } from "./constants.ts";
import type { Dir, Rect, Tank } from "./constants.ts";
import { rectBlocksTank } from "./terrain.ts";

/** 半開區間矩形相交（相接不算） */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const S = TANK_SIZE;

function hitsTank(x: number, y: number, ox: number, oy: number, o: Tank): boolean {
  const nowHit = x < o.x + S && x + S > o.x && y < o.y + S && y + S > o.y;
  if (!nowHit) return false;
  // 原本就重疊 → 允許移開
  const wasHit = ox < o.x + S && ox + S > o.x && oy < o.y + S && oy + S > o.y;
  return !wasHit;
}

/** 坦克從 (ox,oy) 移到 (x,y) 能不能走 */
export function canOccupy(grid: Uint8Array, x: number, y: number, ox: number, oy: number, others: readonly Tank[]): boolean {
  if (rectBlocksTank(grid, x, y, S, S)) return false;
  for (const o of others) if (hitsTank(x, y, ox, oy, o)) return false;
  return true;
}

/** 轉向：垂直轉彎時對齊 8px（round → floor → ceil；都擋就不對齊）；反向掉頭不對齊 */
export function snapForTurn(grid: Uint8Array, t: Tank, dir: Dir, others: readonly Tank[]): void {
  const old = t.dir;
  t.dir = dir;
  if (old === dir || (old + 2) % 4 === dir) return;
  const horizontalBefore = old === 1 || old === 3;
  const v = horizontalBefore ? t.x : t.y;
  for (const nv of [Math.round(v / 8) * 8, Math.floor(v / 8) * 8, Math.ceil(v / 8) * 8]) {
    const nx = horizontalBefore ? nv : t.x;
    const ny = horizontalBefore ? t.y : nv;
    if (nv === v || canOccupy(grid, nx, ny, t.x, t.y, others)) {
      t.x = nx;
      t.y = ny;
      return;
    }
  }
}

/**
 * 沿 t.dir 以累加器逐 px 前進；被擋 → 停、acc=0、blocked=true。
 * maxPx 限制本次最多走幾 px（冰面滑行用）。回傳實際前進 px。
 */
export function moveTank(grid: Uint8Array, t: Tank, speed: number, others: readonly Tank[], maxPx = Infinity): number {
  t.acc += speed;
  let n = Math.floor(t.acc + 1e-9);
  t.acc -= n;
  if (t.acc < 1e-9) t.acc = 0;
  n = Math.min(n, maxPx);
  if (n <= 0) return 0; // 本 tick 沒有前進的 px：blocked 維持上一次的結果
  t.blocked = false;
  let moved = 0;
  for (let i = 0; i < n; i++) {
    const nx = t.x + DX[t.dir];
    const ny = t.y + DY[t.dir];
    if (!canOccupy(grid, nx, ny, t.x, t.y, others)) {
      t.blocked = true;
      t.acc = 0;
      break;
    }
    t.x = nx;
    t.y = ny;
    moved++;
  }
  return moved;
}
