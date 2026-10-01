import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY,
  LOOSE,
  PACKED,
  WALL,
  clearWall,
  countSand,
  createSandGrid,
  displace,
  fillPacked,
  kindOf,
  packBelow,
  pourGrid,
  stampWall,
  stepGrid,
  TOOL_PROFILES,
  type SandGrid,
} from "./sandGrid.ts";

/** 固定種子的亂數，讓測試可重現 */
const seeded = (seed = 1) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const emptyGrid = (cols: number, rows: number): SandGrid => {
  const g = createSandGrid(cols, rows, seeded());
  g.cells.fill(EMPTY);
  return g;
};

const at = (g: SandGrid, c: number, r: number) => kindOf(g.cells[r * g.cols + c]);
const put = (g: SandGrid, c: number, r: number, kind: number) => {
  g.cells[r * g.cols + c] = kind;
};
const countKind = (g: SandGrid, kind: number, c0 = 0, c1 = g.cols - 1) => {
  let n = 0;
  for (let r = 0; r < g.rows; r++) {
    for (let c = c0; c <= c1; c++) if (at(g, c, r) === kind) n++;
  }
  return n;
};
const columnHeight = (g: SandGrid, c: number) => {
  let n = 0;
  for (let r = 0; r < g.rows; r++) if (at(g, c, r) !== EMPTY) n++;
  return n;
};
const all = () => true;

test("createSandGrid 建立指定大小，底部有沙、頂部是空的", () => {
  const g = createSandGrid(100, 60, seeded());
  assert.equal(g.cols, 100);
  assert.equal(g.rows, 60);
  assert.equal(g.cells.length, 6000);
  assert.ok(countSand(g) > 0);
  for (let c = 0; c < g.cols; c++) {
    assert.equal(at(g, c, g.rows - 1), LOOSE, `欄 ${c} 底部應有沙`);
    assert.equal(at(g, c, 0), EMPTY, `欄 ${c} 頂部應為空`);
  }
  assert.ok(columnHeight(g, 50) > columnHeight(g, 0), "中間應有小丘");
});

test("stepGrid 讓懸空的沙粒每步往下掉一格，落地後停住", () => {
  const g = emptyGrid(11, 8);
  put(g, 5, 0, LOOSE);
  stepGrid(g, seeded());
  assert.equal(at(g, 5, 0), EMPTY);
  assert.equal(at(g, 5, 1), LOOSE);
  for (let i = 0; i < 20; i++) stepGrid(g, seeded(i));
  assert.equal(at(g, 5, 7), LOOSE);
  assert.equal(countSand(g), 1);
});

test("stepGrid 會讓沙柱崩落成沙堆，且沙粒數守恆", () => {
  const g = emptyGrid(51, 60);
  for (let r = 20; r < 60; r++) put(g, 25, r, LOOSE);
  const rand = seeded(7);
  for (let i = 0; i < 300; i++) stepGrid(g, rand);
  assert.equal(countSand(g), 40, "沙粒數應守恆");
  assert.ok(columnHeight(g, 25) < 40, "沙柱應該崩落");
  for (let c = 0; c < g.cols - 1; c++) {
    const d = Math.abs(columnHeight(g, c) - columnHeight(g, c + 1));
    assert.ok(d <= 1, `欄 ${c} 坡度過陡（差 ${d}）`);
  }
});

test("紮實的沙不會往旁邊滑，但懸空時會直直掉下去", () => {
  const g = emptyGrid(21, 30);
  for (let r = 20; r < 30; r++) put(g, 10, r, PACKED);
  put(g, 3, 0, PACKED);
  const rand = seeded(3);
  for (let i = 0; i < 100; i++) stepGrid(g, rand);
  assert.equal(columnHeight(g, 10), 10, "紮實沙柱應維持原狀");
  assert.equal(at(g, 3, 29), PACKED, "懸空的紮實沙應落到底");
  assert.equal(countSand(g), 11);
});

test("displace 把範圍內的沙擠到兩側，沙粒數守恆", () => {
  const g = emptyGrid(40, 30);
  for (let r = 20; r < 30; r++) for (let c = 0; c < 40; c++) put(g, c, r, LOOSE);
  const moved = displace(g, 15, 0, 24, 29, all, 0, seeded());
  assert.equal(moved, 100);
  assert.equal(countKind(g, LOOSE, 15, 24), 0, "範圍內應被清空");
  assert.equal(countSand(g), 400, "沙粒數應守恆");
  assert.ok(countKind(g, LOOSE, 0, 14) > 150, "左側應堆高");
  assert.ok(countKind(g, LOOSE, 25, 39) > 150, "右側應堆高");
});

