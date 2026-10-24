import { test } from "node:test";
import assert from "node:assert/strict";
import { COLS, PAC_START } from "./maze.ts";
import type { Dir } from "./maze.ts";
import { DIFFICULTIES, FRUIT_POINTS, levelSpec } from "./levels.ts";
import {
  CLEARED_TICKS,
  DYING_TICKS,
  GHOST_FREEZE,
  READY_START_TICKS,
  READY_TICKS,
  chaseTarget,
  createGame,
  step,
} from "./sim.ts";
import type { GameEvent, GameState, Ghost } from "./sim.ts";

const classic = DIFFICULTIES.classic;

/** 跳過「準備」並清空鬼，專心測小精靈 */
function playing(seed = 1): GameState {
  const s = createGame(classic, seed);
  s.phase = "playing";
  s.phaseTicks = 0;
  s.ghosts = [];
  return s;
}

function run(s: GameState, ticks: number, dir: Dir | null = null): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < ticks; i++) step(s, { dir }, events);
  return events;
}

function ghost(p: Partial<Ghost>): Ghost {
  return { id: "red", state: "active", col: 1, row: 1, dir: 1, t: 0, hx: 0, hy: 0, fright: false, reverse: false, ...p };
}

test("開局：準備中、紅鬼在門口、其他三隻在屋裡", () => {
  const s = createGame(classic, 1);
  assert.equal(s.phase, "ready");
  assert.equal(s.lives, 3);
  assert.deepEqual(
    s.ghosts.map((g) => g.state),
    ["active", "house", "house", "house"]
  );
  run(s, READY_START_TICKS);
  assert.equal(s.phase, "playing");
});

test("往左走、吃豆子加 10 分", () => {
  const s = playing();
  const events = run(s, 20);
  assert.equal(s.pac.row, PAC_START.row);
  assert.ok(s.pac.col < PAC_START.col);
  assert.ok(events.some((e) => e.type === "dot"));
  assert.equal(s.score, 10 * events.filter((e) => e.type === "dot").length);
});

test("預先按方向：走到能轉的路口才轉", () => {
  const s = playing();
  // 出生點正上方是牆，要走到左邊一格才轉上去
  run(s, 1, 0);
  assert.equal(s.pac.dir, 3);
  run(s, 30);
  assert.equal(s.pac.col, PAC_START.col - 1);
  assert.ok(s.pac.row < PAC_START.row);
});

test("撞牆就停", () => {
  const s = playing();
  s.pac = { col: 1, row: 19, dir: 3, t: 0, moving: true };
  run(s, 10);
  assert.equal(s.pac.col, 1);
  assert.equal(s.pac.t, 0);
  assert.equal(s.pac.moving, false);
});

test("走到一半按反方向立刻掉頭", () => {
  const s = playing();
  s.pac = { col: 5, row: 19, dir: 3, t: 0.3, moving: true };
  run(s, 1, 1);
  assert.equal(s.pac.dir, 1);
  assert.equal(s.pac.col, 4);
  assert.ok(s.pac.t > 0.7 && s.pac.t < 0.9);
});

test("隧道：從左邊出去會從右邊出來", () => {
  const s = playing();
  s.pac = { col: 1, row: 9, dir: 3, t: 0, moving: true };
  run(s, 30);
  assert.ok(s.pac.col > COLS / 2);
  assert.equal(s.pac.row, 9);
});

test("大力丸：加 50 分、鬼變藍並掉頭", () => {
  const s = playing();
  s.pac = { col: 1, row: 3, dir: 0, t: 0.5, moving: true };
  const g = ghost({ col: 10, row: 19, dir: 1, t: 0.1 });
  s.ghosts = [g];
  const events: GameEvent[] = [];
  while (!events.some((e) => e.type === "power")) step(s, { dir: null }, events);
  assert.ok(s.score >= 50);
  assert.ok(s.frightTicks > 0);
  assert.equal(g.fright, true);
  assert.equal(g.dir, 3);
});

test("連吃藍鬼 200 → 400 → 800 → 1600，吃到時全場定格", () => {
  const s = playing();
  s.pac = { col: 1, row: 19, dir: 3, t: 0, moving: false };
  s.frightTicks = 600;
  const points: number[] = [];
  for (let i = 0; i < 4; i++) {
    const g = ghost({ col: 1, row: 19, fright: true });
    s.ghosts = [g];
    const events = run(s, 1);
    const ev = events.find((e) => e.type === "ghost");
    assert.ok(ev && ev.type === "ghost");
    points.push(ev.points);
    assert.equal(g.state, "eaten");
    assert.equal(s.freezeTicks, GHOST_FREEZE);
    run(s, GHOST_FREEZE);
  }
  assert.deepEqual(points, [200, 400, 800, 1600]);
  assert.equal(s.score, 3000);
});

test("被鬼碰到：少一條命後重新準備；命用完就結束", () => {
  const s = playing();
  s.pac = { col: 1, row: 19, dir: 3, t: 0, moving: false };
  s.ghosts = [ghost({ col: 1, row: 19 })];
  assert.ok(run(s, 1).some((e) => e.type === "death"));
  assert.equal(s.phase, "dying");
  run(s, DYING_TICKS);
  assert.equal(s.lives, 2);
  assert.equal(s.phase, "ready");
  assert.equal(s.afterDeath, true);
  assert.equal(s.ghosts.length, 4);

  s.lives = 1;
  s.phase = "playing";
  s.ghosts = [ghost({ col: s.pac.col, row: s.pac.row })];
  run(s, 1);
  const events = run(s, DYING_TICKS);
  assert.equal(s.phase, "over");
  assert.ok(events.some((e) => e.type === "gameOver"));
});

