/*
 * 假設的介面（實作請照這個寫）：
 *   constants.ts：T、type Tank / Bullet / Carry / GameEvent / GameState / Input / DifficultyConfig / PowerKind（計畫 2.2）
 *     PowerUp = { kind: PowerKind; x: number; y: number; ticks: number }（x, y 為 16px 格點左上角，16×16）
 *     grid 索引 = 子格列 * 26 + 子格欄
 *   difficulty.ts：DIFFICULTIES（helmetTicks、clockTicks、shovelTicks、powerUpTicks…照計畫 2.10）
 *   sim.ts：createStage(cfg, stageIndex(0 起算), carry, seed)、step(s, input, events)、tally(s)
 *     —— 玩家矩形與道具矩形重疊的那個 tick 就撿到（計畫 2.4 第 6 步），效果立即生效：
 *        s.shield / s.freeze / s.shovel 等計時在撿到的那 tick 結束時 = cfg 值（允許差 1）。
 *     —— 可直接替換 s.grid / s.enemies / s.player / s.powerUp；s.spawnCooldown = 1e9 代表不出生。
 *     —— s.player = null 且 s.respawnTimer 很大 → 不會重生（用來避免意外撿到道具）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { T } from "./constants.ts";
import type { Bullet, Carry, DifficultyConfig, GameEvent, GameState, Input, PowerKind, Tank } from "./constants.ts";
import { DIFFICULTIES } from "./difficulty.ts";
import { createStage, step, tally } from "./sim.ts";

const N = 26;
const RING: [number, number][] = [
  [11, 23], [12, 23], [13, 23], [14, 23],
  [11, 24], [14, 24],
  [11, 25], [14, 25],
];
const emptyGrid = () => new Uint8Array(N * N);
const setCell = (g: Uint8Array, c: number, r: number, v: number) => {
  g[r * N + c] = v;
};
const cell = (g: Uint8Array, c: number, r: number) => g[r * N + c];
const ringWith = (v: number) => {
  const g = emptyGrid();
  for (const [c, r] of RING) setCell(g, c, r, v);
  return g;
};

let uid = 9000;
function makeTank(p: Partial<Tank>): Tank {
  return {
    id: uid++, side: "enemy", kind: "basic", x: 0, y: 0, dir: 2, acc: 0, hp: 1, bonus: false,
    shield: 0, reload: 0, aiTimer: 0, fireTimer: 0, slide: 0, blocked: false, moving: false, ...p,
  };
}
function makeBullet(p: Partial<Bullet>): Bullet {
  return { id: uid++, ownerId: -1, side: "player", x: 0, y: 0, dir: 0, speed: 2, breaksSteel: false, ...p };
}

function setup(cfg: DifficultyConfig = DIFFICULTIES.classic, seed = 1): GameState {
  const carry: Carry = { score: 0, lives: cfg.lives, stars: 0, nextLifeIdx: 0 };
  const s = createStage(cfg, 0, carry, seed);
  s.grid = ringWith(T.STEEL);
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
const IDLE: Input = { dir: null, fire: false };
function run(s: GameState, n: number, events: GameEvent[] = []): GameEvent[] {
  for (let i = 0; i < n; i++) step(s, IDLE, events);
  return events;
}
/** 把道具放在玩家身上並跑一 tick */
function pickUp(s: GameState, kind: PowerKind): GameEvent[] {
  const p = s.player!;
  s.powerUp = { kind, x: p.x, y: p.y, ticks: 300 };
  const ev = run(s, 1);
  assert.equal(s.powerUp, null, `${kind} 應被撿走`);
  assert.ok(ev.some((e) => e.type === "powerGet" && e.kind === kind), `${kind} powerGet 事件`);
  return ev;
}
const within1 = (actual: number, expected: number) => actual === expected || actual === expected - 1;

test("星/頭盔/坦克：星級最多 3、護盾時間正確、命 +1，各 +500 分", () => {
  const cfg = DIFFICULTIES.classic;
  const a = setup(cfg);
  pickUp(a, "star");
  assert.equal(a.stars, 1);
  assert.equal(a.score, 500);
  pickUp(a, "star");
  pickUp(a, "star");
  assert.equal(a.stars, 3);
  pickUp(a, "star");
  assert.equal(a.stars, 3, "最多 3 星");
  assert.equal(a.score, 2000);

  for (const c of [DIFFICULTIES.classic, DIFFICULTIES.easy]) {
    const b = setup(c);
    pickUp(b, "helmet");
    assert.ok(within1(b.player!.shield, c.helmetTicks), `護盾 ${b.player!.shield} 應為 ${c.helmetTicks}`);
    assert.equal(b.score, 500);
  }

  const t = setup(cfg);
  const lives = t.lives;
  const ev = pickUp(t, "tank");
  assert.equal(t.lives, lives + 1);
  assert.ok(ev.some((e) => e.type === "extraLife"));
  assert.equal(t.score, 500);
});

test("時鐘：敵人停止移動與開火，時間到恢復", () => {
  const cfg = DIFFICULTIES.classic;
  const s = setup(cfg);
  s.player!.shield = 1e9;
  s.enemies = [makeTank({ x: 16, y: 16 }), makeTank({ x: 160, y: 16 })];
  pickUp(s, "clock");
  assert.ok(within1(s.freeze, cfg.clockTicks), `freeze ${s.freeze} 應為 ${cfg.clockTicks}`);
  assert.equal(s.score, 500);
  const pos = s.enemies.map((e) => `${e.x},${e.y}`);
  const ev = run(s, 100);
  assert.deepEqual(
    s.enemies.map((e) => `${e.x},${e.y}`),
    pos,
    "凍結中不移動"
  );
  assert.equal(ev.filter((e) => e.type === "shoot" && e.side === "enemy").length, 0, "凍結中不開火");

  s.freeze = 2;
  const ev2 = run(s, 300);
  assert.equal(s.freeze, 0);
  assert.notDeepEqual(
    s.enemies.map((e) => `${e.x},${e.y}`),
    pos,
    "時間到恢復移動"
  );
  assert.ok(ev2.some((e) => e.type === "shoot" && e.side === "enemy"), "時間到恢復開火");
});

