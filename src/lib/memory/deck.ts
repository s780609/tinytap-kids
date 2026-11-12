/**
 * 記憶翻牌：從這一關的圖裡挑幾種、每種兩張、洗牌。
 */
export function buildDeck(ids: readonly string[], pairs: number, rand: () => number = Math.random): string[] {
  const pool = shuffle([...new Set(ids)], rand).slice(0, Math.min(pairs, ids.length));
  return shuffle([...pool, ...pool], rand);
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}


export type MemoryDifficulty = "easy" | "normal" | "hard";

export interface DifficultyInfo {
  id: MemoryDifficulty;
  label: string;
  emoji: string;
  /** 每局幾對（每一關都一樣） */
  pairs: number;
  /** 翻錯時兩張牌亮多久才蓋回去（ms） */
  peekMs: number;
}

export const MEMORY_DIFFICULTIES: DifficultyInfo[] = [
  { id: "easy", label: "簡單", emoji: "🐣", pairs: 8, peekMs: 1000 },
  { id: "normal", label: "普通", emoji: "🐥", pairs: 10, peekMs: 900 },
  { id: "hard", label: "困難", emoji: "🦅", pairs: 12, peekMs: 700 },
];

/** 每局幾對：照難度（8 / 10 / 12），這一關的圖不夠時就全部用上 */
export function pairsFor(itemCount: number, d: DifficultyInfo): number {
  return Math.min(d.pairs, itemCount);
}

/**
 * 排每列都滿的方格時，牌最多可以比最大的排法小多少（比例）。
 * 超過就寧可最後一列不滿，牌才不會小到不好按。
 */
const FULL_ROWS_MIN_RATIO = 0.6;
/** 排滿的排法大小差不到這個比例時，選比較接近正方形的（4×4 比 2×8 好看） */
const SQUARE_PREFER_RATIO = 0.94;

/**
 * 牌要排幾欄才能在 w×h 的空間裡最大：每張是正方形，間距 gap。
 * 優先選每列都排滿的排法，最後一列才不會只剩一兩張凸出來；
 * 一樣大時選空格比較少的排法。
 */
export function bestGrid(count: number, w: number, h: number, gap: number): { cols: number; rows: number; size: number } {
  let best = { cols: 1, rows: count, size: 0, empty: Infinity };
  const fulls: (typeof best)[] = [];
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const size = Math.floor(Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows));
    const empty = rows * cols - count;
    if (size > best.size || (size === best.size && empty < best.empty)) best = { cols, rows, size, empty };
    if (empty === 0) fulls.push({ cols, rows, size, empty });
  }
  const maxFull = Math.max(0, ...fulls.map((f) => f.size));
  const full = fulls
    .filter((f) => f.size >= maxFull * SQUARE_PREFER_RATIO)
    .sort((a, b) => Math.abs(a.cols - a.rows) - Math.abs(b.cols - b.rows) || b.size - a.size)[0];
  const pick = full && full.size >= best.size * FULL_ROWS_MIN_RATIO ? full : best;
  return { cols: pick.cols, rows: pick.rows, size: Math.max(0, pick.size) };
}
