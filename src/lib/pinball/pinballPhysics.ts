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

/** 拉桿：頂端靜止位置、最大下拉距離、放開時的速度範圍 */
export const PLUNGER_REST_Y = 630;
export const PLUNGER_MAX_PULL = 55;
export const PLUNGER_MIN_SPEED = 850;
export const PLUNGER_MAX_SPEED = 1350;
/** 拉不到這個比例就放開，只會彈回去不發射 */
const PLUNGER_MIN_RATIO = 0.05;

const SUBSTEP = 1 / 480;
const WALL_RESTITUTION = 0.45;
const FLIPPER_RESTITUTION = 0.35;
const FLIPPER_UP_SPEED = 20; // rad/s
const FLIPPER_DOWN_SPEED = 12;
const ARC_CX = 200;
const ARC_CY = 200;
const ARC_R = 190;

/** 出球道與回球道之間的隔板 x（左）；右邊以檯面中心鏡射 */
const GUIDE_X = 38;
const GUIDE_TOP_Y = 480;
/** 彈珠掉到出球道這個高度以下時，救球燈亮著就彈回去 */
const KICKBACK_Y = 652;
const KICKBACK_SPEED = 1150;
const SLING_KICK = 480;
const TARGET_RADIUS = 3;
const TARGET_RESET_SECONDS = 1.2;
/** 比這個速度快的彈珠會直接飛過黑洞 */
const WORMHOLE_MAX_SPEED = 650;
const WARP_SECONDS = 0.7;
const WARP_COOLDOWN = 1;
const RAMP_HALF_WIDTH = 13;
const RAMP_RESTITUTION = 0.15;
/** 彈珠離坡道中線超過這個距離就算離開坡道（掉回下層） */
const RAMP_LEAVE_DIST = 16;

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

/** 擋板上方的三角彈射板：A→B 是會彈的斜面，C 是第三個頂點（另外兩邊是普通牆） */
export interface Slingshot extends Segment {
  id: string;
  cx: number;
  cy: number;
  score: number;
}

/** 落靶：被打到就倒下，倒下後彈珠可以穿過 */
export interface DropTarget extends Segment {
  id: string;
  down: boolean;
}

/** 黑洞（x, y）把慢速的彈珠吸進去，從白洞（outX, outY）吐出來 */
export interface Wormhole {
  x: number;
  y: number;
  r: number;
  outX: number;
  outY: number;
}

/**
 * 坡道（上層）：彈珠往上穿過入口後只會碰到坡道的欄杆，不碰下層的元件，
 * 沿著 path 走到底從出口掉回下層。
 */
export interface Ramp {
  entry: { x0: number; x1: number; y: number };
  rails: Segment[];
  /** 中線，用來判斷彈珠是否還在坡道上、走了多遠 */
  path: { x: number; y: number }[];
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
  /** 在坡道（上層）上 */
  onRamp?: boolean;
}

export type PinballEvent =
  | { type: "bumper"; id: string; score: number; x: number; y: number }
  | { type: "rollover"; id: string; score: number; x: number; y: number }
  | { type: "bonus"; score: number }
  | { type: "slingshot"; id: string; score: number; x: number; y: number }
  | { type: "target"; id: string; score: number; x: number; y: number }
  | { type: "targetBank"; score: number }
  | { type: "wormhole"; score: number; x: number; y: number }
  | { type: "warpOut"; x: number; y: number }
  | { type: "ramp"; score: number; x: number; y: number }
  | { type: "kickback"; side: "left" | "right"; x: number; y: number }
  | { type: "mission"; stage: MissionStage }
  | { type: "missionComplete"; score: number; rank: number }
  | { type: "exitLane" }
  | { type: "drain" };

/** 任務進度：0 = 打倒三個靶、1 = 進黑洞、2 = 衝上坡道 */
export type MissionStage = 0 | 1 | 2;

