import { test } from "node:test";
import assert from "node:assert/strict";
import { CATCH_TYPES, createSwimmers, getCatchType, isAllowed, pickRandomKind, shooAway, treasureContents } from "./fishingLogic.ts";
import type { CatchKind } from "./fishingLogic.ts";
import { SCENES, getScene, scenesWith } from "./scenes.ts";
import { createTask, taskPossible } from "./fishingTasks.ts";

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const REGULAR = CATCH_TYPES.filter((c) => !c.isJunk && !c.isRare).map((c) => c.kind);

test("每種天氣有 5 種以上的一般魚，每種一般魚至少在一種天氣出現", () => {
  for (const s of SCENES) {
    assert.ok(s.fish.length >= 5, `${s.label} 魚太少`);
    for (const k of s.fish) assert.ok(REGULAR.includes(k), `${s.label} 的 ${k} 不是一般魚`);
  }
  for (const k of REGULAR) assert.ok(scenesWith(k).length > 0, `${k} 沒有出現的天氣`);
  // 天氣之間的魚要不一樣
  assert.equal(new Set(SCENES.map((s) => [...s.fish].sort().join())).size, SCENES.length);
});

test("冬天有企鵝和海豹、夜晚有魷魚，晴天沒有企鵝", () => {
  assert.ok(getScene("winter").fish.includes("penguin"));
  assert.ok(getScene("winter").fish.includes("seal"));
  assert.ok(getScene("night").fish.includes("squid"));
  assert.ok(!getScene("day").fish.includes("penguin"));
});

test("只會抽到這種天氣的一般魚；稀有獵物與垃圾到處都有", () => {
  for (const s of SCENES) {
    const rand = seeded(5);
    const seen = new Set<CatchKind>();
    for (let i = 0; i < 4000; i++) seen.add(pickRandomKind(rand, undefined, s.fish));
    for (const k of seen) assert.ok(isAllowed(getCatchType(k), s.fish), `${s.label} 抽到 ${k}`);
    for (const k of s.fish) assert.ok(seen.has(k), `${s.label} 一直沒抽到 ${k}`);
    assert.ok([...seen].some((k) => getCatchType(k).isRare));
    assert.ok([...seen].some((k) => getCatchType(k).isJunk));
  }
});

test("一開始放魚也照天氣，至少有一個垃圾和一隻這種天氣的魚", () => {
  const winter = getScene("winter").fish;
  const fish = createSwimmers(9, seeded(2), winter);
  assert.ok(fish.every((f) => isAllowed(getCatchType(f.kind), winter)));
  assert.ok(fish.some((f) => winter.includes(f.kind)));
  assert.ok(fish.some((f) => getCatchType(f.kind).isJunk));
});

test("換天氣：不屬於新天氣的一般魚游走，其他留下", () => {
  const swimmers = createSwimmers(9, seeded(3), getScene("day").fish);
  const winter = getScene("winter").fish;
  const n = shooAway(swimmers, winter);
  const shouldLeave = swimmers.filter((s) => !isAllowed(getCatchType(s.kind), winter));
  assert.equal(n, shouldLeave.length);
  for (const s of swimmers) assert.equal(!!s.leaving, !isAllowed(getCatchType(s.kind), winter));
  assert.equal(shooAway(swimmers, winter), 0, "已經要走的不重算");
});

test("任務只出這種天氣釣得到的魚（或撿垃圾）", () => {
  const night = getScene("night").fish;
  for (let seed = 1; seed < 40; seed++) {
    const t = createTask(["koi", "frog"], seeded(seed), undefined, night);
    assert.ok(t.target === "junk" || night.includes(t.target), `出了 ${t.target}`);
    assert.ok(taskPossible(t, night));
  }
  assert.ok(!taskPossible({ target: "penguin", need: 1, got: 0 }, night));
  assert.ok(taskPossible({ target: "junk", need: 1, got: 0 }, night));
});

test("打開寶箱：各種魚、稀有獵物或垃圾都可能，不會又是寶箱", () => {
  const rand = seeded(11);
  const seen = new Map<CatchKind, number>();
  for (let i = 0; i < 6000; i++) {
    const k = treasureContents(rand);
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  assert.ok(!seen.has("treasure"));
  for (const k of REGULAR) assert.ok(seen.has(k), `寶箱一直開不出 ${k}`);
  const junk = [...seen].filter(([k]) => getCatchType(k).isJunk).reduce((n, [, v]) => n + v, 0);
  assert.ok(junk > 6000 * 0.18 && junk < 6000 * 0.32, `垃圾比例 ${junk / 6000}`);
  assert.ok([...seen.keys()].some((k) => getCatchType(k).isRare));
});
