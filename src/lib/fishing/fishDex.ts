/**
 * 魚類圖鑑：記錄每種魚（不含垃圾）總共釣過幾次，存在 localStorage，
 * 下次進來進度還在。
 */

import { CATCH_TYPES, getCatchType, type CatchKind, type CatchType } from "./fishingLogic.ts";

export interface FishDex {
  caught: Partial<Record<CatchKind, number>>;
  /** 全部收集完的慶祝放過了沒（只放一次） */
  celebrated: boolean;
}

const STORAGE_KEY = "tinytap-fishing-dex";

/** 圖鑑收錄的種類：魚和稀有獵物，垃圾不算 */
export const DEX_TYPES: CatchType[] = CATCH_TYPES.filter((c) => !c.isJunk);

export function emptyDex(): FishDex {
  return { caught: {}, celebrated: false };
}

export function dexCount(dex: FishDex): number {
  return DEX_TYPES.filter((c) => (dex.caught[c.kind] ?? 0) > 0).length;
}

export function isDexComplete(dex: FishDex): boolean {
  return dexCount(dex) === DEX_TYPES.length;
}

export interface DexUpdate {
  dex: FishDex;
  /** 第一次釣到這種 */
  isNew: boolean;
  /** 這一隻剛好讓圖鑑收集完成（而且還沒慶祝過） */
  justCompleted: boolean;
}

/** 記一筆釣到的；垃圾不收錄，原樣回傳 */
export function recordCatch(dex: FishDex, kind: CatchKind): DexUpdate {
  if (getCatchType(kind).isJunk) return { dex, isNew: false, justCompleted: false };
  const prev = dex.caught[kind] ?? 0;
  const next: FishDex = { ...dex, caught: { ...dex.caught, [kind]: prev + 1 } };
  const justCompleted = !dex.celebrated && isDexComplete(next);
  if (justCompleted) next.celebrated = true;
  return { dex: next, isNew: prev === 0, justCompleted };
}

export function loadDex(): FishDex {
  if (typeof window === "undefined") return emptyDex();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDex();
    const parsed = JSON.parse(raw) as Partial<FishDex>;
    return { caught: parsed.caught ?? {}, celebrated: parsed.celebrated ?? false };
  } catch {
    return emptyDex();
  }
}

export function saveDex(dex: FishDex): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dex));
  } catch {
    // localStorage 可能滿了或不能用
  }
}
