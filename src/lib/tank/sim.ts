/**
 * 坦克大戰模擬核心：固定步長 60 tick/秒、就地修改 state、不讀時間、不用 Math.random。
 * 每 tick 順序見計畫 2.4。
 */
import {
  T,
  GRID_N,
  SUB,
  TILE,
  TANK_SIZE,
  BULLET_SIZE,
  BASE_RECT,
  PLAYER_SPAWN,
  ENEMY_SPAWN_COLS,
  DX,
  DY,
} from "./constants.ts";
import type {
  Bullet,
  Carry,
  DifficultyConfig,
  EnemyKind,
  GameEvent,
  GameState,
  Input,
  PowerKind,
  Rect,
  Tank,
} from "./constants.ts";
import { STAGES, parseStageMap, parseEnemyQueue } from "./stages.ts";
import { applyBaseRing, bulletTerrainHit } from "./terrain.ts";
import { moveTank, rectsOverlap, snapForTurn } from "./movement.ts";
import { enemyThink } from "./ai.ts";
import { rand, randInt } from "./rng.ts";
import { POINTS } from "./score.ts";

export const TICK_SEC = 1 / 60;
export const PLAYER_SPEED = 0.75;
export const ENEMY_SPEED: Record<EnemyKind, number> = { basic: 0.5, fast: 1, power: 0.625, armor: 0.5 };
export const SPARKLE_TICKS = 60;
export const RESPAWN_DELAY = 60;
export const PHASE_TICKS = 180;
export const FIRE_INTERVAL = 10;
export const SLIDE_PX = 16;
export const POWER_POINTS = 500;
export const ENEMY_KINDS: readonly EnemyKind[] = ["basic", "fast", "power", "armor"];
const POWER_KINDS: readonly PowerKind[] = ["star", "helmet", "clock", "shovel", "grenade", "tank"];

const S = TANK_SIZE;
const B = BULLET_SIZE;

function tankRect(t: Tank): Rect {
  return { x: t.x, y: t.y, w: S, h: S };
}

function allTanks(s: GameState): Tank[] {
  return s.player ? [...s.enemies, s.player] : s.enemies;
}

function newPlayer(s: GameState): Tank {
  return {
    id: s.nextId++,
    side: "player",
    kind: "player",
    x: PLAYER_SPAWN.x,
    y: PLAYER_SPAWN.y,
    dir: 0,
    acc: 0,
    hp: 1,
    bonus: false,
    shield: s.cfg.spawnShieldTicks,
    reload: 0,
    aiTimer: 0,
    fireTimer: 0,
    slide: 0,
    blocked: false,
    moving: false,
  };
}

export function spawnCooldownFor(cfg: DifficultyConfig, stage: number): number {
  return Math.max(cfg.spawnMin, cfg.spawnBase - (stage - 1) * cfg.spawnStep);
}

/** 建立一關；stageIndex 0 起算 */
export function createStage(cfg: DifficultyConfig, stageIndex: number, carry: Carry, seed: number): GameState {
  const def = STAGES[stageIndex];
  const grid = parseStageMap(def.map);
  const qstr = (cfg.id === "easy" ? def.enemies.easy : def.enemies.classic).slice(0, cfg.enemiesPerStage);
  const s: GameState = {
    cfg,
    stage: stageIndex + 1,
    grid,
    terrainVersion: 0,
    baseAlive: true,
    player: null,
    playerSparkle: null,
    respawnTimer: 0,
    lives: carry.lives,
    stars: carry.stars,
    enemies: [],
    sparkles: [],
    queue: parseEnemyQueue(qstr, cfg.bonusAt),
    spawnCooldown: 0,
    spawnCursor: 0,
    bullets: [],
    powerUp: null,
    freeze: 0,
    shovel: 0,
    kills: { basic: 0, fast: 0, power: 0, armor: 0 },
    destroyed: 0,
    score: carry.score,
    nextLifeIdx: carry.nextLifeIdx,
    phase: "playing",
    phaseTimer: 0,
    tick: 0,
    seed: seed >>> 0,
    nextId: 1,
    fx: [],
  };
  s.player = newPlayer(s);
  if (cfg.startShovelTicks > 0) {
    applyBaseRing(s.grid, T.STEEL, []);
    s.shovel = cfg.startShovelTicks;
  }
  return s;
}

