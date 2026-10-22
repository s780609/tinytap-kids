/**
 * 三關原創出場表。t 單位為 tick（60 = 1 秒），x 為畫面座標（寬 240）。
 */
import type { EnemyKind, ItemKind, Path, Spawn, Stage } from "./constants.ts";

const S = 60;

const line = (x: number, vy = 1.6, vx = 0, y = -14): Path => ({ type: "line", x, y, vx, vy });
const swoop = (x: number, side: -1 | 1): Path => ({ type: "swoop", x, side });
const hover = (x: number, y: number, stay: number, leave: -1 | 1 = -1): Path => ({ type: "hover", x, y, stay, leave });
const sine = (x: number, amp = 40, freq = 0.04, vy = 1.4): Path => ({ type: "sine", x, amp, freq, vy });
const ground = (x: number, vx = 0, vy = 0): Path => ({ type: "ground", x, y: -14, vx, vy });

function one(sec: number, kind: EnemyKind, path: Path, drop?: ItemKind): Spawn[] {
  return [{ t: Math.round(sec * S), kind, path, drop }];
}

/** V 字隊形的小飛鏢（中間先出） */
function vee(sec: number, x: number, n = 5, vy = 2.4): Spawn[] {
  return Array.from({ length: n }, (_, i) => {
    const k = Math.ceil(i / 2) * (i % 2 === 0 ? 1 : -1);
    return { t: Math.round(sec * S) + Math.abs(k) * 8, kind: "dart" as const, path: line(x + k * 16, vy) };
  });
}

/** 一隻接一隻沿同一條路線 */
function chain(sec: number, n: number, gap: number, kind: EnemyKind, path: Path): Spawn[] {
  return Array.from({ length: n }, (_, i) => ({ t: Math.round(sec * S) + i * gap, kind, path }));
}

/** 同時出現在好幾個 x */
function row(sec: number, kind: EnemyKind, xs: number[], make: (x: number) => Path, drop?: ItemKind): Spawn[] {
  return xs.map((x) => ({ t: Math.round(sec * S), kind, path: make(x), drop }));
}

function build(parts: Spawn[][]): Spawn[] {
  return parts.flat().sort((a, b) => a.t - b.t);
}

const STAGE1: Stage = {
  name: "草原前線",
  terrain: 0,
  scroll: 0.6,
  bossAt: 80 * S,
  boss: "boss1",
  spawns: build([
    vee(2, 120),
    vee(4, 60),
    vee(5, 180),
    chain(7, 4, 18, "fighter", swoop(40, 1)),
    chain(9, 4, 18, "fighter", swoop(200, -1)),
    one(11, "carrier", hover(120, 70, 240), "weapon"),
    row(13, "tank", [40, 90], (x) => ground(x, 0.15)),
    chain(15, 5, 14, "dart", sine(80)),
    chain(16.5, 5, 14, "dart", sine(160)),
    row(18, "turret", [60, 180], (x) => ground(x)),
    row(20, "fighter", [50, 190], (x) => line(x, 1.5)),
    row(21, "fighter", [80, 160], (x) => line(x, 1.5)),
    one(23, "gunship", hover(120, 80, 300), "missile"),
    vee(28, 120),
    row(29, "tank", [30], (x) => ground(x, 0.3)),
    row(29, "tank", [210], (x) => ground(x, -0.3)),
    chain(31, 4, 18, "fighter", swoop(30, 1)),
    chain(31, 4, 18, "fighter", swoop(210, -1)),
    one(34, "carrier", hover(60, 60, 200), "bomb"),
    vee(35, 180),
    row(37, "turret", [40, 120, 200], (x) => ground(x)),
    chain(40, 6, 12, "dart", sine(120, 70, 0.03, 1.6)),
    one(43, "gunship", hover(70, 70, 260), "weapon"),
    one(44, "gunship", hover(170, 90, 260)),
    row(48, "tank", [50, 110, 170], (x) => ground(x, 0, 0.1)),
    vee(50, 60),
    vee(51, 180),
    vee(52, 120),
    chain(54, 5, 16, "fighter", swoop(60, 1)),
    one(57, "carrier", hover(180, 70, 220), "weapon"),
    row(59, "turret", [30, 210], (x) => ground(x)),
    row(60, "tank", [80, 160], (x) => ground(x)),
    one(63, "gunship", hover(120, 70, 300), "missile"),
    chain(68, 6, 10, "dart", sine(70, 40, 0.05, 1.8)),
    chain(68, 6, 10, "dart", sine(170, 40, 0.05, 1.8)),
    row(71, "fighter", [40, 100, 140, 200], (x) => line(x, 1.7)),
    one(73, "carrier", hover(120, 60, 200), "bomb"),
  ]),
};

