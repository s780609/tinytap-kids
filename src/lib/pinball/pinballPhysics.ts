/**
 * 彈珠台物理（純函式，方便測試）。
 * 座標為檯面邏輯座標：寬 TABLE_W、高 TABLE_H，y 向下。
 */

export const TABLE_W = 400;
export const TABLE_H = 700;
export const BALL_R = 9;
export const GRAVITY = 750;
export const MAX_SPEED = 1500;

/** 發射軌道的內牆 x 位置；右側 LANE_X～TABLE_W-10 是軌道 */
export const LANE_X = 360;
/** 檯面（不含軌道）的中心 x */
export const FIELD_CX = 185;

const SUBSTEP = 1 / 480;
const WALL_RESTITUTION = 0.45;
const FLIPPER_RESTITUTION = 0.35;
const FLIPPER_UP_SPEED = 20; // rad/s
const FLIPPER_DOWN_SPEED = 12;
const ARC_CX = 200;
const ARC_CY = 200;
const ARC_R = 190;

export interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export interface Bumper {
  id: string;
  x: number;
  y: number;
  r: number;
  kick: number;
  score: number;
}

export interface Rollover {
  id: string;
  x: number;
  y: number;
  r: number;
  lit: boolean;
  /** 彈珠目前是否在範圍內；只有「進入」的瞬間才會點亮 */
  inside: boolean;
}

export interface Flipper {
  side: "left" | "right";
  px: number;
  py: number;
  length: number;
  radius: number;
  restAngle: number;
  activeAngle: number;
  angle: number;
  angVel: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 還在發射軌道裡 */
  inLane: boolean;
}

export type PinballEvent =
  | { type: "bumper"; id: string; score: number; x: number; y: number }
  | { type: "rollover"; id: string; score: number; x: number; y: number }
  | { type: "bonus"; score: number }
  | { type: "exitLane" }
  | { type: "drain" };

export interface Table {
  walls: Segment[];
  /** 彈珠離開軌道後關上的單向門 */
  gate: Segment;
  bumpers: Bumper[];
  rollovers: Rollover[];
  flippers: { left: Flipper; right: Flipper };
  ball: Ball | null;
}

export const ROLLOVER_SCORE = 50;
export const BONUS_SCORE = 1000;

export function createTable(): Table {
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

  const flipperY = 630;
  const leftPivotX = FIELD_CX - 73;
  const rightPivotX = FIELD_CX + 73;

  walls.push(
    // 左牆、右外牆
    { ax: 10, ay: 200, bx: 10, by: 560 },
    { ax: 390, ay: 200, bx: 390, by: TABLE_H },
    // 發射軌道內牆與底板
    { ax: LANE_X, ay: 170, bx: LANE_X, by: TABLE_H },
    { ax: LANE_X, ay: TABLE_H - 10, bx: 390, by: TABLE_H - 10 },
    // 導向擋板的斜坡
    { ax: 10, ay: 560, bx: leftPivotX, by: flipperY - 2 },
    { ax: LANE_X, ay: 560, bx: rightPivotX, by: flipperY - 2 }
  );

  // 單向門：從軌道內牆頂端連到弧線
  const gateAngle = (-15 * Math.PI) / 180;
  const gate: Segment = {
    ax: LANE_X,
    ay: 170,
    bx: ARC_CX + ARC_R * Math.cos(gateAngle),
    by: ARC_CY + ARC_R * Math.sin(gateAngle),
  };

  const bumpers: Bumper[] = [
    { id: "planet-a", x: FIELD_CX - 65, y: 260, r: 24, kick: 520, score: 100 },
    { id: "planet-b", x: FIELD_CX + 65, y: 260, r: 24, kick: 520, score: 100 },
    { id: "planet-c", x: FIELD_CX, y: 345, r: 24, kick: 520, score: 100 },
    { id: "kicker-l", x: 50, y: 455, r: 15, kick: 460, score: 50 },
    { id: "kicker-r", x: 320, y: 455, r: 15, kick: 460, score: 50 },
  ];

  const rollovers: Rollover[] = [
    { id: "star-1", x: FIELD_CX - 90, y: 125, r: 12, lit: false, inside: false },
    { id: "star-2", x: FIELD_CX - 30, y: 105, r: 12, lit: false, inside: false },
    { id: "star-3", x: FIELD_CX + 30, y: 105, r: 12, lit: false, inside: false },
    { id: "star-4", x: FIELD_CX + 90, y: 125, r: 12, lit: false, inside: false },
  ];

  const makeFlipper = (side: "left" | "right"): Flipper => {
    const rest = side === "left" ? 0.45 : Math.PI - 0.45;
    const active = side === "left" ? -0.55 : Math.PI + 0.55;
    return {
      side,
      px: side === "left" ? leftPivotX : rightPivotX,
      py: flipperY,
      length: 58,
      radius: 7,
      restAngle: rest,
      activeAngle: active,
      angle: rest,
      angVel: 0,
    };
  };

  return {
    walls,
    gate,
    bumpers,
    rollovers,
    flippers: { left: makeFlipper("left"), right: makeFlipper("right") },
    ball: null,
  };
}

/** 把新的彈珠放到發射軌道底部 */
export function resetBall(table: Table): void {
  table.ball = {
    x: (LANE_X + 390) / 2,
    y: TABLE_H - 10 - BALL_R - 0.5,
    vx: 0,
    vy: 0,
    inLane: true,
  };
}