/** 固定步長：回傳這一幀要跑幾步與剩餘時間（秒） */
export function consumeTicks(acc: number, dt: number, maxSteps = 5): { steps: number; acc: number } {
  const total = acc + dt;
  const steps = Math.floor(total / TICK_SEC + 1e-9);
  if (steps > maxSteps) return { steps: maxSteps, acc: 0 };
  return { steps, acc: Math.max(0, total - steps * TICK_SEC) };
}

export function tally(s: GameState): { rows: { kind: EnemyKind; count: number; points: number }[]; total: number } {
  const rows = ENEMY_KINDS.map((kind) => ({ kind, count: s.kills[kind], points: s.kills[kind] * POINTS[kind] }));
  return { rows, total: rows.reduce((sum, r) => sum + r.points, 0) };
}

export function carryOver(s: GameState): Carry {
  return { score: s.score, lives: s.lives, stars: s.stars, nextLifeIdx: s.nextLifeIdx };
}

// ───────── 內部 ─────────

function addScore(s: GameState, points: number, x: number, y: number): void {
  s.score += points;
  s.fx.push({ kind: "score", x, y, ticks: 50, value: points });
}

function explode(s: GameState, events: GameEvent[], big: boolean, x: number, y: number): void {
  events.push({ type: "explode", big, x, y });
  s.fx.push({ kind: big ? "boomL" : "boomS", x, y, ticks: big ? 24 : 12, value: 0 });
}

function isFreeTile(s: GameState, x: number, y: number): boolean {
  for (let r = y / SUB; r < y / SUB + 2; r++) {
    for (let c = x / SUB; c < x / SUB + 2; c++) {
      const v = s.grid[r * GRID_N + c];
      if (v === T.BRICK || v === T.STEEL || v === T.WATER) return false;
    }
  }
  return true;
}

function spawnPowerUp(s: GameState): void {
  const kind = POWER_KINDS[Math.floor(rand(s) * POWER_KINDS.length)];
  const good: [number, number][] = [];
  const any: [number, number][] = [];
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      if (row >= 11 && col >= 5 && col <= 7) continue; // 基地區
      const x = col * TILE;
      const y = row * TILE;
      any.push([x, y]);
      if (isFreeTile(s, x, y)) good.push([x, y]);
    }
  }
  const list = good.length > 0 ? good : any;
  const [x, y] = list[Math.floor(rand(s) * list.length)];
  s.powerUp = { kind, x, y, ticks: s.cfg.powerUpTicks };
}

function fireBullet(s: GameState, t: Tank, speed: number, breaksSteel: boolean): void {
  let x = t.x + S / 2 - B / 2;
  let y = t.y + S / 2 - B / 2;
  if (t.dir === 0) y = t.y - B / 2;
  else if (t.dir === 2) y = t.y + S - B / 2;
  else if (t.dir === 1) x = t.x + S - B / 2;
  else x = t.x - B / 2;
  s.bullets.push({ id: s.nextId++, ownerId: t.id, side: t.side, x, y, dir: t.dir, speed, breaksSteel });
}

/** 敵人開火間隔：前面的關卡比較久，第 1 關是設定值的 1.6 倍，第 10 關回到設定值 */
function enemyFireDelay(s: GameState): number {
  const slow = 1.6 - 0.6 * Math.min(1, (s.stage - 1) / 9);
  return Math.round(randInt(s, s.cfg.enemyFireMin, s.cfg.enemyFireMax) * slow);
}

function ownBullets(s: GameState, id: number): number {
  let n = 0;
  for (const b of s.bullets) if (b.ownerId === id) n++;
  return n;
}

function onIce(s: GameState, t: Tank): boolean {
  const c = Math.floor((t.x + S / 2) / SUB);
  const r = Math.floor((t.y + S / 2) / SUB);
  return s.grid[r * GRID_N + c] === T.ICE;
}

