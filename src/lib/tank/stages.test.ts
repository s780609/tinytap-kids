/*
 * 假設的介面（實作請照這個寫）：
 *   constants.ts
 *     export const T = { EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, TREES: 4, ICE: 5 } as const;
 *     地形格 grid：Uint8Array(26 * 26)，索引 = 子格列 * 26 + 子格欄（row-major）
 *   difficulty.ts
 *     export const DIFFICULTIES: Record<"classic" | "easy", DifficultyConfig>（欄位見計畫 2.10，含 bonusAt）
 *   stages.ts
 *     export const STAGES: { name: string; map: string[]; enemies: { classic: string; easy: string } }[]
 *     export function parseStageMap(map: readonly string[]): Uint8Array
 *       —— 13×13 字元圖展開成 26×26 子格；E 所在子格為 T.EMPTY（基地不是地形）；
 *          基地外圈 8 個子格自動鋪 T.BRICK。
 *     export function parseEnemyQueue(str: string, bonusAt: readonly number[]): { kind: EnemyKind; bonus: boolean }[]
 *       —— b/f/p/a → basic/fast/power/armor；bonusAt 為 1 起算的第幾台。
 *     export function tilePathExists(map: readonly string[], from: readonly [number, number], to: readonly [number, number]): boolean
 *       —— 座標為 [欄, 列]（格級）；只有 '@'（鋼）與 '~'（水）不可通過，磚/樹/冰/空地可通過；上下左右四向 BFS。
 *   terrain.ts
 *     export function applyBaseRing(grid: Uint8Array, material: number, occupiedRects: readonly { x: number; y: number; w: number; h: number }[]): void
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { T } from "./constants.ts";
import { DIFFICULTIES } from "./difficulty.ts";
import { STAGES, parseStageMap, parseEnemyQueue, tilePathExists } from "./stages.ts";
import { applyBaseRing } from "./terrain.ts";

const N = 26;
const cell = (g: Uint8Array, c: number, r: number) => g[r * N + c];

/** 基地外圈 8 個子格 [欄, 列] */
const RING: [number, number][] = [
  [11, 23], [12, 23], [13, 23], [14, 23],
  [11, 24], [14, 24],
  [11, 25], [14, 25],
];
/** 基地本身的 4 個子格 */
const BASE_SUB: [number, number][] = [[12, 24], [13, 24], [12, 25], [13, 25]];
const isIn = (list: [number, number][], c: number, r: number) => list.some(([a, b]) => a === c && b === r);

/** 13×13 空地圖（只有基地），可指定格子字元 [欄, 列, 字元] */
function makeMap(cells: [number, number, string][] = []): string[] {
  const rows = Array.from({ length: 13 }, () => ".............".split(""));
  rows[12][6] = "E";
  for (const [c, r, ch] of cells) rows[r][c] = ch;
  return rows.map((r) => r.join(""));
}

const LEGAL = new Set(".#^v<>@~%-E".split(""));
const SPAWN_COLS = [0, 6, 12];

test("十關地圖都是 13×13 且只用合法字元", () => {
  assert.equal(STAGES.length, 10);
  STAGES.forEach((st, i) => {
    assert.ok(typeof st.name === "string" && st.name.length > 0, `第 ${i + 1} 關沒有名稱`);
    assert.equal(st.map.length, 13, `第 ${i + 1} 關列數`);
    st.map.forEach((row, r) => {
      assert.equal(row.length, 13, `第 ${i + 1} 關第 ${r} 列長度`);
      for (const ch of row) assert.ok(LEGAL.has(ch), `第 ${i + 1} 關有非法字元 ${ch}`);
    });
  });
});

test("基地固定在第 12 列第 6 欄，全圖只有一個 E", () => {
  STAGES.forEach((st, i) => {
    const count = st.map.join("").split("").filter((ch) => ch === "E").length;
    assert.equal(count, 1, `第 ${i + 1} 關 E 的數量`);
    assert.equal(st.map[12][6], "E", `第 ${i + 1} 關基地位置`);
  });
});

