import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATCH_TYPES,
  REEL_TURNS_NEEDED,
  createSwimmers,
  updateSwimmers,
  nearestSwimmer,
  angleDelta,
  spawnFromEdge,
  tickPopulation,
  removeGone,
  MAX_SWIMMERS,
  turnsFromAngle,
  isReelDone,
  type Swimmer,
} from "./fishingLogic.ts";

/** 簡單的可重現亂數（LCG） */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test("CATCH_TYPES 包含鯊魚、鯉魚、螃蟹、輪胎，垃圾只有輪胎和靴子", () => {
  const kinds = CATCH_TYPES.map((c) => c.kind);
  for (const k of ["shark", "koi", "crab", "tire"]) {
    assert.ok(kinds.includes(k), `缺少 ${k}`);
  }
  assert.deepEqual(
    CATCH_TYPES.filter((c) => c.isJunk).map((c) => c.kind).sort(),
    ["boot", "tire"]
  );
});

test("createSwimmers 保證有垃圾和螃蟹，位置在池塘範圍內、深度符合種類", () => {
  const swimmers = createSwimmers(8, seeded(1));
  assert.equal(swimmers.length, 8);
  assert.ok(swimmers.some((s) => s.kind === "tire" || s.kind === "boot"), "應有垃圾");
  assert.ok(swimmers.some((s) => s.kind === "crab"), "應有螃蟹");
  for (const s of swimmers) {
    const type = CATCH_TYPES.find((c) => c.kind === s.kind)!;
    assert.ok(s.x >= 0 && s.x <= 1);
    assert.ok(s.y >= type.minDepth && s.y <= type.maxDepth, `${s.kind} 深度 ${s.y} 超出範圍`);
    assert.ok(s.dir === 1 || s.dir === -1);
  }
});

test("createSwimmers 不同亂數會產生不同的魚種組合與深度", () => {
  const a = createSwimmers(8, seeded(1)).map((s) => `${s.kind}@${s.y.toFixed(2)}`);
  const b = createSwimmers(8, seeded(99)).map((s) => `${s.kind}@${s.y.toFixed(2)}`);
  assert.notDeepEqual(a, b);
});

test("魚的深度範圍互相重疊，不是固定一層一種", () => {
  const fish = CATCH_TYPES.filter((c) => !c.isJunk && c.kind !== "crab");
  for (const c of fish) {
    assert.ok(c.maxDepth - c.minDepth >= 0.5, `${c.kind} 深度範圍太窄`);
  }
});

test("updateSwimmers 會前進並在池邊折返，x 永遠在 0~1", () => {
  const s: Swimmer = { id: 1, kind: "koi", x: 0.98, y: 0.5, baseY: 0.5, targetY: 0.5, dir: 1, speed: 0.5, phase: 0 };
  updateSwimmers([s], 0.1);
  assert.equal(s.dir, -1, "碰到右邊應折返");
  for (let i = 0; i < 200; i++) updateSwimmers([s], 0.05);
  assert.ok(s.x >= 0 && s.x <= 1);
});

test("nearestSwimmer 回傳離鉤子最近的一隻", () => {
  const list: Swimmer[] = [
    { id: 1, kind: "koi", x: 0.1, y: 0.1, baseY: 0.1, targetY: 0.1, dir: 1, speed: 0.1, phase: 0 },
    { id: 2, kind: "shark", x: 0.6, y: 0.6, baseY: 0.6, targetY: 0.6, dir: 1, speed: 0.1, phase: 0 },
    { id: 3, kind: "tire", x: 0.9, y: 0.9, baseY: 0.9, targetY: 0.9, dir: 1, speed: 0.1, phase: 0 },
  ];
  assert.equal(nearestSwimmer(list, 0.55, 0.5)?.id, 2);
  assert.equal(nearestSwimmer(list, 0.9, 0.95)?.id, 3, "瞄準池底就能釣到輪胎");
  assert.equal(nearestSwimmer([], 0.5, 0.5), null);
});

