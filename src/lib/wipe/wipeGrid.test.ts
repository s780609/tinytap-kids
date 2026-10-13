import { test } from "node:test";
import assert from "node:assert/strict";
import { clearedRatio, createGrid, wipeAt, wipeLine } from "./wipeGrid.ts";

test("createGrid 依畫面大小與格子大小算出欄列，一開始都沒擦", () => {
  const g = createGrid(100, 50, 10);
  assert.equal(g.cols, 10);
  assert.equal(g.rows, 5);
  assert.equal(clearedRatio(g), 0);
});

test("createGrid 畫面不是格子大小的整數倍時無條件進位", () => {
  const g = createGrid(105, 41, 10);
  assert.equal(g.cols, 11);
  assert.equal(g.rows, 5);
});

test("wipeAt 只擦到圓內的格子中心，回傳新擦掉的格數", () => {
  const g = createGrid(100, 100, 10);
  // 圓心 (50,50) 半徑 6：格子中心 (45,45)(55,45)(45,55)(55,55) 距離約 7.07，不在圓內
  assert.equal(wipeAt(g, 50, 50, 6), 0);
  // 半徑 8：剛好包含這四格
  assert.equal(wipeAt(g, 50, 50, 8), 4);
  // 同一個地方再擦一次，不會重複計算
  assert.equal(wipeAt(g, 50, 50, 8), 0);
  assert.ok(Math.abs(clearedRatio(g) - 4 / 100) < 1e-9);
});

test("wipeAt 在畫面邊緣外也不會出錯", () => {
  const g = createGrid(100, 100, 10);
  assert.equal(wipeAt(g, -30, -30, 10), 0);
  assert.ok(wipeAt(g, 0, 0, 20) > 0);
});

test("wipeLine 快速滑動時中間不會漏格", () => {
  const g = createGrid(200, 20, 10);
  wipeLine(g, 5, 5, 195, 5, 6);
  // 第一列 20 格全部被擦到
  for (let c = 0; c < g.cols; c++) {
    assert.equal(g.cleared[c], 1, `第 ${c} 格沒擦到`);
  }
});

test("整個畫面擦過後比例為 1", () => {
  const g = createGrid(60, 60, 10);
  for (let y = 0; y <= 60; y += 10) wipeLine(g, 0, y, 60, y, 10);
  assert.equal(clearedRatio(g), 1);
});
