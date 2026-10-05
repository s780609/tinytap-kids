/**
 * 夜市彈珠台物理（純函式，方便測試）。
 * 沒有擋板：拉桿把彈珠打上去，穿過釘子陣後掉進底部的格子，依格子得分。
 * 座標為檯面邏輯座標：寬 TABLE_W、高 TABLE_H，y 向下。
 */

import { BALL_R, collideSegment, type Ball, type Segment } from "./pinballPhysics.ts";

export { BALL_R };

export const TABLE_W = 400;
export const TABLE_H = 700;

/** 左牆 x；檯面是 FIELD_LEFT～LANE_X，右側 LANE_X～TABLE_W-10 是發射軌道 */
export const FIELD_LEFT = 10;
export const LANE_X = 360;

export const PIN_R = 4;

/** 底部的格子：SLOT_TOP_Y 是隔板頂端，FLOOR_Y 是格子底 */
export const SLOT_COUNT = 7;
export const SLOT_W = 50;
export const SLOT_TOP_Y = 570;
export const FLOOR_Y = 672;
export const SLOT_SCORES = [10, 30, 50, 100, 50, 30, 10];

/** 拉桿：頂端靜止位置、最大下拉距離、放開時的速度範圍 */
export const PLUNGER_REST_Y = 630;
export const PLUNGER_MAX_PULL = 55;
export const PLUNGER_MIN_SPEED = 700;
export const PLUNGER_MAX_SPEED = 1300;
/** 拉不到這個比例就放開，只會彈回去不發射 */
const PLUNGER_MIN_RATIO = 0.05;
/** 發射速度的亂數幅度（±2%）：物理是決定性的，不加的話每次拉到底都進同一格 */
const LAUNCH_JITTER = 0.04;

const GRAVITY = 750;
const MAX_SPEED = 1500;
const SUBSTEP = 1 / 480;
const WALL_RESTITUTION = 0.45;
const PIN_RESTITUTION = 0.5;
const SETTLED_RESTITUTION = 0.2;
const ARC_CX = 200;
const ARC_CY = 200;
const ARC_R = 190;

/** 撞釘的法向速度超過這個值才算一次「叮」，否則沿著釘子滾會噴一堆事件 */
const PIN_HIT_MIN_SPEED = 60;
/** 靜止判定看位移不看速度：卡在縫裡的彈珠速度會一直抖，但位置不會動 */
const REST_DIST = 3;
/** 在格子裡停這麼久就算落定 */
const SETTLE_SECONDS = 0.4;
/** 在格子以外的地方停這麼久就輕推一下 */
const STUCK_SECONDS = 0.8;
const NUDGE_VX = 90;
const NUDGE_VY = -120;

export interface Pin {
  x: number;
  y: number;
}

export interface SettledBall {
  x: number;
  y: number;
  slot: number;
}

export type NightMarketEvent =
  | { type: "pin"; x: number; y: number }
  | { type: "nudge"; x: number; y: number }
  | { type: "slot"; slot: number; score: number; x: number; y: number };

export interface NightMarketTable {
  walls: Segment[];
  /** 彈珠離開軌道後關上的單向門 */
  gate: Segment;
  /** 拉桿頂端（彈珠停在上面），y 會跟著下拉距離移動 */
  laneFloor: Segment;
  plunger: { pull: number };
  pins: Pin[];
  /** 已落定的彈珠：之後的彈珠會撞到它們、疊在上面 */
  settled: SettledBall[];
  /** 靜止判定：上次明顯移動的位置，以及之後停留的秒數 */
  rest: { x: number; y: number; t: number };
  nudgeCount: number;
  ball: Ball | null;
}

