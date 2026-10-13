/**
 * 擦窗戶：用粗格子記錄霧被擦掉多少（純函式，方便測試）。
 * 不讀 canvas 像素，手指每次移動只更新格子，判斷「擦乾淨了沒」很便宜。
 */

export interface WipeGrid {
  cols: number;
  rows: number;
  cellSize: number;
  /** 1 = 已擦掉 */
  cleared: Uint8Array;
  clearedCount: number;
}

export function createGrid(width: number, height: number, cellSize: number): WipeGrid {
  const cols = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  return { cols, rows, cellSize, cleared: new Uint8Array(cols * rows), clearedCount: 0 };
}

/** 擦掉中心落在圓內的格子，回傳這次新擦掉的格數 */
export function wipeAt(g: WipeGrid, x: number, y: number, radius: number): number {
  const s = g.cellSize;
  const c0 = Math.max(0, Math.floor((x - radius) / s));
  const c1 = Math.min(g.cols - 1, Math.floor((x + radius) / s));
  const r0 = Math.max(0, Math.floor((y - radius) / s));
  const r1 = Math.min(g.rows - 1, Math.floor((y + radius) / s));
  let added = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const i = r * g.cols + c;
      if (g.cleared[i]) continue;
      const dx = (c + 0.5) * s - x;
      const dy = (r + 0.5) * s - y;
      if (dx * dx + dy * dy <= radius * radius) {
        g.cleared[i] = 1;
        added++;
      }
    }
  }
  g.clearedCount += added;
  return added;
}

/** 沿著兩點之間每隔半個半徑擦一次，手指滑很快也不會漏 */
export function wipeLine(
  g: WipeGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number
): number {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / (radius / 2)));
  let added = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    added += wipeAt(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius);
  }
  return added;
}

export function clearedRatio(g: WipeGrid): number {
  return g.clearedCount / g.cleared.length;
}
