/**
 * 躲貓貓：藏身處與輪流躲起來的動物（純函式，方便測試）。
 * 每次從 8 種藏身處挑 4 個；動物的圖在 components/svg/animals（name 對應 AnimalInfo.name）。
 */

export type SpotKind = "bush" | "door" | "box" | "curtain" | "blanket" | "umbrella" | "rock" | "window";

export interface Spot {
  kind: SpotKind;
  label: string;
}

export const SPOTS: Spot[] = [
  { kind: "bush", label: "草叢" },
  { kind: "door", label: "門" },
  { kind: "box", label: "禮物盒" },
  { kind: "curtain", label: "窗簾" },
  { kind: "blanket", label: "棉被" },
  { kind: "umbrella", label: "雨傘" },
  { kind: "rock", label: "大石頭" },
  { kind: "window", label: "窗戶" },
];

/** 畫面上同時有幾個藏身處 */
export const SPOT_COUNT = 4;

export interface Hider {
  /** 對應 components/svg/animals 的 AnimalInfo.name */
  name: string;
  label: string;
  /** 叫聲；沒有的就唸名字 */
  sound?: string;
}

const S = (n: string) => `/sounds/animals/${n}.mp3`;

export const HIDERS: Hider[] = [
  { name: "cat", label: "貓咪", sound: S("cat") },
  { name: "dog", label: "小狗", sound: S("dog") },
  { name: "cow", label: "乳牛", sound: S("cow") },
  { name: "duck", label: "鴨子", sound: S("duck") },
  { name: "lion", label: "獅子", sound: S("lion") },
  { name: "elephant", label: "大象", sound: S("elephant") },
  { name: "pig", label: "小豬" },
  { name: "rabbit", label: "兔子" },
  { name: "chicken", label: "母雞" },
  { name: "sheep", label: "綿羊" },
  { name: "monkey", label: "猴子" },
  { name: "panda", label: "熊貓" },
  { name: "giraffe", label: "長頸鹿" },
  { name: "zebra", label: "斑馬" },
  { name: "tiger", label: "老虎" },
  { name: "bear", label: "熊" },
];

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

/** 隨機挑 count 個不同的藏身處（SPOTS 的編號）；給了 previous 就盡量換成不一樣的 */
export function pickSpots(count = SPOT_COUNT, rand: () => number = Math.random, previous: number[] = []): number[] {
  const all = SPOTS.map((_, i) => i);
  const fresh = all.filter((i) => !previous.includes(i));
  const pool = fresh.length >= count ? fresh : all;
  const out = [...pool];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, count);
}