export function createTable(): NightMarketTable {
  const walls: Segment[] = [];

  // 頂部弧線（左牆頂 → 右牆頂）
  const ARC_SEGS = 28;
  for (let i = 0; i < ARC_SEGS; i++) {
    const a0 = Math.PI + (Math.PI * i) / ARC_SEGS;
    const a1 = Math.PI + (Math.PI * (i + 1)) / ARC_SEGS;
    walls.push({
      ax: ARC_CX + ARC_R * Math.cos(a0),
      ay: ARC_CY + ARC_R * Math.sin(a0),
      bx: ARC_CX + ARC_R * Math.cos(a1),
      by: ARC_CY + ARC_R * Math.sin(a1),
    });
  }

  walls.push(
    // 左牆、右外牆
    { ax: FIELD_LEFT, ay: 200, bx: FIELD_LEFT, by: TABLE_H },
    { ax: 390, ay: 200, bx: 390, by: TABLE_H },
    // 發射軌道內牆
    { ax: LANE_X, ay: 170, bx: LANE_X, by: TABLE_H },
    // 格子底
    { ax: FIELD_LEFT, ay: FLOOR_Y, bx: LANE_X, by: FLOOR_Y },
    // 左上導板：沒有它的話，沿著弧線衝過來的彈珠會貼著左牆直落最左邊那格
    { ax: FIELD_LEFT, ay: 190, bx: 44, by: 215 }
  );

  // 格子隔板
  for (let i = 1; i < SLOT_COUNT; i++) {
    const x = FIELD_LEFT + SLOT_W * i;
    walls.push({ ax: x, ay: SLOT_TOP_Y, bx: x, by: FLOOR_Y });
  }

  // 釘子陣：8 排交錯，奇數排對齊隔板、偶數排對齊格子中心
  const pins: Pin[] = [];
  for (let r = 0; r < 8; r++) {
    const y = 240 + 40 * r;
    const count = r % 2 === 0 ? SLOT_COUNT : SLOT_COUNT - 1;
    const x0 = FIELD_LEFT + (r % 2 === 0 ? SLOT_W / 2 : SLOT_W);
    for (let i = 0; i < count; i++) pins.push({ x: x0 + SLOT_W * i, y });
  }

  // 單向門：從軌道內牆頂端連到弧線
  const gateAngle = (-15 * Math.PI) / 180;
  const gate: Segment = {
    ax: LANE_X,
    ay: 170,
    bx: ARC_CX + ARC_R * Math.cos(gateAngle),
    by: ARC_CY + ARC_R * Math.sin(gateAngle),
  };

  return {
    walls,
    gate,
    laneFloor: { ax: LANE_X, ay: PLUNGER_REST_Y, bx: 390, by: PLUNGER_REST_Y },
    plunger: { pull: 0 },
    pins,
    settled: [],
    rest: { x: 0, y: 0, t: 0 },
    nudgeCount: 0,
    ball: null,
  };
}

/** x 落在第幾格（0 = 最左） */
export function slotAt(x: number): number {
  return Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor((x - FIELD_LEFT) / SLOT_W)));
}

/** 拉桿頂端目前的 y */
export function plungerTipY(table: NightMarketTable): number {
  return PLUNGER_REST_Y + table.plunger.pull;
}

/** 設定拉桿下拉距離（0～PLUNGER_MAX_PULL），彈珠會跟著拉桿頂端下沉 */
export function setPlungerPull(table: NightMarketTable, pull: number): void {
  const p = Math.max(0, Math.min(PLUNGER_MAX_PULL, pull));
  // 停在拉桿上的彈珠黏著頂板一起下去：手指很快一滑到底就放開時，彈珠才不會還在半空中而打不出去
  const riding = isBallOnPlunger(table);
  table.plunger.pull = p;
  table.laneFloor.ay = PLUNGER_REST_Y + p;
  table.laneFloor.by = PLUNGER_REST_Y + p;
  // 拉桿往回推時把彈珠一起頂上來，否則頂板一下子升過彈珠，彈珠會掉到頂板下面
  const b = table.ball;
  const restY = PLUNGER_REST_Y + p - BALL_R - 0.5;
  if (
    b &&
    b.inLane &&
    (riding || (b.y > restY && b.y < restY + PLUNGER_MAX_PULL + BALL_R * 2))
  ) {
    b.y = restY;
    b.vy = Math.min(b.vy, 0);
  }
}

/** 彈珠是否靜止停在拉桿上 */
export function isBallOnPlunger(table: NightMarketTable): boolean {
  const b = table.ball;
  if (!b || !b.inLane) return false;
  return (
    Math.abs(b.y - (plungerTipY(table) - BALL_R)) < 6 && Math.hypot(b.vx, b.vy) < 80
  );
}

/** 把新的彈珠放到拉桿上 */
export function resetBall(table: NightMarketTable): void {
  setPlungerPull(table, 0);
  table.rest.t = 0;
  table.ball = {
    x: (LANE_X + 390) / 2,
    y: PLUNGER_REST_Y - BALL_R - 0.5,
    vx: 0,
    vy: 0,
    inLane: true,
  };
}

/** 彈珠停在拉桿上時才能發射；拉桿彈回原位並把彈珠打出去。成功回傳 true */
export function launchBall(table: NightMarketTable, speed: number): boolean {
  const ready = isBallOnPlunger(table);
  setPlungerPull(table, 0);
  const b = table.ball;
  if (!ready || !b) return false;
  b.y = PLUNGER_REST_Y - BALL_R - 0.5;
  b.vx = 0;
  b.vy = -speed;
  return true;
}

/**
 * 放開拉桿：依下拉比例決定力道，拉越深越快，再加一點亂數。
 * 回傳發射速度；沒有發射（沒拉、或彈珠不在拉桿上）回傳 0。
 */
