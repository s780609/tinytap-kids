/**
 * 小精靈模擬核心：固定步長 60 tick/秒、就地修改 state、不讀時間、不用 Math.random。
 * 角色站在格子 (col,row) 上、朝 dir 往下一格走了 t（0～1），只在格子中心轉彎。
 */
import {
  COLS,
  DX,
  DY,
  FRUIT_TILE,
  HOUSE_CENTER,
  HOUSE_EXIT,
  PAC_START,
  createDots,
  isOpen,
  isTunnel,
  opposite,
  wrapCol,
} from "./maze.ts";
import type { Dir, Tile } from "./maze.ts";
import { DEATH_RELEASE, FRUIT_POINTS, fruitOf, levelSpec } from "./levels.ts";
import type { DifficultyConfig, FruitKind, LevelSpec } from "./levels.ts";
import { randInt } from "../tank/rng.ts";

export type GhostId = "red" | "pink" | "cyan" | "orange";
/** house 在屋裡等、leaving 出門中、active 在外面跑、eaten 剩眼睛回家、entering 眼睛進屋 */
export type GhostState = "house" | "leaving" | "active" | "eaten" | "entering";

export interface Mover {
  col: number;
  row: number;
  dir: Dir;
  t: number;
}

export interface Pac extends Mover {
  moving: boolean;
}

export interface Ghost extends Mover {
  id: GhostId;
  state: GhostState;
  /** 在鬼屋裡（house / leaving / entering）時的位置 */
  hx: number;
  hy: number;
  fright: boolean;
  /** 下一次移動前先掉頭 */
  reverse: boolean;
}

export type Phase = "ready" | "playing" | "dying" | "cleared" | "over";

export type GameEvent =
  | { type: "dot" }
  | { type: "power" }
  | { type: "ghost"; points: number }
  | { type: "fruit"; points: number }
  | { type: "fruitAppear" }
  | { type: "death" }
  | { type: "levelClear" }
  | { type: "extraLife" }
  | { type: "gameOver" };

export interface Input {
  dir: Dir | null;
}

export interface GameState {
  cfg: DifficultyConfig;
  level: number;
  spec: LevelSpec;
  score: number;
  lives: number;
  nextLifeIdx: number;
  phase: Phase;
  phaseTicks: number;
  tick: number;
  dots: Uint8Array;
  dotsTotal: number;
  dotsLeft: number;
  pac: Pac;
  /** 最後按的方向：放開也記得，走到能轉的地方就轉 */
  want: Dir | null;
  ghosts: Ghost[];
  modeIdx: number;
  modeTicks: number;
  frightTicks: number;
  /** 這次大力丸吃了幾隻鬼 */
  combo: number;
  /** 吃到鬼時全場定格 */
  freezeTicks: number;
  popup: { x: number; y: number; points: number; ticks: number } | null;
  fruit: { kind: FruitKind; ticks: number } | null;
  /** 這關（或這條命）吃了幾顆豆子，決定鬼什麼時候出門 */
  houseDots: number;
  idleTicks: number;
  afterDeath: boolean;
  seed: number;
}

export const READY_START_TICKS = 150;
export const READY_TICKS = 100;
export const DYING_TICKS = 150;
/** 死掉時先定格多久才開始縮小動畫 */
export const DYING_FREEZE = 45;
export const CLEARED_TICKS = 150;
export const GHOST_FREEZE = 60;
export const FRUIT_TICKS = 570;
/** 剩下多少豆子時出現水果（各一次） */
export const FRUIT_AT_LEFT = [0.7, 0.3];
export const HOUSE_SPEED = 3 / 60;
export const EYES_SPEED = 12 / 60;
/** 剩幾秒開始閃白 */
export const FLASH_TICKS = 120;

const GHOST_IDS: readonly GhostId[] = ["red", "pink", "cyan", "orange"];
/** 粉、青、橘在屋裡的位置 */
const HOUSE_SLOT: Record<Exclude<GhostId, "red">, number> = { pink: 9, cyan: 8, orange: 10 };

export const SCATTER: Record<GhostId, Tile> = {
  red: { col: COLS - 3, row: -2 },
  pink: { col: 2, row: -2 },
  cyan: { col: COLS - 1, row: 22 },
  orange: { col: 0, row: 22 },
};

/** 同分時的優先順序：上、左、下、右 */
const TIE_ORDER: readonly Dir[] = [0, 3, 2, 1];

const EPS = 1e-9;

// ---------- 建立 ----------

