import { T, GRID_N } from "./constants.ts";
import type { EnemyKind, QueuedEnemy } from "./constants.ts";
import { applyBaseRing } from "./terrain.ts";

export interface StageDef {
  name: string;
  map: string[];
  enemies: { classic: string; easy: string };
}

/*
 * 圖例：. 空地  # 整格磚  ^ 上半磚  v 下半磚  < 左半磚  > 右半磚
 *       @ 鋼  ~ 水  % 樹  - 冰  E 基地（固定第 12 列第 6 欄）
 * 全部原創關卡。
 */
export const STAGES: StageDef[] = [
  {
    name: "新手訓練場",
    map: [
      ".............",
      "..###...###..",
      ".............",
      "#..%%...%%..#",
      "#..##...##..#",
      ".............",
      "...#######...",
      ".............",
      ".##..%.%..##.",
      ".##.......##.",
      ".....v.v.....",
      "..#.......#..",
      "..#...E...#..",
    ],
    enemies: { classic: "bbbbbbbbbbfbbbbbbbfb", easy: "bbbbbbbbbb" },
  },
  {
    name: "磚塊迷宮",
    map: [
      ".............",
      ".#.#######.#.",
      ".#.........#.",
      ".#.##.#.##.#.",
      "...#..#..#...",
      "##.#.###.#.##",
      ".............",
      ".###.#.#.###.",
      ".#...#.#...#.",
      ".#.###.###.#.",
      ".............",
      "##.#.....#.##",
      "...#..E..#...",
    ],
    enemies: { classic: "bbbbfbbbbfbbbbfbbfaa", easy: "bbbbfbbbbb" },
  },
  {
    name: "小森林",
    map: [
      ".............",
      ".%%%.###.%%%.",
      ".%%%.....%%%.",
      ".%%%.%%%.%%%.",
      ".....%@%.....",
      "##...%%%...##",
      ".............",
      ".%%.##.##.%%.",
      ".%%.#...#.%%.",
      ".%%.......%%.",
      "..#.%%%%%.#..",
      "..#.%...%.#..",
      "......E......",
    ],
    enemies: { classic: "bbffbbbbffbbpbbffbpb", easy: "bbfbbbfbbb" },
  },
  {
    name: "大河",
    map: [
      ".............",
      ".##.#...#.##.",
      ".##.#.@.#.##.",
      ".............",
      "~~~.~~~~~.~~~",
      "~~~.~~~~~.~~~",
      "....#...#....",
      ".#.##.%.##.#.",
      ".#....%....#.",
      ".#~~.....~~#.",
      "..~~..#..~~..",
      ".##.......##.",
      "......E......",
    ],
    enemies: { classic: "bbbbppffbbbbppffbbaa", easy: "bbfbbpbbfb" },
  },
  {
    name: "鋼鐵堡壘",
    map: [
      ".............",
      ".@@.#####.@@.",
      ".............",
      ".#.@.#.#.@.#.",
      ".#.@.#.#.@.#.",
      ".#...#.#...#.",
      "...@@...@@...",
      ".#.........#.",
      ".#.##@@@##.#.",
      ".............",
      "@..#.#.#.#..@",
      "...#.....#...",
      "...#..E..#...",
    ],
    enemies: { classic: "ffbbbbppffbbppbbffaa", easy: "bfbbpbfbbp" },
  },
  {
    name: "冰湖",
    map: [
      ".............",
      "..##.---.##..",
      "..#..---..#..",
      "...--#-#--...",
      "@.----.----.@",
      "..--#####--..",
      "#.---------.#",
      "..--#####--..",
      "@.----.----.@",
      "...--#-#--...",
      "..#..---..#..",
      "..##.....##..",
      "......E......",
    ],
    enemies: { classic: "bbffaabbffppbbffppaa", easy: "bbfpbbfpba" },
  },
  {
    name: "十字路口",
    map: [
      ".............",
      ".##.##.##.##.",
      ".##.##.##.##.",
      ".............",
      "##.@##.##@.##",
      ".....%%%.....",
      ".#@#.%@%.#@#.",
      ".....%%%.....",
      "##.@##.##@.##",
      ".............",
      ".##.##.##.##.",
      ".#.........#.",
      "......E......",
    ],
    enemies: { classic: "ffffbbppffaabbffppaa", easy: "bfpbfbpbfa" },
  },
  {
    name: "雙子島",
    map: [
      ".............",
      ".~~~~...~~~~.",
      ".~##~.#.~##~.",
      ".~##~...~##~.",
      ".~~.~.@.~.~~.",
      ".............",
      "#.~~~#.#~~~.#",
      "..~%%...%%~..",
      "..~%%.#.%%~..",
      "..~~~...~~~..",
      ".>...^.^...<.",
      ".#.........#.",
      "......E......",
    ],
    enemies: { classic: "ppbbffppaaffbbppffaa", easy: "fbpbfpbfba" },
  },
  {
    name: "迷霧森林",
    map: [
      ".............",
      "%%%.%%%%%.%%%",
      "%@%.%#@#%.%@%",
      "%%%.%%%%%.%%%",
      ".............",
      ".##%%%.%%%##.",
      ".@.%@%.%@%.@.",
      ".##%%%.%%%##.",
      ".............",
      "#.%%%#@#%%%.#",
      "..%%.....%%..",
      "@.%%.....%%.@",
      "......E......",
    ],
    enemies: { classic: "aaffppbbffppaaffppaa", easy: "fpbfapbfpb" },
  },
  {
    name: "最終決戰",
    map: [
      ".............",
      "..@@.###.@@..",
      ".~~#.....#~~.",
      ".~~#.%@%.#~~.",
      "....##.##....",
      "-#-..%.%..-#-",
      "-@--#...#--@-",
      "-#-..%.%..-#-",
      "....##@##....",
      "%%#.......#%%",
      "%%#.#####.#%%",
      "...@.....@...",
      "......E......",
    ],
    enemies: { classic: "ffppaaffppaaffppaaaa", easy: "fpafbpfapb" },
  },
];

