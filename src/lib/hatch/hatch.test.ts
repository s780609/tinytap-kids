import { test } from "node:test";
import assert from "node:assert/strict";
import { CRACKS_TO_HATCH, EGG_STYLES, HATCHLINGS, RECENT, applyTap, newEgg, tapResult } from "./hatch.ts";
import type { EggState } from "./hatch.ts";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test("動物名字都不重複", () => {
  const ids = HATCHLINGS.map((h) => `${h.kind}-${h.name}`);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(HATCHLINGS.length >= 16);
});

test("點 3 下裂開、第 4 下孵出來、再點是再叫一次", () => {
  let s = newEgg(null, [], seeded(1));
  assert.equal(s.round, 0);
  const results = [];
  for (let i = 0; i < CRACKS_TO_HATCH + 2; i++) {
    results.push(tapResult(s));
    s = applyTap(s);
  }
  assert.deepEqual(results, ["crack", "crack", "crack", "hatch", "again"]);
  assert.equal(s.cracks, CRACKS_TO_HATCH);
  assert.equal(s.hatched, true);
});

test("換蛋：花色跟上一顆不一樣、最近出現過的動物不會再出現", () => {
  const rand = seeded(42);
  const history: number[] = [];
  let s: EggState | null = null;
  for (let i = 0; i < 200; i++) {
    const next = newEgg(s, history, rand);
    if (s) assert.notEqual(next.style, s.style);
    assert.ok(!history.slice(-RECENT).includes(next.hatchling), `第 ${i} 顆重複了`);
    assert.ok(next.style >= 0 && next.style < EGG_STYLES.length);
    assert.equal(next.round, i);
    history.push(next.hatchling);
    s = next;
  }
  // 每一隻都輪得到
  assert.equal(new Set(history).size, HATCHLINGS.length);
});
