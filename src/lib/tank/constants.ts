/** 坦克大戰：尺寸常數、地形碼與共用型別（純資料，Node 型別剝除相容：不用 enum） */

/** 1 格 = 16px、1 子格 = 8px；地圖 13×13 格 = 26×26 子格 = 208×208px */
export const TILE = 16;
export const SUB = 8;
export const GRID_N = 26;
export const MAP_PX = 208;
export const TANK_SIZE = 16;
export const BULLET_SIZE = 4;

/** 地形碼（子格） */
export const T = { EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, TREES: 4, ICE: 5 } as const;
export type Terrain = (typeof T)[keyof typeof T];

/** 基地矩形（px） */
export const BASE_RECT = { x: 96, y: 192, w: 16, h: 16 } as const;
/** 玩家出生點 */
export const PLAYER_SPAWN = { x: 64, y: 192 } as const;
/** 敵方出生欄（格），依序輪流 */
export const ENEMY_SPAWN_COLS = [6, 12, 0] as const;

/** 0 上、1 右、2 下、3 左 */
export type Dir = 0 | 1 | 2 | 3;
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;

export type Side = "player" | "enemy";
export type EnemyKind = "basic" | "fast" | "power" | "armor";
export type PowerKind = "star" | "helmet" | "clock" | "shovel" | "grenade" | "tank";
export type Difficulty = "classic" | "easy";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Tank {
  id: number;
  side: Side;
  kind: "player" | EnemyKind;
  x: number;
  y: number;
  dir: Dir;
  acc: number;
  hp: number;
  bonus: boolean;
  shield: number;
  reload: number;
  aiTimer: number;
  fireTimer: number;
  slide: number;
  blocked: boolean;
  moving: boolean;
}

export interface Bullet {
  id: number;
  ownerId: number;
  side: Side;
  x: number;
  y: number;
  dir: Dir;
  speed: number;
  breaksSteel: boolean;
}

export interface QueuedEnemy {
  kind: EnemyKind;
  bonus: boolean;
}

export interface Sparkle {
  x: number;
  y: number;
  ticks: number;
  enemy: QueuedEnemy | null;
}

export interface PowerUp {
  kind: PowerKind;
  x: number;
  y: number;
  ticks: number;
}

/** 純視覺特效（爆炸、分數字樣），由 sim 計時 */
export interface Fx {
  kind: "boomS" | "boomL" | "score";
  x: number;
  y: number;
  ticks: number;
  value: number;
}

export type GameEvent =
  | { type: "shoot"; side: Side }
  | { type: "brick" }
  | { type: "steel" }
  | { type: "armorHit" }
  | { type: "explode"; big: boolean; x: number; y: number }
  | { type: "powerAppear" }
  | { type: "powerGet"; kind: PowerKind }
  | { type: "extraLife" }
  | { type: "playerDown" }
  | { type: "baseDown" }
  | { type: "stageClear" }
  | { type: "gameOver" };

export interface Input {
  dir: Dir | null;
  fire: boolean;
}

export interface Carry {
  score: number;
  lives: number;
  stars: 0 | 1 | 2 | 3;
  nextLifeIdx: number;
}

export interface DifficultyConfig {
  id: Difficulty;
  lives: number;
  enemiesPerStage: number;
  maxOnScreen: number;
  enemySpeedMul: number;
  enemyBulletMul: number;
  enemyFireMin: number;
  enemyFireMax: number;
  aiBaseBias: number;
  aiPlayerBias: number;
  armorHp: number;
  bonusAt: readonly number[];
  spawnShieldTicks: number;
  helmetTicks: number;
  clockTicks: number;
  shovelTicks: number;
  powerUpTicks: number;
  startShovelTicks: number;
  starsOnDeath: "reset" | "minusOne";
  extraLifeAt: readonly number[];
  /** 出生冷卻 = max(spawnMin, spawnBase - (stage-1) * spawnStep) */
  spawnBase: number;
  spawnStep: number;
  spawnMin: number;
}

export type Phase = "playing" | "clearing" | "cleared" | "losing" | "lost";

export interface GameState {
  cfg: DifficultyConfig;
  stage: number;
  grid: Uint8Array;
  terrainVersion: number;
  baseAlive: boolean;
  player: Tank | null;
  playerSparkle: Sparkle | null;
  respawnTimer: number;
  lives: number;
  stars: 0 | 1 | 2 | 3;
  enemies: Tank[];
  sparkles: Sparkle[];
  queue: QueuedEnemy[];
  spawnCooldown: number;
  spawnCursor: number;
  bullets: Bullet[];
  powerUp: PowerUp | null;
  freeze: number;
  shovel: number;
  kills: Record<EnemyKind, number>;
  destroyed: number;
  score: number;
  nextLifeIdx: number;
  phase: Phase;
  phaseTimer: number;
  tick: number;
  seed: number;
  nextId: number;
  fx: Fx[];
}