/** 子格遮罩 [左上, 右上, 左下, 右下] */
const HALF: Record<string, readonly [boolean, boolean, boolean, boolean]> = {
  "#": [true, true, true, true],
  "^": [true, true, false, false],
  v: [false, false, true, true],
  "<": [true, false, true, false],
  ">": [false, true, false, true],
};
const SOLID: Record<string, number> = { "@": T.STEEL, "~": T.WATER, "%": T.TREES, "-": T.ICE };

/** 13×13 字元圖 → 26×26 子格；E 為空地，基地外圈自動鋪磚 */
export function parseStageMap(map: readonly string[]): Uint8Array {
  const g = new Uint8Array(GRID_N * GRID_N);
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const ch = map[row]?.[col] ?? ".";
      const mask = HALF[ch];
      const v = mask ? T.BRICK : SOLID[ch];
      if (v === undefined) continue;
      for (let k = 0; k < 4; k++) {
        if (mask && !mask[k]) continue;
        const c = col * 2 + (k & 1);
        const r = row * 2 + (k >> 1);
        g[r * GRID_N + c] = v;
      }
    }
  }
  applyBaseRing(g, T.BRICK, []);
  return g;
}

const KIND: Record<string, EnemyKind> = { b: "basic", f: "fast", p: "power", a: "armor" };

/** "bfpa…" → 出生佇列；bonusAt 為 1 起算的第幾台 */
export function parseEnemyQueue(str: string, bonusAt: readonly number[]): QueuedEnemy[] {
  return str.split("").map((ch, i) => ({ kind: KIND[ch] ?? "basic", bonus: bonusAt.includes(i + 1) }));
}

/** 格級四向 BFS：只有鋼 '@' 與水 '~' 不可通過；座標 [欄, 列] */
export function tilePathExists(
  map: readonly string[],
  from: readonly [number, number],
  to: readonly [number, number]
): boolean {
  const pass = (c: number, r: number) => {
    if (c < 0 || r < 0 || c >= 13 || r >= 13) return false;
    const ch = map[r][c];
    return ch !== "@" && ch !== "~";
  };
  if (!pass(from[0], from[1]) || !pass(to[0], to[1])) return false;
  const seen = new Set<number>([from[1] * 13 + from[0]]);
  const queue: [number, number][] = [[from[0], from[1]]];
  while (queue.length > 0) {
    const [c, r] = queue.shift()!;
    if (c === to[0] && r === to[1]) return true;
    for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nc = c + dc;
      const nr = r + dr;
      const key = nr * 13 + nc;
      if (!pass(nc, nr) || seen.has(key)) continue;
      seen.add(key);
      queue.push([nc, nr]);
    }
  }
  return false;
}
