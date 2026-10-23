import { test } from "node:test";
import assert from "node:assert/strict";
import { ART_SIZE, DINOS, LEVELS, isNearSlot, layoutPuzzle, makeEdges, piecePath, pieceRect, shuffledOrder } from "./puzzle.ts";

/** 簡單的可重現亂數（LCG） */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;

const inside = (r: Rect, w: number, h: number) =>
  r.x >= -1e-6 && r.y >= -1e-6 && r.x + r.w <= w + 1e-6 && r.y + r.h <= h + 1e-6;

test("十二隻恐龍，代號、名字與顏色都不重複", () => {
  assert.equal(DINOS.length, 12);
  assert.equal(new Set(DINOS.map((d) => d.id)).size, 12);
  assert.equal(new Set(DINOS.map((d) => d.name)).size, 12);
  assert.equal(new Set(DINOS.map((d) => d.color)).size, 12);
});

test("難度有 4 片、6 片與 8 片三種", () => {
  assert.deepEqual(
    LEVELS.map((l) => l.cols * l.rows),
    [4, 6, 8]
  );
});

test("pieceRect 切出來的每一片剛好拼滿整張圖、不重疊", () => {
  for (const { cols, rows } of LEVELS) {
    const n = cols * rows;
    const rects = Array.from({ length: n }, (_, i) => pieceRect(i, cols, rows));
    const area = rects.reduce((s, r) => s + r.w * r.h, 0);
    assert.ok(Math.abs(area - ART_SIZE * ART_SIZE) < 1e-6);
    for (const r of rects) assert.ok(inside(r, ART_SIZE, ART_SIZE));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) assert.ok(!overlaps(rects[i], rects[j]));
  }
  // 由左到右、由上到下編號
  assert.deepEqual(pieceRect(1, 2, 2), { x: 150, y: 0, w: 150, h: 150 });
  assert.deepEqual(pieceRect(5, 3, 2), { x: 200, y: 150, w: 100, h: 150 });
  assert.deepEqual(pieceRect(6, 4, 2), { x: 150, y: 150, w: 75, h: 150 });
});

for (const [label, w, h] of [
  ["直拿手機", 390, 700],
  ["橫拿手機", 800, 360],
  ["平板", 1024, 700],
] as const) {
  for (const { cols, rows } of LEVELS) for (const tabs of [false, true]) {
    test(`layoutPuzzle（${label}、${cols * rows} 片${tabs ? "、有榫頭" : ""}）：拼板和托盤都在畫面內、互不重疊`, () => {
      const n = cols * rows;
      const L = layoutPuzzle(w, h, cols, rows, 12, tabs);
      const board = { x: L.board.x, y: L.board.y, w: L.board.size, h: L.board.size };
      assert.ok(inside(board, w, h), "拼板超出畫面");
      assert.ok(L.board.size >= Math.min(w, h) * 0.4, `拼板太小：${L.board.size}`);
      assert.equal(L.cellW, L.board.size / cols);
      assert.equal(L.cellH, L.board.size / rows);
      assert.equal(L.tray.length, n);
      assert.equal(L.margin > 0, tabs);
      assert.equal(L.trayScale < 1, tabs);
      // 托盤上每片（縮小後）連同凸出去的榫頭
      const t = L.trayScale;
      const m = L.margin * t;
      const slots = L.tray.map((p) => ({ x: p.x - m, y: p.y - m, w: L.cellW * t + 2 * m, h: L.cellH * t + 2 * m }));
      for (const s of slots) {
        assert.ok(inside(s, w, h), "托盤格超出畫面");
        assert.ok(!overlaps(s, board), "托盤格壓到拼板");
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) assert.ok(!overlaps(slots[i], slots[j]));
    });
  }
}

test("layoutPuzzle：直的畫面托盤在拼板下面，橫的畫面托盤在右邊", () => {
  const p = layoutPuzzle(390, 700, 2, 2);
  for (const s of p.tray) assert.ok(s.y >= p.board.y + p.board.size);
  const l = layoutPuzzle(800, 360, 2, 2);
  for (const s of l.tray) assert.ok(s.x >= l.board.x + l.board.size);
});

test("slot 回傳拼板上每一格的左上角", () => {
  const L = layoutPuzzle(390, 700, 3, 2);
  assert.deepEqual(L.slot(4), { x: L.board.x + L.cellW, y: L.board.y + L.cellH });
});

test("isNearSlot：碎片中心落在正確那一格裡才算放對", () => {
  // 格子 100×80
  assert.ok(isNearSlot(0, 0, 0, 0, 100, 80));
  assert.ok(isNearSlot(49, -39, 0, 0, 100, 80));
  assert.ok(!isNearSlot(51, 0, 0, 0, 100, 80));
  assert.ok(!isNearSlot(0, 41, 0, 0, 100, 80));
});

test("shuffledOrder 是 0..n-1 的排列，而且不會剛好照順序", () => {
  const rand = seeded(7);
  for (let t = 0; t < 50; t++) {
    const o = shuffledOrder(6, rand);
    assert.deepEqual([...o].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
    assert.notDeepEqual(o, [0, 1, 2, 3, 4, 5]);
  }
});

test("makeEdges：外框是平的，相鄰兩片一定一凸一凹", () => {
  for (const { cols, rows } of LEVELS) {
    const e = makeEdges(cols, rows, seeded(3));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = e[r * cols + c];
        if (r === 0) assert.equal(p.top, 0);
        if (r === rows - 1) assert.equal(p.bottom, 0);
        if (c === 0) assert.equal(p.left, 0);
        if (c === cols - 1) assert.equal(p.right, 0);
        if (c < cols - 1) {
          assert.ok(Math.abs(p.right) === 1);
          assert.equal(p.right, -e[r * cols + c + 1].left);
        }
        if (r < rows - 1) {
          assert.ok(Math.abs(p.bottom) === 1);
          assert.equal(p.bottom, -e[(r + 1) * cols + c].top);
        }
      }
    }
  }
});

/** path 裡所有座標點 */
const pointsOf = (d: string) =>
  [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as [number, number]);

test("piecePath：平的邊是直線；凸的榫頭往外、凹的往內；相鄰兩片的榫頭是同一條曲線", () => {
  const flat = piecePath(0, 0, 100, 80, { top: 0, right: 0, bottom: 0, left: 0 }, 20);
  assert.equal(flat, "M0,0 L100,0 L100,80 L0,80 L0,0 Z");

  const out = pointsOf(piecePath(0, 0, 100, 80, { top: 0, right: 1, bottom: 0, left: 0 }, 20));
  assert.ok(Math.max(...out.map((p) => p[0])) > 100 + 20, "公頭要凸出右邊");
  const inn = pointsOf(piecePath(0, 0, 100, 80, { top: 0, right: -1, bottom: 0, left: 0 }, 20));
  assert.ok(Math.max(...inn.map((p) => p[0])) <= 100 && Math.min(...inn.filter((p) => p[1] > 0 && p[1] < 80).map((p) => p[0])) < 80);

  // 左片右邊凸、右片左邊凹：右片的榫頭點（倒過來）等於左片的
  const tab = 20;
  const a = pointsOf(piecePath(0, 0, 100, 80, { top: 0, right: 1, bottom: 0, left: 0 }, tab)).filter((p) => p[0] > 100);
  const b = pointsOf(piecePath(100, 0, 100, 80, { top: 0, right: 0, bottom: 0, left: -1 }, tab)).filter((p) => p[0] > 100 && p[0] < 200 && p[1] > 0 && p[1] < 80);
  const key = (p: [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  assert.deepEqual(new Set(a.map(key)), new Set(b.map(key)));
});
