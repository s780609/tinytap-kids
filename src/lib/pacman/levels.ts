/**
 * 難度與每關參數。時間單位皆為 tick（60 tick = 1 秒），速度單位為「格 / tick」。
 */
export type Difficulty = "classic" | "easy";

export interface DifficultyConfig {
  id: Difficulty;
  lives: number;
  /** 鬼的速度倍率 */
  ghostSpeedMul: number;
  /** 鬼變藍時間倍率，以及最少幾秒 */
  frightMul: number;
  minFrightSec: number;
  /** 分數到這些門檻各加一條命 */
  extraLifeAt: number[];
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  classic: { id: "classic", lives: 3, ghostSpeedMul: 1, frightMul: 1, minFrightSec: 0, extraLifeAt: [10000] },
  easy: { id: "easy", lives: 5, ghostSpeedMul: 0.8, frightMul: 1.5, minFrightSec: 3, extraLifeAt: [10000, 30000, 60000] },
};

export type FruitKind = "cherry" | "strawberry" | "orange" | "apple" | "melon" | "rocket" | "bell" | "key";

export const FRUIT_POINTS: Record<FruitKind, number> = {
  cherry: 100,
  strawberry: 300,
  orange: 500,
  apple: 700,
  melon: 1000,
  rocket: 2000,
  bell: 3000,
  key: 5000,
};

const FRUIT_BY_LEVEL: FruitKind[] = [
  "cherry",
  "strawberry",
  "orange",
  "orange",
  "apple",
  "apple",
  "melon",
  "melon",
  "rocket",
  "rocket",
  "bell",
  "bell",
];

export function fruitOf(level: number): FruitKind {
  return FRUIT_BY_LEVEL[level - 1] ?? "key";
}

export interface LevelSpec {
  pacSpeed: number;
  pacFrightSpeed: number;
  ghostSpeed: number;
  ghostTunnelSpeed: number;
  ghostFrightSpeed: number;
  frightTicks: number;
  /** 散開 / 追擊輪流的長度：偶數格是散開、奇數格是追擊，最後一段無限 */
  schedule: number[];
  /** 粉、青、橘三隻鬼出門前要先吃掉幾顆豆子 */
  release: [number, number, number];
  /** 這麼久沒吃豆子就放下一隻鬼出門 */
  idleTicks: number;
}

/** 100% 速度：每秒 6 格（原本 8 格在手機小迷宮上太快） */
const BASE = 6 / 60;
const SEC = 60;

/** 經典模式每關變藍秒數（第 19 關以後不會變藍，只會掉頭） */
const FRIGHT_SEC = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1];

const SCHEDULES = [
  [7, 20, 7, 20, 5, 20, 5, Infinity],
  [7, 20, 7, 20, 5, 1033, 1 / 60, Infinity],
  [5, 20, 5, 20, 5, 1037, 1 / 60, Infinity],
];

const RELEASE: [number, number, number][] = [
  [0, 20, 45],
  [0, 0, 35],
  [0, 0, 0],
];

/** 死掉重來後鬼出門的門檻（不分關卡） */
export const DEATH_RELEASE: [number, number, number] = [5, 12, 22];

export function levelSpec(cfg: DifficultyConfig, level: number): LevelSpec {
  const tier = level <= 1 ? 0 : level <= 4 ? 1 : 2;
  const pac = [0.8, 0.9, 1][tier];
  const pacFright = [0.9, 0.95, 1][tier];
  const ghost = [0.75, 0.85, 0.95][tier] * cfg.ghostSpeedMul;
  const tunnel = [0.4, 0.45, 0.5][tier] * cfg.ghostSpeedMul;
  const fright = [0.5, 0.55, 0.6][tier] * cfg.ghostSpeedMul;
  const frightSec = Math.max(cfg.minFrightSec, (FRIGHT_SEC[level - 1] ?? 0) * cfg.frightMul);
  // 輕鬆模式一直用第 1 關的散開節奏（散開比較久）
  const schedule = SCHEDULES[cfg.id === "easy" ? 0 : tier].map((sec) => (sec === Infinity ? Infinity : Math.round(sec * SEC)));
  return {
    pacSpeed: pac * BASE,
    pacFrightSpeed: pacFright * BASE,
    ghostSpeed: ghost * BASE,
    ghostTunnelSpeed: tunnel * BASE,
    ghostFrightSpeed: fright * BASE,
    frightTicks: Math.round(frightSec * SEC),
    schedule,
    release: RELEASE[Math.min(level - 1, 2)],
    idleTicks: (level <= 4 ? 4 : 3) * SEC,
  };
}
