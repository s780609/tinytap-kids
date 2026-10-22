import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COLS,
  DX,
  DY,
  FRUIT_TILE,
  HOUSE_CENTER,
  HOUSE_EXIT,
  MAZE_ROWS,
  PAC_START,
  ROWS,
  charAt,
  createDots,
  isOpen,
  wrapCol,
} from "./maze.ts";

const openTiles = () => {
  const tiles: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isOpen(c, r)) tiles.push([c, r]);
  return tiles;
};

test("每一列一樣寬、左右對稱", () => {
  for (const row of MAZE_ROWS) {
    assert.equal(row.length, COLS);
    assert.equal([...row].reverse().join("").replace("P", "."), row.replace("P", "."));
  }
});

test("沒有死路：每個通道格至少兩個出口", () => {
  for (const [c, r] of openTiles()) {
    const exits = [0, 1, 2, 3].filter((d) => isOpen(c + DX[d], r + DY[d])).length;
    assert.ok(exits >= 2, `(${c},${r}) 只有 ${exits} 個出口`);
  }
});

test("所有通道都連得到小精靈出生點", () => {
  const seen = new Set<string>([`${PAC_START.col},${PAC_START.row}`]);
  const queue: [number, number][] = [[PAC_START.col, PAC_START.row]];
  while (queue.length) {
    const [c, r] = queue.shift()!;
    for (let d = 0; d < 4; d++) {
      const nc = wrapCol(c + DX[d]);
      const nr = r + DY[d];
      const key = `${nc},${nr}`;
      if (isOpen(nc, nr) && !seen.has(key)) {
        seen.add(key);
        queue.push([nc, nr]);
      }
    }
  }
  assert.equal(seen.size, openTiles().length);
});

test("鬼屋：出口在門的正上方，屋子正中間在門的正下方", () => {
  assert.ok(isOpen(HOUSE_EXIT.col, HOUSE_EXIT.row));
  assert.equal(charAt(HOUSE_EXIT.col, HOUSE_EXIT.row + 1), "-");
  assert.equal(charAt(HOUSE_CENTER.col, HOUSE_CENTER.row), "H");
  assert.equal(HOUSE_CENTER.row, HOUSE_EXIT.row + 2);
  assert.ok(isOpen(FRUIT_TILE.col, FRUIT_TILE.row));
});

test("隧道左右相通", () => {
  assert.ok(isOpen(-1, 9));
  assert.ok(isOpen(COLS, 9));
  assert.equal(wrapCol(-1), COLS - 1);
});

test("豆子：四顆大力丸，出生點沒有豆子", () => {
  const dots = createDots();
  assert.equal(dots.filter((v) => v === 2).length, 4);
  assert.ok(dots.filter((v) => v === 1).length > 100);
  assert.equal(dots[PAC_START.row * COLS + PAC_START.col], 0);
});