function newGhost(id: GhostId): Ghost {
  if (id === "red") {
    return { id, state: "active", col: HOUSE_EXIT.col, row: HOUSE_EXIT.row, dir: 3, t: 0, hx: 0, hy: 0, fright: false, reverse: false };
  }
  const hx = HOUSE_SLOT[id];
  return { id, state: "house", col: hx, row: HOUSE_CENTER.row, dir: 0, t: 0, hx, hy: HOUSE_CENTER.row, fright: false, reverse: false };
}

function resetActors(s: GameState): void {
  s.pac = { col: PAC_START.col, row: PAC_START.row, dir: 3, t: 0, moving: false };
  s.want = null;
  s.ghosts = GHOST_IDS.map(newGhost);
  s.modeIdx = 0;
  s.modeTicks = 0;
  s.frightTicks = 0;
  s.combo = 0;
  s.freezeTicks = 0;
  s.popup = null;
  s.fruit = null;
  s.houseDots = 0;
  s.idleTicks = 0;
}

function startLevel(s: GameState, level: number): void {
  s.level = level;
  s.spec = levelSpec(s.cfg, level);
  s.dots = createDots();
  s.dotsTotal = s.dots.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
  s.dotsLeft = s.dotsTotal;
  s.afterDeath = false;
  resetActors(s);
  s.phase = "ready";
  s.phaseTicks = READY_TICKS;
}

export function createGame(cfg: DifficultyConfig, seed: number): GameState {
  const s = {
    cfg,
    score: 0,
    lives: cfg.lives,
    nextLifeIdx: 0,
    tick: 0,
    seed: seed >>> 0,
  } as GameState;
  startLevel(s, 1);
  s.phaseTicks = READY_START_TICKS;
  return s;
}

// ---------- 位置 ----------

export function posOf(m: Mover): { x: number; y: number } {
  return { x: m.col + DX[m.dir] * m.t, y: m.row + DY[m.dir] * m.t };
}

export function ghostPos(g: Ghost): { x: number; y: number } {
  return g.state === "house" || g.state === "leaving" || g.state === "entering" ? { x: g.hx, y: g.hy } : posOf(g);
}

/** 最靠近的格子 */
export function tileOf(m: Mover): Tile {
  return m.t < 0.5 ? { col: m.col, row: m.row } : { col: wrapCol(m.col + DX[m.dir]), row: m.row + DY[m.dir] };
}

function reverseMover(m: Mover): void {
  if (m.t > 0) {
    m.col = wrapCol(m.col + DX[m.dir]);
    m.row += DY[m.dir];
    m.t = 1 - m.t;
  }
  m.dir = opposite(m.dir);
}

function arrive(m: Mover): void {
  m.col = wrapCol(m.col + DX[m.dir]);
  m.row += DY[m.dir];
  m.t = 0;
}

// ---------- 鬼的目標 ----------

export function isScatter(s: GameState): boolean {
  return s.modeIdx % 2 === 0;
}

export function chaseTarget(s: GameState, g: Ghost): Tile {
  const p = tileOf(s.pac);
  const d = s.pac.dir;
  switch (g.id) {
    case "red":
      return p;
    case "pink":
      return { col: p.col + DX[d] * 4, row: p.row + DY[d] * 4 };
    case "cyan": {
      const ahead = { col: p.col + DX[d] * 2, row: p.row + DY[d] * 2 };
      const red = s.ghosts.find((x) => x.id === "red");
      const r = red ? tileOf(red) : ahead;
      return { col: ahead.col * 2 - r.col, row: ahead.row * 2 - r.row };
    }
    case "orange": {
      const me = tileOf(g);
      const d2 = (me.col - p.col) ** 2 + (me.row - p.row) ** 2;
      return d2 > 64 ? p : SCATTER.orange;
    }
  }
}

function targetOf(s: GameState, g: Ghost): Tile {
  if (g.state === "eaten") return HOUSE_EXIT;
  return isScatter(s) ? SCATTER[g.id] : chaseTarget(s, g);
}

