/*
 * 假設的介面（實作請照這個寫）：
 *   constants.ts
 *     export const T（EMPTY 0、BRICK 1、STEEL 2、WATER 3、TREES 4、ICE 5）；export type Tank, Carry, Input（計畫 2.2）
 *     Dir：0 上、1 右、2 下、3 左；grid：Uint8Array(26*26)，索引 = 子格列 * 26 + 子格欄
 *   movement.ts
 *     export function rectsOverlap(a: Rect, b: Rect): boolean        // Rect = { x, y, w, h }，邊緣相接不算重疊
 *     export function snapForTurn(grid: Uint8Array, t: Tank, dir: Dir, others: readonly Tank[]): void
 *       —— 就地修改：t.dir = dir；若 dir 與原方向垂直，舊行進軸座標先試 Math.round(v/8)*8，
 *          被擋（地形/出界/基地，或與 others 中原本沒重疊的坦克重疊）改試 floor、ceil；都擋就不動座標。
 *          反向掉頭不對齊。others 不含 t 自己。
 *     export function moveTank(grid: Uint8Array, t: Tank, speed: number, others: readonly Tank[]): void
 *       —— 沿 t.dir：acc += speed; n = floor(acc); acc -= n; 逐 px 前進；
 *          某 px 被擋 → 停、acc = 0、blocked = true；否則 blocked = false。
 *          坦克互撞：新矩形與另一台重疊、且舊矩形原本沒重疊才擋。others 不含 t 自己。
 *   sim.ts（冰面滑行由 step 處理）
 *     createStage(cfg, stageIndex(0 起算), carry, seed)、step(s, input, events)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { T } from "./constants.ts";
import type { Carry, GameEvent, GameState, Tank } from "./constants.ts";
import { DIFFICULTIES } from "./difficulty.ts";
import { rectsOverlap, snapForTurn, moveTank } from "./movement.ts";
import { createStage, step } from "./sim.ts";

const N = 26;
const emptyGrid = () => new Uint8Array(N * N);
const setCell = (g: Uint8Array, c: number, r: number, v: number) => {
  g[r * N + c] = v;
};

let uid = 9000;
function makeTank(p: Partial<Tank>): Tank {
  return {
    id: uid++, side: "enemy", kind: "basic", x: 0, y: 0, dir: 0, acc: 0, hp: 1, bonus: false,
    shield: 0, reload: 0, aiTimer: 0, fireTimer: 0, slide: 0, blocked: false, moving: false, ...p,
  };
}

/** 安靜的測試關卡：空地圖、沒有敵人、不會出生 */
function setup(): GameState {
  const cfg = DIFFICULTIES.classic;
  const carry: Carry = { score: 0, lives: cfg.lives, stars: 0, nextLifeIdx: 0 };
  const s = createStage(cfg, 0, carry, 1);
  s.grid = emptyGrid();
  s.terrainVersion++;
  s.enemies = [];
  s.sparkles = [];
  s.bullets = [];
  s.powerUp = null;
  s.spawnCooldown = 1e9;
  s.freeze = 0;
  s.shovel = 0;
  s.player = makeTank({ side: "player", kind: "player", x: 64, y: 96, dir: 0 });
  s.playerSparkle = null;
  s.respawnTimer = 0;
  return s;
}

test("rectsOverlap 相交才算，邊緣相接不算", () => {
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 16, h: 16 }, { x: 15, y: 15, w: 16, h: 16 }), true);
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 16, h: 16 }, { x: 16, y: 0, w: 16, h: 16 }), false);
  assert.equal(rectsOverlap({ x: 0, y: 0, w: 16, h: 16 }, { x: 0, y: 16, w: 16, h: 16 }), false);
});

test("轉彎對齊 8px：x=21 往上變 24、x=19 變 16", () => {
  const g = emptyGrid();
  const a = makeTank({ x: 21, y: 96, dir: 1 });
  snapForTurn(g, a, 0, []);
  assert.equal(a.dir, 0);
  assert.equal(a.x, 24);
  assert.equal(a.y, 96);

  const b = makeTank({ x: 19, y: 96, dir: 3 });
  snapForTurn(g, b, 2, []);
  assert.equal(b.dir, 2);
  assert.equal(b.x, 16);

  // 縱向行進改橫向：對齊 y
  const c = makeTank({ x: 64, y: 21, dir: 0 });
  snapForTurn(g, c, 1, []);
  assert.equal(c.dir, 1);
  assert.equal(c.y, 24);
  assert.equal(c.x, 64);
});