test("鏟子：外圈變鋼，時間到恢復完整磚牆，被坦克壓住子格不寫", () => {
  const cfg = DIFFICULTIES.classic;
  const s = setup(cfg);
  s.player = makeTank({ side: "player", kind: "player", x: 16, y: 96, dir: 0 });
  s.grid = ringWith(T.BRICK);
  setCell(s.grid, 11, 23, T.EMPTY); // 被打掉、且被坦克壓住
  setCell(s.grid, 14, 24, T.EMPTY); // 被打掉、沒被壓住
  s.terrainVersion++;
  s.freeze = 1e6;
  s.enemies = [makeTank({ x: 80, y: 176 })]; // 覆蓋子格欄 10–11、列 22–23
  pickUp(s, "shovel");
  assert.ok(within1(s.shovel, cfg.shovelTicks), `shovel ${s.shovel} 應為 ${cfg.shovelTicks}`);
  assert.equal(s.score, 500);
  for (const [c, r] of RING) {
    const expected = c === 11 && r === 23 ? T.EMPTY : T.STEEL;
    assert.equal(cell(s.grid, c, r), expected, `外圈 (${c},${r})`);
  }

  // 時間到：恢復完整磚牆（含被打掉的部分）
  s.enemies = [];
  s.shovel = 2;
  run(s, 3);
  assert.equal(s.shovel, 0);
  for (const [c, r] of RING) assert.equal(cell(s.grid, c, r), T.BRICK, `恢復磚牆 (${c},${r})`);
});

test("手榴彈：全滅、不給分、計 destroyed", () => {
  const s = setup();
  s.freeze = 1e6;
  s.enemies = [
    makeTank({ x: 16, y: 16 }),
    makeTank({ kind: "armor", x: 96, y: 16, hp: 4 }),
    makeTank({ kind: "fast", x: 160, y: 48 }),
  ];
  const ev = pickUp(s, "grenade");
  assert.equal(s.enemies.length, 0);
  assert.equal(s.score, 500, "只有道具本身的 500 分");
  assert.equal(s.destroyed, 3);
  assert.deepEqual({ ...s.kills }, { basic: 0, fast: 0, power: 0, armor: 0 });
  assert.equal(tally(s).total, 0, "不進結算表");
  assert.equal(ev.filter((e) => e.type === "explode" && e.big).length, 3);
});

test("道具會過期，不生成在基地區/鋼/水上", () => {
  // 過期
  const s = setup();
  s.powerUp = { kind: "star", x: 160, y: 16, ticks: 5 };
  run(s, 10);
  assert.equal(s.powerUp, null);
  assert.equal(s.stars, 0);

  // 生成位置：多種子下都避開磚/鋼/水與基地區（第 11–12 列第 5–7 欄）
  const BASE_AREA = { x: 80, y: 176, w: 48, h: 32 };
  const blocked = new Set<number>([T.BRICK, T.STEEL, T.WATER]);
  for (let seed = 1; seed <= 30; seed++) {
    const cfg = DIFFICULTIES.classic;
    const t = setup(cfg, seed);
    const g = emptyGrid();
    for (let row = 0; row < 13; row++) {
      for (let col = 0; col < 13; col++) {
        const inBase = row >= 11 && col >= 5 && col <= 7;
        const shotLane = col === 12 && row <= 3;
        if (inBase || shotLane) continue;
        const k = (col * 7 + row * 3) % 5;
        const v = k === 0 ? T.STEEL : k === 1 ? T.WATER : k === 2 ? T.BRICK : T.EMPTY;
        for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) setCell(g, col * 2 + dc, row * 2 + dr, v);
      }
    }
    t.grid = g;
    t.terrainVersion++;
    t.freeze = 1e6;
    t.player = null;
    t.respawnTimer = 1e9;
    const e = makeTank({ kind: "armor", x: 192, y: 0, hp: 4, bonus: true });
    t.enemies = [e];
    const b = makeBullet({ side: "player", x: 198, y: 30, dir: 0, speed: 2 });
    t.bullets.push(b);
    for (let i = 0; i < 30 && t.powerUp === null; i++) step(t, IDLE, []);
    const pu = t.powerUp;
    assert.ok(pu !== null, `種子 ${seed} 應生成道具`);
    assert.equal(pu.x % 16, 0);
    assert.equal(pu.y % 16, 0);
    assert.ok(pu.x >= 0 && pu.x <= 192 && pu.y >= 0 && pu.y <= 192);
    assert.ok(pu.ticks > 0 && pu.ticks <= cfg.powerUpTicks);
    for (let r = pu.y / 8; r < pu.y / 8 + 2; r++) {
      for (let c = pu.x / 8; c < pu.x / 8 + 2; c++) {
        assert.ok(!blocked.has(cell(t.grid, c, r)), `種子 ${seed}：道具 (${pu.x},${pu.y}) 壓在地形上`);
      }
    }
    const overlapBase =
      pu.x < BASE_AREA.x + BASE_AREA.w && pu.x + 16 > BASE_AREA.x && pu.y < BASE_AREA.y + BASE_AREA.h && pu.y + 16 > BASE_AREA.y;
    assert.equal(overlapBase, false, `種子 ${seed}：道具 (${pu.x},${pu.y}) 在基地區`);
  }
});
