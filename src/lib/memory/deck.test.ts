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

test("難度：簡單 6 對、普通 8 對、困難 12 對，越難翻錯時亮越短；圖不夠就全用上", () => {
  assert.deepEqual(MEMORY_DIFFICULTIES.map((d) => d.pairs), [6, 8, 12]);
  const peeks = MEMORY_DIFFICULTIES.map((d) => d.peekMs);
  assert.ok(peeks[0] > peeks[1] && peeks[1] > peeks[2]);
  const hard = MEMORY_DIFFICULTIES[2];
  assert.equal(pairsFor(8, hard), 8);
  assert.equal(pairsFor(40, hard), 12);
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