test("反向掉頭不對齊", () => {
  const g = emptyGrid();
  const a = makeTank({ x: 21, y: 96, dir: 1 });
  snapForTurn(g, a, 3, []);
  assert.equal(a.dir, 3);
  assert.equal(a.x, 21);
  const b = makeTank({ x: 64, y: 19, dir: 2 });
  snapForTurn(g, b, 0, []);
  assert.equal(b.dir, 0);
  assert.equal(b.y, 19);
});

test("對齊後被擋改 floor/ceil，都擋則保持原位", () => {
  const g = emptyGrid();
  // x=21：round → 24 被右邊坦克 (38) 擋住 → 改 floor 16
  const a = makeTank({ x: 21, y: 96, dir: 1 });
  const right = makeTank({ x: 38, y: 96 });
  snapForTurn(g, a, 0, [right]);
  assert.equal(a.x, 16);
  assert.equal(a.dir, 0);

  // 左右都被擋：保持 21，但仍轉向
  const b = makeTank({ x: 21, y: 96, dir: 1 });
  const left = makeTank({ x: 1, y: 96 });
  snapForTurn(g, b, 0, [right, left]);
  assert.equal(b.x, 21);
  assert.equal(b.dir, 0);
});

test("坦克不能互相重疊，原本重疊可移開", () => {
  const g = emptyGrid();
  const a = makeTank({ x: 0, y: 0, dir: 1 });
  const b = makeTank({ x: 20, y: 0 });
  for (let i = 0; i < 10; i++) moveTank(g, a, 1, [b]);
  assert.equal(a.x, 4, "停在剛好相接的位置");
  assert.equal(a.blocked, true);
  assert.equal(rectsOverlap({ x: a.x, y: a.y, w: 16, h: 16 }, { x: b.x, y: b.y, w: 16, h: 16 }), false);

  // 原本就重疊：可以往外移開
  const c = makeTank({ x: 40, y: 0, dir: 3 });
  const d = makeTank({ x: 48, y: 0 });
  for (let i = 0; i < 5; i++) moveTank(g, c, 1, [d]);
  assert.equal(c.x, 35);
  assert.equal(c.blocked, false);
});

test("冰面放開方向多滑 16px；一般地面立刻停", () => {
  for (const [ground, extra] of [
    [T.ICE, 16],
    [T.EMPTY, 0],
  ] as const) {
    const s = setup();
    if (ground === T.ICE) for (let r = 0; r < 20; r++) for (let c = 0; c < N; c++) setCell(s.grid, c, r, T.ICE);
    s.terrainVersion++;
    s.player = makeTank({ side: "player", kind: "player", x: 16, y: 96, dir: 1 });
    const ev: GameEvent[] = [];
    for (let i = 0; i < 20; i++) step(s, { dir: 1, fire: false }, ev);
    const x0 = s.player!.x;
    assert.ok(x0 > 16, "按住方向應前進");
    for (let i = 0; i < 60; i++) step(s, { dir: null, fire: false }, ev);
    assert.equal(s.player!.x - x0, extra, ground === T.ICE ? "冰面多滑 16px" : "一般地面立刻停");
    assert.equal(s.player!.y, 96);
  }
});

test("速度累加器：0.75 px/tick 跑 4 tick 前進 3px", () => {
  const g = emptyGrid();
  const t = makeTank({ x: 32, y: 32, dir: 1 });
  for (let i = 0; i < 4; i++) moveTank(g, t, 0.75, []);
  assert.equal(t.x, 35);
  assert.equal(t.y, 32);
  assert.ok(Math.abs(t.acc) < 1e-9);
  for (let i = 0; i < 4; i++) moveTank(g, t, 0.75, []);
  assert.equal(t.x, 38);

  // 被擋：停下、acc 歸 0、blocked = true
  const w = emptyGrid();
  setCell(w, 6, 4, T.STEEL); // px x 48..56
  setCell(w, 6, 5, T.STEEL);
  const u = makeTank({ x: 30, y: 32, dir: 1 });
  for (let i = 0; i < 10; i++) moveTank(w, u, 1, []);
  assert.equal(u.x, 32);
  assert.equal(u.blocked, true);
  assert.equal(u.acc, 0);
});