const STAGE2: Stage = {
  name: "海上艦隊",
  terrain: 1,
  scroll: 0.7,
  bossAt: 88 * S,
  boss: "boss2",
  spawns: build([
    vee(2, 80),
    vee(3, 160),
    row(5, "tank", [40, 200], (x) => ground(x, 0, 0.2)),
    chain(6, 5, 16, "fighter", swoop(50, 1)),
    chain(8, 5, 16, "fighter", swoop(190, -1)),
    one(10, "carrier", hover(120, 70, 220), "weapon"),
    row(12, "turret", [70, 170], (x) => ground(x)),
    chain(14, 6, 12, "dart", sine(60, 30, 0.06, 1.8)),
    chain(14, 6, 12, "dart", sine(180, 30, 0.06, 1.8)),
    one(17, "gunship", hover(80, 80, 260)),
    one(18, "gunship", hover(160, 60, 260), "missile"),
    row(23, "tank", [30, 90, 150, 210], (x) => ground(x, 0, 0.25)),
    vee(25, 120, 7),
    row(27, "fighter", [40, 80, 160, 200], (x) => line(x, 1.8)),
    one(29, "carrier", hover(60, 70, 200), "bomb"),
    one(30, "carrier", hover(180, 70, 200), "weapon"),
    row(32, "turret", [40, 120, 200], (x) => ground(x)),
    chain(34, 5, 16, "fighter", swoop(30, 1)),
    chain(35, 5, 16, "fighter", swoop(210, -1)),
    one(38, "gunship", hover(120, 70, 320), "weapon"),
    vee(43, 60),
    vee(44, 180),
    row(45, "tank", [60, 180], (x) => ground(x, 0, 0.3)),
    chain(47, 8, 10, "dart", sine(120, 80, 0.03, 1.7)),
    row(50, "turret", [30, 90, 150, 210], (x) => ground(x)),
    one(53, "gunship", hover(60, 70, 260)),
    one(53, "gunship", hover(180, 70, 260), "missile"),
    row(58, "fighter", [30, 70, 110, 130, 170, 210], (x) => line(x, 1.6)),
    one(61, "carrier", hover(120, 60, 220), "weapon"),
    chain(63, 5, 16, "fighter", swoop(40, 1)),
    chain(63, 5, 16, "fighter", swoop(200, -1)),
    row(66, "tank", [40, 100, 140, 200], (x) => ground(x, 0, 0.2)),
    vee(68, 120, 7),
    one(70, "gunship", hover(120, 80, 300), "bomb"),
    row(75, "turret", [50, 190], (x) => ground(x)),
    chain(76, 6, 10, "dart", sine(80, 40, 0.05, 2)),
    chain(76, 6, 10, "dart", sine(160, 40, 0.05, 2)),
    one(80, "carrier", hover(120, 70, 200), "weapon"),
  ]),
};

const STAGE3: Stage = {
  name: "敵軍要塞",
  terrain: 2,
  scroll: 0.8,
  bossAt: 95 * S,
  boss: "boss3",
  spawns: build([
    vee(2, 120, 7),
    row(4, "turret", [40, 200], (x) => ground(x)),
    chain(5, 5, 14, "fighter", swoop(40, 1)),
    chain(6, 5, 14, "fighter", swoop(200, -1)),
    one(8, "carrier", hover(120, 70, 220), "weapon"),
    row(10, "tank", [30, 70, 170, 210], (x) => ground(x, 0, 0.15)),
    one(13, "gunship", hover(70, 70, 280)),
    one(14, "gunship", hover(170, 90, 280), "missile"),
    chain(18, 8, 10, "dart", sine(120, 90, 0.03, 1.8)),
    row(20, "turret", [40, 100, 140, 200], (x) => ground(x)),
    row(23, "fighter", [30, 70, 110, 130, 170, 210], (x) => line(x, 1.8)),
    one(25, "carrier", hover(60, 60, 200), "bomb"),
    vee(27, 180, 7),
    row(29, "tank", [50, 120, 190], (x) => ground(x, 0, 0.3)),
    one(31, "gunship", hover(120, 70, 300), "weapon"),
    chain(36, 5, 14, "fighter", swoop(30, 1)),
    chain(36, 5, 14, "fighter", swoop(210, -1)),
    row(39, "turret", [30, 90, 150, 210], (x) => ground(x)),
    vee(41, 60, 7),
    vee(42, 180, 7),
    one(45, "carrier", hover(180, 70, 200), "weapon"),
    one(47, "gunship", hover(60, 60, 260)),
    one(47, "gunship", hover(180, 60, 260)),
    row(53, "tank", [30, 80, 160, 210], (x) => ground(x, 0, 0.2)),
    chain(55, 8, 10, "dart", sine(70, 40, 0.05, 2)),
    chain(55, 8, 10, "dart", sine(170, 40, 0.05, 2)),
    one(58, "carrier", hover(120, 60, 200), "missile"),
    row(60, "turret", [40, 120, 200], (x) => ground(x)),
    row(61, "fighter", [40, 80, 160, 200], (x) => line(x, 2)),
    one(64, "gunship", hover(120, 80, 300), "bomb"),
    chain(70, 6, 14, "fighter", swoop(50, 1)),
    chain(70, 6, 14, "fighter", swoop(190, -1)),
    row(73, "tank", [40, 100, 140, 200], (x) => ground(x, 0, 0.3)),
    vee(75, 120, 9),
    one(78, "gunship", hover(70, 70, 260), "weapon"),
    one(79, "gunship", hover(170, 70, 260)),
    row(84, "turret", [30, 90, 150, 210], (x) => ground(x)),
    one(86, "carrier", hover(120, 60, 220), "bomb"),
  ]),
};

export const STAGES: Stage[] = [STAGE1, STAGE2, STAGE3];
