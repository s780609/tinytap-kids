import type { Difficulty, DifficultyConfig } from "./constants.ts";

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  classic: {
    id: "classic",
    lives: 3,
    bombs: 3,
    fireMul: 1,
    bulletMul: 1,
    levelLoss: 99,
    keepMissile: false,
    extraLifeAt: [50000, 150000],
  },
  easy: {
    id: "easy",
    lives: 5,
    bombs: 4,
    fireMul: 1.6,
    bulletMul: 0.7,
    levelLoss: 2,
    keepMissile: true,
    extraLifeAt: [30000, 80000, 150000],
  },
};