test("angleDelta 取最短角度差，跨越 ±180 也正確", () => {
  assert.equal(angleDelta(10, 20), 10);
  assert.equal(angleDelta(170, -170), 20);
  assert.equal(angleDelta(-170, 170), -20);
});

test("手指畫圈累積 3 圈才算收線成功，反方向也算", () => {
  assert.equal(REEL_TURNS_NEEDED, 3);
  assert.equal(turnsFromAngle(0), 0);
  assert.equal(turnsFromAngle(359), 0);
  assert.equal(turnsFromAngle(360), 1);
  assert.equal(turnsFromAngle(-800), 2);
  assert.equal(isReelDone(1079), false);
  assert.equal(isReelDone(1080), true);
  assert.equal(isReelDone(-1100), true);
  assert.equal(turnsFromAngle(5000), 3, "不會超過 3");
});

test("魚會上下游動：深度會明顯改變，但不超出該種類的深度範圍", () => {
  const rand = seeded(7);
  const swimmers = createSwimmers(8, rand).filter((s) => !CATCH_TYPES.find((c) => c.kind === s.kind)!.isJunk);
  const startY = swimmers.map((s) => s.baseY);
  let maxMove = 0;
  for (let i = 0; i < 1200; i++) {
    updateSwimmers(swimmers, 0.05, rand);
    swimmers.forEach((s, idx) => {
      const type = CATCH_TYPES.find((c) => c.kind === s.kind)!;
      assert.ok(s.baseY >= type.minDepth - 1e-9 && s.baseY <= type.maxDepth + 1e-9, `${s.kind} 游出深度範圍`);
      maxMove = Math.max(maxMove, Math.abs(s.baseY - startY[idx]));
    });
  }
  assert.ok(maxMove > 0.15, `應有明顯的上下移動，實際最大 ${maxMove}`);
});

test("輪胎和靴子沉在池底，不會上下游", () => {
  const s: Swimmer = { id: 9, kind: "tire", x: 0.5, y: 0.9, baseY: 0.9, targetY: 0.9, dir: 1, speed: 0.03, phase: 0 };
  for (let i = 0; i < 600; i++) updateSwimmers([s], 0.05, seeded(3));
  assert.ok(Math.abs(s.baseY - 0.9) < 1e-9);
});

test("spawnFromEdge 從池塘外側出生並往池內游", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const s = spawnFromEdge("koi", seeded(seed));
    assert.ok(s.x < 0 || s.x > 1, "應從池外開始");
    assert.equal(s.dir, s.x < 0 ? 1 : -1, "應朝池內游");
    const x0 = s.x;
    for (let i = 0; i < 40; i++) updateSwimmers([s], 0.05, seeded(seed));
    assert.ok(Math.abs(s.x - 0.5) < Math.abs(x0 - 0.5), "應該游進池塘");
  }
});

test("tickPopulation：未滿時隨機生成新的，滿了就讓一隻游走", () => {
  const rand = seeded(11);
  const swimmers = createSwimmers(6, rand);
  tickPopulation(swimmers, rand);
  assert.equal(swimmers.length, 7, "未滿應新增一隻");
  while (swimmers.length < MAX_SWIMMERS) tickPopulation(swimmers, rand);
  tickPopulation(swimmers, rand);
  assert.equal(swimmers.length, MAX_SWIMMERS, "滿了不再新增");
  assert.equal(swimmers.filter((s) => s.leaving).length, 1, "應有一隻準備游走");
});

test("準備游走的魚不折返，游出池外後被 removeGone 移除", () => {
  const s: Swimmer = { id: 5, kind: "koi", x: 0.9, y: 0.5, baseY: 0.5, targetY: 0.5, dir: 1, speed: 0.5, phase: 0, leaving: true };
  let list = [s];
  for (let i = 0; i < 20; i++) {
    updateSwimmers(list, 0.05, seeded(1));
    list = removeGone(list);
  }
  assert.equal(list.length, 0);
});
