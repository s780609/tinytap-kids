/**
 * 復古雷電模擬核心：固定步長 60 tick/秒、就地修改 state、不讀時間、不用 Math.random。
 * 一關的流程：照出場表出敵人 → 警告 → 大魔王 → 大魔王爆炸（bossDown）→ cleared。
 */
import { H, W } from "./constants.ts";
import type {
  DifficultyConfig,
  EnemyKind,
  Gun,
  ItemKind,
  MissileKind,
  Path,
  Stage,
  WeaponKind,
} from "./constants.ts";
import { BOSS_PHASES, ENEMIES, bossPhaseIndex, isBoss } from "./enemies.ts";
import { BOSS_ENTER, pathPos } from "./paths.ts";
import { STAGES } from "./stages.ts";
import { FIRE_EVERY, MISSILE_EVERY, missileShots, pickUp, plasmaDamage, weaponShots } from "./weapons.ts";
import type { Shot } from "./weapons.ts";
import { rand } from "../tank/rng.ts";

export interface Enemy {
  id: number;
  kind: EnemyKind;
  path: Path;
  age: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  flash: number;
  drop?: ItemKind;
  /** 旋轉彈幕目前角度 */
  spin: number;
  /** 砲塔朝向（畫圖用） */
  aim: number;
  /** 大魔王：目前階段與這階段開始後經過的 tick */
  phase: number;
  phaseAge: number;
}

export interface PShot extends Shot {
  id: number;
}

export interface Missile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: MissileKind;
  dmg: number;
  targetId: number | null;
  age: number;
}

export interface EBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface Item {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}

export interface Boom {
  x: number;
  y: number;
  size: number;
  age: number;
  life: number;
}

export interface Player {
  x: number;
  y: number;
  alive: boolean;
  invuln: number;
  respawn: number;
  fireTimer: number;
  missileTimer: number;
}

export type Phase = "playing" | "bossDown" | "cleared" | "lost";

export type GameEvent =
  | { type: "hit" }
  | { type: "boom"; big: boolean }
  | { type: "item"; kind: ItemKind }
  | { type: "bomb" }
  | { type: "playerDie" }
  | { type: "extraLife" }
  | { type: "warning" }
  | { type: "bossDown" }
  | { type: "stageClear" }
  | { type: "gameOver" };

export interface Input {
  /** 觸控拖曳：飛機要去的位置；null 代表沒在拖 */
  tx: number | null;
  ty: number | null;
  /** 鍵盤方向 -1～1 */
  dx: number;
  dy: number;
  bomb: boolean;
}

export interface Carry {
  score: number;
  lives: number;
  bombs: number;
  weapon: { kind: WeaponKind; level: number };
  missile: { kind: MissileKind; level: number } | null;
  nextLifeIdx: number;
}

export interface GameState {
  cfg: DifficultyConfig;
  stage: number;
  def: Stage;
  tick: number;
  scrollY: number;
  score: number;
  lives: number;
  nextLifeIdx: number;
  bombs: number;
  weapon: { kind: WeaponKind; level: number };
  missile: { kind: MissileKind; level: number } | null;
  player: Player;
  enemies: Enemy[];
  shots: PShot[];
  missiles: Missile[];
  ebullets: EBullet[];
  items: Item[];
  booms: Boom[];
  bomb: { ticks: number; x: number; y: number } | null;
  plasmaTarget: number | null;
  spawnIdx: number;
  bossSpawned: boolean;
  bossPos: { x: number; y: number } | null;
  warnTicks: number;
  phase: Phase;
  phaseTicks: number;
  medals: number;
  seed: number;
  nextId: number;
}

export const RESPAWN_TICKS = 90;
export const INVULN_TICKS = 150;
export const BOMB_TICKS = 100;
export const BOMB_DAMAGE = 6;
export const WARN_TICKS = 180;
export const BOSS_DOWN_TICKS = 200;
export const MEDAL_POINTS = 500;
export const PLAYER_SPEED = 2.4;
export const DRAG_SPEED = 5;
export const PICKUP_R = 14;
export const MAX_EBULLETS = 500;
/** 後面的關卡敵人開火比較頻繁 */
const STAGE_FIRE_MUL = [1, 0.9, 0.8];

const PLAYER_START = { x: W / 2, y: H - 34 };

export function startCarry(cfg: DifficultyConfig): Carry {
  return { score: 0, lives: cfg.lives, bombs: cfg.bombs, weapon: { kind: "vulcan", level: 1 }, missile: null, nextLifeIdx: 0 };
}

