/**
 * 躲貓貓：藏身處與輪流躲起來的動物（純函式，方便測試）。
 */

import { ANIMAL_KEYS } from "../piano/keyboard.ts";

export type SpotKind = "bush" | "door" | "box" | "curtain";

export interface Spot {
  kind: SpotKind;
  label: string;
}

export const SPOTS: Spot[] = [
  { kind: "bush", label: "草叢" },
  { kind: "door", label: "門" },
  { kind: "box", label: "禮物盒" },
  { kind: "curtain", label: "窗簾" },
];

/** 會躲起來的動物：沿用動物鍵盤的叫聲 */
export const HIDERS = ANIMAL_KEYS.map(({ emoji, name, sound }) => ({ emoji, name, sound }));

/** 從沒被排除的動物裡隨機挑一隻；全部都被排除時就從全部裡挑 */
export function pickHider(exclude: number[], rand: () => number = Math.random): number {
  const pool = HIDERS.map((_, i) => i).filter((i) => !exclude.includes(i));
  const from = pool.length > 0 ? pool : HIDERS.map((_, i) => i);
  return from[Math.floor(rand() * from.length)];
}

/** 開場每個藏身處各放一隻不同的動物 */
export function initialHiders(count: number, rand: () => number = Math.random): number[] {
  const hiders: number[] = [];
  for (let i = 0; i < count; i++) hiders.push(pickHider(hiders, rand));
  return hiders;
}
