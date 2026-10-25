import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDeck } from "./deck.ts";

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