export function releasePlunger(
  table: NightMarketTable,
  rand: () => number = Math.random
): number {
  const ratio = table.plunger.pull / PLUNGER_MAX_PULL;
  if (ratio < PLUNGER_MIN_RATIO) {
    setPlungerPull(table, 0);
    return 0;
  }
  const speed =
    (PLUNGER_MIN_SPEED + ratio * (PLUNGER_MAX_SPEED - PLUNGER_MIN_SPEED)) *
    (1 + (rand() - 0.5) * LAUNCH_JITTER);
  return launchBall(table, speed) ? speed : 0;
}

/** 彈珠對固定圓（釘子、已落定的彈珠）的碰撞，回傳法向撞擊速度（沒撞到回傳 0） */
function collideCircle(b: Ball, x: number, y: number, r: number, restitution: number): number {
  const dx = b.x - x;
  const dy = b.y - y;
  const dist = Math.hypot(dx, dy);
  const R = r + BALL_R;
  if (dist >= R) return 0;
  const nx = dist > 1e-6 ? dx / dist : 0;
  const ny = dist > 1e-6 ? dy / dist : -1;
  b.x = x + nx * R;
  b.y = y + ny * R;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return 0;
  b.vx -= (1 + restitution) * vn * nx;
  b.vy -= (1 + restitution) * vn * ny;
  return -vn;
}

function substep(table: NightMarketTable, h: number, events: NightMarketEvent[]): void {
  const b = table.ball;
  if (!b) return;

  b.vy += GRAVITY * h;
  // 些微滾動阻力，避免無止盡彈跳
  const damp = 1 - 0.08 * h;
  b.vx *= damp;
  b.vy *= damp;
  b.x += b.vx * h;
  b.y += b.vy * h;

  for (const w of table.walls) {
    collideSegment(b, w.ax, w.ay, w.bx, w.by, 0, WALL_RESTITUTION);
  }
  const lf = table.laneFloor;
  collideSegment(b, lf.ax, lf.ay, lf.bx, lf.by, 0, 0.2);
  if (!b.inLane) {
    const g = table.gate;
    collideSegment(b, g.ax, g.ay, g.bx, g.by, 0, WALL_RESTITUTION);
  }

  for (const p of table.pins) {
    if (collideCircle(b, p.x, p.y, PIN_R, PIN_RESTITUTION) > PIN_HIT_MIN_SPEED) {
      events.push({ type: "pin", x: p.x, y: p.y });
    }
  }
  for (const s of table.settled) {
    collideCircle(b, s.x, s.y, BALL_R, SETTLED_RESTITUTION);
  }

  if (b.inLane && b.x < LANE_X - BALL_R - 4) b.inLane = false;

  const speed = Math.hypot(b.vx, b.vy);
  if (speed > MAX_SPEED) {
    b.vx = (b.vx / speed) * MAX_SPEED;
    b.vy = (b.vy / speed) * MAX_SPEED;
  }

  // 還在軌道裡（等發射、或力道不夠滑回來）不做靜止判定
  if (b.inLane) return;

  const rest = table.rest;
  if (Math.hypot(b.x - rest.x, b.y - rest.y) > REST_DIST) {
    rest.x = b.x;
    rest.y = b.y;
    rest.t = 0;
    return;
  }
  rest.t += h;
  if (b.y > SLOT_TOP_Y && rest.t >= SETTLE_SECONDS) {
    // 停在格子裡：結算，彈珠留在原地
    const slot = slotAt(b.x);
    table.settled.push({ x: b.x, y: b.y, slot });
    table.ball = null;
    events.push({ type: "slot", slot, score: SLOT_SCORES[slot], x: b.x, y: b.y });
  } else if (rest.t >= STUCK_SECONDS) {
    // 卡在釘子上、或格子滿了停在隔板上：輕推一下，左右輪流
    table.nudgeCount++;
    b.vx = table.nudgeCount % 2 === 0 ? NUDGE_VX : -NUDGE_VX;
    b.vy = NUDGE_VY;
    rest.t = 0;
    events.push({ type: "nudge", x: b.x, y: b.y });
  }
}

/** 推進 dt 秒（內部切成小步避免穿牆），回傳這段時間發生的事件 */
export function stepTable(table: NightMarketTable, dt: number): NightMarketEvent[] {
  const events: NightMarketEvent[] = [];
  const clamped = Math.min(dt, 1 / 30);
  const steps = Math.max(1, Math.ceil(clamped / SUBSTEP));
  const h = clamped / steps;
  for (let i = 0; i < steps; i++) substep(table, h, events);
  return events;
}
