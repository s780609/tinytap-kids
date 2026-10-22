/**
 * 主武器、飛彈、道具：純函式，sim.ts 每 tick 呼叫。
 */
import { BOMB_MAX, MISSILE_MAX, WEAPON_MAX } from "./constants.ts";
import type { ItemKind, MissileKind, WeaponKind } from "./constants.ts";

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  dmg: number;
  kind: WeaponKind;
}

/** 主武器射擊間隔（tick） */
export const FIRE_EVERY: Record<WeaponKind, number> = { vulcan: 6, laser: 4, plasma: 5 };

/** 紅色散彈：每級的子彈角度（0 = 正上方） */
const VULCAN_SPREAD: number[][] = [
  [0, 0],
  [0, -0.08, 0.08],
  [0, -0.08, 0.08, -0.16, 0.16],
  [0, -0.1, 0.1, -0.22, 0.22],
  [0, -0.08, 0.08, -0.18, 0.18, -0.3, 0.3],
  [0, -0.1, 0.1, -0.22, 0.22, -0.36, 0.36],
  [0, -0.08, 0.08, -0.18, 0.18, -0.3, 0.3, -0.44, 0.44],
  [0, -0.1, 0.1, -0.22, 0.22, -0.36, 0.36, -0.52, 0.52],
];

/** 一次射擊產生的子彈；level 1～8。電漿鎖定敵人時另外算（plasmaDamage），沒目標才用這裡的直射 */
export function weaponShots(kind: WeaponKind, level: number, x: number, y: number): Shot[] {
  const lv = Math.max(1, Math.min(WEAPON_MAX, level));
  switch (kind) {
    case "vulcan": {
      const angles = VULCAN_SPREAD[lv - 1];
      return angles.map((a, i) => {
        // 一級的兩發平行、左右各 4px
        const ox = lv === 1 ? (i === 0 ? -4 : 4) : 0;
        return { x: x + ox, y: y - 8, vx: Math.sin(a) * 7, vy: -Math.cos(a) * 7, w: 3, h: 8, dmg: 1, kind };
      });
    }
    case "laser":
      return [{ x, y: y - 14, vx: 0, vy: -10, w: 3 + lv, h: 18, dmg: 1 + 0.5 * lv, kind }];
    case "plasma":
      return [{ x, y: y - 10, vx: 0, vy: -9, w: 4, h: 12, dmg: 0.6 + 0.2 * lv, kind }];
  }
}

/** 電漿光束鎖定目標時每 tick 的傷害 */
export function plasmaDamage(level: number): number {
  return 0.15 + 0.11 * Math.max(1, Math.min(WEAPON_MAX, level));
}

export interface MissileShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: MissileKind;
  dmg: number;
}

export const MISSILE_EVERY: Record<MissileKind, number> = { homing: 40, nuclear: 50 };

/** 一次發射的飛彈；追蹤飛彈先往兩側散開，核子飛彈直直往上 */
export function missileShots(kind: MissileKind, level: number, x: number, y: number): MissileShot[] {
  const lv = Math.max(1, Math.min(MISSILE_MAX, level));
  const n = lv + 1;
  const out: MissileShot[] = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const k = Math.floor(i / 2) + 1;
    if (kind === "homing") out.push({ x: x + side * 6, y: y + 2, vx: side * (1 + k * 0.6), vy: -1, kind, dmg: 2 });
    else out.push({ x: x + side * (5 + k * 4), y: y + 4, vx: 0, vy: -2, kind, dmg: 5 });
  }
  return out;
}

/** 會變色的道具：主武器每 2 秒換一種、飛彈每 2.5 秒換一種 */
export function weaponItemKind(age: number): WeaponKind {
  return (["vulcan", "laser", "plasma"] as const)[Math.floor(age / 120) % 3];
}

export function missileItemKind(age: number): MissileKind {
  return (["homing", "nuclear"] as const)[Math.floor(age / 150) % 2];
}

export interface Loadout {
  weapon: { kind: WeaponKind; level: number };
  missile: { kind: MissileKind; level: number } | null;
  bombs: number;
}

/** 撿到道具；回傳額外加分（武器已滿級等） */
export function pickUp(l: Loadout, kind: ItemKind, age: number): number {
  switch (kind) {
    case "weapon": {
      const c = weaponItemKind(age);
      const full = l.weapon.kind === c && l.weapon.level >= WEAPON_MAX;
      l.weapon = { kind: c, level: Math.min(WEAPON_MAX, l.weapon.level + 1) };
      return full ? 5000 : 0;
    }
    case "missile": {
      const c = missileItemKind(age);
      if (!l.missile) {
        l.missile = { kind: c, level: 1 };
        return 0;
      }
      const full = l.missile.kind === c && l.missile.level >= MISSILE_MAX;
      l.missile = { kind: c, level: Math.min(MISSILE_MAX, l.missile.level + 1) };
      return full ? 3000 : 0;
    }
    case "bomb":
      if (l.bombs >= BOMB_MAX) return 2000;
      l.bombs++;
      return 0;
    default:
      return 0;
  }
}