test("displace 往右推時，沙只堆到右邊", () => {
  const g = emptyGrid(40, 30);
  for (let r = 20; r < 30; r++) for (let c = 0; c < 40; c++) put(g, c, r, LOOSE);
  displace(g, 15, 0, 24, 29, all, 1, seeded());
  assert.equal(countKind(g, LOOSE, 0, 14), 150, "左側不應增加");
  assert.equal(countKind(g, LOOSE, 25, 39), 250, "右側應增加");
});

test("displace 只移動 inside 為 true 的格子，被擠開的紮實沙會變鬆", () => {
  const g = emptyGrid(40, 30);
  for (let r = 20; r < 30; r++) for (let c = 0; c < 40; c++) put(g, c, r, PACKED);
  const moved = displace(g, 15, 0, 24, 29, (_c, r) => r < 25, 0, seeded());
  assert.equal(moved, 50);
  assert.equal(countKind(g, LOOSE), 50);
  assert.equal(countKind(g, PACKED), 350);
  assert.equal(at(g, 20, 25), PACKED, "inside 以外的格子不應被動到");
});

test("displace 沒有空位時多的沙會被丟棄，不會出錯", () => {
  const g = emptyGrid(10, 5);
  g.cells.fill(LOOSE);
  const moved = displace(g, 3, 0, 6, 4, all, 0, seeded());
  assert.equal(moved, 20);
  assert.equal(countSand(g), 30);
});

test("packBelow 把指定格子往下連續的沙標成紮實", () => {
  const g = emptyGrid(5, 10);
  for (let r = 4; r < 10; r++) put(g, 2, r, LOOSE);
  put(g, 2, 1, LOOSE);
  packBelow(g, 2, 4);
  for (let r = 4; r < 10; r++) assert.equal(at(g, 2, r), PACKED);
  assert.equal(at(g, 2, 1), LOOSE, "上方不相連的沙不受影響");
  packBelow(g, 3, 4);
  assert.equal(countKind(g, PACKED), 6, "起點不是沙時不做事");
});

test("fillPacked 只把範圍內的空格填成紮實沙，不動原本的沙", () => {
  const g = emptyGrid(10, 10);
  put(g, 4, 5, LOOSE);
  const added = fillPacked(g, 3, 4, 6, 6, (c) => c !== 6, seeded());
  assert.equal(added, 8);
  assert.equal(countKind(g, PACKED), 8);
  assert.equal(at(g, 4, 5), LOOSE, "原本的沙不變");
  assert.equal(at(g, 6, 5), EMPTY, "inside 以外不填");
});

test("pourGrid 在指定位置加入沙粒並回傳實際加入數", () => {
  const g = emptyGrid(30, 20);
  const added = pourGrid(g, 15, 2, 5, 6, seeded());
  assert.ok(added > 0 && added <= 5);
  assert.equal(countSand(g), added);
  assert.equal(countKind(g, LOOSE, 10, 20), added, "沙應落在倒沙點附近");
  g.cells.fill(LOOSE);
  assert.equal(pourGrid(g, 15, 2, 5, 6, seeded()), 0, "沒有空位時不加沙");
});

test("stampWall 的格子會擋住沙，clearWall 後沙繼續往下掉", () => {
  const g = emptyGrid(9, 10);
  put(g, 4, 0, LOOSE);
  stampWall(g, 0, 5, 8, 5, all);
  assert.equal(at(g, 4, 5), WALL);
  assert.equal(countSand(g), 1, "牆不算沙");
  const rand = seeded(5);
  for (let i = 0; i < 20; i++) stepGrid(g, rand);
  assert.equal(at(g, 4, 4), LOOSE, "沙應停在牆上");
  clearWall(g, 0, 5, 8, 5);
  assert.equal(countKind(g, WALL), 0);
  for (let i = 0; i < 20; i++) stepGrid(g, rand);
  assert.equal(at(g, 4, 9), LOOSE);
});

test("TOOL_PROFILES 每個工具的塑形面在寬度內都回傳有限數值；壓平為實心（>=0），其他模具為凹槽（<=0）", () => {
  for (const tool of TOOL_PROFILES) {
    assert.ok(tool.halfWidth > 0);
    let hasCavity = false;
    for (let dx = -tool.halfWidth; dx <= tool.halfWidth; dx += 1) {
      const d = tool.profile(dx);
      assert.ok(Number.isFinite(d), `${tool.id} 在 dx=${dx} 回傳 ${d}`);
      if (tool.id === "flat") assert.ok(d >= 0, "壓平應為實心");
      else {
        assert.ok(d <= 0, `${tool.id} 應為凹槽`);
        if (d < 0) hasCavity = true;
      }
    }
    if (tool.id !== "flat") assert.ok(hasCavity, `${tool.id} 應有凹槽`);
  }
});
