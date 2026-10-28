/**
 * 敲敲蛋：點蛋會裂開，點到第 4 下孵出一隻動物（純函式，方便測試）。
 * 動物的圖：kind "animal" 用 components/svg/animals，"sea" 用釣魚的 CatchIcon。
 */

import { HIDERS } from "../peekaboo/peekaboo.ts";

export interface Hatchling {
  kind: "animal" | "sea";
  /** animal：AnimalInfo.name；sea：CatchKind */
  name: string;
  label: string;
  sound?: string;
}

export const HATCHLINGS: Hatchling[] = [
  ...HIDERS.map((h): Hatchling => ({ kind: "animal", name: h.name, label: h.label, sound: h.sound })),
  { kind: "sea", name: "turtle", label: "烏龜" },
  { kind: "sea", name: "penguin", label: "企鵝" },
];

export type EggPattern = "spots" | "stripes" | "zigzag" | "dots" | "speckle" | "hearts";

export interface EggStyle {
  base: string;
  accent: string;
  pattern: EggPattern;
}

export const EGG_STYLES: EggStyle[] = [
  { base: "#FFF8E1", accent: "#FFB74D", pattern: "spots" },
  { base: "#E1F5FE", accent: "#4FC3F7", pattern: "stripes" },
  { base: "#FCE4EC", accent: "#F06292", pattern: "zigzag" },
  { base: "#F3E5F5", accent: "#BA68C8", pattern: "dots" },
  { base: "#DCEDC8", accent: "#558B2F", pattern: "speckle" },
  { base: "#FFFDE7", accent: "#EF5350", pattern: "hearts" },
];

/** 裂幾次之後，再點一下就孵出來 */
export const CRACKS_TO_HATCH = 3;

export interface EggState {
  /** 第幾顆蛋（換蛋時 +1，當 React key 重播滾進來的動畫） */
  round: number;
  style: number;
  hatchling: number;
  cracks: number;
  hatched: boolean;
}

/** again：已經孵出來了，再叫一次 */
export type TapResult = "crack" | "hatch" | "again";

/** 隨機挑一個，盡量不要跟最近出現過的一樣 */
function pickAvoiding(count: number, recent: number[], rand: () => number): number {
  const pool = Array.from({ length: count }, (_, i) => i).filter((i) => !recent.includes(i));
  const from = pool.length > 0 ? pool : Array.from({ length: count }, (_, i) => i);
  return from[Math.floor(rand() * from.length)];
}

/** 最近幾隻不要重複出現 */
export const RECENT = 6;

export function newEgg(prev: EggState | null, history: number[], rand: () => number = Math.random): EggState {
  return {
    round: (prev?.round ?? -1) + 1,
    style: pickAvoiding(EGG_STYLES.length, prev ? [prev.style] : [], rand),
    hatchling: pickAvoiding(HATCHLINGS.length, history.slice(-RECENT), rand),
    cracks: 0,
    hatched: false,
  };
}

/** 點一下蛋會怎樣 */
export function tapResult(s: EggState): TapResult {
  if (s.hatched) return "again";
  return s.cracks < CRACKS_TO_HATCH ? "crack" : "hatch";
}

export function applyTap(s: EggState): EggState {
  const r = tapResult(s);
  if (r === "crack") return { ...s, cracks: s.cracks + 1 };
  if (r === "hatch") return { ...s, hatched: true };
  return s;
}
