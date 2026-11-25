/**
 * 城市狂飆的城市地圖（純函式，方便測試）。
 * 棋盤狀街道：每 BLOCK 格一條雙線道（右側通行），中間是街區；
 * 街區外圈是人行道，裡面是大樓、公園或停車場，正中間一塊是警察局。
 */

import { rand, randInt } from "../tank/rng.ts";

export const TILE = 32;
/** 每個街區（含道路）佔幾格 */
export const BLOCK = 12;
/** 每個方向有幾個街區 */
export const BLOCKS = 7;
/** 道路條數（每個方向） */
export const ROADS = BLOCKS + 1;
/** 地圖邊長（格） */
export const MAP_N = BLOCKS * BLOCK + 2;
export const WORLD = MAP_N * TILE;

export const T = {
  Road: 0,
  Sidewalk: 1,
  Building: 2,
  Grass: 3,
  Tree: 4,
  Parking: 5,
} as const;
export type T = (typeof T)[keyof typeof T];

export type BlockKind = "buildings" | "park" | "parking" | "police";

export interface Building {
  /** 以格為單位 */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 屋頂顏色 */
  color: string;
  /** 高度（越大牆越長），0.08～0.3 */
  height: number;
  /** 屋頂上的裝飾 */
  roof: "plain" | "ac" | "helipad" | "garden" | "tank";
  police?: boolean;
}

export interface CityMap {
  tiles: Uint8Array;
  buildings: Building[];
  blocks: BlockKind[];
  /** 停車場裡停好的車位置（像素、朝向） */
  parked: { x: number; y: number; angle: number }[];
  /** 警察局門口（被抓後從這裡出發） */
  station: { x: number; y: number };
}

const ROOF_COLORS = ["#8D6E63", "#78909C", "#A1887F", "#90A4AE", "#B0BEC5", "#BCAAA4", "#7E8C9A", "#9E9D89", "#C5A880", "#8C7B9E"];

export function tileAt(m: CityMap, tx: number, ty: number): T {
  if (tx < 0 || ty < 0 || tx >= MAP_N || ty >= MAP_N) return T.Building;
  return m.tiles[ty * MAP_N + tx] as T;
}

/** 車子和人都過不去的格子 */
export function isSolid(t: T): boolean {
  return t === T.Building || t === T.Tree;
}

/** 這一格屬於道路（含路口） */
export function isRoadIndex(i: number): boolean {
  return i % BLOCK < 2;
}

/** 路口（兩條路交會）的格子 */
export function isIntersection(tx: number, ty: number): boolean {
  return isRoadIndex(tx) && isRoadIndex(ty);
}

/** 方向：0 東、1 南、2 西、3 北 */
export type Dir = 0 | 1 | 2 | 3;
export const DIR_VEC: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/**
 * 車道中心線（像素）：東西向的車看 y，南北向的車看 x。
 * 右側通行：往東在下面那一格、往西在上面；往南在左邊、往北在右邊。
 */
export function laneCoord(dir: Dir, road: number): number {
  const base = road * BLOCK;
  if (dir === 0) return (base + 1.5) * TILE;
  if (dir === 2) return (base + 0.5) * TILE;
  if (dir === 1) return (base + 0.5) * TILE;
  return (base + 1.5) * TILE;
}

/** 往 dir 開的車進入第 (ix, iy) 個路口前停的點 */
export function entryPoint(dir: Dir, ix: number, iy: number): { x: number; y: number } {
  const x0 = ix * BLOCK * TILE;
  const y0 = iy * BLOCK * TILE;
  if (dir === 0) return { x: x0 - 6, y: laneCoord(0, iy) };
  if (dir === 2) return { x: x0 + 2 * TILE + 6, y: laneCoord(2, iy) };
  if (dir === 1) return { x: laneCoord(1, ix), y: y0 - 6 };
  return { x: laneCoord(3, ix), y: y0 + 2 * TILE + 6 };
}

/** 從第 (ix, iy) 個路口往 dir 開出去的點 */
export function exitPoint(dir: Dir, ix: number, iy: number): { x: number; y: number } {
  const x0 = ix * BLOCK * TILE;
  const y0 = iy * BLOCK * TILE;
  if (dir === 0) return { x: x0 + 2 * TILE + 6, y: laneCoord(0, iy) };
  if (dir === 2) return { x: x0 - 6, y: laneCoord(2, iy) };
  if (dir === 1) return { x: laneCoord(1, ix), y: y0 + 2 * TILE + 6 };
  return { x: laneCoord(3, ix), y: y0 - 6 };
}

/** 在路口可以往哪些方向開（不出地圖、不迴轉） */
export function exitsAt(ix: number, iy: number, from: Dir): Dir[] {
  const out: Dir[] = [];
  for (const d of [0, 1, 2, 3] as Dir[]) {
    if (d === (from + 2) % 4) continue;
    const nx = ix + DIR_VEC[d][0];
    const ny = iy + DIR_VEC[d][1];
    if (nx >= 0 && ny >= 0 && nx < ROADS && ny < ROADS) out.push(d);
  }
  // 死路（角落）才准迴轉
  return out.length > 0 ? out : [((from + 2) % 4) as Dir];
}

function setTile(tiles: Uint8Array, x: number, y: number, t: T) {
  tiles[y * MAP_N + x] = t;
}

