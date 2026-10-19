/*
 * 假設的介面（實作請照這個寫）：
 *   input.ts
 *     export function dirFromPad(dx: number, dy: number, radius: number): Dir | null
 *       —— dx/dy 為手指相對十字鍵中心的位移（螢幕座標，y 往下為正）；
 *          距離 < radius * 0.18 → null；否則取 |dx|、|dy| 較大的主軸：右 1、左 3、下 2、上 0。
 *     export class DirStack {
 *       press(dir: Dir): void;    // 重複按同一方向不會重複堆疊
 *       release(dir: Dir): void;
 *       current(): Dir | null;    // 最後按下且仍按著的方向；都放開 → null
 *     }
 *   sim.ts
 *     export function consumeTicks(acc: number, dt: number, maxSteps = 5): { steps: number; acc: number }
 *       —— acc、dt 單位為秒，固定步長 1/60 秒；steps = floor((acc+dt)/(1/60))，最多 maxSteps；
 *          沒被上限截斷時回傳的 acc = 餘數（< 1/60）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirFromPad, DirStack } from "./input.ts";
import { consumeTicks } from "./sim.ts";

const STEP = 1 / 60;
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test("dirFromPad 取主軸、死區回 null", () => {
  assert.equal(dirFromPad(30, 5, 100), 1);
  assert.equal(dirFromPad(-30, 5, 100), 3);
  assert.equal(dirFromPad(5, -30, 100), 0);
  assert.equal(dirFromPad(5, 30, 100), 2);
  assert.equal(dirFromPad(-40, -60, 100), 0, "斜向取較大的軸");
  assert.equal(dirFromPad(70, -20, 100), 1);
  assert.equal(dirFromPad(10, 5, 100), null, "死區內");
  assert.equal(dirFromPad(0, 0, 100), null);
  assert.equal(dirFromPad(0, 17, 100), null, "18% 半徑以內");
  assert.equal(dirFromPad(0, 19, 100), 2, "超過 18% 半徑");
});

test("DirStack 放開回到仍按著的方向", () => {
  const ds = new DirStack();
  assert.equal(ds.current(), null);
  ds.press(0);
  assert.equal(ds.current(), 0);
  ds.press(1);
  assert.equal(ds.current(), 1, "最後按下優先");
  ds.release(1);
  assert.equal(ds.current(), 0, "放開回到仍按著的方向");
  ds.press(2);
  ds.press(2); // 按鍵連發
  ds.release(2);
  assert.equal(ds.current(), 0, "重複按同一鍵不會堆疊");
  ds.press(3);
  ds.release(0); // 放開不是最上層的鍵
  assert.equal(ds.current(), 3);
  ds.release(3);
  assert.equal(ds.current(), null);
});

test("consumeTicks 一幀最多 5 步保留餘數", () => {
  const a = consumeTicks(0, 0.04); // 2.4 步
  assert.equal(a.steps, 2);
  assert.ok(near(a.acc, 0.04 - 2 * STEP), `餘數 ${a.acc}`);

  const b = consumeTicks(a.acc, 0.01); // 餘數累加
  assert.equal(b.steps, 1);
  assert.ok(near(b.acc, 0.05 - 3 * STEP), `餘數 ${b.acc}`);

  const c = consumeTicks(0, 0.005);
  assert.equal(c.steps, 0);
  assert.ok(near(c.acc, 0.005));

  const d = consumeTicks(0, 0.1); // 6 步 → 最多 5
  assert.equal(d.steps, 5);
  assert.ok(Number.isFinite(d.acc) && d.acc >= 0);

  assert.equal(consumeTicks(0, 1, 3).steps, 3, "自訂上限");
});