function killPlayer(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  if (!p) return;
  s.player = null;
  s.lives = Math.max(0, s.lives - 1);
  s.stars = s.cfg.starsOnDeath === "reset" ? 0 : (Math.max(0, s.stars - 1) as 0 | 1 | 2 | 3);
  explode(s, events, true, p.x + S / 2, p.y + S / 2);
  events.push({ type: "playerDown" });
  s.respawnTimer = RESPAWN_DELAY;
  if (s.lives <= 0 && s.phase === "playing") {
    s.phase = "losing";
    s.phaseTimer = PHASE_TICKS;
  }
}

function hitEnemy(s: GameState, e: Tank, events: GameEvent[]): void {
  e.hp--;
  if (e.bonus) {
    e.bonus = false;
    spawnPowerUp(s);
    events.push({ type: "powerAppear" });
  }
  if (e.hp <= 0) {
    const kind = e.kind as EnemyKind;
    s.enemies = s.enemies.filter((x) => x !== e);
    explode(s, events, true, e.x + S / 2, e.y + S / 2);
    addScore(s, POINTS[kind], e.x + S / 2, e.y + S / 2);
    s.kills[kind]++;
    s.destroyed++;
  } else {
    events.push({ type: "armorHit" });
  }
}

function applyPowerUp(s: GameState, kind: PowerKind, events: GameEvent[]): void {
  const cfg = s.cfg;
  switch (kind) {
    case "star":
      s.stars = Math.min(3, s.stars + 1) as 0 | 1 | 2 | 3;
      break;
    case "helmet":
      if (s.player) s.player.shield = cfg.helmetTicks;
      break;
    case "clock":
      s.freeze = cfg.clockTicks;
      break;
    case "shovel":
      applyBaseRing(s.grid, T.STEEL, allTanks(s).map(tankRect));
      s.shovel = cfg.shovelTicks;
      s.terrainVersion++;
      break;
    case "grenade":
      for (const e of s.enemies) {
        explode(s, events, true, e.x + S / 2, e.y + S / 2);
        s.destroyed++;
      }
      s.enemies = [];
      break;
    case "tank":
      s.lives++;
      events.push({ type: "extraLife" });
      break;
  }
}

function stepTimers(s: GameState): void {
  if (s.freeze > 0) s.freeze--;
  if (s.shovel > 0) {
    s.shovel--;
    if (s.shovel === 0) {
      applyBaseRing(s.grid, T.BRICK, allTanks(s).map(tankRect));
      s.terrainVersion++;
    }
  }
  if (s.powerUp) {
    s.powerUp.ticks--;
    if (s.powerUp.ticks <= 0) s.powerUp = null;
  }
  if (s.player) {
    if (s.player.shield > 0) s.player.shield--;
    if (s.player.reload > 0) s.player.reload--;
  }
  if (s.phaseTimer > 0) s.phaseTimer--;

  // 重生：延遲 → 出生閃光 → 坦克
  if (s.playerSparkle) {
    s.playerSparkle.ticks--;
    if (s.playerSparkle.ticks <= 0) {
      s.playerSparkle = null;
      s.player = newPlayer(s);
    }
  } else if (!s.player && s.lives > 0 && s.phase !== "losing" && s.phase !== "lost") {
    if (s.respawnTimer > 0) s.respawnTimer--;
    if (s.respawnTimer <= 0) s.playerSparkle = { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, ticks: SPARKLE_TICKS, enemy: null };
  }
}