export interface Table {
  walls: Segment[];
  /** 彈珠離開軌道後關上的單向門 */
  gate: Segment;
  /** 拉桿頂端（彈珠停在上面），y 會跟著下拉距離移動 */
  laneFloor: Segment;
  plunger: { pull: number };
  bumpers: Bumper[];
  rollovers: Rollover[];
  flippers: { left: Flipper; right: Flipper };
  slingshots: Slingshot[];
  /** 出球道上方的單向導板：只擋往下掉的彈珠，把貼牆的球導向回球道；被救球彈回的球可以從下面穿過 */
  deflectors: Segment[];
  targets: DropTarget[];
  /** 落靶全倒後，到這個時間重新立起 */
  targetsResetAt: number | null;
  wormhole: Wormhole;
  /** 彈珠正在蟲洞裡，到 until 才從白洞吐出來 */
  warp: { until: number } | null;
  warpReadyAt: number;
  warpCount: number;
  ramp: Ramp;
  /** 出球道的救球燈：亮著時掉進去會被彈回來一次 */
  kickbacks: { left: boolean; right: boolean };
  mission: { stage: MissionStage; rank: number };
  /** 檯面經過的時間（秒） */
  time: number;
  ball: Ball | null;
}

export const ROLLOVER_SCORE = 50;
export const BONUS_SCORE = 1000;
export const SLINGSHOT_SCORE = 10;
export const TARGET_SCORE = 200;
export const TARGET_BANK_SCORE = 1000;
export const WORMHOLE_SCORE = 300;
export const RAMP_SCORE = 500;
export const MISSION_SCORE = 5000;

/** 以檯面中心左右鏡射 */
const mirrorX = (x: number) => FIELD_CX * 2 - x;

function arcPoints(
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
  segs: number
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = from + ((to - from) * i) / segs;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function toSegments(pts: { x: number; y: number }[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    segs.push({ ax: pts[i].x, ay: pts[i].y, bx: pts[i + 1].x, by: pts[i + 1].y });
  }
  return segs;
}

/** 左側 U 形坡道：從檯面中左的入口往上，繞過頂端，沿左邊下來送進左回球道 */
function createRamp(): Ramp {
  const upX = 86;
  const downX = 52;
  const turnY = 234;
  const exitY = 455;
  const entryY = 432;
  const cx = (upX + downX) / 2;
  const turnR = (upX - downX) / 2;
  const w = RAMP_HALF_WIDTH;
  const turn = (r: number, segs: number) => arcPoints(cx, turnY, r, 0, -Math.PI, segs);
  const inner = [{ x: upX - w, y: entryY + 4 }, ...turn(turnR - w, 8), { x: downX + w, y: exitY }];
  // 入口右側往外張開，比較好打進去
  const outer = [
    { x: upX + w + 15, y: entryY + 8 },
    { x: upX + w, y: entryY - 36 },
    ...turn(turnR + w, 24),
    { x: downX - w, y: exitY },
  ];
  return {
    entry: { x0: upX - w + 3, x1: upX + w + 9, y: entryY },
    rails: [...toSegments(inner), ...toSegments(outer)],
    path: [{ x: upX, y: entryY }, ...turn(turnR, 16), { x: downX, y: exitY }],
  };
}

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
    { ax: 10, ay: 200, bx: 10, by: TABLE_H },
    { ax: 390, ay: 200, bx: 390, by: TABLE_H },
    // 發射軌道內牆
    { ax: LANE_X, ay: 170, bx: LANE_X, by: TABLE_H },
    // 出球道與回球道之間的隔板
    { ax: GUIDE_X, ay: GUIDE_TOP_Y, bx: GUIDE_X, by: TABLE_H },
    { ax: mirrorX(GUIDE_X), ay: GUIDE_TOP_Y, bx: mirrorX(GUIDE_X), by: TABLE_H },
    // 回球道：導向擋板的斜坡
    { ax: GUIDE_X, ay: 572, bx: leftPivotX, by: flipperY - 2 },
    { ax: mirrorX(GUIDE_X), ay: 572, bx: rightPivotX, by: flipperY - 2 }
  );

  // 三角彈射板：斜面朝向檯面中央，另外兩邊是普通牆
  const slingshots: Slingshot[] = (["left", "right"] as const).map((side) => {
    const m = side === "left" ? (x: number) => x : mirrorX;
    const s: Slingshot = {
      id: `sling-${side}`,
      ax: m(68),
      ay: 470,
      bx: m(108),
      by: 580,
      cx: m(68),
      cy: 548,
      score: SLINGSHOT_SCORE,
    };
    walls.push(
      { ax: s.ax, ay: s.ay, bx: s.cx, by: s.cy },
      { ax: s.cx, ay: s.cy, bx: s.bx, by: s.by }
    );
    return s;
  });

  // 右牆上的三個落靶，面向左邊
  const targets: DropTarget[] = [0, 1, 2].map((i) => ({
    id: `target-${i + 1}`,
    ax: 354,
    ay: 290 + i * 28,
    bx: 354,
    by: 312 + i * 28,
    down: false,
  }));

  // 單向門：從軌道內牆頂端連到弧線
  const gateAngle = (-15 * Math.PI) / 180;
  const gate: Segment = {
    ax: LANE_X,
    ay: 170,
    bx: ARC_CX + ARC_R * Math.cos(gateAngle),
    by: ARC_CY + ARC_R * Math.sin(gateAngle),
  };

  const bumpers: Bumper[] = [
    { id: "planet-a", x: FIELD_CX - 50, y: 260, r: 24, kick: 520, score: 100 },
    { id: "planet-b", x: FIELD_CX + 50, y: 260, r: 24, kick: 520, score: 100 },
    { id: "planet-c", x: FIELD_CX, y: 345, r: 24, kick: 520, score: 100 },
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
    laneFloor: { ax: LANE_X, ay: PLUNGER_REST_Y, bx: 390, by: PLUNGER_REST_Y },
    plunger: { pull: 0 },
    bumpers,
    rollovers,
    flippers: { left: makeFlipper("left"), right: makeFlipper("right") },
    slingshots,
    deflectors: [
      { ax: 10, ay: 405, bx: 30, by: 442 },
      { ax: LANE_X, ay: 405, bx: mirrorX(30), by: 442 },
    ],
    targets,
    targetsResetAt: null,
    wormhole: { x: FIELD_CX, y: 455, r: 16, outX: FIELD_CX, outY: 195 },
    warp: null,
    warpReadyAt: 0,
    warpCount: 0,
    ramp: createRamp(),
    kickbacks: { left: true, right: true },
    mission: { stage: 0, rank: 1 },
    time: 0,
    ball: null,
  };
}

