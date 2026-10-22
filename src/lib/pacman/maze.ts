/**
 * 小精靈迷宮（原創，左右對稱、沒有死路）。
 * # 牆　_ 迷宮外的空白　- 鬼屋門　H 鬼屋內部
 * . 豆子　o 大力丸　空白 沒豆子的通道　T 隧道（鬼會變慢，左右相通）　P 小精靈出生點
 */
export const MAZE_ROWS = [
  "###################",
  "#........#........#",
  "#o##.###.#.###.##o#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#....#...#...#....#",
  "####.### # ###.####",
  "___#.#       #.#___",
  "####.# ##-## #.####",
  "TTTT.  #HHH#  .TTTT",
  "####.# ##### #.####",
  "___#.#       #.#___",
  "####.# ##### #.####",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#o.#.....P.....#.o#",
  "##.#.#.#####.#.#.##",
  "#....#...#...#....#",
  "#.######.#.######.#",
  "#.................#",
  "###################",
] as const;

export const COLS = MAZE_ROWS[0].length;
export const ROWS = MAZE_ROWS.length;

export type Dir = 0 | 1 | 2 | 3; // 上 右 下 左
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;
export const opposite = (d: Dir): Dir => ((d + 2) % 4) as Dir;

export interface Tile {
  col: number;
  row: number;
}

/** 鬼屋門正上方的格子：鬼出門後、眼睛回家前都經過這裡 */
export const HOUSE_EXIT: Tile = { col: 9, row: 7 };
/** 鬼屋正中間（眼睛回到這裡復活） */
export const HOUSE_CENTER: Tile = { col: 9, row: 9 };
/** 水果出現的位置（鬼屋正下方） */
export const FRUIT_TILE: Tile = { col: 9, row: 11 };

export function charAt(col: number, row: number): string {
  if (row < 0 || row >= ROWS) return "_";
  return MAZE_ROWS[row][((col % COLS) + COLS) % COLS];
}

/** 小精靈與在外面跑的鬼可以走的格子（左右超出邊界的隧道會繞回另一邊） */
export function isOpen(col: number, row: number): boolean {
  const ch = charAt(col, row);
  return ch !== "#" && ch !== "_" && ch !== "-" && ch !== "H";
}

export function isTunnel(col: number, row: number): boolean {
  return charAt(col, row) === "T";
}

/** 左右繞回後的欄 */
export function wrapCol(col: number): number {
  return ((col % COLS) + COLS) % COLS;
}

export function findChar(ch: string): Tile {
  for (let row = 0; row < ROWS; row++) {
    const col = MAZE_ROWS[row].indexOf(ch);
    if (col >= 0) return { col, row };
  }
  throw new Error(`maze has no ${ch}`);
}

export const PAC_START = findChar("P");

/** 豆子：0 無、1 小豆子、2 大力丸；索引 = row * COLS + col */
export function createDots(): Uint8Array {
  const dots = new Uint8Array(COLS * ROWS);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = MAZE_ROWS[row][col];
      if (ch === ".") dots[row * COLS + col] = 1;
      else if (ch === "o") dots[row * COLS + col] = 2;
    }
  }
  return dots;
}
