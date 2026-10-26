import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DISHES,
  HAPPY_BIRTHDAY,
  MAX_CANDLES,
  MAX_ITEMS,
  TOPPINGS,
  acceptsDrop,
  addItem,
  candleCount,
  clampToRegion,
  drawOrder,
  pickSpot,
} from "./kitchen.ts";
import type { Placed, Region, ToppingId } from "./kitchen.ts";
import { parseMelody } from "../rhythm/music.ts";

const R: Region = { cx: 100, cy: 100, rx: 60, ry: 20 };

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function item(topping: ToppingId, key: number, y = 100): Placed {
  return { key, topping, x: 100, y, rot: 0, scale: 1 };
}

const inside = (r: Region, p: { x: number; y: number }) =>
  Math.hypot((p.x - r.cx) / r.rx, (p.y - r.cy) / r.ry) <= 1 + 1e-9;

test("每道料理：配料都存在、不重複，左右各 4 個、下面 4～5 個", () => {
  for (const d of DISHES) {
    const all = [...d.left, ...d.right, ...d.bottom];
    assert.equal(new Set(all).size, all.length, `${d.title} 有重複配料`);
    for (const id of all) assert.ok(TOPPINGS[id], `${d.title} 的 ${id} 不存在`);
    assert.equal(d.left.length, 4);
    assert.equal(d.right.length, 4);
    assert.ok(d.bottom.length >= 4 && d.bottom.length <= 5);
  }
});

test("只有蛋糕有蠟燭", () => {
  for (const d of DISHES) {
    const hasCandle = [...d.left, ...d.right, ...d.bottom].some((id) => TOPPINGS[id].candle);
    assert.equal(hasCandle, d.id === "cake", d.title);
  }
});

test("拖曳：料理上和邊緣附近收、離太遠不收", () => {
  assert.ok(acceptsDrop(R, 100, 100));
  assert.ok(acceptsDrop(R, 165, 100));
  assert.ok(!acceptsDrop(R, 190, 100));
  assert.ok(!acceptsDrop(R, 100, 140));
});

test("拉回橢圓：裡面的點不動、外面的點拉到邊上", () => {
  assert.deepEqual(clampToRegion(R, 110, 105), { x: 110, y: 105 });
  const p = clampToRegion(R, 200, 100);
  assert.ok(Math.abs(p.x - 160) < 1e-9 && p.y === 100);
  assert.ok(inside(R, clampToRegion(R, 150, 130)));
});

test("點一下：位置都在料理上，而且會避開已經放的配料", () => {
  const rand = seeded(7);
  const placed: { x: number; y: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const p = pickSpot(R, placed, rand);
    assert.ok(inside(R, p), `第 ${i} 個跑出去了`);
    placed.push(p);
  }
  // 中心已經有一個，新的不該貼在旁邊
  const p = pickSpot(R, [{ x: 100, y: 100 }], seeded(3));
  assert.ok(Math.hypot(p.x - 100, (p.y - 100) * 3) > 20);
});

test("蠟燭最多 10 根", () => {
  let items: Placed[] = [];
  for (let i = 0; i < MAX_CANDLES; i++) items = addItem(items, item("candlePink", i))!;
  assert.equal(candleCount(items), MAX_CANDLES);
  assert.equal(addItem(items, item("candleBlue", 99)), null);
  assert.ok(addItem(items, item("strawberry", 100)));
});

test("配料太多：拿掉最早放的，但不拿蠟燭", () => {
  let items: Placed[] = [item("candlePink", 0)];
  for (let i = 1; i < MAX_ITEMS; i++) items = addItem(items, item("strawberry", i))!;
  assert.equal(items.length, MAX_ITEMS);
  items = addItem(items, item("cherry", 1000))!;
  assert.equal(items.length, MAX_ITEMS);
  assert.equal(items[0].topping, "candlePink");
  assert.equal(items[1].key, 2);
  assert.equal(items.at(-1)!.key, 1000);
});

test("畫的順序：醬料墊底，其他由後往前", () => {
  const order = drawOrder([item("cherry", 1, 110), item("syrup", 2, 120), item("kiwi", 3, 90)]).map((p) => p.key);
  assert.deepEqual(order, [2, 3, 1]);
});

test("生日快樂歌：3/4 拍弱起，一共 25 個音", () => {
  const notes = parseMelody(HAPPY_BIRTHDAY.melody);
  assert.equal(notes.length, 25);
  const beats = notes.reduce((s, n) => s + n.beats, 0);
  // 弱起 1 拍 + 7 小節 × 3 拍 + 最後一小節 3 拍
  assert.equal(beats, 1 + 7 * 3 + 3);
});
