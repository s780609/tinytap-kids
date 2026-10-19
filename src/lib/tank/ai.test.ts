/*
 * 敵人 AI 透過 sim 的 step 間接測試（不綁定 ai.ts 的函式簽名，chooseEnemyDir / enemyThink 的參數由實作自訂）。
 * 假設的介面：
 *   constants.ts：T、type Tank / Carry / GameState / Input（計畫 2.2）；grid 索引 = 子格列 * 26 + 子格欄
 *   difficulty.ts：DIFFICULTIES
 *   sim.ts：createStage(cfg, stageIndex(0 起算), carry, seed)、step(s, input, events)
 *     —— 可直接替換 s.grid / s.enemies / s.player；s.spawnCooldown = 1e9 代表不出生。
 *     —— 敵車未凍結時每 tick 都會嘗試沿目前方向移動（不會原地停住）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { T } from "./constants.ts";
import type { Carry, GameState, Input, Tank } from "./constants.ts";
import { DIFFICULTIES } from "./difficulty.ts";
import { createStage, step } from "./sim.ts";

const N = 26;
const RING: [number, number][] = [
  [11, 23], [12, 23], [13, 23], [14, 23],
  [11, 24], [14, 24],
  [11, 25], [14, 25],
];
const setCell = (g: Uint8Array, c: number, r: number, v: number) => {
  g[r * N + c] = v;
};

let uid = 9000;
function makeTank(p: Partial<Tank>): Tank {
  return {
    id: uid++, side: "enemy", kind: "basic", x: 0, y: 0, dir: 2, acc: 0, hp: 1, bonus: false,
    shield: 0, reload: 0, aiTimer: 0, fireTimer: 0, slide: 0, blocked: false, moving: false, ...p,
  };
}

/** 空地圖＋鋼外圈，一台敵車，玩家在左下角有超長護盾 */
function setup(seed: number, enemy: Partial<Tank>): GameState {
  const cfg = DIFFICULTIES.classic;
  const carry: Carry = { score: 0, lives: cfg.lives, stars: 0, nextLifeIdx: 0 };
  const s = createStage(cfg, 0, carry, seed);
  const g = new Uint8Array(N * N);
  for (const [c, r] of RING) setCell(g, c, r, T.STEEL);
  s.grid = g;
  s.terrainVersion++;
  s.sparkles = [];
  s.bullets = [];
  s.powerUp = null;
  s.spawnCooldown = 1e9;
  s.freeze = 0;
  s.shovel = 0;
  s.player = makeTank({ side: "player", kind: "player", x: 0, y: 192, dir: 0, shield: 1e9 });
  s.playerSparkle = null;
  s.respawnTimer = 0;
  s.enemies = [makeTank(enemy)];
  return s;
}
const IDLE: Input = { dir: null, fire: false };

test("撞牆會換方向，長時間模擬不會一直卡同方向", () => {
  // 敵車正上方是一整排鋼（子格列 9 = y 72..80），一開始就朝上撞牆
  const s = setup(3, { x: 96, y: 80, dir: 0, aiTimer: 1e6, fireTimer: 1e6 });
  for (let c = 0; c < N; c++) setCell(s.grid, c, 9, T.STEEL);
  s.terrainVersion++;
  let changed = false;
  for (let i = 0; i < 60 && !changed; i++) {
    step(s, IDLE, []);
    changed = s.enemies[0].dir !== 0;
  }
  assert.ok(changed, "被擋後應在 60 tick 內換方向");

  for (const seed of [1, 2, 3]) {
    const t = setup(seed, { x: 96, y: 80, dir: 0 });
    for (let c = 0; c < N; c++) setCell(t.grid, c, 9, T.STEEL);
    t.terrainVersion++;
    let last = "";
    let streak = 0;
    let maxStreak = 0;
    const tiles = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      step(t, IDLE, []);
      assert.equal(t.enemies.length, 1);
      const e = t.enemies[0];
      const k = `${e.x},${e.y},${e.dir}`;
      streak = k === last ? streak + 1 : 0;
      last = k;
      maxStreak = Math.max(maxStreak, streak);
      tiles.add(`${Math.floor(e.x / 16)},${Math.floor(e.y / 16)}`);
    }
    assert.ok(maxStreak < 40, `種子 ${seed}：同位置同方向卡住 ${maxStreak} tick`);
    assert.ok(tiles.size >= 6, `種子 ${seed}：只走過 ${tiles.size} 格`);
  }
});

test("長時間模擬往下移動距離多於往上", () => {
  let down = 0;
  let up = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const s = setup(seed, { x: 96, y: 16, dir: 2 });
    let y = s.enemies[0].y;
    for (let i = 0; i < 2000; i++) {
      step(s, IDLE, []);
      assert.equal(s.enemies.length, 1);
      const ny = s.enemies[0].y;
      if (ny > y) down += ny - y;
      else up += y - ny;
      y = ny;
    }
  }
  assert.ok(down > up, `往下 ${down}px 應多於往上 ${up}px`);
});