export function createStage(cfg: DifficultyConfig, stageIndex: number, carry: Carry, seed: number): GameState {
  return {
    cfg,
    stage: stageIndex + 1,
    def: STAGES[stageIndex],
    tick: 0,
    scrollY: 0,
    score: carry.score,
    lives: carry.lives,
    nextLifeIdx: carry.nextLifeIdx,
    bombs: carry.bombs,
    weapon: { ...carry.weapon },
    missile: carry.missile ? { ...carry.missile } : null,
    player: { ...PLAYER_START, alive: true, invuln: 60, respawn: 0, fireTimer: 0, missileTimer: 0 },
    enemies: [],
    shots: [],
    missiles: [],
    ebullets: [],
    items: [],
    booms: [],
    bomb: null,
    plasmaTarget: null,
    spawnIdx: 0,
    bossSpawned: false,
    bossPos: null,
    warnTicks: 0,
    phase: "playing",
    phaseTicks: 0,
    medals: 0,
    seed: seed >>> 0,
    nextId: 1,
  };
}

export function carryOver(s: GameState): Carry {
  return {
    score: s.score,
    lives: s.lives,
    bombs: s.bombs,
    weapon: { ...s.weapon },
    missile: s.missile ? { ...s.missile } : null,
    nextLifeIdx: s.nextLifeIdx,
  };
}

/** 跟坦克大戰一樣：累積時間換成固定步長的 tick 數 */
export { consumeTicks } from "../tank/sim.ts";

// ---------- 小工具 ----------

function addScore(s: GameState, points: number, events: GameEvent[]): void {
  s.score += points;
  const at = s.cfg.extraLifeAt;
  while (s.nextLifeIdx < at.length && s.score >= at[s.nextLifeIdx]) {
    s.nextLifeIdx++;
    s.lives++;
    events.push({ type: "extraLife" });
  }
}

function boom(s: GameState, x: number, y: number, size: number): void {
  s.booms.push({ x, y, size, age: 0, life: size > 12 ? 40 : 24 });
}

function onScreen(e: Enemy): boolean {
  return e.y > -ENEMIES[e.kind].h / 2 && e.y < H && e.x > -8 && e.x < W + 8;
}

function overlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
}

export function findEnemy(s: GameState, id: number | null): Enemy | undefined {
  return id === null ? undefined : s.enemies.find((e) => e.id === id && e.hp > 0);
}

function spawnEnemy(s: GameState, kind: EnemyKind, path: Path, drop?: ItemKind): Enemy {
  const def = ENEMIES[kind];
  const p = pathPos(path, 0, s.def.scroll);
  const e: Enemy = {
    id: s.nextId++,
    kind,
    path,
    age: 0,
    x: p.x,
    y: p.y,
    hp: def.hp,
    maxHp: def.hp,
    flash: 0,
    drop: drop ?? def.drop,
    spin: 0,
    aim: Math.PI / 2,
    phase: 0,
    phaseAge: 0,
  };
  s.enemies.push(e);
  return e;
}

// ---------- 傷害與擊破 ----------

function killEnemy(s: GameState, e: Enemy, events: GameEvent[]): void {
  const def = ENEMIES[e.kind];
  addScore(s, def.points, events);
  const big = def.w >= 20;
  boom(s, e.x, e.y, big ? 22 : 10);
  events.push({ type: "boom", big });
  if (e.drop) {
    const dir = rand(s) < 0.5 ? -1 : 1;
    s.items.push({ id: s.nextId++, kind: e.drop, x: e.x, y: e.y, vx: dir * 0.5, vy: e.drop === "medal" ? 0.8 : 0.45, age: 0 });
  }
  if (isBoss(e.kind)) {
    s.phase = "bossDown";
    s.phaseTicks = BOSS_DOWN_TICKS;
    s.bossPos = { x: e.x, y: e.y };
    s.ebullets = [];
    for (const o of s.enemies) {
      if (o !== e && o.hp > 0) {
        o.hp = 0;
        boom(s, o.x, o.y, 10);
      }
    }
    events.push({ type: "bossDown" });
  }
}

export function damage(s: GameState, e: Enemy, dmg: number, events: GameEvent[]): void {
  if (e.hp <= 0) return;
  if (isBoss(e.kind) && e.age < BOSS_ENTER) return;
  e.hp -= dmg;
  e.flash = 3;
  if (e.hp <= 0) killEnemy(s, e, events);
  else events.push({ type: "hit" });
}