function stepSpawns(s: GameState): void {
  const cfg = s.cfg;
  // 既有閃光倒數，時間到變坦克
  const keep: typeof s.sparkles = [];
  for (const sp of s.sparkles) {
    sp.ticks--;
    if (sp.ticks > 0) {
      keep.push(sp);
      continue;
    }
    if (!sp.enemy) continue;
    const kind = sp.enemy.kind;
    s.enemies.push({
      id: s.nextId++,
      side: "enemy",
      kind,
      x: sp.x,
      y: sp.y,
      dir: 2,
      acc: 0,
      hp: kind === "armor" ? cfg.armorHp : 1,
      bonus: sp.enemy.bonus,
      shield: 0,
      reload: 0,
      aiTimer: randInt(s, 32, 160),
      fireTimer: enemyFireDelay(s),
      slide: 0,
      blocked: false,
      moving: true,
    });
  }
  s.sparkles = keep;

  if (s.spawnCooldown > 0) s.spawnCooldown--;
  if (s.phase !== "playing" || s.spawnCooldown > 0 || s.queue.length === 0) return;
  if (s.enemies.length + s.sparkles.length >= cfg.maxOnScreen) return;
  const tanks = allTanks(s);
  for (let k = 0; k < ENEMY_SPAWN_COLS.length; k++) {
    const idx = (s.spawnCursor + k) % ENEMY_SPAWN_COLS.length;
    const spot: Rect = { x: ENEMY_SPAWN_COLS[idx] * TILE, y: 0, w: S, h: S };
    const busy =
      tanks.some((t) => rectsOverlap(spot, tankRect(t))) ||
      s.sparkles.some((sp) => rectsOverlap(spot, { x: sp.x, y: sp.y, w: S, h: S }));
    if (busy) continue;
    const enemy = s.queue.shift()!;
    if (enemy.bonus) s.powerUp = null;
    s.sparkles.push({ x: spot.x, y: spot.y, ticks: SPARKLE_TICKS, enemy });
    s.spawnCursor = (idx + 1) % ENEMY_SPAWN_COLS.length;
    s.spawnCooldown = spawnCooldownFor(cfg, s.stage);
    return;
  }
}

function stepPlayer(s: GameState, input: Input, events: GameEvent[]): void {
  const p = s.player;
  if (!p) return;
  const accept = s.phase !== "losing";
  const dir = accept ? input.dir : null;
  const others = s.enemies;
  if (dir !== null) {
    if (dir !== p.dir) snapForTurn(s.grid, p, dir, others);
    p.slide = 0;
    moveTank(s.grid, p, PLAYER_SPEED, others);
    p.moving = true;
  } else {
    if (p.moving && onIce(s, p)) p.slide = SLIDE_PX;
    p.moving = false;
    if (p.slide > 0) {
      const moved = moveTank(s.grid, p, PLAYER_SPEED, others, p.slide);
      p.slide = p.blocked ? 0 : p.slide - moved;
    } else {
      p.acc = 0;
    }
  }
  if (accept && input.fire && p.reload <= 0) {
    const cap = s.stars >= 2 ? 2 : 1;
    if (ownBullets(s, p.id) < cap) {
      fireBullet(s, p, s.stars >= 1 ? 4 : 2, s.stars >= 3);
      p.reload = FIRE_INTERVAL;
      events.push({ type: "shoot", side: "player" });
    }
  }
}

function stepEnemies(s: GameState, events: GameEvent[]): void {
  if (s.freeze > 0) return;
  const cfg = s.cfg;
  for (const e of s.enemies) {
    const others = s.enemies.filter((o) => o !== e);
    if (s.player) others.push(s.player);
    enemyThink(s, e, others);
    moveTank(s.grid, e, ENEMY_SPEED[e.kind as EnemyKind] * cfg.enemySpeedMul, others);
    if (e.fireTimer > 0) e.fireTimer--;
    if (e.fireTimer <= 0 && ownBullets(s, e.id) === 0) {
      fireBullet(s, e, (e.kind === "power" ? 4 : 2) * cfg.enemyBulletMul, false);
      e.fireTimer = enemyFireDelay(s);
      events.push({ type: "shoot", side: "enemy" });
    }
  }
}

function bulletRect(b: Bullet): Rect {
  return { x: b.x, y: b.y, w: B, h: B };
}

