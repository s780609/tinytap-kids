import { test } from "node:test";
import assert from "node:assert/strict";
import { MEMORY_DIFFICULTIES, bestGrid, buildDeck, pairsFor } from "./deck.ts";

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test("buildDeck：挑 pairs 種、每種剛好兩張", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  const deck = buildDeck(ids, 6, seeded(1));
  assert.equal(deck.length, 12);
  const counts = new Map<string, number>();
  for (const k of deck) counts.set(k, (counts.get(k) ?? 0) + 1);
  assert.equal(counts.size, 6);
  for (const [k, n] of counts) {
    assert.equal(n, 2);
    assert.ok(ids.includes(k));
  }
});

test("buildDeck：每次挑的種類與順序不一樣；圖不夠時就全部用上", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `x${i}`);
  const a = buildDeck(ids, 6, seeded(1)).join();
  const b = buildDeck(ids, 6, seeded(2)).join();
  assert.notEqual(a, b);
  assert.equal(buildDeck(["a", "b", "c"], 6, seeded(3)).length, 6);
});

test("難度：每一關都是簡單 8 對、普通 10 對、困難 12 對；圖不夠就全用上", () => {
  const [easy, normal, hard] = MEMORY_DIFFICULTIES;
  assert.equal(easy.peekMs, 1000);
  assert.ok(easy.peekMs > normal.peekMs && normal.peekMs > hard.peekMs);
  assert.deepEqual([easy, normal, hard].map((d) => pairsFor(40, d)), [8, 10, 12]);
  assert.equal(pairsFor(9, hard), 9);
});

test("bestGrid：直向排 4 欄、橫向排成寬的；放得下而且不會超出", () => {
  const portrait = bestGrid(24, 380, 660, 8);
  assert.equal(portrait.cols, 4);
  const landscape = bestGrid(24, 800, 300, 8);
  assert.ok(landscape.cols >= 8, `橫向排了 ${landscape.cols} 欄`);
  for (const [n, w, h] of [
    [12, 380, 660],
    [16, 800, 300],
    [24, 800, 300],
    [24, 1000, 700],
  ]) {
    const g = bestGrid(n, w, h, 8);
    assert.ok(g.cols * g.rows >= n);
    assert.ok(g.cols * g.size + (g.cols - 1) * 8 <= w, `${n} 張寬度超出`);
    assert.ok(g.rows * g.size + (g.rows - 1) * 8 <= h, `${n} 張高度超出`);
  }
  // 12 張在正方形空間：4×3 或 3×4，不要 5 欄留 3 個空格
  const sq = bestGrid(12, 400, 400, 8);
  assert.equal(sq.cols * sq.rows, 12);
});

test("bestGrid：手機直向的 16 / 20 / 24 張排成每列都滿，最後一列不會凸一張", () => {
  // iPhone 直向的牌桌大約 396×760
  for (const [n, cols] of [
    [16, 4],
    [20, 4],
    [24, 4],
  ]) {
    const g = bestGrid(n, 396, 760, 8);
    assert.equal(g.cols * g.rows, n, `${n} 張排成 ${g.cols}×${g.rows}，最後一列不滿`);
    assert.equal(g.cols, cols);
  }
  // 橫向也要排滿
  for (const n of [16, 20, 24]) {
    const g = bestGrid(n, 800, 320, 8);
    assert.equal(g.cols * g.rows, n, `橫向 ${n} 張排成 ${g.cols}×${g.rows}`);
  }
});

test("bestGrid：排滿會讓牌小太多時，寧可最後一列不滿", () => {
  // 14 張只能排成 2×7 或 7×2，在正方形空間裡牌會小很多
  const g = bestGrid(14, 400, 400, 8);
  assert.ok(g.size > 60, `牌太小：${g.size}`);
});