function killPlayer(s: GameState, events: GameEvent[]): void {
  const p = s.player;
  p.alive = false;
  p.respawn = RESPAWN_TICKS;
  s.lives--;
  boom(s, p.x, p.y, 24);
  s.weapon.level = Math.max(1, s.weapon.level - s.cfg.levelLoss);
  if (!s.cfg.keepMissile) s.missile = null;
  s.bombs = Math.max(s.bombs, s.cfg.bombs);
  s.plasmaTarget = null;
  events.push({ type: "playerDie" });
}

// ---------- 敵人射擊 ----------

function fireGun(s: GameState, e: Enemy, gun: Gun): void {
  const ox = e.x + (gun.ox ?? 0);
  const oy = e.y + (gun.oy ?? 0);
  const p = gun.pattern;
  const speed = p.speed * s.cfg.bulletMul;
  const angles: number[] = [];
  switch (p.type) {
    case "aimed": {
      const base = Math.atan2(s.player.y - oy, s.player.x - ox);
      for (let i = 0; i < p.n; i++) angles.push(base + (p.n > 1 ? (i / (p.n - 1) - 0.5) * p.spread : 0));
      break;
    }
    case "fan":
      for (let i = 0; i < p.n; i++) angles.push(p.dir + (p.n > 1 ? (i / (p.n - 1) - 0.5) * p.spread : 0));
      break;
    case "ring":
      e.spin += 0.13;
      for (let i = 0; i < p.n; i++) angles.push(e.spin + (i * Math.PI * 2) / p.n);
      break;
    case "spiral":
      e.spin += p.step;
      for (let i = 0; i < p.arms; i++) angles.push(e.spin + (i * Math.PI * 2) / p.arms);
      break;
  }
  for (const a of angles) {
    if (s.ebullets.length >= MAX_EBULLETS) return;
    s.ebullets.push({ x: ox, y: oy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 2.5 });
  }
}

export function gunsOf(e: Enemy): Gun[] {
  const phases = BOSS_PHASES[e.kind];
  return phases ? phases[e.phase].guns : ENEMIES[e.kind].guns;
}

function updateEnemy(s: GameState, e: Enemy): void {
  e.age++;
  const pos = pathPos(e.path, e.age, s.def.scroll);
  e.x = pos.x;
  e.y = pos.y;
  if (e.flash > 0) e.flash--;
  if (s.player.alive) e.aim = Math.atan2(s.player.y - e.y, s.player.x - e.x);

  const boss = isBoss(e.kind);
  if (boss) {
    const next = bossPhaseIndex(e.kind, e.hp / e.maxHp);
    if (next !== e.phase) {
      e.phase = next;
      e.phaseAge = 0;
    }
    if (e.age > BOSS_ENTER) e.phaseAge++;
  }
  if (s.phase !== "playing" || !s.player.alive) return;
  if (boss ? e.age <= BOSS_ENTER : e.y < 4 || e.y > H * 0.75 || e.x < 0 || e.x > W) return;
  const gunAge = boss ? e.phaseAge : e.age;
  const mul = s.cfg.fireMul * STAGE_FIRE_MUL[s.stage - 1];
  for (const gun of gunsOf(e)) {
    const every = Math.max(3, Math.round(gun.every * mul));
    const k = gunAge - Math.round(gun.first * mul);
    if (k >= 0 && k % every === 0) fireGun(s, e, gun);
  }
}

// ---------- 玩家 ----------

