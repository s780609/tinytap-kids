/**
 * 釣魚遊戲的純邏輯：魚種定義、游動、找最近的魚、戳魚、捲線輪圈數。
 * 座標皆為池塘內的正規化座標（x, y 都在 0～1）。
 */

export type CatchKind =
  | "shark"
  | "koi"
  | "puffer"
  | "turtle"
  | "octopus"
  | "crab"
  | "frog"
  | "shrimp"
  | "squid"
  | "lobster"
  | "penguin"
  | "seal"
  | "goldfish"
  | "whale"
  | "mermaid"
  | "treasure"
  | "tire"
  | "boot"
  | "can";

/** 上鉤時的特殊反應：大力拉扯 / 鼓成一顆球 / 噴墨汁 */
export type CatchReaction = "strong" | "puff" | "ink";

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
  /** 稀有獵物：出現機率很低，釣到有特別的慶祝 */
  isRare?: boolean;
  /** 隨機抽選時的權重 */
  weight: number;
  /** 捲線輪要畫幾圈才釣得上來 */
  reelTurns: number;
  reaction?: CatchReaction;
  /** 量詞（隻 / 個） */
  unit: string;
  /** 在池裡會發光（金魚） */
  glow?: string;
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
  /** 被戳到時跳一下的進度（0～1），沒在跳就是 undefined */
  jumpT?: number;
}

/** 一般魚的捲線圈數（每種魚可以不同，見 CatchType.reelTurns） */
export const REEL_TURNS_NEEDED = 3;
/** 池裡最多同時有幾隻，滿了會讓舊的游走 */
export const MAX_SWIMMERS = 11;
/** 連點模式下，點一下捲線輪算轉了幾度 */
export const TAP_REEL_DEGREES = 180;
/** 被戳到跳一下要幾秒 */
export const JUMP_DURATION = 0.6;

export const CATCH_TYPES: CatchType[] = [
  { kind: "shark", label: "鯊魚", emoji: "🦈", size: 64, speed: 0.16, minDepth: 0.12, maxDepth: 0.8, isJunk: false, weight: 3, reelTurns: 5, reaction: "strong", unit: "條" },
  { kind: "koi", label: "鯉魚", emoji: "🐠", size: 44, speed: 0.22, minDepth: 0.08, maxDepth: 0.85, isJunk: false, weight: 4, reelTurns: 3, unit: "條" },
  { kind: "puffer", label: "河豚", emoji: "🐡", size: 44, speed: 0.14, minDepth: 0.1, maxDepth: 0.8, isJunk: false, weight: 3, reelTurns: 3, reaction: "puff", unit: "隻" },
  { kind: "turtle", label: "烏龜", emoji: "🐢", size: 46, speed: 0.08, minDepth: 0.1, maxDepth: 0.9, isJunk: false, weight: 2, reelTurns: 2, unit: "隻" },
  { kind: "octopus", label: "章魚", emoji: "🐙", size: 48, speed: 0.12, minDepth: 0.4, maxDepth: 0.9, isJunk: false, weight: 2, reelTurns: 3, reaction: "ink", unit: "隻" },
  { kind: "crab", label: "螃蟹", emoji: "🦀", size: 42, speed: 0.1, minDepth: 0.7, maxDepth: 0.95, isJunk: false, weight: 3, reelTurns: 2, unit: "隻" },
  { kind: "frog", label: "青蛙", emoji: "🐸", size: 40, speed: 0.14, minDepth: 0.05, maxDepth: 0.55, isJunk: false, weight: 3, reelTurns: 2, unit: "隻" },
  { kind: "shrimp", label: "蝦子", emoji: "🦐", size: 36, speed: 0.18, minDepth: 0.4, maxDepth: 0.95, isJunk: false, weight: 3, reelTurns: 2, unit: "隻" },
  { kind: "squid", label: "魷魚", emoji: "🦑", size: 46, speed: 0.16, minDepth: 0.2, maxDepth: 0.8, isJunk: false, weight: 3, reelTurns: 3, reaction: "ink", unit: "隻" },
  { kind: "lobster", label: "龍蝦", emoji: "🦞", size: 46, speed: 0.08, minDepth: 0.75, maxDepth: 0.95, isJunk: false, weight: 2, reelTurns: 3, unit: "隻" },
  { kind: "penguin", label: "企鵝", emoji: "🐧", size: 46, speed: 0.24, minDepth: 0.05, maxDepth: 0.6, isJunk: false, weight: 3, reelTurns: 3, unit: "隻" },
  { kind: "seal", label: "海豹", emoji: "🦭", size: 54, speed: 0.16, minDepth: 0.1, maxDepth: 0.7, isJunk: false, weight: 2, reelTurns: 4, reaction: "strong", unit: "隻" },
  { kind: "goldfish", label: "金色小魚", emoji: "🐟", size: 46, speed: 0.26, minDepth: 0.1, maxDepth: 0.8, isJunk: false, isRare: true, weight: 0.5, reelTurns: 3, unit: "條", glow: "#FFD54F" },
  { kind: "whale", label: "鯨魚", emoji: "🐳", size: 76, speed: 0.1, minDepth: 0.2, maxDepth: 0.7, isJunk: false, isRare: true, weight: 0.4, reelTurns: 5, reaction: "strong", unit: "隻" },
  { kind: "mermaid", label: "美人魚", emoji: "🧜‍♀️", size: 54, speed: 0.15, minDepth: 0.15, maxDepth: 0.8, isJunk: false, isRare: true, weight: 0.3, reelTurns: 3, unit: "條" },
  { kind: "treasure", label: "寶箱", emoji: "🎁", size: 48, speed: 0.02, minDepth: 0.85, maxDepth: 0.95, isJunk: false, isRare: true, weight: 0.4, reelTurns: 4, unit: "個" },
  { kind: "tire", label: "輪胎", emoji: "🛞", size: 46, speed: 0.03, minDepth: 0.8, maxDepth: 0.95, isJunk: true, weight: 1.2, reelTurns: 3, unit: "個" },
  { kind: "boot", label: "舊靴子", emoji: "👢", size: 42, speed: 0.03, minDepth: 0.8, maxDepth: 0.95, isJunk: true, weight: 1.2, reelTurns: 2, unit: "個" },
  { kind: "can", label: "鐵罐", emoji: "🥫", size: 38, speed: 0.03, minDepth: 0.8, maxDepth: 0.95, isJunk: true, weight: 1.2, reelTurns: 2, unit: "個" },
];

