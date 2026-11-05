/**
 * 復古雷電的虛擬搖桿：把搖桿頭的位移換成 -1～1 的移動方向（純函式，方便測試）。
 */

/** 中間這一圈（佔半徑的比例）不算推動，手指稍微晃一下飛機不會飄 */
export const STICK_DEAD = 0.15;

/**
 * ox, oy：手指相對搖桿中心的位移（px，往下是正）；radius：推到底的距離。
 * 回傳長度 0～1 的向量，從死區外緣由 0 平滑變大，推到底（或超過）是 1。
 */
export function stickVector(ox: number, oy: number, radius: number): { dx: number; dy: number } {
  const d = Math.hypot(ox, oy);
  const dead = radius * STICK_DEAD;
  if (d <= dead) return { dx: 0, dy: 0 };
  const mag = Math.min(1, (d - dead) / (radius - dead));
  return { dx: (ox / d) * mag, dy: (oy / d) * mag };
}

/** 鍵盤方向和搖桿一起用時相加，再限制在 -1～1 */
export function mergeAxis(key: number, stick: number): number {
  return Math.max(-1, Math.min(1, key + stick));
}