function updatePlayer(s: GameState, input: Input, events: GameEvent[]): void {
  const p = s.player;
  if (!p.alive) {
    if (p.respawn > 0 && --p.respawn === 0) {
      if (s.lives > 0) {
        Object.assign(p, PLAYER_START, { alive: true, invuln: INVULN_TICKS, fireTimer: 0, missileTimer: 0 });
      } else {
        s.phase = "lost";
        events.push({ type: "gameOver" });
      }
    }
    return;
  }
  if (input.tx !== null && input.ty !== null) {
    const dx = input.tx - p.x;
    const dy = input.ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 0) {
      const k = Math.min(1, DRAG_SPEED / d);
      p.x += dx * k;
      p.y += dy * k;
    }
  }
  p.x += input.dx * PLAYER_SPEED;
  p.y += input.dy * PLAYER_SPEED;
  p.x = Math.max(8, Math.min(W - 8, p.x));
  p.y = Math.max(16, Math.min(H - 10, p.y));
  if (p.invuln > 0) p.invuln--;

  if (input.bomb && s.bombs > 0 && !s.bomb && s.phase === "playing") {
    s.bombs--;
    s.bomb = { ticks: BOMB_TICKS, x: p.x, y: p.y };
    p.invuln = Math.max(p.invuln, BOMB_TICKS + 30);
    events.push({ type: "bomb" });
  }

  // 主武器
  const w = s.weapon;
  if (w.kind === "plasma") {
    let target = findEnemy(s, s.plasmaTarget);
    if (!target || !onScreen(target) || target.y > p.y) {
      target = undefined;
      let best = Infinity;
      for (const e of s.enemies) {
        if (e.hp <= 0 || !onScreen(e) || e.y > p.y - 6) continue;
        if (isBoss(e.kind) && e.age < BOSS_ENTER) continue;
        const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
        if (d < best) {
          best = d;
          target = e;
        }
      }
    }
    s.plasmaTarget = target ? target.id : null;
    if (target) damage(s, target, plasmaDamage(w.level), events);
  } else {
    s.plasmaTarget = null;
  }
  if (--p.fireTimer <= 0) {
    p.fireTimer = FIRE_EVERY[w.kind];
    if (s.plasmaTarget === null) for (const shot of weaponShots(w.kind, w.level, p.x, p.y)) s.shots.push({ ...shot, id: s.nextId++ });
  }
  // 飛彈
  if (s.missile && --p.missileTimer <= 0) {
    p.missileTimer = MISSILE_EVERY[s.missile.kind];
    for (const m of missileShots(s.missile.kind, s.missile.level, p.x, p.y)) {
      s.missiles.push({ ...m, id: s.nextId++, targetId: null, age: 0 });
    }
  }
}

function updateMissile(s: GameState, m: Missile): void {
  m.age++;
  if (m.kind === "nuclear") {
    m.vy = Math.max(-7, m.vy - 0.2);
  } else {
    let t = findEnemy(s, m.targetId);
    if (!t || !onScreen(t)) {
      t = undefined;
      let best = Infinity;
      for (const e of s.enemies) {
        if (e.hp <= 0 || !onScreen(e)) continue;
        const d = (e.x - m.x) ** 2 + (e.y - m.y) ** 2;
        if (d < best) {
          best = d;
          t = e;
        }
      }
      m.targetId = t ? t.id : null;
    }
    const speed = Math.min(5, 2 + m.age * 0.15);
    let a = Math.atan2(m.vy, m.vx);
    if (t && m.age > 6) {
      const want = Math.atan2(t.y - m.y, t.x - m.x);
      let diff = want - a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a += Math.max(-0.14, Math.min(0.14, diff));
    } else if (m.age > 6) {
      a = -Math.PI / 2;
    }
    m.vx = Math.cos(a) * speed;
    m.vy = Math.sin(a) * speed;
  }
  m.x += m.vx;
  m.y += m.vy;
}

// ---------- 主迴圈 ----------

function offScreen(x: number, y: number, margin: number): boolean {
  return x < -margin || x > W + margin || y < -margin || y > H + margin;
}

