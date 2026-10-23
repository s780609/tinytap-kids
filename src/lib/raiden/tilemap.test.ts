import { test } from "node:test";
import assert from "node:assert/strict";
import { MAP_COLS, MAP_ROWS, PATH_TILE, T, buildTilemap, pathTiles } from "./tilemap.ts";

const PATHS = new Set(Object.values(PATH_TILE));

test("三種地形都填滿、格子編號都在素材範圍內、每次產生結果相同", () => {
  for (const terrain of [0, 1, 2] as const) {
    const m = buildTilemap(terrain);
    assert.equal(m.length, MAP_COLS * MAP_ROWS);
    assert.ok(m.every((t) => t >= 36 && t < 120), `地形 ${terrain} 有不是地面的格子`);
    assert.deepEqual(buildTilemap(terrain), m);
  }
});

test("草原有道路、要塞有水道、海上大部分是水", () => {
  const grass = buildTilemap(0);
  const fort = buildTilemap(2);
  const sea = buildTilemap(1);
  assert.ok(grass.filter((t) => PATHS.has(t)).length > MAP_ROWS);
  assert.ok(fort.filter((t) => PATHS.has(t - 6)).length > MAP_ROWS);
  assert.ok(sea.filter((t) => t === T.water).length > sea.length / 2);
});

test("道路接法：直線、轉角、丁字、十字，以及往畫面外延伸", () => {
  const isPath = new Uint8Array(MAP_COLS * MAP_ROWS);
  const at = (c: number, r: number) => r * MAP_COLS + c;
  // 十字：中心 (5,5)
  for (const [c, r] of [[5, 4], [5, 5], [5, 6], [4, 5], [6, 5]]) isPath[at(c, r)] = 1;
  // 碰到左邊界的橫路
  for (const c of [0, 1]) isPath[at(c, 20)] = 1;
  const tiles = pathTiles(isPath, new Set([20]), new Set(), 0);
  assert.equal(tiles.get(at(5, 5)), PATH_TILE[15]);
  assert.equal(tiles.get(at(5, 4)), 100); // 只往下接
  assert.equal(tiles.get(at(4, 5)), 101); // 只往右接
  assert.equal(tiles.get(at(0, 20)), 74); // 左右都接（左邊延伸出去）
  assert.equal(tiles.get(at(1, 20)), 113); // 只往左接
});
