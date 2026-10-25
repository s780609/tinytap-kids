import { test } from "node:test";
import assert from "node:assert/strict";
import { HIDERS, SPOTS, SPOT_COUNT, initialHiders, pickHider, pickSpots } from "./peekaboo.ts";

/** 簡單的可重現亂數（LCG） */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test("藏身處有 8 種且不重複，動物至少 12 隻、名字不重複，有叫聲的檔名正確", () => {
  assert.equal(SPOTS.length, 8);
  assert.equal(new Set(SPOTS.map((s) => s.kind)).size, 8);
  assert.ok(HIDERS.length >= 12);
  assert.equal(new Set(HIDERS.map((h) => h.name)).size, HIDERS.length);
  for (const h of HIDERS) if (h.sound) assert.match(h.sound, /^\/sounds\/animals\/\w+\.mp3$/);
});

test("pickSpots 挑 4 個不同的藏身處；換地方時盡量全換", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const a = pickSpots(SPOT_COUNT, seeded(seed));
    assert.equal(a.length, SPOT_COUNT);
    assert.equal(new Set(a).size, SPOT_COUNT);
    const b = pickSpots(SPOT_COUNT, seeded(seed + 100), a);
    assert.ok(b.every((i) => !a.includes(i)), "換地方應該全部換新的");
  }
});

test("initialHiders 每個藏身處放不同的動物", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const hiders = initialHiders(SPOT_COUNT, seeded(seed));
    assert.equal(hiders.length, SPOT_COUNT);
    assert.equal(new Set(hiders).size, SPOT_COUNT);
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
