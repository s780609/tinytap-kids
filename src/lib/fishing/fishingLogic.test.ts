import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATCH_TYPES,
  REEL_TURNS_NEEDED,
  createSwimmers,
  updateSwimmers,
  nearestSwimmer,
  reelStep,
  type Swimmer,
} from "./fishingLogic.ts";

test("CATCH_TYPES 包含鯊魚、鯉魚、螃蟹、輪胎，且只有輪胎是垃圾", () => {
  const kinds = CATCH_TYPES.map((c) => c.kind);
  for (const k of ["shark", "koi", "crab", "tire"]) {
    assert.ok(kinds.includes(k), `缺少 ${k}`);
  }
  assert.deepEqual(
    CATCH_TYPES.filter((c) => c.isJunk).map((c) => c.kind),
    ["tire"]
  );
});

test("createSwimmers 每種都至少一隻，且位置在池塘範圍內、深度符合種類", () => {
  const swimmers = createSwimmers(8, () => 0.5);
  assert.equal(swimmers.length, 8);
  for (const c of CATCH_TYPES) {
    assert.ok(swimmers.some((s) => s.kind === c.kind), `缺少 ${c.kind}`);
  }
  for (const s of swimmers) {
    const type = CATCH_TYPES.find((c) => c.kind === s.kind)!;
    assert.ok(s.x >= 0 && s.x <= 1);
    assert.ok(s.y >= type.minDepth && s.y <= type.maxDepth, `${s.kind} 深度 ${s.y} 超出範圍`);
    assert.ok(s.dir === 1 || s.dir === -1);
  }
});

test("updateSwimmers 會前進並在池邊折返，x 永遠在 0~1", () => {
  const s: Swimmer = { id: 1, kind: "koi", x: 0.98, y: 0.5, baseY: 0.5, dir: 1, speed: 0.5, phase: 0 };
  updateSwimmers([s], 0.1);
  assert.equal(s.dir, -1, "碰到右邊應折返");
  for (let i = 0; i < 200; i++) updateSwimmers([s], 0.05);
  assert.ok(s.x >= 0 && s.x <= 1);
});

test("nearestSwimmer 回傳離鉤子最近的一隻", () => {
  const list: Swimmer[] = [
    { id: 1, kind: "koi", x: 0.1, y: 0.1, baseY: 0.1, dir: 1, speed: 0.1, phase: 0 },
    { id: 2, kind: "shark", x: 0.6, y: 0.6, baseY: 0.6, dir: 1, speed: 0.1, phase: 0 },
    { id: 3, kind: "crab", x: 0.9, y: 0.9, baseY: 0.9, dir: 1, speed: 0.1, phase: 0 },
  ];
  assert.equal(nearestSwimmer(list, 0.55, 0.5)?.id, 2);
  assert.equal(nearestSwimmer([], 0.5, 0.5), null);
});

test("reelStep 轉滿 3 圈才算收線成功", () => {
  assert.equal(REEL_TURNS_NEEDED, 3);
  let r = reelStep(0);
  assert.deepEqual(r, { turns: 1, done: false });
  r = reelStep(r.turns);
  assert.deepEqual(r, { turns: 2, done: false });
  r = reelStep(r.turns);
  assert.deepEqual(r, { turns: 3, done: true });
});
