import type { Difficulty, EnemyKind } from "./constants.ts";

export const POINTS: Record<EnemyKind, number> = { basic: 100, fast: 200, power: 300, armor: 400 };

export type DiffMap = { classic: number; easy: number };

export const HI_KEY = "tinytap-tank-hi";
export const PROGRESS_KEY = "tinytap-tank-progress";

function parseObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
    return v as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 最高分：壞資料、非有限數字或負數 → 0 */
export function parseHiScores(raw: string | null): DiffMap {
  const o = parseObject(raw);
  const pick = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  return { classic: pick(o?.classic), easy: pick(o?.easy) };
}

export function mergeHiScore(map: DiffMap, diff: Difficulty, score: number): DiffMap {
  return score > map[diff] ? { ...map, [diff]: score } : { ...map };
}

/** 最遠到達關卡（1 起算）：壞資料、非整數或 < 1 → 1 */
export function parseProgress(raw: string | null): DiffMap {
  const o = parseObject(raw);
  const pick = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : 1);
  return { classic: pick(o?.classic), easy: pick(o?.easy) };
}

export function mergeProgress(map: DiffMap, diff: Difficulty, stage: number): DiffMap {
  return stage > map[diff] ? { ...map, [diff]: stage } : { ...map };
}
