/**
 * 敵人種類：血量、大小、分數、射擊方式。大魔王依剩餘血量分階段換彈幕。
 */
import type { EnemyKind, Gun, ItemKind } from "./constants.ts";

export interface EnemyDef {
  hp: number;
  w: number;
  h: number;
  points: number;
  /** 地面單位：跟著地面捲動、撞到不會死 */
  ground: boolean;
  guns: Gun[];
  drop?: ItemKind;
}

const DOWN = Math.PI / 2;

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  dart: { hp: 1, w: 10, h: 10, points: 100, ground: false, guns: [] },
  fighter: {
    hp: 3,
    w: 14,
    h: 14,
    points: 200,
    ground: false,
    guns: [{ pattern: { type: "aimed", n: 1, spread: 0, speed: 2 }, every: 80, first: 35 }],
  },
  carrier: { hp: 12, w: 22, h: 18, points: 500, ground: false, guns: [], drop: "weapon" },
  tank: {
    hp: 6,
    w: 14,
    h: 14,
    points: 300,
    ground: true,
    guns: [{ pattern: { type: "aimed", n: 1, spread: 0, speed: 1.8 }, every: 100, first: 60 }],
  },
  turret: {
    hp: 10,
    w: 16,
    h: 16,
    points: 500,
    ground: true,
    guns: [{ pattern: { type: "aimed", n: 3, spread: 0.3, speed: 1.7 }, every: 110, first: 50 }],
    drop: "medal",
  },
  gunship: {
    hp: 60,
    w: 30,
    h: 26,
    points: 2000,
    ground: false,
    guns: [
      { pattern: { type: "ring", n: 10, speed: 1.4 }, every: 130, first: 80 },
      { pattern: { type: "aimed", n: 5, spread: 0.6, speed: 2 }, every: 130, first: 145 },
    ],
  },
  boss1: { hp: 600, w: 64, h: 44, points: 10000, ground: false, guns: [] },
  boss2: { hp: 900, w: 84, h: 44, points: 20000, ground: false, guns: [] },
  boss3: { hp: 1300, w: 72, h: 60, points: 30000, ground: false, guns: [] },
};

export interface BossPhase {
  /** 血量比例低於這個值就進到這一階段 */
  below: number;
  guns: Gun[];
}

export const BOSS_PHASES: Partial<Record<EnemyKind, BossPhase[]>> = {
  boss1: [
    {
      below: 1,
      guns: [
        { pattern: { type: "aimed", n: 3, spread: 0.35, speed: 2.2 }, every: 50, first: 0, oy: 14 },
        { pattern: { type: "ring", n: 14, speed: 1.5 }, every: 140, first: 70 },
      ],
    },
    {
      below: 0.5,
      guns: [
        { pattern: { type: "spiral", arms: 3, step: 0.23, speed: 1.7 }, every: 7, first: 0 },
        { pattern: { type: "aimed", n: 5, spread: 0.5, speed: 2.2 }, every: 90, first: 40, oy: 14 },
      ],
    },
  ],
  boss2: [
    {
      below: 1,
      guns: [
        { pattern: { type: "fan", n: 7, spread: 1.2, speed: 1.8, dir: DOWN }, every: 45, first: 0, ox: -30 },
        { pattern: { type: "fan", n: 7, spread: 1.2, speed: 1.8, dir: DOWN }, every: 45, first: 22, ox: 30 },
        { pattern: { type: "aimed", n: 1, spread: 0, speed: 3 }, every: 25, first: 10, oy: 12 },
      ],
    },
    {
      below: 0.5,
      guns: [
        { pattern: { type: "spiral", arms: 3, step: 0.19, speed: 1.6 }, every: 7, first: 0 },
        { pattern: { type: "ring", n: 18, speed: 1.3 }, every: 150, first: 60 },
        { pattern: { type: "aimed", n: 3, spread: 0.25, speed: 2.8 }, every: 70, first: 30, oy: 12 },
      ],
    },
  ],
  boss3: [
    {
      below: 1,
      guns: [
        { pattern: { type: "ring", n: 20, speed: 1.4 }, every: 70, first: 0 },
        { pattern: { type: "aimed", n: 3, spread: 0.3, speed: 2.4 }, every: 40, first: 20, oy: 20 },
      ],
    },
    {
      below: 0.66,
      guns: [
        { pattern: { type: "spiral", arms: 4, step: 0.17, speed: 1.5 }, every: 8, first: 0 },
        { pattern: { type: "aimed", n: 5, spread: 0.5, speed: 2.3 }, every: 90, first: 45, oy: 20 },
      ],
    },
    {
      below: 0.33,
      guns: [
        { pattern: { type: "spiral", arms: 4, step: 0.21, speed: 1.6 }, every: 8, first: 0 },
        { pattern: { type: "spiral", arms: 3, step: -0.13, speed: 1.2 }, every: 14, first: 4 },
        { pattern: { type: "ring", n: 16, speed: 1.1 }, every: 110, first: 50 },
      ],
    },
  ],
};

export function isBoss(kind: EnemyKind): boolean {
  return kind === "boss1" || kind === "boss2" || kind === "boss3";
}

/** 目前血量比例對應的階段（0 起算） */
export function bossPhaseIndex(kind: EnemyKind, hpFrac: number): number {
  const phases = BOSS_PHASES[kind] ?? [];
  let idx = 0;
  phases.forEach((p, i) => {
    if (hpFrac <= p.below) idx = i;
  });
  return idx;
}
