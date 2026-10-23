/**
 * 背景地圖：用 Kenney Pixel Shmup 的 16×16 地形格子（public/raiden/tiles.png，CC0）拼出三種地形。
 * 地圖寬 15 格（240px）、高 MAP_ROWS 格，上下循環捲動；回傳每格的格子編號（tiles.png 由左到右、由上到下 0 起算）。
 */
import { rand, randInt } from "../tank/rng.ts";

export const TILE = 16;
export const MAP_COLS = 15;
export const MAP_ROWS = 240;

const U = 1;
const R = 2;
const D = 4;
const L = 8;

/** 草地上的道路：連接方向 → 格子編號（水道是同樣排列 +6） */
export const PATH_TILE: Record<number, number> = {
  [U | D]: 85,
  [L | R]: 74,
  [R | D]: 73,
  [L | D]: 75,
  [U | R]: 97,
  [U | L]: 99,
  [U | D | R]: 76,
  [U | D | L]: 77,
  [L | R | D]: 88,
  [L | R | U]: 89,
  [U | R | D | L]: 86,
  [U]: 112,
  [L]: 113,
  [D]: 100,
  [R]: 101,
};

/** 水上的島（3×3 邊框）：草地島，沙地島 +6 */
const ISLAND = { tl: 37, t: 38, tr: 39, l: 49, c: 50, r: 51, bl: 61, b: 62, br: 63 };

export const T = {
  water: 42,
  grass: 50,
  grass2: 110,
  dirt: 116,
  treesG: [36, 48, 60],
  treesD: [54, 66],
  houseG: [72, 84],
  houseD: [78, 90],
  flagG: 96,
  flagD: 102,
  fieldG: 109,
  fieldD: 115,
  craterG: 111,
  craterD: 117,
  islet: [64, 65],
  isletD: [70, 71],
  /** 2×2 小池塘：左上、右上、左下、右下 */
  pondG: [40, 41, 52, 53],
  pondD: [46, 47, 58, 59],
} as const;

const idx = (c: number, r: number) => ((r + MAP_ROWS) % MAP_ROWS) * MAP_COLS + c;

/** 由「哪些格子是路」算出每格的道路格子編號；超出左右邊界的路視為往畫面外延伸 */
export function pathTiles(isPath: Uint8Array, edgeL: Set<number>, edgeR: Set<number>, offset: number): Map<number, number> {
  const out = new Map<number, number>();
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (!isPath[idx(c, r)]) continue;
      let m = 0;
      if (isPath[idx(c, r - 1)]) m |= U;
      if (isPath[idx(c, r + 1)]) m |= D;
      if (c > 0 ? isPath[idx(c - 1, r)] : edgeL.has(r)) m |= L;
      if (c < MAP_COLS - 1 ? isPath[idx(c + 1, r)] : edgeR.has(r)) m |= R;
      const tile = PATH_TILE[m];
      if (tile !== undefined) out.set(idx(c, r), tile + offset);
    }
  }
  return out;
}

function pick<T>(st: { seed: number }, list: readonly T[]): T {
  return list[randInt(st, 0, list.length - 1)];
}