test("基地周圍、玩家出生點 (4,12)、(8,12) 都是空地", () => {
  const mustBeEmpty: [number, number][] = [[5, 11], [6, 11], [7, 11], [5, 12], [7, 12], [4, 12], [8, 12]];
  STAGES.forEach((st, i) => {
    for (const [c, r] of mustBeEmpty) {
      assert.equal(st.map[r][c], ".", `第 ${i + 1} 關 (${c},${r}) 應為空地`);
    }
  });
});

test("三個敵方出生點是空地，正下方不是鋼或水", () => {
  STAGES.forEach((st, i) => {
    assert.equal(st.map[0], ".............", `第 ${i + 1} 關第 0 列應全空`);
    for (const c of SPAWN_COLS) {
      assert.equal(st.map[0][c], ".", `第 ${i + 1} 關出生點 (${c},0)`);
      assert.ok(st.map[1][c] !== "@" && st.map[1][c] !== "~", `第 ${i + 1} 關出生點 (${c},0) 下方是鋼或水`);
    }
  });
});

test("整塊磚展開 2×2 子格，半磚只佔對應兩個子格（# ^ v < >）", () => {
  const g = parseStageMap(
    makeMap([
      [0, 0, "#"], [2, 0, "^"], [4, 0, "v"], [6, 0, "<"], [8, 0, ">"],
      [0, 2, "@"], [2, 2, "~"], [4, 2, "%"], [6, 2, "-"],
    ])
  );
  assert.ok(g instanceof Uint8Array);
  assert.equal(g.length, N * N);
  // 整塊磚
  for (const [c, r] of [[0, 0], [1, 0], [0, 1], [1, 1]]) assert.equal(cell(g, c, r), T.BRICK, `# (${c},${r})`);
  // 上半磚
  assert.equal(cell(g, 4, 0), T.BRICK);
  assert.equal(cell(g, 5, 0), T.BRICK);
  assert.equal(cell(g, 4, 1), T.EMPTY);
  assert.equal(cell(g, 5, 1), T.EMPTY);
  // 下半磚
  assert.equal(cell(g, 8, 0), T.EMPTY);
  assert.equal(cell(g, 9, 0), T.EMPTY);
  assert.equal(cell(g, 8, 1), T.BRICK);
  assert.equal(cell(g, 9, 1), T.BRICK);
  // 左半磚
  assert.equal(cell(g, 12, 0), T.BRICK);
  assert.equal(cell(g, 12, 1), T.BRICK);
  assert.equal(cell(g, 13, 0), T.EMPTY);
  assert.equal(cell(g, 13, 1), T.EMPTY);
  // 右半磚
  assert.equal(cell(g, 16, 0), T.EMPTY);
  assert.equal(cell(g, 16, 1), T.EMPTY);
  assert.equal(cell(g, 17, 0), T.BRICK);
  assert.equal(cell(g, 17, 1), T.BRICK);
  // 其他地形各 2×2
  for (let dr = 0; dr < 2; dr++) {
    for (let dc = 0; dc < 2; dc++) {
      assert.equal(cell(g, 0 + dc, 4 + dr), T.STEEL);
      assert.equal(cell(g, 4 + dc, 4 + dr), T.WATER);
      assert.equal(cell(g, 8 + dc, 4 + dr), T.TREES);
      assert.equal(cell(g, 12 + dc, 4 + dr), T.ICE);
    }
  }
  // 總數（磚含外圈 8 格）
  const count = (v: number) => g.filter((x) => x === v).length;
  assert.equal(count(T.BRICK), 4 + 2 * 4 + 8);
  assert.equal(count(T.STEEL), 4);
  assert.equal(count(T.WATER), 4);
  assert.equal(count(T.TREES), 4);
  assert.equal(count(T.ICE), 4);
});

