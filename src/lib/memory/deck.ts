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
  /** 翻錯時兩張牌亮多久才蓋回去（ms） */
  peekMs: number;
}

export const MEMORY_DIFFICULTIES: DifficultyInfo[] = [
  { id: "easy", label: "簡單", emoji: "🐣", peekMs: 1000 },
  { id: "normal", label: "普通", emoji: "🐥", peekMs: 900 },
  { id: "hard", label: "困難", emoji: "🦅", peekMs: 700 },
];

/** 困難模式至少幾對 */
const HARD_PAIRS = 12;

/**
 * 每局幾對：簡單就是這一關原本的對數，普通多 2 對，困難至少 12 對；
 * 這一關的圖不夠時就全部用上。
 */
export function pairsFor(basePairs: number, itemCount: number, d: DifficultyInfo): number {
  const want = d.id === "easy" ? basePairs : d.id === "normal" ? basePairs + 2 : Math.max(HARD_PAIRS, basePairs + 4);
  return Math.min(want, itemCount);
}

/**
 * 牌要排幾欄才能在 w×h 的空間裡最大：每張是正方形，間距 gap。
 * 一樣大時選空格比較少的排法。
 */
export function bestGrid(count: number, w: number, h: number, gap: number): { cols: number; rows: number; size: number } {
  let best = { cols: 1, rows: count, size: 0, empty: Infinity };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const size = Math.floor(Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows));
    const empty = rows * cols - count;
    if (size > best.size || (size === best.size && empty < best.empty)) best = { cols, rows, size, empty };
  }
  return { cols: best.cols, rows: best.rows, size: Math.max(0, best.size) };
}