export function step(s: GameState, input: Input, events: GameEvent[]): void {
  if (s.phase === "cleared" || s.phase === "lost") return;
  s.tick++;
  s.scrollY += s.def.scroll;

  // 出場表、警告、大魔王
  if (s.phase === "playing") {
    const list = s.def.spawns;
    while (s.spawnIdx < list.length && list[s.spawnIdx].t <= s.tick) {
      const sp = list[s.spawnIdx++];
      spawnEnemy(s, sp.kind, sp.path, sp.drop);
    }
    if (s.tick === s.def.bossAt - WARN_TICKS) {
      s.warnTicks = WARN_TICKS;
      events.push({ type: "warning" });
    }
    if (!s.bossSpawned && s.tick >= s.def.bossAt) {
      s.bossSpawned = true;
      spawnEnemy(s, s.def.boss, { type: "boss" });
    }
  }
  if (s.warnTicks > 0) s.warnTicks--;

  updatePlayer(s, input, events);
  // updatePlayer 可能把 phase 改成 lost（TS 看不出來）
  if ((s.phase as Phase) === "lost") return;

  // 炸彈：前 40 tick 每 4 tick 對畫面上所有敵人造成傷害，期間敵彈全消
  if (s.bomb) {
    const b = s.bomb;
    b.ticks--;
    s.ebullets = [];
    const k = BOMB_TICKS - b.ticks;
    if (k <= 40 && k % 4 === 0) {
      for (const e of s.enemies) if (onScreen(e)) damage(s, e, BOMB_DAMAGE, events);
      boom(s, 20 + rand(s) * (W - 40), 20 + rand(s) * (H - 60), 18);
    }
    if (b.ticks <= 0) s.bomb = null;
  }

  for (const shot of s.shots) {
    shot.x += shot.vx;
    shot.y += shot.vy;
  }
  for (const m of s.missiles) updateMissile(s, m);
  for (const e of s.enemies) if (e.hp > 0) updateEnemy(s, e);
  for (const b of s.ebullets) {
    b.x += b.vx;
    b.y += b.vy;
  }

  // 子彈打敵人
  for (const shot of s.shots) {
    for (const e of s.enemies) {
      if (e.hp <= 0 || !onScreen(e)) continue;
      const d = ENEMIES[e.kind];
      if (!overlap(shot.x, shot.y, shot.w, shot.h, e.x, e.y, d.w, d.h)) continue;
      damage(s, e, shot.dmg, events);
      shot.y = -999;
      break;
    }
  }
  for (const m of s.missiles) {
    for (const e of s.enemies) {
      if (e.hp <= 0 || !onScreen(e)) continue;
      const d = ENEMIES[e.kind];
      if (!overlap(m.x, m.y, 4, 8, e.x, e.y, d.w, d.h)) continue;
      damage(s, e, m.dmg, events);
      if (m.kind === "nuclear") {
        boom(s, m.x, m.y, 12);
        for (const o of s.enemies) {
          if (o !== e && o.hp > 0 && (o.x - m.x) ** 2 + (o.y - m.y) ** 2 < 24 * 24) damage(s, o, 2, events);
        }
      }
      m.y = -999;
      break;
    }
  }

  // 敵人打玩家
  const p = s.player;
  if (p.alive && p.invuln <= 0 && s.phase === "playing") {
    let hit = s.ebullets.some((b) => (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + 2) ** 2);
    if (!hit) {
      hit = s.enemies.some((e) => {
        const d = ENEMIES[e.kind];
        return e.hp > 0 && !d.ground && overlap(p.x, p.y, 6, 8, e.x, e.y, d.w * 0.8, d.h * 0.8);
      });
    }
    if (hit) killPlayer(s, events);
  }

  // 道具
  for (const it of s.items) {
    it.age++;
    it.x += it.vx;
    it.y += it.vy;
    if (it.x < 8 || it.x > W - 8) it.vx = -it.vx;
    if (it.kind !== "medal" && it.age < 480) {
      if (it.y > H - 14) it.vy = -Math.abs(it.vy);
      if (it.y < 24) it.vy = Math.abs(it.vy);
    } else if (it.vy < 0) {
      it.vy = -it.vy;
    }
    if (p.alive && (it.x - p.x) ** 2 + (it.y - p.y) ** 2 < PICKUP_R * PICKUP_R) {
      if (it.kind === "medal") {
        s.medals++;
        addScore(s, MEDAL_POINTS, events);
      } else if (it.kind === "life") {
        s.lives++;
      } else {
        addScore(s, pickUp(s, it.kind, it.age), events);
      }
      events.push({ type: "item", kind: it.kind });
      it.y = 9999;
    }
  }

  // 大魔王爆炸中
  if (s.phase === "bossDown") {
    s.phaseTicks--;
    if (s.bossPos && s.phaseTicks % 8 === 0 && s.phaseTicks > 40) {
      boom(s, s.bossPos.x + (rand(s) - 0.5) * 70, s.bossPos.y + (rand(s) - 0.5) * 50, 16);
      events.push({ type: "boom", big: true });
    }
    if (s.phaseTicks <= 0) {
      s.phase = "cleared";
      events.push({ type: "stageClear" });
    }
  }

  for (const b of s.booms) b.age++;

  // 清掉跑出畫面的東西
  s.shots = s.shots.filter((b) => !offScreen(b.x, b.y, 20));
  s.missiles = s.missiles.filter((m) => !offScreen(m.x, m.y, 20) && m.age < 300);
  s.ebullets = s.ebullets.filter((b) => !offScreen(b.x, b.y, 8));
  s.items = s.items.filter((it) => it.y < H + 12);
  s.booms = s.booms.filter((b) => b.age < b.life);
  s.enemies = s.enemies.filter((e) => e.hp > 0 && !(e.age > 30 && offScreen(e.x, e.y, 70)));
}