/** 拉桿頂端目前的 y */
export function plungerTipY(table: Table): number {
  return PLUNGER_REST_Y + table.plunger.pull;
}

/** 設定拉桿下拉距離（0～PLUNGER_MAX_PULL），彈珠會跟著拉桿頂端下沉 */
export function setPlungerPull(table: Table, pull: number): void {
  const p = Math.max(0, Math.min(PLUNGER_MAX_PULL, pull));
  table.plunger.pull = p;
  table.laneFloor.ay = PLUNGER_REST_Y + p;
  table.laneFloor.by = PLUNGER_REST_Y + p;
  // 拉桿往回推時把彈珠一起頂上來，否則頂板一下子升過彈珠，彈珠會掉到頂板下面
  const b = table.ball;
  const restY = PLUNGER_REST_Y + p - BALL_R - 0.5;
  if (b && b.inLane && b.y > restY && b.y < restY + PLUNGER_MAX_PULL + BALL_R * 2) {
    b.y = restY;
    b.vy = Math.min(b.vy, 0);
  }
}

/** 彈珠是否靜止停在拉桿上 */
export function isBallOnPlunger(table: Table): boolean {
  const b = table.ball;
  if (!b || !b.inLane) return false;
  return (
    Math.abs(b.y - (plungerTipY(table) - BALL_R)) < 6 && Math.hypot(b.vx, b.vy) < 80
  );
}