export function getCatchType(kind: CatchKind): CatchType {
  return CATCH_TYPES.find((c) => c.kind === kind)!;
}

let nextId = 1;

/** 偏好的種類（例如任務要釣的魚）權重變成幾倍 */
export const FAVOR_MULTIPLIER = 3;

/** 這種魚在這個池塘會不會出現：allowed 是場景的一般魚清單，稀有獵物與垃圾到處都有 */
export function isAllowed(type: CatchType, allowed?: readonly CatchKind[]): boolean {
  return !allowed || type.isJunk || !!type.isRare || allowed.includes(type.kind);
}

/**
 * 依權重隨機抽一種；favor 符合的種類權重加倍，任務要的魚比較容易出現。
 * allowed 給了就只抽場景裡會出現的一般魚（見 scenes.ts）。
 */
export function pickRandomKind(
  rand: () => number = Math.random,
  favor?: (type: CatchType) => boolean,
  allowed?: readonly CatchKind[]
): CatchKind {
  const weightOf = (c: CatchType) =>
    !isAllowed(c, allowed) ? 0 : favor?.(c) ? c.weight * FAVOR_MULTIPLIER : c.weight;
  const total = CATCH_TYPES.reduce((s, c) => s + weightOf(c), 0);
  let r = rand() * total;
  for (const c of CATCH_TYPES) {
    r -= weightOf(c);
    if (r < 0) return c.kind;
  }
  return CATCH_TYPES[CATCH_TYPES.length - 1].kind;
}

/**
 * 打開寶箱：裡面是隨機一樣東西。大多是一般的魚（不分天氣），偶爾是稀有獵物，也可能是垃圾。
 * 不會又是寶箱。
 */
export const TREASURE_ODDS = { fish: 0.65, rare: 0.1, junk: 0.25 };

export function treasureContents(rand: () => number = Math.random): CatchKind {
  const r = rand();
  const pool =
    r < TREASURE_ODDS.fish
      ? CATCH_TYPES.filter((c) => !c.isJunk && !c.isRare)
      : r < TREASURE_ODDS.fish + TREASURE_ODDS.rare
        ? CATCH_TYPES.filter((c) => c.isRare && c.kind !== "treasure")
        : CATCH_TYPES.filter((c) => c.isJunk);
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))].kind;
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
 * 建立 count 隻：保證至少一個垃圾、一隻一般魚（沒給 allowed 時是螃蟹），其餘依權重隨機，
 * 所以每次進來的組合和深度都不一樣。
 */