function stepBullets(s: GameState, events: GameEvent[]): void {
  for (let sub = 0; sub < 4; sub++) {
    if (s.bullets.length === 0) return;
    const dead = new Set<Bullet>();
    // 移動＋地形＋基地
    for (const b of s.bullets) {
      const d = b.speed / 4;
      b.x += DX[b.dir] * d;
      b.y += DY[b.dir] * d;
      const hit = bulletTerrainHit(s.grid, b);
      if (hit !== null) {
        dead.add(b);
        if (hit === "brick" || b.breaksSteel) s.terrainVersion++;
        if (b.side === "player") events.push({ type: hit });
        s.fx.push({ kind: "boomS", x: b.x + B / 2, y: b.y + B / 2, ticks: 10, value: 0 });
        continue;
      }
      if (rectsOverlap(bulletRect(b), BASE_RECT)) {
        dead.add(b);
        if (s.baseAlive) {
          s.baseAlive = false;
          events.push({ type: "baseDown" });
          explode(s, events, true, BASE_RECT.x + 8, BASE_RECT.y + 8);
          if (s.phase === "playing" || s.phase === "clearing") {
            s.phase = "losing";
            s.phaseTimer = PHASE_TICKS;
          }
        }
      }
    }
    // 異陣營子彈互撞
    for (let i = 0; i < s.bullets.length; i++) {
      const a = s.bullets[i];
      if (dead.has(a)) continue;
      for (let j = i + 1; j < s.bullets.length; j++) {
        const c = s.bullets[j];
        if (dead.has(c) || c.side === a.side) continue;
        if (rectsOverlap(bulletRect(a), bulletRect(c))) {
          dead.add(a);
          dead.add(c);
          break;
        }
      }
    }
    // 子彈打坦克
    for (const b of s.bullets) {
      if (dead.has(b)) continue;
      const br = bulletRect(b);
      if (b.side === "player") {
        const e = s.enemies.find((t) => rectsOverlap(br, tankRect(t)));
        if (e) {
          dead.add(b);
          hitEnemy(s, e, events);
        }
      } else if (s.player && rectsOverlap(br, tankRect(s.player))) {
        dead.add(b);
        if (s.player.shield <= 0) killPlayer(s, events);
      }
    }
    if (dead.size > 0) s.bullets = s.bullets.filter((b) => !dead.has(b));
  }
}

function stepPickup(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  const pu = s.powerUp;
  if (!p || !pu) return;
  if (!rectsOverlap(tankRect(p), { x: pu.x, y: pu.y, w: TILE, h: TILE })) return;
  s.powerUp = null;
  applyPowerUp(s, pu.kind, events);
  addScore(s, POWER_POINTS, pu.x + TILE / 2, pu.y + TILE / 2);
  events.push({ type: "powerGet", kind: pu.kind });
}

function stepPhase(s: GameState, events: GameEvent[]): void {
  const at = s.cfg.extraLifeAt;
  while (s.nextLifeIdx < at.length && s.score >= at[s.nextLifeIdx]) {
    s.nextLifeIdx++;
    s.lives++;
    events.push({ type: "extraLife" });
  }
  if (s.phase === "playing" && s.queue.length === 0 && s.sparkles.length === 0 && s.enemies.length === 0) {
    s.phase = "clearing";
    s.phaseTimer = PHASE_TICKS;
    s.bullets = s.bullets.filter((b) => b.side !== "enemy");
  } else if (s.phase === "clearing" && s.phaseTimer <= 0) {
    s.phase = "cleared";
    events.push({ type: "stageClear" });
  } else if (s.phase === "losing" && s.phaseTimer <= 0) {
    s.phase = "lost";
    events.push({ type: "gameOver" });
  }
}

function stepFx(s: GameState): void {
  if (s.fx.length === 0) return;
  for (const f of s.fx) f.ticks--;
  s.fx = s.fx.filter((f) => f.ticks > 0);
}

/** 跑一個 tick；事件 push 進 events */
export function step(s: GameState, input: Input, events: GameEvent[]): void {
  if (s.phase === "cleared" || s.phase === "lost") return;
  s.tick++;
  stepTimers(s);
  stepSpawns(s);
  stepPlayer(s, input, events);
  stepEnemies(s, events);
  stepBullets(s, events);
  stepPickup(s, events);
  stepPhase(s, events);
  stepFx(s);
}
