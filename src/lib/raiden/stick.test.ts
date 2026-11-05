import { test } from "node:test";
import assert from "node:assert/strict";
import { STICK_DEAD, mergeAxis, stickVector } from "./stick.ts";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("stickVector：在中間的死區裡不動", () => {
  assert.deepEqual(stickVector(0, 0, 50), { dx: 0, dy: 0 });
  const r = 50 * STICK_DEAD * 0.9;
  assert.deepEqual(stickVector(r, 0, 50), { dx: 0, dy: 0 });
});

test("stickVector：推到底是單位長度，方向跟手指一樣（上是負的）", () => {
  const up = stickVector(0, -50, 50);
  assert.ok(close(up.dx, 0) && close(up.dy, -1));
  const right = stickVector(80, 0, 50);
  assert.ok(close(right.dx, 1) && close(right.dy, 0));
  const diag = stickVector(-100, 100, 50);
  assert.ok(close(Math.hypot(diag.dx, diag.dy), 1));
  assert.ok(diag.dx < 0 && diag.dy > 0 && close(-diag.dx, diag.dy));
});

test("stickVector：推一半大概是一半的速度，從死區外緣由 0 開始平滑變大", () => {
  const half = stickVector(25, 0, 50);
  assert.ok(half.dx > 0.3 && half.dx < 0.5, `推一半：${half.dx}`);
  const edge = stickVector(50 * STICK_DEAD + 0.01, 0, 50);
  assert.ok(edge.dx >= 0 && edge.dx < 0.01);
});

test("mergeAxis：鍵盤和搖桿加起來，限制在 -1～1", () => {
  assert.equal(mergeAxis(1, 0.5), 1);
  assert.equal(mergeAxis(-1, -1), -1);
  assert.equal(mergeAxis(0, 0.4), 0.4);
  assert.equal(mergeAxis(1, -0.25), 0.75);
});
