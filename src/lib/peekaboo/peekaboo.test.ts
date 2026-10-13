import { test } from "node:test";
import assert from "node:assert/strict";
import { HIDERS, SPOTS, initialHiders, pickHider } from "./peekaboo.ts";

/** 簡單的可重現亂數（LCG） */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test("藏身處有 4 個且種類不重複，動物至少 6 隻且都有叫聲", () => {
  assert.equal(SPOTS.length, 4);
  assert.equal(new Set(SPOTS.map((s) => s.kind)).size, 4);
  assert.ok(HIDERS.length >= 6);
  for (const h of HIDERS) assert.match(h.sound, /^\/sounds\/animals\/\w+\.mp3$/);
});

test("initialHiders 每個藏身處放不同的動物", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const hiders = initialHiders(SPOTS.length, seeded(seed));
    assert.equal(hiders.length, SPOTS.length);
    assert.equal(new Set(hiders).size, SPOTS.length);
    for (const h of hiders) assert.ok(h >= 0 && h < HIDERS.length);
  }
});

test("pickHider 不會選到排除的動物", () => {
  const rand = seeded(7);
  for (let i = 0; i < 200; i++) {
    const exclude = [0, 2, 4];
    const h = pickHider(exclude, rand);
    assert.ok(!exclude.includes(h), `選到被排除的 ${h}`);
    assert.ok(h >= 0 && h < HIDERS.length);
  }
});

test("pickHider 全部都被排除時仍回傳合法的動物", () => {
  const all = HIDERS.map((_, i) => i);
  const h = pickHider(all, seeded(3));
  assert.ok(h >= 0 && h < HIDERS.length);
});