/** 把街區內部切成幾棟大樓，大樓之間留一格小巷 */
function splitLot(x: number, y: number, w: number, h: number, depth: number, st: { seed: number }, out: { x: number; y: number; w: number; h: number }[]) {
  const canSplitW = w >= 5;
  const canSplitH = h >= 5;
  if (depth >= 2 || (!canSplitW && !canSplitH) || (depth > 0 && rand(st) < 0.3)) {
    out.push({ x, y, w, h });
    return;
  }
  const vertical = canSplitW && (!canSplitH || rand(st) < 0.5);
  if (vertical) {
    const cut = randInt(st, 2, w - 3);
    splitLot(x, y, cut, h, depth + 1, st, out);
    splitLot(x + cut + 1, y, w - cut - 1, h, depth + 1, st, out);
  } else {
    const cut = randInt(st, 2, h - 3);
    splitLot(x, y, w, cut, depth + 1, st, out);
    splitLot(x, y + cut + 1, w, h - cut - 1, depth + 1, st, out);
  }
}

export function createMap(seed = 20261125): CityMap {
  const st = { seed };
  const tiles = new Uint8Array(MAP_N * MAP_N).fill(T.Sidewalk);
  const buildings: Building[] = [];
  const blocks: BlockKind[] = [];
  const parked: CityMap["parked"] = [];

  // 道路
  for (let y = 0; y < MAP_N; y++) {
    for (let x = 0; x < MAP_N; x++) {
      if (isRoadIndex(x) || isRoadIndex(y)) setTile(tiles, x, y, T.Road);
    }
  }

  const center = Math.floor(BLOCKS / 2);
  let station = { x: 0, y: 0 };
  for (let by = 0; by < BLOCKS; by++) {
    for (let bx = 0; bx < BLOCKS; bx++) {
      // 街區內部（人行道裡面那 8×8）
      const ix = bx * BLOCK + 3;
      const iy = by * BLOCK + 3;
      const inner = BLOCK - 4;
      let kind: BlockKind;
      if (bx === center && by === center) kind = "police";
      else {
        const r = rand(st);
        kind = r < 0.16 ? "park" : r < 0.3 ? "parking" : "buildings";
      }
      blocks.push(kind);

      if (kind === "park") {
        for (let y = iy; y < iy + inner; y++) {
          for (let x = ix; x < ix + inner; x++) {
            const edge = x === ix || y === iy || x === ix + inner - 1 || y === iy + inner - 1;
            // 中間十字小路，四周隨機種樹
            const path = x === ix + inner / 2 || y === iy + inner / 2;
            setTile(tiles, x, y, path ? T.Sidewalk : !edge && rand(st) < 0.22 ? T.Tree : T.Grass);
          }
        }
      } else if (kind === "parking") {
        for (let y = iy; y < iy + inner; y++) for (let x = ix; x < ix + inner; x++) setTile(tiles, x, y, T.Parking);
        // 上下兩排車位，隨機停幾台車
        for (const row of [iy + 0.75, iy + inner - 0.75]) {
          for (let k = 0; k < inner; k++) {
            if (rand(st) < 0.35) {
              parked.push({ x: (ix + k + 0.5) * TILE, y: row * TILE, angle: row < iy + inner / 2 ? Math.PI / 2 : -Math.PI / 2 });
            }
          }
        }
      } else if (kind === "police") {
        // 警察局：上半是大樓，下半是門口廣場
        const b: Building = {
          x: ix + 1,
          y: iy,
          w: inner - 2,
          h: 4,
          color: "#3F51B5",
          height: 0.18,
          roof: "helipad",
          police: true,
        };
        buildings.push(b);
        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) setTile(tiles, x, y, T.Building);
        for (let y = iy + 4; y < iy + inner; y++) for (let x = ix; x < ix + inner; x++) setTile(tiles, x, y, T.Parking);
        station = { x: (ix + inner / 2) * TILE, y: (iy + 5) * TILE };
        parked.push({ x: (ix + 1.5) * TILE, y: (iy + 6.5) * TILE, angle: -Math.PI / 2 });
        parked.push({ x: (ix + inner - 1.5) * TILE, y: (iy + 6.5) * TILE, angle: -Math.PI / 2 });
      } else {
        const lots: { x: number; y: number; w: number; h: number }[] = [];
        splitLot(ix, iy, inner, inner, 0, st, lots);
        for (const lot of lots) {
          const r = rand(st);
          const b: Building = {
            ...lot,
            color: ROOF_COLORS[randInt(st, 0, ROOF_COLORS.length - 1)],
            height: 0.08 + rand(st) * 0.22,
            roof: r < 0.35 ? "ac" : r < 0.5 ? "tank" : r < 0.62 ? "garden" : r < 0.7 && lot.w >= 4 && lot.h >= 4 ? "helipad" : "plain",
          };
          buildings.push(b);
          for (let y = lot.y; y < lot.y + lot.h; y++) for (let x = lot.x; x < lot.x + lot.w; x++) setTile(tiles, x, y, T.Building);
        }
      }
    }
  }

  return { tiles, buildings, blocks, parked, station };
}

/** 隨機找一個某種地形的格子中心（像素），找不到回傳 null */
export function randomTileOf(
  m: CityMap,
  st: { seed: number },
  kinds: T[],
  near?: { x: number; y: number; min: number; max: number },
  tries = 40
): { x: number; y: number } | null {
  for (let i = 0; i < tries; i++) {
    let tx: number;
    let ty: number;
    if (near) {
      const a = rand(st) * Math.PI * 2;
      const d = near.min + rand(st) * (near.max - near.min);
      tx = Math.floor((near.x + Math.cos(a) * d) / TILE);
      ty = Math.floor((near.y + Math.sin(a) * d) / TILE);
    } else {
      tx = randInt(st, 0, MAP_N - 1);
      ty = randInt(st, 0, MAP_N - 1);
    }
    if (kinds.includes(tileAt(m, tx, ty)) && tx >= 0 && ty >= 0 && tx < MAP_N && ty < MAP_N) {
      return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
    }
  }
  return null;
}