test("吃完豆子過關，閃完進下一關", () => {
  const s = playing();
  s.dots.fill(0);
  s.dots[PAC_START.row * COLS + PAC_START.col - 1] = 1;
  s.dotsLeft = 1;
  const events: GameEvent[] = [];
  while (s.phase === "playing") step(s, { dir: null }, events);
  assert.ok(events.some((e) => e.type === "levelClear"));
  assert.equal(s.phase, "cleared");
  run(s, CLEARED_TICKS);
  assert.equal(s.level, 2);
  assert.equal(s.phase, "ready");
  assert.equal(s.dotsLeft, s.dotsTotal);
  assert.equal(s.phaseTicks, READY_TICKS);
});

test("一萬分加一條命", () => {
  const s = playing();
  s.score = 9995;
  const events = run(s, 20);
  assert.ok(events.some((e) => e.type === "extraLife"));
  assert.equal(s.lives, 4);
});

test("被吃掉的鬼剩眼睛回家，復活後再出門、不再是藍色", () => {
  const s = playing();
  s.pac = { col: 1, row: 19, dir: 3, t: 0, moving: false };
  const g = ghost({ state: "eaten", col: 17, row: 1, dir: 3 });
  s.ghosts = [g];
  const seen = new Set<string>();
  for (let i = 0; i < 600 && !(seen.has("leaving") && g.state === "active"); i++) {
    run(s, 1);
    seen.add(g.state);
  }
  assert.ok(seen.has("entering"));
  assert.ok(seen.has("leaving"));
  assert.equal(g.state, "active");
  assert.equal(g.fright, false);
});

test("追擊目標：紅追本人、粉追前 4 格、青用紅鬼對稱、橘靠近就散開", () => {
  const s = playing();
  s.pac = { col: 9, row: 15, dir: 3, t: 0, moving: true };
  const red = ghost({ id: "red", col: 5, row: 13 });
  const orange = ghost({ id: "orange", col: 8, row: 15 });
  s.ghosts = [red];
  assert.deepEqual(chaseTarget(s, red), { col: 9, row: 15 });
  assert.deepEqual(chaseTarget(s, ghost({ id: "pink" })), { col: 5, row: 15 });
  // 前 2 格 (7,15)，紅鬼 (5,13) → (9,17)
  assert.deepEqual(chaseTarget(s, ghost({ id: "cyan" })), { col: 9, row: 17 });
  assert.deepEqual(chaseTarget(s, orange), { col: 0, row: 22 });
  assert.deepEqual(chaseTarget(s, ghost({ id: "orange", col: 1, row: 1 })), { col: 9, row: 15 });
});

test("散開 / 追擊切換時，外面的鬼會掉頭", () => {
  const s = playing();
  s.pac = { col: 1, row: 19, dir: 3, t: 0, moving: false };
  const g = ghost({ col: 4, row: 3, dir: 1, t: 0.2 });
  s.ghosts = [g];
  s.modeTicks = s.spec.schedule[0] - 1;
  run(s, 1);
  assert.equal(s.modeIdx, 1);
  assert.equal(g.dir, 3);
});

test("第 1 關：粉鬼馬上出門、青鬼吃 20 顆後、太久沒吃豆子也會放鬼", () => {
  const s = createGame(classic, 1);
  s.phase = "playing";
  run(s, 1);
  assert.equal(s.ghosts[1].state, "leaving");
  assert.equal(s.ghosts[2].state, "house");
  s.houseDots = 20;
  run(s, 1);
  assert.equal(s.ghosts[2].state, "leaving");
  s.idleTicks = s.spec.idleTicks;
  run(s, 1);
  assert.equal(s.ghosts[3].state, "leaving");
});

test("吃到一定數量的豆子出現水果，吃到水果加分", () => {
  const s = playing();
  const before = Math.round(s.dotsTotal * 0.3) - 1;
  s.dotsLeft = s.dotsTotal - before;
  const events = run(s, 15);
  assert.ok(events.some((e) => e.type === "fruitAppear"));
  assert.equal(s.fruit?.kind, "cherry");
  s.pac = { col: 9, row: 11, dir: 3, t: 0, moving: true };
  const ev = run(s, 1).find((e) => e.type === "fruit");
  assert.ok(ev && ev.type === "fruit");
  assert.equal(ev.points, FRUIT_POINTS.cherry);
  assert.equal(s.fruit, null);
});

test("同樣的種子與輸入，結果完全相同", () => {
  const play = () => {
    const s = createGame(classic, 42);
    const dirs: Dir[] = [3, 0, 1, 2];
    for (let i = 0; i < 3000; i++) step(s, { dir: dirs[Math.floor(i / 97) % 4] }, []);
    return JSON.stringify({ ...s, dots: Array.from(s.dots) });
  };
  assert.equal(play(), play());
});

test("難度：輕鬆模式鬼比較慢、變藍比較久；經典後期不會變藍", () => {
  const c1 = levelSpec(DIFFICULTIES.classic, 1);
  const e1 = levelSpec(DIFFICULTIES.easy, 1);
  assert.ok(e1.ghostSpeed < c1.ghostSpeed);
  assert.ok(e1.frightTicks > c1.frightTicks);
  assert.equal(levelSpec(DIFFICULTIES.classic, 19).frightTicks, 0);
  assert.equal(levelSpec(DIFFICULTIES.easy, 19).frightTicks, 180);
  assert.ok(levelSpec(DIFFICULTIES.classic, 5).pacSpeed > c1.pacSpeed);
});

test("速度：第 1 關小精靈每秒 4 格，鬼比小精靈慢一點", () => {
  const s1 = levelSpec(DIFFICULTIES.classic, 1);
  assert.ok(Math.abs(s1.pacSpeed * 60 - 4) < 1e-9);
  assert.ok(s1.ghostSpeed < s1.pacSpeed);
});