/** 彈珠停在軌道底部時才能發射；成功回傳 true */
export function launchBall(table: Table, speed: number): boolean {
  const b = table.ball;
  if (!b || !b.inLane) return false;
  if (b.y < TABLE_H - 60 || Math.hypot(b.vx, b.vy) > 60) return false;
  b.vx = 0;
  b.vy = -speed;
  return true;
}

export function flipperTip(f: Flipper): { x: number; y: number } {
  return {
    x: f.px + Math.cos(f.angle) * f.length,
    y: f.py + Math.sin(f.angle) * f.length,
  };
}

function updateFlipper(f: Flipper, pressed: boolean, h: number): void {
  const target = pressed ? f.activeAngle : f.restAngle;
  const speed = pressed ? FLIPPER_UP_SPEED : FLIPPER_DOWN_SPEED;
  const diff = target - f.angle;
  const maxStep = speed * h;
  if (Math.abs(diff) <= maxStep) {
    f.angVel = diff / h;
    f.angle = target;
  } else {
    const step = Math.sign(diff) * maxStep;
    f.angle += step;
    f.angVel = step / h;
  }
}

/**
 * 圓（彈珠）對線段的碰撞。extraR 為線段本身的半徑（擋板是膠囊形）。
 * surfaceVel 回傳接觸點的表面速度（擋板轉動時用）。
 */
function collideSegment(
  b: Ball,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  extraR: number,
  restitution: number,
  surfaceVel?: (cx: number, cy: number) => { x: number; y: number }
): boolean {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? ((b.x - ax) * abx + (b.y - ay) * aby) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  let nx = b.x - cx;
  let ny = b.y - cy;
  let dist = Math.hypot(nx, ny);
  const R = BALL_R + extraR;
  if (dist >= R) return false;
  if (dist < 1e-6) {
    // 正好壓在線上：用線段法線
    const l = Math.sqrt(len2) || 1;
    nx = -aby / l;
    ny = abx / l;
    dist = 0;
  } else {
    nx /= dist;
    ny /= dist;
  }
  b.x += nx * (R - dist);
  b.y += ny * (R - dist);

  const sv = surfaceVel ? surfaceVel(cx, cy) : { x: 0, y: 0 };
  const rvx = b.vx - sv.x;
  const rvy = b.vy - sv.y;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    b.vx = rvx - (1 + restitution) * vn * nx + sv.x;
    b.vy = rvy - (1 + restitution) * vn * ny + sv.y;
  }
  return true;
}

function collideFlipper(b: Ball, f: Flipper): void {
  const tip = flipperTip(f);
  collideSegment(b, f.px, f.py, tip.x, tip.y, f.radius, FLIPPER_RESTITUTION, (cx, cy) => ({
    x: -f.angVel * (cy - f.py),
    y: f.angVel * (cx - f.px),
  }));
}

function substep(
  table: Table,
  h: number,
  input: { left: boolean; right: boolean },
  events: PinballEvent[]
): void {
  updateFlipper(table.flippers.left, input.left, h);
  updateFlipper(table.flippers.right, input.right, h);

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
  if (!b.inLane) {
    const g = table.gate;
    collideSegment(b, g.ax, g.ay, g.bx, g.by, 0, WALL_RESTITUTION);
  }

  for (const bump of table.bumpers) {
    const dx = b.x - bump.x;
    const dy = b.y - bump.y;
    const dist = Math.hypot(dx, dy);
    const R = bump.r + BALL_R;
    if (dist < R) {
      const nx = dist > 1e-6 ? dx / dist : 0;
      const ny = dist > 1e-6 ? dy / dist : -1;
      b.x = bump.x + nx * R;
      b.y = bump.y + ny * R;
      const vn = b.vx * nx + b.vy * ny;
      // 去掉法線分量後，沿法線往外彈
      const out = Math.max(bump.kick, -vn);
      b.vx = b.vx - vn * nx + out * nx;
      b.vy = b.vy - vn * ny + out * ny;
      events.push({ type: "bumper", id: bump.id, score: bump.score, x: bump.x, y: bump.y });
    }
  }

  collideFlipper(b, table.flippers.left);
  collideFlipper(b, table.flippers.right);

  for (const r of table.rollovers) {
    const inside = Math.hypot(b.x - r.x, b.y - r.y) < r.r + BALL_R;
    const entered = inside && !r.inside;
    r.inside = inside;
    if (entered && !r.lit) {
      r.lit = true;
      events.push({ type: "rollover", id: r.id, score: ROLLOVER_SCORE, x: r.x, y: r.y });
      if (table.rollovers.every((x) => x.lit)) {
        for (const x of table.rollovers) x.lit = false;
        events.push({ type: "bonus", score: BONUS_SCORE });
      }
    }
  }

  if (b.inLane && b.x < LANE_X - BALL_R - 4) {
    b.inLane = false;
    events.push({ type: "exitLane" });
  }

  const speed = Math.hypot(b.vx, b.vy);
  if (speed > MAX_SPEED) {
    b.vx = (b.vx / speed) * MAX_SPEED;
    b.vy = (b.vy / speed) * MAX_SPEED;
  }

  if (b.y > TABLE_H + 30) {
    table.ball = null;
    events.push({ type: "drain" });
  }
}

/** 推進 dt 秒（內部切成小步避免穿牆），回傳這段時間發生的事件 */
export function stepTable(
  table: Table,
  dt: number,
  input: { left: boolean; right: boolean }
): PinballEvent[] {
  const events: PinballEvent[] = [];
  const clamped = Math.min(dt, 1 / 30);
  const steps = Math.max(1, Math.ceil(clamped / SUBSTEP));
  const h = clamped / steps;
  for (let i = 0; i < steps; i++) substep(table, h, input, events);
  return events;
}
