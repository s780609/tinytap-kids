/**
 * 釣魚遊戲的純邏輯：魚種定義、游動、找最近的魚、收線圈數。
 * 座標皆為池塘內的正規化座標（x, y 都在 0～1）。
 */

export type CatchKind = "shark" | "koi" | "crab" | "tire";

export interface CatchType {
  kind: CatchKind;
  label: string;
  emoji: string;
  /** 在畫布上的字級（px） */
  size: number;
  /** 游動速度（每秒移動的池寬比例） */
  speed: number;
  /** 出沒深度範圍（0 = 水面，1 = 池底） */
  minDepth: number;
  maxDepth: number;
  isJunk: boolean;
}

export interface Swimmer {
  id: number;
  kind: CatchKind;
  x: number;
  y: number;
  baseY: number;
  dir: 1 | -1;
  speed: number;
  phase: number;
}

export const REEL_TURNS_NEEDED = 3;

export const CATCH_TYPES: CatchType[] = [
  { kind: "shark", label: "鯊魚", emoji: "🦈", size: 64, speed: 0.16, minDepth: 0.25, maxDepth: 0.6, isJunk: false },
  { kind: "koi", label: "鯉魚", emoji: "🐠", size: 44, speed: 0.22, minDepth: 0.1, maxDepth: 0.7, isJunk: false },
  { kind: "crab", label: "螃蟹", emoji: "🦀", size: 42, speed: 0.1, minDepth: 0.85, maxDepth: 0.95, isJunk: false },
  { kind: "tire", label: "輪胎", emoji: "🛞", size: 46, speed: 0.03, minDepth: 0.88, maxDepth: 0.95, isJunk: true },
];

export function getCatchType(kind: CatchKind): CatchType {
  return CATCH_TYPES.find((c) => c.kind === kind)!;
}

let nextId = 1;

export function createSwimmer(kind: CatchKind, rand: () => number = Math.random): Swimmer {
  const type = getCatchType(kind);
  const baseY = type.minDepth + rand() * (type.maxDepth - type.minDepth);
  return {
    id: nextId++,
    kind,
    x: 0.05 + rand() * 0.9,
    y: baseY,
    baseY,
    dir: rand() < 0.5 ? -1 : 1,
    speed: type.speed * (0.8 + rand() * 0.4),
    phase: rand() * Math.PI * 2,
  };
}

/** 建立 count 隻，前四隻保證每種各一，其餘以魚為主隨機。 */
export function createSwimmers(count: number, rand: () => number = Math.random): Swimmer[] {
  const list: Swimmer[] = [];
  const pool: CatchKind[] = ["koi", "koi", "shark", "crab", "koi", "tire"];
  for (let i = 0; i < count; i++) {
    const kind = i < CATCH_TYPES.length
      ? CATCH_TYPES[i].kind
      : pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
    list.push(createSwimmer(kind, rand));
  }
  return list;
}

/** 每幀更新游動位置；dt 為秒。 */
export function updateSwimmers(swimmers: Swimmer[], dt: number): void {
  for (const s of swimmers) {
    s.x += s.dir * s.speed * dt;
    if (s.x > 0.97) {
      s.x = 0.97;
      s.dir = -1;
    } else if (s.x < 0.03) {
      s.x = 0.03;
      s.dir = 1;
    }
    s.phase += dt * 2;
    s.y = s.baseY + Math.sin(s.phase) * 0.02;
  }
}

export function nearestSwimmer(swimmers: Swimmer[], x: number, y: number): Swimmer | null {
  let best: Swimmer | null = null;
  let bestD = Infinity;
  for (const s of swimmers) {
    const d = (s.x - x) ** 2 + (s.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function reelStep(turns: number): { turns: number; done: boolean } {
  const next = turns + 1;
  return { turns: next, done: next >= REEL_TURNS_NEEDED };
}