test("基地外圈自動鋪 8 個磚子格，位置正確", () => {
  const g = parseStageMap(makeMap());
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isIn(BASE_SUB, c, r)) continue;
      const expected = isIn(RING, c, r) ? T.BRICK : T.EMPTY;
      assert.equal(cell(g, c, r), expected, `子格 (${c},${r})`);
    }
  }
  // 每一關的地圖也都有完整外圈
  STAGES.forEach((st, i) => {
    const sg = parseStageMap(st.map);
    for (const [c, r] of RING) assert.equal(cell(sg, c, r), T.BRICK, `第 ${i + 1} 關外圈 (${c},${r})`);
  });
  // applyBaseRing 直接鋪鋼：剛好 8 格
  const g2 = new Uint8Array(N * N);
  applyBaseRing(g2, T.STEEL, []);
  assert.equal(g2.filter((x) => x === T.STEEL).length, 8);
  for (const [c, r] of RING) assert.equal(cell(g2, c, r), T.STEEL);
});

test("每關三個出生點都能不經過鋼和水走到基地旁（格級 BFS，磚/樹/冰可通過）", () => {
  // BFS 本身的正確性：空地圖可通、被整排鋼或水隔開就不通
  assert.equal(tilePathExists(makeMap(), [0, 0], [6, 11]), true);
  const steelWall = makeMap(Array.from({ length: 13 }, (_, c) => [c, 5, "@"] as [number, number, string]));
  assert.equal(tilePathExists(steelWall, [0, 0], [6, 11]), false);
  const waterWall = makeMap(Array.from({ length: 13 }, (_, c) => [c, 5, "~"] as [number, number, string]));
  assert.equal(tilePathExists(waterWall, [6, 0], [6, 11]), false);
  const softWall = makeMap([
    ...Array.from({ length: 13 }, (_, c) => [c, 4, "#"] as [number, number, string]),
    ...Array.from({ length: 13 }, (_, c) => [c, 5, "%"] as [number, number, string]),
    ...Array.from({ length: 13 }, (_, c) => [c, 6, "-"] as [number, number, string]),
  ]);
  assert.equal(tilePathExists(softWall, [12, 0], [6, 11]), true, "磚、樹、冰可以通過");

  STAGES.forEach((st, i) => {
    for (const c of SPAWN_COLS) {
      assert.equal(tilePathExists(st.map, [c, 0], [6, 11]), true, `第 ${i + 1} 關出生點 (${c},0) 走不到基地旁`);
    }
  });
});

test("每關玩家出生點都能走到三個敵方出生點", () => {
  STAGES.forEach((st, i) => {
    for (const c of SPAWN_COLS) {
      assert.equal(tilePathExists(st.map, [4, 12], [c, 0]), true, `第 ${i + 1} 關玩家走不到 (${c},0)`);
    }
  });
});

test("敵人編成：經典每關 20、輕鬆每關 10，只用 b/f/p/a", () => {
  STAGES.forEach((st, i) => {
    assert.equal(st.enemies.classic.length, 20, `第 ${i + 1} 關經典`);
    assert.equal(st.enemies.easy.length, 10, `第 ${i + 1} 關輕鬆`);
    assert.match(st.enemies.classic, /^[bfpa]+$/);
    assert.match(st.enemies.easy, /^[bfpa]+$/);
  });
  const q = parseEnemyQueue("bfpa", []);
  assert.deepEqual(
    q.map((e) => e.kind),
    ["basic", "fast", "power", "armor"]
  );
  assert.ok(q.every((e) => e.bonus === false));
  assert.equal(parseEnemyQueue(STAGES[0].enemies.classic, DIFFICULTIES.classic.bonusAt).length, 20);
});

test("輕鬆前五關沒有裝甲車；經典後期 fast+power+armor 總數不少於前期", () => {
  for (let i = 0; i < 5; i++) {
    assert.ok(!STAGES[i].enemies.easy.includes("a"), `輕鬆第 ${i + 1} 關有裝甲車`);
  }
  const strong = (s: string) => s.split("").filter((ch) => ch !== "b").length;
  const early = STAGES.slice(0, 5).reduce((sum, st) => sum + strong(st.enemies.classic), 0);
  const late = STAGES.slice(5).reduce((sum, st) => sum + strong(st.enemies.classic), 0);
  assert.ok(late >= early, `後期 ${late} 應不少於前期 ${early}`);
});