export function createSwimmers(
  count: number,
  rand: () => number = Math.random,
  allowed?: readonly CatchKind[]
): Swimmer[] {
  const junk = CATCH_TYPES.filter((c) => c.isJunk);
  const sure = allowed ? allowed[Math.min(allowed.length - 1, Math.floor(rand() * allowed.length))] : "crab";
  const kinds: CatchKind[] = [junk[Math.min(junk.length - 1, Math.floor(rand() * junk.length))].kind, sure];
  while (kinds.length < count) kinds.push(pickRandomKind(rand, undefined, allowed));
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
export function tickPopulation(
  swimmers: Swimmer[],
  rand: () => number = Math.random,
  favor?: (type: CatchType) => boolean,
  allowed?: readonly CatchKind[]
): void {
  if (swimmers.length < MAX_SWIMMERS) {
    swimmers.push(spawnFromEdge(pickRandomKind(rand, favor, allowed), rand));
    return;
  }
  const staying = swimmers.filter((s) => !s.leaving);
  if (staying.length === 0) return;
  const pick = staying[Math.min(staying.length - 1, Math.floor(rand() * staying.length))];
  pick.leaving = true;
  pick.dir = pick.x < 0.5 ? -1 : 1;
}

/** 換天氣：不屬於新場景的一般魚游出池塘，回傳有幾隻要走（呼叫端可以補新的進來） */
export function shooAway(swimmers: Swimmer[], allowed: readonly CatchKind[]): number {
  let n = 0;
  for (const s of swimmers) {
    if (s.leaving || isAllowed(getCatchType(s.kind), allowed)) continue;
    s.leaving = true;
    s.dir = s.x < 0.5 ? -1 : 1;
    n++;
  }
  return n;
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

    if (s.jumpT !== undefined) {
      s.jumpT += dt / JUMP_DURATION;
      if (s.jumpT >= 1) s.jumpT = undefined;
    }

    s.phase += dt * 2;
    s.y = s.baseY + Math.sin(s.phase) * 0.015 - jumpOffset(s);
  }
}

/** 跳一下時往上的位移（正規化座標），一個弧線 */
export function jumpOffset(s: Swimmer): number {
  if (s.jumpT === undefined) return 0;
  return Math.sin(Math.min(1, s.jumpT) * Math.PI) * 0.09;
}

/**
 * 找出被點到的那隻：在 radius（正規化距離）內最近的；
 * 用 aspect（池寬 / 池高）把 x、y 換成一樣的比例。
 */
export function swimmerAt(
  swimmers: Swimmer[],
  x: number,
  y: number,
  radius: number,
  aspect = 1
): Swimmer | null {
  let best: Swimmer | null = null;
  let bestD = radius * radius;
  for (const s of swimmers) {
    const d = ((s.x - x) * aspect) ** 2 + (s.y - y) ** 2;
    if (d <= bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** 戳一下：開始跳（正在跳的不重來），回傳有沒有跳 */
export function pokeSwimmer(s: Swimmer): boolean {
  if (s.jumpT !== undefined) return false;
  s.jumpT = 0;
  return true;
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
export function turnsFromAngle(accum: number, needed = REEL_TURNS_NEEDED): number {
  return Math.min(needed, Math.floor(Math.abs(accum) / 360));
}

export function isReelDone(accum: number, needed = REEL_TURNS_NEEDED): boolean {
  return Math.abs(accum) >= needed * 360;
}

/**
 * 丟回池塘時落水的位置：左右在池塘中段，深度落在這種魚會出沒的範圍
 * （再限制在 0.2～0.85，不會掉在看不到的池邊）。
 */
export function releaseSpot(kind: CatchKind, rand: () => number = Math.random): { x: number; y: number } {
  const type = getCatchType(kind);
  const lo = Math.max(0.2, type.minDepth);
  const hi = Math.max(lo, Math.min(0.85, type.maxDepth));
  return { x: 0.2 + rand() * 0.6, y: lo + rand() * (hi - lo) };
}

/** 連點模式：點一下往目前的方向多轉 TAP_REEL_DEGREES 度 */
export function tapReel(accum: number): number {
  return accum + (accum < 0 ? -TAP_REEL_DEGREES : TAP_REEL_DEGREES);
}
