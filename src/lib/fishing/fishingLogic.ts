/**
 * 釣魚遊戲的純邏輯：魚種定義、游動、找最近的魚、捲線輪圈數。
 * 座標皆為池塘內的正規化座標（x, y 都在 0～1）。
 */

export type CatchKind =
  | "shark"
  | "koi"
  | "puffer"
  | "turtle"
  | "octopus"
  | "crab"
  | "tire"
  | "boot";

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
  /** 隨機抽選時的權重 */
  weight: number;
}

export interface Swimmer {
  id: number;
  kind: CatchKind;
  x: number;
  y: number;
  baseY: number;
  /** 正在游向的目標深度，到了會再隨機換一個 */
  targetY: number;
  dir: 1 | -1;
  speed: number;
  phase: number;
  /** true = 準備游出池塘，不再折返 */
  leaving?: boolean;
}

export const REEL_TURNS_NEEDED = 3;
/** 池裡最多同時有幾隻，滿了會讓舊的游走 */
export const MAX_SWIMMERS = 11;

export const CATCH_TYPES: CatchType[] = [
  { kind: "shark", label: "鯊魚", emoji: "🦈", size: 64, speed: 0.16, minDepth: 0.12, maxDepth: 0.8, isJunk: false, weight: 3 },
  { kind: "koi", label: "鯉魚", emoji: "🐠", size: 44, speed: 0.22, minDepth: 0.08, maxDepth: 0.85, isJunk: false, weight: 4 },
  { kind: "puffer", label: "河豚", emoji: "🐡", size: 44, speed: 0.14, minDepth: 0.1, maxDepth: 0.8, isJunk: false, weight: 3 },
  { kind: "turtle", label: "烏龜", emoji: "🐢", size: 46, speed: 0.08, minDepth: 0.1, maxDepth: 0.9, isJunk: false, weight: 2 },
  { kind: "octopus", label: "章魚", emoji: "🐙", size: 48, speed: 0.12, minDepth: 0.4, maxDepth: 0.9, isJunk: false, weight: 2 },
  { kind: "crab", label: "螃蟹", emoji: "🦀", size: 42, speed: 0.1, minDepth: 0.7, maxDepth: 0.95, isJunk: false, weight: 3 },
  { kind: "tire", label: "輪胎", emoji: "🛞", size: 46, speed: 0.03, minDepth: 0.8, maxDepth: 0.95, isJunk: true, weight: 2 },
  { kind: "boot", label: "舊靴子", emoji: "🥾", size: 40, speed: 0.03, minDepth: 0.8, maxDepth: 0.95, isJunk: true, weight: 1 },
];

export function getCatchType(kind: CatchKind): CatchType {
  return CATCH_TYPES.find((c) => c.kind === kind)!;
}

let nextId = 1;

/** 依權重隨機抽一種 */
export function pickRandomKind(rand: () => number = Math.random): CatchKind {
  const total = CATCH_TYPES.reduce((s, c) => s + c.weight, 0);
  let r = rand() * total;
  for (const c of CATCH_TYPES) {
    r -= c.weight;
    if (r < 0) return c.kind;
  }
  return CATCH_TYPES[CATCH_TYPES.length - 1].kind;
}

export function createSwimmer(kind: CatchKind, rand: () => number = Math.random): Swimmer {
  const type = getCatchType(kind);
  const baseY = type.minDepth + rand() * (type.maxDepth - type.minDepth);
  return {
    id: nextId++,
    kind,
    x: 0.05 + rand() * 0.9,
    y: baseY,
    baseY,
    targetY: type.minDepth + rand() * (type.maxDepth - type.minDepth),
    dir: rand() < 0.5 ? -1 : 1,
    speed: type.speed * (0.8 + rand() * 0.4),
    phase: rand() * Math.PI * 2,
  };
}

/**
 * 建立 count 隻：保證至少一個垃圾、一隻螃蟹，其餘依權重隨機，
 * 所以每次進來的組合和深度都不一樣。
 */
export function createSwimmers(count: number, rand: () => number = Math.random): Swimmer[] {
  const kinds: CatchKind[] = [rand() < 0.7 ? "tire" : "boot", "crab"];
  while (kinds.length < count) kinds.push(pickRandomKind(rand));
  // 洗牌，避免固定順序
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return kinds.slice(0, count).map((k) => createSwimmer(k, rand));
}

/** 從池塘左或右邊外側出生，朝池內游 */
export function spawnFromEdge(kind: CatchKind, rand: () => number = Math.random): Swimmer {
  const s = createSwimmer(kind, rand);
  const fromLeft = rand() < 0.5;
  s.x = fromLeft ? -0.08 : 1.08;
  s.dir = fromLeft ? 1 : -1;
  return s;
}

/**
 * 族群輪替：未滿時隨機生成一隻新的；滿了就挑一隻讓牠游出池塘。
 * 由呼叫端每隔幾秒呼叫一次。
 */
export function tickPopulation(swimmers: Swimmer[], rand: () => number = Math.random): void {
  if (swimmers.length < MAX_SWIMMERS) {
    swimmers.push(spawnFromEdge(pickRandomKind(rand), rand));
    return;
  }
  const staying = swimmers.filter((s) => !s.leaving);
  if (staying.length === 0) return;
  const pick = staying[Math.min(staying.length - 1, Math.floor(rand() * staying.length))];
  pick.leaving = true;
  pick.dir = pick.x < 0.5 ? -1 : 1;
}

/** 移除已經游出池塘的 */
export function removeGone(swimmers: Swimmer[]): Swimmer[] {
  return swimmers.filter((s) => !(s.leaving && (s.x < -0.1 || s.x > 1.1)));
}

/** 每幀更新游動位置（左右 + 上下）；dt 為秒。 */
export function updateSwimmers(
  swimmers: Swimmer[],
  dt: number,
  rand: () => number = Math.random
): void {
  for (const s of swimmers) {
    const type = getCatchType(s.kind);

    // 左右：碰到池邊折返（準備游走的不折返）
    s.x += s.dir * s.speed * dt;
    if (!s.leaving) {
      if (s.x > 0.97 && s.dir === 1) s.dir = -1;
      else if (s.x < 0.03 && s.dir === -1) s.dir = 1;
    }

    // 上下：游向目標深度，到了再隨機換一個（垃圾沉在池底不動）
    if (!type.isJunk) {
      const dy = s.targetY - s.baseY;
      const step = s.speed * 0.6 * dt;
      if (Math.abs(dy) <= step) {
        s.baseY = s.targetY;
        s.targetY = type.minDepth + rand() * (type.maxDepth - type.minDepth);
      } else {
        s.baseY += Math.sign(dy) * step;
      }
    }

    s.phase += dt * 2;
    s.y = s.baseY + Math.sin(s.phase) * 0.015;
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

/** 兩個角度（度）之間最短的差值，範圍 -180～180 */
export function angleDelta(prev: number, next: number): number {
  let d = next - prev;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/** 由累積旋轉角度算出完成幾圈（往哪個方向轉都算） */
export function turnsFromAngle(accum: number): number {
  return Math.min(REEL_TURNS_NEEDED, Math.floor(Math.abs(accum) / 360));
}

export function isReelDone(accum: number): boolean {
  return Math.abs(accum) >= REEL_TURNS_NEEDED * 360;
}