/** 在格子中心選下一步：不回頭，藍色亂走，其餘往目標直線距離最近的方向 */
function chooseDir(s: GameState, g: Ghost): Dir {
  const options = TIE_ORDER.filter((d) => d !== opposite(g.dir) && isOpen(g.col + DX[d], g.row + DY[d]));
  if (options.length === 0) return opposite(g.dir);
  if (g.fright && g.state === "active") return options[randInt(s, 0, options.length - 1)];
  const target = targetOf(s, g);
  let best = options[0];
  let bestD = Infinity;
  for (const d of options) {
    const c = g.col + DX[d];
    const r = g.row + DY[d];
    const dist = (c - target.col) ** 2 + (r - target.row) ** 2;
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

// ---------- 計分 ----------

function addScore(s: GameState, points: number, events: GameEvent[]): void {
  s.score += points;
  const at = s.cfg.extraLifeAt;
  while (s.nextLifeIdx < at.length && s.score >= at[s.nextLifeIdx]) {
    s.nextLifeIdx++;
    s.lives++;
    events.push({ type: "extraLife" });
  }
}

function startFright(s: GameState): void {
  s.frightTicks = s.spec.frightTicks;
  s.combo = 0;
  for (const g of s.ghosts) {
    if (g.state === "active") g.reverse = true;
    if (g.state !== "eaten" && g.state !== "entering") g.fright = s.frightTicks > 0;
  }
}

function eatAt(s: GameState, col: number, row: number, events: GameEvent[]): void {
  const idx = row * COLS + col;
  const v = s.dots[idx];
  if (v === 0) return;
  s.dots[idx] = 0;
  s.dotsLeft--;
  s.houseDots++;
  s.idleTicks = 0;
  if (v === 2) {
    addScore(s, 50, events);
    events.push({ type: "power" });
    startFright(s);
  } else {
    addScore(s, 10, events);
    events.push({ type: "dot" });
  }
  const eaten = s.dotsTotal - s.dotsLeft;
  if (FRUIT_AT_LEFT.some((f) => eaten === Math.round(s.dotsTotal * (1 - f)))) {
    s.fruit = { kind: fruitOf(s.level), ticks: FRUIT_TICKS };
    events.push({ type: "fruitAppear" });
  }
  if (s.dotsLeft === 0) {
    s.phase = "cleared";
    s.phaseTicks = CLEARED_TICKS;
    s.fruit = null;
    events.push({ type: "levelClear" });
  }
}

// ---------- 移動 ----------

function movePac(s: GameState, events: GameEvent[]): void {
  const p = s.pac;
  const want = s.want;
  if (want !== null && want === opposite(p.dir) && p.t > 0) reverseMover(p);
  let rem = s.frightTicks > 0 ? s.spec.pacFrightSpeed : s.spec.pacSpeed;
  p.moving = false;
  while (rem > EPS) {
    if (p.t === 0) {
      if (want !== null && isOpen(p.col + DX[want], p.row + DY[want])) p.dir = want;
      else if (!isOpen(p.col + DX[p.dir], p.row + DY[p.dir])) break;
    }
    const len = Math.min(rem, 1 - p.t);
    p.t += len;
    rem -= len;
    p.moving = true;
    if (p.t >= 1 - EPS) {
      arrive(p);
      eatAt(s, p.col, p.row, events);
      if (s.phase !== "playing") return;
    }
  }
}

function atExit(g: Ghost): boolean {
  return g.t === 0 && g.col === HOUSE_EXIT.col && g.row === HOUSE_EXIT.row;
}

/** 往 (x, y) 直線移動 dist，先水平再垂直；到了回傳 true */
function moveInHouse(g: Ghost, x: number, y: number, dist: number): boolean {
  if (g.hx !== x) {
    const dx = Math.max(-dist, Math.min(dist, x - g.hx));
    g.hx += dx;
    g.dir = dx > 0 ? 1 : 3;
    return false;
  }
  const dy = Math.max(-dist, Math.min(dist, y - g.hy));
  g.hy += dy;
  g.dir = dy < 0 ? 0 : 2;
  return Math.abs(y - g.hy) < EPS;
}

function ghostSpeed(s: GameState, g: Ghost): number {
  if (g.state === "eaten") return EYES_SPEED;
  if (isTunnel(g.col, g.row)) return s.spec.ghostTunnelSpeed;
  if (g.fright) return s.spec.ghostFrightSpeed;
  return s.spec.ghostSpeed;
}

function moveGhost(s: GameState, g: Ghost): void {
  switch (g.state) {
    case "house":
      return;
    case "leaving":
      if (moveInHouse(g, HOUSE_EXIT.col, HOUSE_EXIT.row, HOUSE_SPEED)) {
        g.state = "active";
        g.col = HOUSE_EXIT.col;
        g.row = HOUSE_EXIT.row;
        g.t = 0;
        g.dir = 3;
        g.reverse = false;
      }
      return;
    case "entering":
      if (moveInHouse(g, HOUSE_CENTER.col, HOUSE_CENTER.row, HOUSE_SPEED * 2)) {
        g.state = "leaving";
        g.fright = false;
      }
      return;
  }
  if (g.reverse) {
    g.reverse = false;
    reverseMover(g);
  }
  let rem = ghostSpeed(s, g);
  while (rem > EPS) {
    if (g.state === "eaten" && atExit(g)) {
      g.state = "entering";
      g.hx = HOUSE_EXIT.col;
      g.hy = HOUSE_EXIT.row;
      return;
    }
    if (g.t === 0) g.dir = chooseDir(s, g);
    const len = Math.min(rem, 1 - g.t);
    g.t += len;
    rem -= len;
    if (g.t >= 1 - EPS) arrive(g);
  }
}

function releaseGhosts(s: GameState): void {
  const waiting = s.ghosts.find((g) => g.state === "house");
  if (!waiting) return;
  const idx = GHOST_IDS.indexOf(waiting.id) - 1;
  const need = (s.afterDeath ? DEATH_RELEASE : s.spec.release)[idx];
  if (s.houseDots >= need) {
    waiting.state = "leaving";
  } else if (s.idleTicks >= s.spec.idleTicks) {
    waiting.state = "leaving";
    s.idleTicks = 0;
  }
}

function collide(s: GameState, events: GameEvent[]): void {
  const p = posOf(s.pac);
  for (const g of s.ghosts) {
    if (g.state !== "active") continue;
    const q = posOf(g);
    if (Math.abs(p.x - q.x) >= 0.5 || Math.abs(p.y - q.y) >= 0.5) continue;
    if (g.fright) {
      s.combo = Math.min(4, s.combo + 1);
      const points = 200 * 2 ** (s.combo - 1);
      addScore(s, points, events);
      g.state = "eaten";
      g.fright = false;
      s.freezeTicks = GHOST_FREEZE;
      s.popup = { x: q.x, y: q.y, points, ticks: GHOST_FREEZE };
      events.push({ type: "ghost", points });
      return;
    }
    s.phase = "dying";
    s.phaseTicks = DYING_TICKS;
    s.fruit = null;
    s.popup = null;
    events.push({ type: "death" });
    return;
  }
}

function eatFruit(s: GameState, events: GameEvent[]): void {
  if (!s.fruit) return;
  const t = tileOf(s.pac);
  if (t.col !== FRUIT_TILE.col || t.row !== FRUIT_TILE.row) return;
  const points = FRUIT_POINTS[s.fruit.kind];
  addScore(s, points, events);
  s.popup = { x: FRUIT_TILE.col, y: FRUIT_TILE.row, points, ticks: 90 };
  s.fruit = null;
  events.push({ type: "fruit", points });
}

function playTick(s: GameState, events: GameEvent[]): void {
  if (s.popup && --s.popup.ticks <= 0) s.popup = null;
  if (s.freezeTicks > 0) {
    s.freezeTicks--;
    return;
  }

  if (s.frightTicks > 0) {
    if (--s.frightTicks === 0) {
      for (const g of s.ghosts) g.fright = false;
    }
  } else if (++s.modeTicks >= s.spec.schedule[s.modeIdx]) {
    s.modeIdx++;
    s.modeTicks = 0;
    for (const g of s.ghosts) if (g.state === "active") g.reverse = true;
  }

  if (s.fruit && --s.fruit.ticks <= 0) s.fruit = null;

  s.idleTicks++;
  releaseGhosts(s);

  movePac(s, events);
  if (s.phase !== "playing") return;
  eatFruit(s, events);
  for (const g of s.ghosts) moveGhost(s, g);
  collide(s, events);
}

export function step(s: GameState, input: Input, events: GameEvent[]): void {
  s.tick++;
  if (input.dir !== null) s.want = input.dir;
  switch (s.phase) {
    case "ready":
      if (--s.phaseTicks <= 0) s.phase = "playing";
      return;
    case "playing":
      playTick(s, events);
      return;
    case "dying":
      if (--s.phaseTicks > 0) return;
      s.lives--;
      if (s.lives <= 0) {
        s.phase = "over";
        events.push({ type: "gameOver" });
        return;
      }
      resetActors(s);
      s.afterDeath = true;
      s.phase = "ready";
      s.phaseTicks = READY_TICKS;
      return;
    case "cleared":
      if (--s.phaseTicks <= 0) startLevel(s, s.level + 1);
      return;
    case "over":
      return;
  }
}