/** 0 草原（道路網）、1 海上（草地與沙地島嶼）、2 要塞（沙地＋水道） */
export function buildTilemap(terrain: 0 | 1 | 2, seed = 20261022 + terrain): Uint8Array {
  const st = { seed };
  const map = new Uint8Array(MAP_COLS * MAP_ROWS);
  const used = new Uint8Array(MAP_COLS * MAP_ROWS);

  if (terrain === 1) {
    map.fill(T.water);
    // 島嶼：彼此至少隔一格水，不跨過地圖上下接縫
    for (let r = 3; r < MAP_ROWS - 10; ) {
      const h = randInt(st, 3, 8);
      const placed = randInt(st, 1, 3);
      for (let k = 0; k < placed; k++) {
        const w = randInt(st, 3, 7);
        const c0 = randInt(st, 0, MAP_COLS - w);
        let free = true;
        for (let y = r - 1; y <= r + h && free; y++) {
          for (let x = c0 - 1; x <= c0 + w && free; x++) if (x >= 0 && x < MAP_COLS && used[idx(x, y)]) free = false;
        }
        if (!free) continue;
        const dirt = rand(st) < 0.3 ? 6 : 0;
        for (let y = r; y < r + h; y++) {
          for (let x = c0; x < c0 + w; x++) {
            const top = y === r;
            const bottom = y === r + h - 1;
            // 碰到左右邊界的島視為延伸到畫面外
            const left = x === c0 && x > 0;
            const right = x === c0 + w - 1 && x < MAP_COLS - 1;
            const key = top ? (left ? "tl" : right ? "tr" : "t") : bottom ? (left ? "bl" : right ? "br" : "b") : left ? "l" : right ? "r" : "c";
            let tile = ISLAND[key] + dirt;
            if (key === "c") {
              const roll = rand(st);
              if (roll < 0.3) tile = pick(st, dirt ? T.treesD : T.treesG);
              else if (roll < 0.38) tile = pick(st, dirt ? T.houseD : T.houseG);
              else if (roll < 0.42) tile = dirt ? T.fieldD : T.fieldG;
            }
            map[idx(x, y)] = tile;
            used[idx(x, y)] = 1;
          }
        }
      }
      r += h + randInt(st, 1, 4);
    }
    for (let i = 0; i < map.length; i++) {
      if (map[i] === T.water && rand(st) < 0.03) map[i] = rand(st) < 0.7 ? pick(st, T.islet) : pick(st, T.isletD);
    }
    return map;
  }

  const grass = terrain === 0;
  const offset = grass ? 0 : 6;
  for (let i = 0; i < map.length; i++) map[i] = grass ? (rand(st) < 0.2 ? T.grass2 : T.grass) : T.dirt;

  // 道路（草原）或水道（要塞）：兩條直的貫穿全圖，橫的隔一段接一條
  const isPath = new Uint8Array(MAP_COLS * MAP_ROWS);
  const edgeL = new Set<number>();
  const edgeR = new Set<number>();
  const cols = grass ? [3, 11] : [2, 12];
  for (const c of cols) for (let r = 0; r < MAP_ROWS; r++) isPath[idx(c, r)] = 1;
  for (let r = randInt(st, 4, 10); r < MAP_ROWS - 2; r += randInt(st, 10, 18)) {
    const kind = randInt(st, 0, 2);
    const [c0, c1] = kind === 0 ? [cols[0], cols[1]] : kind === 1 ? [0, cols[1]] : [cols[0], MAP_COLS - 1];
    for (let c = c0; c <= c1; c++) isPath[idx(c, r)] = 1;
    if (c0 === 0) edgeL.add(r);
    if (c1 === MAP_COLS - 1) edgeR.add(r);
  }
  for (const [i, tile] of pathTiles(isPath, edgeL, edgeR, offset)) {
    map[i] = tile;
    used[i] = 1;
  }

  // 2×2 池塘
  for (let k = 0; k < 14; k++) {
    const c = randInt(st, 0, MAP_COLS - 2);
    const r = randInt(st, 2, MAP_ROWS - 4);
    const cells = [idx(c, r), idx(c + 1, r), idx(c, r + 1), idx(c + 1, r + 1)];
    if (cells.some((i) => used[i])) continue;
    const pond = grass ? T.pondG : T.pondD;
    cells.forEach((i, n) => {
      map[i] = pond[n];
      used[i] = 1;
    });
  }

  // 其他擺設：樹林、房子（靠路邊）、田、彈坑、旗子
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const i = idx(c, r);
      if (used[i]) continue;
      const nearPath = (c > 0 && isPath[idx(c - 1, r)]) || (c < MAP_COLS - 1 && isPath[idx(c + 1, r)]);
      const roll = rand(st);
      if (nearPath && roll < 0.14) map[i] = pick(st, grass ? T.houseG : T.houseD);
      else if (roll < (grass ? 0.18 : 0.08)) map[i] = pick(st, grass ? T.treesG : T.treesD);
      else if (roll < (grass ? 0.22 : 0.12)) map[i] = grass ? T.fieldG : T.fieldD;
      else if (roll < (grass ? 0.235 : 0.18)) map[i] = grass ? T.craterG : T.craterD;
      else if (roll < (grass ? 0.24 : 0.19)) map[i] = grass ? T.flagG : T.flagD;
    }
  }
  return map;
}