/** 把新的彈珠放到拉桿上 */
export function resetBall(table: Table): void {
  setPlungerPull(table, 0);
  table.kickbacks.left = true;
  table.kickbacks.right = true;
  table.warp = null;
  table.ball = {
    x: (LANE_X + 390) / 2,
    y: PLUNGER_REST_Y - BALL_R - 0.5,
    vx: 0,
    vy: 0,
    inLane: true,
  };
}

/** 彈珠停在拉桿上時才能發射；拉桿彈回原位並把彈珠打出去。成功回傳 true */
export function launchBall(table: Table, speed: number): boolean {
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
 * 放開拉桿：依下拉比例決定力道，拉越深越快。
 * 回傳發射速度；沒有發射（沒拉、或彈珠不在拉桿上）回傳 0。
 */
export function releasePlunger(table: Table): number {
  const ratio = table.plunger.pull / PLUNGER_MAX_PULL;
  if (ratio < PLUNGER_MIN_RATIO) {
    setPlungerPull(table, 0);
    return 0;
  }
  const speed = PLUNGER_MIN_SPEED + ratio * (PLUNGER_MAX_SPEED - PLUNGER_MIN_SPEED);
  return launchBall(table, speed) ? speed : 0;
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
export function collideSegment(
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

/** 彈珠到坡道中線最近的距離，以及最近點落在中線的哪個比例（0 = 入口、1 = 出口） */
function rampProgress(ramp: Ramp, b: Ball): { dist: number; ratio: number } {
  const path = ramp.path;
  let best = Infinity;
  let bestAt = 0;
  let walked = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    const q = path[i + 1];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy);
    let t = len > 0 ? ((b.x - p.x) * dx + (b.y - p.y) * dy) / (len * len) : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(b.x - (p.x + dx * t), b.y - (p.y + dy * t));
    if (d < best) {
      best = d;
      bestAt = walked + len * t;
    }
    walked += len;
  }
  return { dist: best, ratio: bestAt / walked };
}

function clampSpeed(b: Ball): void {
  const speed = Math.hypot(b.vx, b.vy);
  if (speed > MAX_SPEED) {
    b.vx = (b.vx / speed) * MAX_SPEED;
    b.vy = (b.vy / speed) * MAX_SPEED;
  }
}

function substep(
  table: Table,
  h: number,
  input: { left: boolean; right: boolean },
  events: PinballEvent[]
): void {
  updateFlipper(table.flippers.left, input.left, h);
  updateFlipper(table.flippers.right, input.right, h);

  table.time += h;
  if (table.targetsResetAt !== null && table.time >= table.targetsResetAt) {
    for (const t of table.targets) t.down = false;
    table.targetsResetAt = null;
  }

  const b = table.ball;
  if (!b) return;

  // 在蟲洞裡：時間到才從白洞吐出來
  if (table.warp) {
    if (table.time < table.warp.until) return;
    table.warp = null;
    table.warpReadyAt = table.time + WARP_COOLDOWN;
    table.warpCount++;
    b.vx = table.warpCount % 2 === 0 ? 70 : -70;
    b.vy = 220;
    events.push({ type: "warpOut", x: b.x, y: b.y });
  }

  const prevY = b.y;
  b.vy += GRAVITY * h;
  // 些微滾動阻力，避免無止盡彈跳
  const damp = 1 - 0.08 * h;
  b.vx *= damp;
  b.vy *= damp;
  b.x += b.vx * h;
  b.y += b.vy * h;

  // 坡道在上層：只碰坡道欄杆，離開中線太遠就掉回下層
  if (b.onRamp) {
    for (const r of table.ramp.rails) {
      collideSegment(b, r.ax, r.ay, r.bx, r.by, 0, RAMP_RESTITUTION);
    }
    clampSpeed(b);
    const { dist, ratio } = rampProgress(table.ramp, b);
    if (dist > RAMP_LEAVE_DIST) {
      b.onRamp = false;
      // 從出口那一端離開才算跑完
      if (ratio > 0.9) {
        events.push({ type: "ramp", score: RAMP_SCORE, x: b.x, y: b.y });
        if (table.mission.stage === 2) {
          table.mission.stage = 0;
          table.mission.rank++;
          events.push({
            type: "missionComplete",
            score: MISSION_SCORE,
            rank: table.mission.rank,
          });
        }
      }
    }
    return;
  }

  for (const w of table.walls) {
    collideSegment(b, w.ax, w.ay, w.bx, w.by, 0, WALL_RESTITUTION);
  }
  if (b.vy > 0) {
    for (const d of table.deflectors) {
      collideSegment(b, d.ax, d.ay, d.bx, d.by, 0, WALL_RESTITUTION);
    }
  }
  const lf = table.laneFloor;
  collideSegment(b, lf.ax, lf.ay, lf.bx, lf.by, 0, 0.2);
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

  for (const s of table.slingshots) {
    if (!collideSegment(b, s.ax, s.ay, s.bx, s.by, 0, WALL_RESTITUTION)) continue;
    // 只有打在斜面中段才彈，兩端當成普通牆角
    const abx = s.bx - s.ax;
    const aby = s.by - s.ay;
    const t = ((b.x - s.ax) * abx + (b.y - s.ay) * aby) / (abx * abx + aby * aby);
    if (t < 0.1 || t > 0.9) continue;
    const nx = (b.x - (s.ax + abx * t)) / BALL_R;
    const ny = (b.y - (s.ay + aby * t)) / BALL_R;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < SLING_KICK) {
      b.vx += (SLING_KICK - vn) * nx;
      b.vy += (SLING_KICK - vn) * ny;
      events.push({ type: "slingshot", id: s.id, score: s.score, x: b.x, y: b.y });
    }
  }

  for (const t of table.targets) {
    if (t.down) continue;
    if (!collideSegment(b, t.ax, t.ay, t.bx, t.by, TARGET_RADIUS, WALL_RESTITUTION)) continue;
    t.down = true;
    events.push({
      type: "target",
      id: t.id,
      score: TARGET_SCORE,
      x: t.ax,
      y: (t.ay + t.by) / 2,
    });
    if (table.targets.every((x) => x.down)) {
      table.targetsResetAt = table.time + TARGET_RESET_SECONDS;
      table.kickbacks.left = true;
      table.kickbacks.right = true;
      events.push({ type: "targetBank", score: TARGET_BANK_SCORE });
      if (table.mission.stage === 0) {
        table.mission.stage = 1;
        events.push({ type: "mission", stage: 1 });
      }
    }
  }

  collideFlipper(b, table.flippers.left);
  collideFlipper(b, table.flippers.right);

  // 黑洞：慢速滾進去的彈珠被傳送到白洞
  const wh = table.wormhole;
  if (
    !b.inLane &&
    table.time >= table.warpReadyAt &&
    Math.hypot(b.x - wh.x, b.y - wh.y) < wh.r &&
    Math.hypot(b.vx, b.vy) < WORMHOLE_MAX_SPEED
  ) {
    events.push({ type: "wormhole", score: WORMHOLE_SCORE, x: wh.x, y: wh.y });
    b.x = wh.outX;
    b.y = wh.outY;
    b.vx = 0;
    b.vy = 0;
    table.warp = { until: table.time + WARP_SECONDS };
    if (table.mission.stage === 1) {
      table.mission.stage = 2;
      events.push({ type: "mission", stage: 2 });
    }
    return;
  }

  // 坡道入口：往上穿過入口線就上到坡道
  const entry = table.ramp.entry;
  if (prevY > entry.y && b.y <= entry.y && b.x > entry.x0 && b.x < entry.x1) {
    b.onRamp = true;
    return;
  }

  // 出球道：救球燈亮著就彈回去
  if (!b.inLane && b.vy > 0 && b.y > KICKBACK_Y && b.y < TABLE_H) {
    const side = b.x < GUIDE_X ? "left" : b.x > mirrorX(GUIDE_X) ? "right" : null;
    if (side && table.kickbacks[side]) {
      table.kickbacks[side] = false;
      b.vx = side === "left" ? 40 : -40;
      b.vy = -KICKBACK_SPEED;
      events.push({ type: "kickback", side, x: b.x, y: b.y });
    }
  }

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

  clampSpeed(b);

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
