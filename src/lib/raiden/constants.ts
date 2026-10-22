/**
 * 復古雷電：共用常數與型別。畫面座標為 240×320 邏輯像素，y 往下為正；60 tick = 1 秒。
 */
export const W = 240;
export const H = 320;
export const TICK_SEC = 1 / 60;

export type Difficulty = "classic" | "easy";
export type WeaponKind = "vulcan" | "laser" | "plasma";
export type MissileKind = "homing" | "nuclear";
export type ItemKind = "weapon" | "missile" | "bomb" | "medal" | "life";
export type EnemyKind =
  | "dart"
  | "fighter"
  | "carrier"
  | "tank"
  | "turret"
  | "gunship"
  | "boss1"
  | "boss2"
  | "boss3";

export const WEAPON_MAX = 8;
export const MISSILE_MAX = 4;
export const BOMB_MAX = 7;

/** 敵人的移動路線：給定出生後經過幾 tick，算出位置（見 paths.ts） */
export type Path =
  | { type: "line"; x: number; y: number; vx: number; vy: number }
  | { type: "swoop"; x: number; side: -1 | 1 }
  | { type: "hover"; x: number; y: number; stay: number; leave: -1 | 1 }
  | { type: "sine"; x: number; amp: number; freq: number; vy: number }
  | { type: "ground"; x: number; y: number; vx: number; vy: number }
  | { type: "boss" };

/** 敵人的射擊方式；角度單位為弧度，π/2 = 正下方 */
export type Pattern =
  | { type: "aimed"; n: number; spread: number; speed: number }
  | { type: "ring"; n: number; speed: number }
  | { type: "spiral"; arms: number; step: number; speed: number }
  | { type: "fan"; n: number; spread: number; speed: number; dir: number };

export interface Gun {
  pattern: Pattern;
  /** 每幾 tick 射一次、第一次在出生後第幾 tick */
  every: number;
  first: number;
  ox?: number;
  oy?: number;
}

export interface Spawn {
  t: number;
  kind: EnemyKind;
  path: Path;
  drop?: ItemKind;
}

export interface Stage {
  name: string;
  /** 0 草原、1 海上、2 要塞 */
  terrain: 0 | 1 | 2;
  scroll: number;
  bossAt: number;
  boss: EnemyKind;
  spawns: Spawn[];
}

export interface DifficultyConfig {
  id: Difficulty;
  lives: number;
  bombs: number;
  /** 敵人射擊間隔倍率（越大越少）、子彈速度倍率 */
  fireMul: number;
  bulletMul: number;
  /** 死掉後主武器掉幾級（最低 1 級）、飛彈是否保留 */
  levelLoss: number;
  keepMissile: boolean;
  extraLifeAt: number[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
