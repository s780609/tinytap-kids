import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSandField,
  totalSand,
  relaxField,
  carveField,
  pourField,
  TOOL_PROFILES,
} from "./sandField.ts";

const sum = (arr: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
};

test("createSandField 建立指定欄數並帶初始沙量", () => {
  const f = createSandField(100, 200);
  assert.equal(f.h.length, 100);
  assert.equal(f.maxH, 200);
  assert.ok(totalSand(f) > 0);
  for (let i = 0; i < f.h.length; i++) {
    assert.ok(f.h[i] >= 0 && f.h[i] <= f.maxH);
  }
});

test("relaxField 會把陡峭的柱子攤平，且沙量守恆", () => {
  const f = createSandField(50, 300);
  f.h.fill(0);
  f.h[25] = 200;
  const before = totalSand(f);
  for (let i = 0; i < 200; i++) relaxField(f, 6);
  const after = totalSand(f);
  assert.ok(Math.abs(before - after) < 1e-6, "沙量應守恆");
  assert.ok(f.h[25] < 200, "尖柱應該崩落");
  for (let i = 0; i < f.h.length - 1; i++) {
    assert.ok(Math.abs(f.h[i] - f.h[i + 1]) <= 6 + 1e-6, `欄 ${i} 坡度過陡`);
  }
});

test("carveField 用平板壓下去：範圍內沙高被截斷，多的沙擠到兩側", () => {
  const f = createSandField(100, 300);
  f.h.fill(100);
  const before = totalSand(f);
  // 工具中心在第 50 欄、底部深度使允許高度為 60
  const cap = () => 60;
  const moved = carveField(f, 50, 10, cap, 0);
  assert.ok(moved > 0, "應該有沙被推開");
  for (let i = 40; i <= 60; i++) {
    assert.ok(f.h[i] <= 60 + 1e-6, `欄 ${i} 應被壓到 60 以下`);
  }
  assert.ok(f.h[39] > 100 || f.h[61] > 100, "兩側應該堆高");
  assert.ok(Math.abs(totalSand(f) - before) < 1e-6, "沙量應守恆");
});

test("carveField 往右推時，沙只堆到右邊", () => {
  const f = createSandField(100, 300);
  f.h.fill(100);
  carveField(f, 50, 10, () => 60, 1);
  const leftPile = sum(f.h.subarray(0, 40)) - 40 * 100;
  const rightPile = sum(f.h.subarray(61, 100)) - 39 * 100;
  assert.ok(Math.abs(leftPile) < 1e-6, "左側不應增加");
  assert.ok(rightPile > 0, "右側應增加");
});

test("carveField 不會超過 maxH，超出的沙會被丟棄", () => {
  const f = createSandField(20, 120);
  f.h.fill(100);
  carveField(f, 10, 8, () => 0, 0);
  for (let i = 0; i < f.h.length; i++) {
    assert.ok(f.h[i] <= 120 + 1e-6, `欄 ${i} 超過上限`);
  }
});

test("pourField 在指定位置加沙並回傳實際加入量", () => {
  const f = createSandField(60, 300);
  f.h.fill(10);
  const before = totalSand(f);
  const added = pourField(f, 30, 12, 4);
  assert.ok(added > 0);
  assert.ok(Math.abs(totalSand(f) - before - added) < 1e-6);
  assert.ok(f.h[30] > f.h[10], "倒沙點應比遠處高");
});

test("TOOL_PROFILES 每個模具的底部輪廓都在工具寬度內回傳非負深度", () => {
  for (const tool of TOOL_PROFILES) {
    assert.ok(tool.halfWidth > 0);
    for (let dx = -tool.halfWidth; dx <= tool.halfWidth; dx += 1) {
      const d = tool.profile(dx);
      assert.ok(Number.isFinite(d) && d >= 0, `${tool.id} 在 dx=${dx} 回傳 ${d}`);
    }
  }
});
