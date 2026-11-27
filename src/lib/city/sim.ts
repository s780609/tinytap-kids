/**
 * 城市狂飆的模擬（純函式、固定步長 60 tick/秒，方便測試）。
 * 走路、上下車、開車（甩尾）、車流、行人、撿錢、通緝與警察追捕。
 * 給小孩玩：行人被撞只會跌倒再爬起來，被警察追到就是「被抓到了」。
 */

import { rand, randInt } from "../tank/rng.ts";
import {
  BLOCK,
  DIR_VEC,
  MAP_N,
  ROADS,
  T,
  TILE,
  createMap,
  entryPoint,
  exitPoint,
  exitsAt,
  isIntersection,
  isRoadIndex,
  isSolid,
  laneCoord,
  randomTileOf,
  tileAt,
  type CityMap,
  type Dir,
} from "./map.ts";

export const DT = 1 / 60;

export type CarKind = "sedan" | "taxi" | "sports" | "van" | "police";

export interface CarSpec {
  length: number;
  width: number;
  maxSpeed: number;
  accel: number;
  brake: number;
  /** 最大轉向角速度（rad/s） */
  turn: number;
  hp: number;
  mass: number;
}

export const CAR_SPECS: Record<CarKind, CarSpec> = {
  sedan: { length: 40, width: 20, maxSpeed: 260, accel: 220, brake: 420, turn: 2.7, hp: 100, mass: 1 },
  taxi: { length: 40, width: 20, maxSpeed: 270, accel: 230, brake: 420, turn: 2.7, hp: 100, mass: 1 },
  sports: { length: 40, width: 19, maxSpeed: 340, accel: 320, brake: 480, turn: 3.0, hp: 80, mass: 0.9 },
  van: { length: 48, width: 22, maxSpeed: 210, accel: 160, brake: 360, turn: 2.2, hp: 150, mass: 1.6 },
  police: { length: 42, width: 20, maxSpeed: 290, accel: 270, brake: 450, turn: 2.8, hp: 160, mass: 1.1 },
};

const CAR_COLORS: Record<CarKind, string[]> = {
  sedan: ["#1E88E5", "#43A047", "#8E24AA", "#F4511E", "#546E7A", "#EEEEEE", "#6D4C41", "#00897B"],
  taxi: ["#FDD835"],
  sports: ["#E53935", "#FF6F00", "#212121", "#D81B60"],
  van: ["#ECEFF1", "#90A4AE", "#FFB300", "#5D4037"],
  police: ["#FAFAFA"],
};

export type Driver = "none" | "ai" | "player" | "police";

export interface LaneAI {
  dir: Dir;
  ix: number;
  iy: number;
  stage: "approach" | "turn";
  next: Dir;
  tx: number;
  ty: number;
}

export interface Car {
  id: number;
  kind: CarKind;
  color: string;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  hp: number;
  wrecked: boolean;
  driver: Driver;
  ai: LaneAI | null;
  /** 警車正在追玩家 */
  chase: boolean;
  /** 卡住多久（tick） */
  stuck: number;
  /** 倒車脫困剩幾 tick */
  backing: number;
  /** 這一 tick 在煞車（畫煞車燈） */
  braking: boolean;
  /** 上次留下胎痕的後輪位置 */
  skidFrom: [number, number, number, number] | null;
  /** 駕駛座車門打開的程度 0～1 */
  door: number;
  /** 有人要上這台車：AI 先停下來等 */
  held: boolean;
}

export type PedState = "walk" | "flee" | "down";

export interface Ped {
  id: number;
  x: number;
  y: number;
  angle: number;
  state: PedState;
  timer: number;
  tx: number;
  ty: number;
  dir: Dir;
  shirt: string;
  hair: string;
  speed: number;
  phase: number;
  /** 被水槍噴到，身上還濕多久（tick） */
  wet: number;
  /** 錢已經被搶走了，不會再掉 */
  robbed: boolean;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  value: number;
}

export interface Skid {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tick: number;
}

export interface Player {
  x: number;
  y: number;
  angle: number;
  /** 坐在哪台車上，null 是走路 */
  car: number | null;
  /** 被撞倒還要躺幾 tick */
  down: number;
  phase: number;
  moving: boolean;
  /** 上車動作：走到車門 → 開門 → 坐進去 → 關門 */
  entering: { car: number; phase: "walk" | "open" | "in" | "close"; t: number; fromX: number; fromY: number } | null;
  /** 下車動作：開門 → 走出來 → 關門 */
  exiting: { car: number; phase: "open" | "close"; t: number } | null;
  /** 出拳動畫還剩幾 tick */
  punch: number;
  /** 水槍冷卻 */
  shootCd: number;
  /** 最近開過水槍（畫手上的水槍） */
  gun: number;
}

export interface Shot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Input {
  /** 搖桿方向 -1～1（往右、往下是正） */
  dx: number;
  dy: number;
  /** 上車 / 下車（按一下） */
  action: boolean;
  horn: boolean;
  /** 手煞車（按住甩尾） */
  handbrake: boolean;
  /** 出拳（按一下） */
  punch?: boolean;
  /** 水槍（按住連發） */
  shoot?: boolean;
}

export type GameEvent =
  | { type: "crash"; x: number; y: number; power: number }
  | { type: "coin"; x: number; y: number; value: number }
  | { type: "enter"; kind: CarKind }
  | { type: "exit" }
  | { type: "horn" }
  | { type: "pedHit"; x: number; y: number }
  | { type: "playerHit" }
  | { type: "wanted"; level: number }
  | { type: "calm"; level: number }
  | { type: "busted"; fine: number }
  | { type: "free" }
  | { type: "wreck"; withPlayer: boolean }
  | { type: "punch" }
  | { type: "punchHit"; x: number; y: number }
  | { type: "shoot" }
  | { type: "splash"; x: number; y: number }
  | { type: "scare"; x: number; y: number }
  | { type: "carjack" };

export interface GameState {
  map: CityMap;
  seed: number;
  tick: number;
  nextId: number;
  player: Player;
  cars: Car[];
  peds: Ped[];
  coins: Coin[];
  skids: Skid[];
  shots: Shot[];
  cash: number;
  wanted: number;
  /** 附近沒警察多久了（tick） */
  calm: number;
  /** 被警察貼住多久（tick） */
  bust: number;
  /** 被抓到的畫面還剩幾 tick */
  bustedTicks: number;
  /** 撞人 / 撞警車後一陣子內不重複加通緝 */
  wantedCooldown: number;
  /** 從玩家所在格出發的 BFS 距離（追捕用），-1 是到不了 */
  flow: Int16Array;
  flowTick: number;
}

export const MAX_WANTED = 4;
/** 附近沒警察這麼久，通緝就少一顆星 */
export const CALM_TICKS = 12 * 60;
/** 被警車貼住這麼久就被抓 */
export const BUST_TICKS = 45;
export const BUSTED_SHOW = 150;
export const TRAFFIC_TARGET = 16;
export const PED_TARGET = 22;
export const COIN_TARGET = 14;
const SPAWN_MIN = 650;
const SPAWN_MAX = 950;
const DESPAWN = 1350;
const ENTER_RANGE = 42;
const PED_R = 6;
const PLAYER_R = 7;

const SHIRTS = ["#E53935", "#1E88E5", "#43A047", "#FDD835", "#8E24AA", "#FB8C00", "#00ACC1", "#EC407A", "#795548", "#FAFAFA"];
const HAIRS = ["#3E2723", "#212121", "#FFCC80", "#8D6E63", "#BDBDBD", "#D84315"];

// ---------- 小工具 ----------

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function forwardSpeed(c: Car): number {
  return c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle);
}

export function findCar(s: GameState, id: number | null): Car | undefined {
  return id === null ? undefined : s.cars.find((c) => c.id === id);
}

/** 玩家現在的位置（坐車就是車的位置） */
export function playerPos(s: GameState): { x: number; y: number } {
  const car = findCar(s, s.player.car);
  return car ? { x: car.x, y: car.y } : { x: s.player.x, y: s.player.y };
}

function carCircles(c: Car): [number, number, number][] {
  const spec = CAR_SPECS[c.kind];
  const off = spec.length * 0.25;
  const r = spec.width / 2 + 1;
  const fx = Math.cos(c.angle);
  const fy = Math.sin(c.angle);
  return [
    [c.x + fx * off, c.y + fy * off, r],
    [c.x - fx * off, c.y - fy * off, r],
  ];
}

/** 圓和實心格子的碰撞：回傳推出去的量與法線（沒撞到回傳 null） */
function pushOutOfTiles(m: CityMap, x: number, y: number, r: number): { px: number; py: number; nx: number; ny: number } | null {
  let px = 0;
  let py = 0;
  const x0 = Math.floor((x - r) / TILE);
  const x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE);
  const y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolid(tileAt(m, tx, ty))) continue;
      const cx = clamp(x + px, tx * TILE, (tx + 1) * TILE);
      const cy = clamp(y + py, ty * TILE, (ty + 1) * TILE);
      let dx = x + px - cx;
      let dy = y + py - cy;
      let d = Math.hypot(dx, dy);
      if (d >= r) continue;
      if (d < 1e-6) {
        // 圓心在格子裡：往最近的邊推
        const left = x + px - tx * TILE;
        const right = (tx + 1) * TILE - (x + px);
        const top = y + py - ty * TILE;
        const bottom = (ty + 1) * TILE - (y + py);
        const mn = Math.min(left, right, top, bottom);
        dx = mn === left ? -1 : mn === right ? 1 : 0;
        dy = mn === top ? -1 : mn === bottom ? 1 : 0;
        d = 0;
        px += dx * (mn + r);
        py += dy * (mn + r);
        continue;
      }
      px += (dx / d) * (r - d);
      py += (dy / d) * (r - d);
    }
  }
  if (px === 0 && py === 0) return null;
  const len = Math.hypot(px, py);
  return { px, py, nx: px / len, ny: py / len };
}

/** 依目前位置與朝向，接上最近的車道（車流 AI 用） */
export function laneFromPosition(x: number, y: number, angle: number): LaneAI {
  let dir = (((Math.round(angle / (Math.PI / 2)) % 4) + 4) % 4) as Dir;
  const tx = x / TILE;
  const ty = y / TILE;
  for (let attempt = 0; attempt < 2; attempt++) {
    const horizontal = dir === 0 || dir === 2;
    const road = clamp(Math.round(((horizontal ? ty : tx) - 1) / BLOCK), 0, ROADS - 1);
    const along = horizontal ? tx : ty;
    const forward = dir === 0 || dir === 1;
    const k = forward ? Math.floor(along / BLOCK) + 1 : Math.floor((along - 2) / BLOCK);
    if (k >= 0 && k < ROADS) {
      const ix = horizontal ? k : road;
      const iy = horizontal ? road : k;
      const e = entryPoint(dir, ix, iy);
      return { dir, ix, iy, stage: "approach", next: dir, tx: e.x, ty: e.y };
    }
    dir = ((dir + 2) % 4) as Dir;
  }
  const e = entryPoint(0, 1, 0);
  return { dir: 0, ix: 1, iy: 0, stage: "approach", next: 0, tx: e.x, ty: e.y };
}

function newCar(s: GameState, kind: CarKind, x: number, y: number, angle: number, driver: Driver): Car {
  const colors = CAR_COLORS[kind];
  return {
    id: s.nextId++,
    kind,
    color: colors[randInt(s, 0, colors.length - 1)],
    x,
    y,
    angle,
    vx: 0,
    vy: 0,
    hp: CAR_SPECS[kind].hp,
    wrecked: false,
    driver,
    ai: driver === "ai" || driver === "police" ? laneFromPosition(x, y, angle) : null,
    chase: false,
    stuck: 0,
    backing: 0,
    braking: false,
    skidFrom: null,
    door: 0,
    held: false,
  };
}

function newPed(s: GameState, x: number, y: number): Ped {
  return {
    id: s.nextId++,
    x,
    y,
    angle: rand(s) * Math.PI * 2,
    state: "walk",
    timer: 0,
    tx: x,
    ty: y,
    dir: randInt(s, 0, 3) as Dir,
    shirt: SHIRTS[randInt(s, 0, SHIRTS.length - 1)],
    hair: HAIRS[randInt(s, 0, HAIRS.length - 1)],
    speed: 28 + rand(s) * 14,
    phase: rand(s) * 10,
    wet: 0,
    robbed: false,
  };
}

/** 隨機找一個不是路口的車道位置 */
function randomLaneSpot(s: GameState, near: { x: number; y: number }, min: number, max: number) {
  for (let i = 0; i < 30; i++) {
    const p = randomTileOf(s.map, s, [T.Road], { x: near.x, y: near.y, min, max }, 1);
    if (!p) continue;
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    if (isIntersection(tx, ty)) continue;
    let dir: Dir;
    let x = p.x;
    let y = p.y;
    if (isRoadIndex(ty)) {
      dir = ty % BLOCK === 0 ? 2 : 0;
      y = laneCoord(dir, Math.floor(ty / BLOCK));
    } else {
      dir = tx % BLOCK === 0 ? 1 : 3;
      x = laneCoord(dir, Math.floor(tx / BLOCK));
    }
    if (s.cars.some((c) => Math.hypot(c.x - x, c.y - y) < 70)) continue;
    return { x, y, angle: (dir * Math.PI) / 2 };
  }
  return null;
}

// ---------- 建立 ----------

export function createGame(seed = 1): GameState {
  const map = createMap();
  const s: GameState = {
    map,
    seed: seed >>> 0 || 1,
    tick: 0,
    nextId: 1,
    player: {
      x: map.station.x,
      y: map.station.y,
      angle: Math.PI / 2,
      car: null,
      down: 0,
      phase: 0,
      moving: false,
      entering: null,
      exiting: null,
      punch: 0,
      shootCd: 0,
      gun: 0,
    },
    cars: [],
    peds: [],
    coins: [],
    skids: [],
    shots: [],
    cash: 0,
    wanted: 0,
    calm: 0,
    bust: 0,
    bustedTicks: 0,
    wantedCooldown: 0,
    flow: new Int16Array(MAP_N * MAP_N).fill(-1),
    flowTick: -999,
  };
  for (const p of map.parked) {
    s.cars.push(newCar(s, rand(s) < 0.2 ? "sports" : rand(s) < 0.3 ? "van" : "sedan", p.x, p.y, p.angle, "none"));
  }
  // 警察局門口那兩台：一台轎車、一台跑車，一開始就有車可以開（坐警車會被通緝）
  const stationCars = s.cars.filter((c) => Math.hypot(c.x - map.station.x, c.y - map.station.y) < 6 * TILE);
  stationCars.forEach((c, i) => {
    c.kind = i === 0 ? "sedan" : "sports";
    c.color = CAR_COLORS[c.kind][0];
    c.hp = CAR_SPECS[c.kind].hp;
  });
  populate(s, true);
  return s;
}

// ---------- 通緝 ----------

function raiseWanted(s: GameState, events: GameEvent[], force = false) {
  if (!force && s.wantedCooldown > 0) return;
  s.wantedCooldown = 180;
  s.calm = 0;
  if (s.wanted < MAX_WANTED) {
    s.wanted++;
    events.push({ type: "wanted", level: s.wanted });
  }
}

function policeNear(s: GameState, x: number, y: number, r: number): boolean {
  return s.cars.some((c) => c.driver === "police" && !c.wrecked && Math.hypot(c.x - x, c.y - y) < r);
}

function updateFlow(s: GameState) {
  const { x, y } = playerPos(s);
  const flow = s.flow;
  flow.fill(-1);
  const sx = clamp(Math.floor(x / TILE), 0, MAP_N - 1);
  const sy = clamp(Math.floor(y / TILE), 0, MAP_N - 1);
  const queue = new Int32Array(MAP_N * MAP_N);
  let head = 0;
  let tail = 0;
  flow[sy * MAP_N + sx] = 0;
  queue[tail++] = sy * MAP_N + sx;
  while (head < tail) {
    const i = queue[head++];
    const cx = i % MAP_N;
    const cy = (i - cx) / MAP_N;
    for (const [dx, dy] of DIR_VEC) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_N || ny >= MAP_N) continue;
      const j = ny * MAP_N + nx;
      if (flow[j] !== -1 || isSolid(s.map.tiles[j] as T)) continue;
      flow[j] = flow[i] + 1;
      queue[tail++] = j;
    }
  }
  s.flowTick = s.tick;
}

/** 追捕：沿著 BFS 距離往玩家走兩格，回傳目標點 */
function chaseTarget(s: GameState, c: Car): { x: number; y: number } {
  const p = playerPos(s);
  if (Math.hypot(p.x - c.x, p.y - c.y) < 150) return p;
  let tx = Math.floor(c.x / TILE);
  let ty = Math.floor(c.y / TILE);
  for (let stepN = 0; stepN < 2; stepN++) {
    let best = -1;
    let bx = tx;
    let by = ty;
    for (const [dx, dy] of DIR_VEC) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_N || ny >= MAP_N) continue;
      const d = s.flow[ny * MAP_N + nx];
      if (d >= 0 && (best < 0 || d < best)) {
        best = d;
        bx = nx;
        by = ny;
      }
    }
    if (best < 0) break;
    tx = bx;
    ty = by;
  }
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

// ---------- 車子 ----------

interface Controls {
  throttle: number;
  steer: number;
  handbrake: boolean;
}

/** 玩家用搖桿開車：往搖桿指的方向轉、推越遠油門越大；指向後面就倒車 */
export function playerControls(c: Car, input: Input): Controls {
  const mag = Math.min(1, Math.hypot(input.dx, input.dy));
  if (mag < 0.12) return { throttle: 0, steer: 0, handbrake: input.handbrake };
  const target = Math.atan2(input.dy, input.dx);
  const diff = wrapAngle(target - c.angle);
  const vf = forwardSpeed(c);
  // 往後指：還在往前衝就先煞車；慢下來後倒車，讓車尾轉向搖桿方向
  if (Math.abs(diff) > (Math.PI * 2) / 3) {
    const back = wrapAngle(target - (c.angle + Math.PI));
    return { throttle: -mag, steer: vf < 30 ? clamp(-back * 2.5, -1, 1) : 0, handbrake: input.handbrake };
  }
  return { throttle: mag, steer: clamp(diff * 2.5, -1, 1), handbrake: input.handbrake };
}

function aiControls(s: GameState, c: Car): Controls {
  const spec = CAR_SPECS[c.kind];
  const vf = forwardSpeed(c);
  if (c.held) return { throttle: vf > 4 ? -1 : 0, steer: 0, handbrake: false };
  if (c.backing > 0) {
    c.backing--;
    return { throttle: -0.7, steer: c.id % 2 ? 1 : -1, handbrake: false };
  }
  let target: { x: number; y: number };
  let cruise: number;
  if (c.chase) {
    if (s.tick - s.flowTick > 15) updateFlow(s);
    target = chaseTarget(s, c);
    cruise = spec.maxSpeed * 0.92;
    // 玩家走路時，靠近了就慢下來，不要直接撞上去
    if (s.player.car === null && Math.hypot(target.x - c.x, target.y - c.y) < 70) cruise = 40;
  } else {
    if (!c.ai) c.ai = laneFromPosition(c.x, c.y, c.angle);
    const ai = c.ai;
    if (Math.hypot(ai.tx - c.x, ai.ty - c.y) < 16) advanceLane(s, ai);
    target = { x: ai.tx, y: ai.ty };
    cruise = c.driver === "police" ? 125 : 105 + (c.id % 5) * 6;
  }
  const want = Math.atan2(target.y - c.y, target.x - c.x);
  const diff = wrapAngle(want - c.angle);
  if (Math.abs(diff) > 0.5) cruise = Math.min(cruise, 70);

  // 前面有車、有人就停
  if (!c.chase || s.player.car === null) {
    const fx = Math.cos(c.angle);
    const fy = Math.sin(c.angle);
    const blocked = (ox: number, oy: number) => {
      const dx = ox - c.x;
      const dy = oy - c.y;
      const ahead = dx * fx + dy * fy;
      const side = Math.abs(-dx * fy + dy * fx);
      return ahead > 10 && ahead < 26 + Math.max(0, vf) * 0.35 && side < 15;
    };
    const p = playerPos(s);
    if (
      s.cars.some((o) => o !== c && blocked(o.x, o.y)) ||
      s.peds.some((pd) => pd.state !== "down" && blocked(pd.x, pd.y)) ||
      (!c.chase && blocked(p.x, p.y))
    ) {
      cruise = 0;
    }
  }

  // 卡住了就倒車一下
  if (cruise > 30 && Math.abs(vf) < 6) {
    c.stuck++;
    if (c.stuck > 90) {
      c.stuck = 0;
      c.backing = 40;
    }
  } else c.stuck = 0;

  const throttle = vf < cruise - 8 ? 1 : vf > cruise + 15 ? -0.6 : 0;
  return { throttle: cruise === 0 && vf > 4 ? -1 : throttle, steer: clamp(diff * 3, -1, 1), handbrake: false };
}

function advanceLane(s: GameState, ai: LaneAI) {
  if (ai.stage === "approach") {
    const opts = exitsAt(ai.ix, ai.iy, ai.dir);
    // 比較常直走
    const straight = opts.includes(ai.dir) && rand(s) < 0.55;
    ai.next = straight ? ai.dir : opts[randInt(s, 0, opts.length - 1)];
    const e = exitPoint(ai.next, ai.ix, ai.iy);
    ai.stage = "turn";
    ai.tx = e.x;
    ai.ty = e.y;
  } else {
    ai.dir = ai.next;
    ai.ix += DIR_VEC[ai.dir][0];
    ai.iy += DIR_VEC[ai.dir][1];
    const e = entryPoint(ai.dir, ai.ix, ai.iy);
    ai.stage = "approach";
    ai.tx = e.x;
    ai.ty = e.y;
  }
}

function driveCar(s: GameState, c: Car, ctl: Controls) {
  const spec = CAR_SPECS[c.kind];
  let { throttle, steer } = ctl;
  if (c.wrecked) {
    throttle = 0;
    steer = 0;
  }
  const fx = Math.cos(c.angle);
  const fy = Math.sin(c.angle);
  let vf = c.vx * fx + c.vy * fy;
  let vr = -c.vx * fy + c.vy * fx;

  c.braking = false;
  if (throttle > 0) {
    if (vf < -5) {
      vf += spec.brake * DT;
      c.braking = true;
    } else vf += spec.accel * throttle * DT;
  } else if (throttle < 0) {
    if (vf > 5) {
      vf -= spec.brake * -throttle * DT;
      c.braking = true;
    } else vf += spec.accel * 0.6 * throttle * DT;
  } else {
    vf -= Math.sign(vf) * Math.min(Math.abs(vf), 90 * DT);
  }
  if (ctl.handbrake) {
    vf -= Math.sign(vf) * Math.min(Math.abs(vf), 120 * DT);
    c.braking = true;
  }
  vf -= vf * 0.2 * DT;
  vf = clamp(vf, -spec.maxSpeed * 0.4, spec.maxSpeed);

  const speedRatio = Math.min(1, Math.abs(vf) / spec.maxSpeed);
  const turnFactor = clamp(vf / 70, -1, 1) * (1 - 0.3 * speedRatio);
  c.angle = wrapAngle(c.angle + steer * spec.turn * turnFactor * DT);

  // 側滑：平常抓地力很強；手煞車或高速急轉會甩尾
  const grip = ctl.handbrake ? 1.4 : Math.abs(steer) > 0.75 && speedRatio > 0.7 ? 5 : 13;
  vr *= Math.max(0, 1 - grip * DT);

  const nfx = Math.cos(c.angle);
  const nfy = Math.sin(c.angle);
  c.vx = nfx * vf - nfy * vr;
  c.vy = nfy * vf + nfx * vr;
  c.x += c.vx * DT;
  c.y += c.vy * DT;

  // 胎痕
  const skidding = Math.abs(vr) > 55 || (ctl.handbrake && Math.abs(vf) > 70);
  if (skidding) {
    const back = spec.length * 0.32;
    const half = spec.width * 0.38;
    const rx = c.x - nfx * back;
    const ry = c.y - nfy * back;
    const l: [number, number] = [rx + nfy * half, ry - nfx * half];
    const r: [number, number] = [rx - nfy * half, ry + nfx * half];
    if (c.skidFrom) {
      s.skids.push({ x1: c.skidFrom[0], y1: c.skidFrom[1], x2: l[0], y2: l[1], tick: s.tick });
      s.skids.push({ x1: c.skidFrom[2], y1: c.skidFrom[3], x2: r[0], y2: r[1], tick: s.tick });
      if (s.skids.length > 500) s.skids.splice(0, s.skids.length - 500);
    }
    c.skidFrom = [l[0], l[1], r[0], r[1]];
  } else c.skidFrom = null;
}

function damage(s: GameState, c: Car, amount: number, events: GameEvent[]) {
  if (c.wrecked || amount <= 0) return;
  c.hp -= amount;
  if (c.hp <= 0) {
    c.hp = 0;
    c.wrecked = true;
    const withPlayer = s.player.car === c.id;
    events.push({ type: "wreck", withPlayer });
    if (withPlayer) exitCar(s, c, events);
    if (c.driver === "ai" || c.driver === "police") {
      // 司機下車走掉
      const p = newPed(s, c.x - Math.sin(c.angle) * 18, c.y + Math.cos(c.angle) * 18);
      s.peds.push(p);
      c.driver = "none";
      c.chase = false;
    }
  }
}

function collideCarTiles(s: GameState, c: Car, events: GameEvent[]) {
  for (const [cx, cy, r] of carCircles(c)) {
    const hit = pushOutOfTiles(s.map, cx, cy, r);
    if (!hit) continue;
    c.x += hit.px;
    c.y += hit.py;
    const vn = c.vx * hit.nx + c.vy * hit.ny;
    if (vn < 0) {
      c.vx -= hit.nx * vn * 1.3;
      c.vy -= hit.ny * vn * 1.3;
      const power = -vn;
      if (power > 80) {
        damage(s, c, (power - 80) * 0.22, events);
        if (c.driver === "player" || power > 150) events.push({ type: "crash", x: cx - hit.nx * r, y: cy - hit.ny * r, power });
      }
    }
  }
}

function collideCars(s: GameState, a: Car, b: Car, events: GameEvent[]) {
  if (Math.abs(a.x - b.x) > 60 || Math.abs(a.y - b.y) > 60) return;
  let best: { nx: number; ny: number; overlap: number; x: number; y: number } | null = null;
  for (const [ax, ay, ar] of carCircles(a)) {
    for (const [bx, by, br] of carCircles(b)) {
      const dx = bx - ax;
      const dy = by - ay;
      const d = Math.hypot(dx, dy);
      const overlap = ar + br - d;
      if (overlap > 0 && (!best || overlap > best.overlap)) {
        best = d > 1e-6 ? { nx: dx / d, ny: dy / d, overlap, x: (ax + bx) / 2, y: (ay + by) / 2 } : { nx: 1, ny: 0, overlap, x: ax, y: ay };
      }
    }
  }
  if (!best) return;
  const ma = CAR_SPECS[a.kind].mass;
  const mb = CAR_SPECS[b.kind].mass;
  const total = ma + mb;
  a.x -= best.nx * best.overlap * (mb / total);
  a.y -= best.ny * best.overlap * (mb / total);
  b.x += best.nx * best.overlap * (ma / total);
  b.y += best.ny * best.overlap * (ma / total);
  const rel = (a.vx - b.vx) * best.nx + (a.vy - b.vy) * best.ny;
  if (rel <= 0) return;
  const j = (rel * 1.3) / (1 / ma + 1 / mb);
  a.vx -= (j / ma) * best.nx;
  a.vy -= (j / ma) * best.ny;
  b.vx += (j / mb) * best.nx;
  b.vy += (j / mb) * best.ny;
  if (rel > 60) {
    damage(s, a, (rel - 60) * 0.16, events);
    damage(s, b, (rel - 60) * 0.16, events);
    const playerInvolved = a.driver === "player" || b.driver === "player";
    if (playerInvolved || rel > 140) events.push({ type: "crash", x: best.x, y: best.y, power: rel });
    if (playerInvolved && (a.driver === "police" || b.driver === "police")) raiseWanted(s, events);
  }
}

// ---------- 上下車 ----------

function exitCar(s: GameState, c: Car, events: GameEvent[]) {
  const spec = CAR_SPECS[c.kind];
  const sides = [-Math.PI / 2, Math.PI / 2, Math.PI];
  let placed = false;
  for (const side of sides) {
    const a = c.angle + side;
    const dist = (side === Math.PI ? spec.length / 2 : spec.width / 2) + 12;
    const x = c.x + Math.cos(a) * dist;
    const y = c.y + Math.sin(a) * dist;
    if (!isSolid(tileAt(s.map, Math.floor(x / TILE), Math.floor(y / TILE)))) {
      s.player.x = x;
      s.player.y = y;
      placed = true;
      break;
    }
  }
  if (!placed) {
    s.player.x = c.x;
    s.player.y = c.y;
  }
  s.player.angle = c.angle;
  s.player.car = null;
  c.driver = "none";
  c.ai = null;
  events.push({ type: "exit" });
}

/** 駕駛座車門外面那一點（車子左側） */
export function doorPoint(c: Car): { x: number; y: number } {
  const spec = CAR_SPECS[c.kind];
  const fx = Math.cos(c.angle);
  const fy = Math.sin(c.angle);
  return {
    x: c.x + fx * spec.length * 0.08 + fy * (spec.width / 2 + 9),
    y: c.y + fy * spec.length * 0.08 - fx * (spec.width / 2 + 9),
  };
}

/** 把車上的司機拉下來，讓他跑走 */
function ejectDriver(s: GameState, c: Car, events: GameEvent[], awayFrom: { x: number; y: number }) {
  if (c.driver !== "ai" && c.driver !== "police") return;
  const d = doorPoint(c);
  const p = newPed(s, d.x, d.y);
  p.state = "flee";
  p.timer = 100;
  p.angle = Math.atan2(p.y - awayFrom.y, p.x - awayFrom.x);
  s.peds.push(p);
  if (c.driver === "police" || policeNear(s, c.x, c.y, 350)) raiseWanted(s, events, true);
  c.driver = "none";
  c.ai = null;
  c.chase = false;
}

const OPEN_TICKS = 8;
const IN_TICKS = 12;
const ENTER_TIMEOUT = 150;

function toggleCar(s: GameState) {
  const pl = s.player;
  if (pl.entering || pl.exiting) return;
  const car = findCar(s, pl.car);
  if (car) {
    pl.exiting = { car: car.id, phase: "open", t: 0 };
    return;
  }
  if (pl.down > 0) return;
  let best: Car | null = null;
  let bestD = ENTER_RANGE;
  for (const c of s.cars) {
    if (c.wrecked) continue;
    const d = Math.hypot(c.x - pl.x, c.y - pl.y) - CAR_SPECS[c.kind].width / 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  if (!best) return;
  best.held = true;
  pl.entering = { car: best.id, phase: "walk", t: 0, fromX: pl.x, fromY: pl.y };
}

function cancelEnter(s: GameState) {
  const e = s.player.entering;
  if (!e) return;
  const c = findCar(s, e.car);
  if (c) {
    c.held = false;
    c.door = 0;
  }
  s.player.entering = null;
}

/** 上車動作一格 */
function updateEntering(s: GameState, input: Input, events: GameEvent[]) {
  const pl = s.player;
  const e = pl.entering!;
  const c = findCar(s, e.car);
  if (!c || c.wrecked) {
    cancelEnter(s);
    return;
  }
  e.t++;
  if (e.phase === "walk") {
    // 推搖桿就取消；走太久（車子跑掉了）也取消
    if (Math.hypot(input.dx, input.dy) > 0.6 && e.t > 6) {
      cancelEnter(s);
      return;
    }
    const d = doorPoint(c);
    const dx = d.x - pl.x;
    const dy = d.y - pl.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 5 || e.t > ENTER_TIMEOUT) {
      if (dist > 40) {
        cancelEnter(s);
        return;
      }
      pl.x = d.x;
      pl.y = d.y;
      pl.angle = Math.atan2(c.y - pl.y, c.x - pl.x);
      e.phase = "open";
      e.t = 0;
      return;
    }
    const sp = Math.min(150, dist / DT);
    pl.angle = Math.atan2(dy, dx);
    pl.moving = true;
    pl.phase += sp * DT * 0.18;
    moveWalker(s, pl, (dx / dist) * sp, (dy / dist) * sp, PLAYER_R, c);
  } else if (e.phase === "open") {
    c.door = Math.min(1, e.t / OPEN_TICKS);
    if (e.t >= OPEN_TICKS) {
      if (c.driver === "ai" || c.driver === "police") {
        ejectDriver(s, c, events, c);
        events.push({ type: "carjack" });
      } else if (c.kind === "police") {
        raiseWanted(s, events, true);
      }
      e.phase = "in";
      e.t = 0;
      e.fromX = pl.x;
      e.fromY = pl.y;
    }
  } else if (e.phase === "in") {
    const k = Math.min(1, e.t / IN_TICKS);
    pl.x = e.fromX + (c.x - e.fromX) * k;
    pl.y = e.fromY + (c.y - e.fromY) * k;
    if (e.t >= IN_TICKS) {
      c.driver = "player";
      c.ai = null;
      c.chase = false;
      c.held = false;
      pl.car = c.id;
      pl.moving = false;
      events.push({ type: "enter", kind: c.kind });
      e.phase = "close";
      e.t = 0;
    }
  } else {
    c.door = Math.max(0, 1 - e.t / OPEN_TICKS);
    if (e.t >= OPEN_TICKS) {
      c.door = 0;
      pl.entering = null;
    }
  }
}

/** 下車動作一格 */
function updateExiting(s: GameState, events: GameEvent[]) {
  const pl = s.player;
  const e = pl.exiting!;
  const c = findCar(s, e.car);
  if (!c) {
    pl.exiting = null;
    return;
  }
  e.t++;
  if (e.phase === "open") {
    c.door = Math.min(1, e.t / OPEN_TICKS);
    if (e.t >= OPEN_TICKS) {
      if (pl.car === c.id) exitCar(s, c, events);
      e.phase = "close";
      e.t = 0;
    }
  } else {
    c.door = Math.max(0, 1 - e.t / OPEN_TICKS);
    if (e.t >= OPEN_TICKS) {
      c.door = 0;
      pl.exiting = null;
    }
  }
}

// ---------- 出拳、水槍 ----------

const PUNCH_TICKS = 16;
/** 出拳打中的那一格（手伸到最長） */
const PUNCH_HIT = 10;
const SHOT_SPEED = 380;
const SHOT_LIFE = 42;
const SHOOT_CD = 7;

/** 路人掉錢（每個人只掉一次） */
function dropMoney(s: GameState, pd: Ped) {
  if (pd.robbed) return;
  pd.robbed = true;
  const a = rand(s) * Math.PI * 2;
  s.coins.push({ id: s.nextId++, x: pd.x + Math.cos(a) * 12, y: pd.y + Math.sin(a) * 12, value: 5 * randInt(s, 2, 6) });
}

function updatePunch(s: GameState, events: GameEvent[]) {
  const pl = s.player;
  pl.punch--;
  if (pl.punch !== PUNCH_TICKS - PUNCH_HIT) return;
  const fx = Math.cos(pl.angle);
  const fy = Math.sin(pl.angle);
  for (const pd of s.peds) {
    if (pd.state === "down") continue;
    const dx = pd.x - pl.x;
    const dy = pd.y - pl.y;
    const ahead = dx * fx + dy * fy;
    const side = Math.abs(-dx * fy + dy * fx);
    if (ahead > 0 && ahead < 22 && side < 13) {
      pd.state = "down";
      pd.timer = 150;
      pd.angle = pl.angle;
      pd.x += fx * 8;
      pd.y += fy * 8;
      dropMoney(s, pd);
      events.push({ type: "punchHit", x: pd.x, y: pd.y });
      raiseWanted(s, events);
      return;
    }
  }
}

/** 自動瞄準：前方一個扇形內最近的路人或有司機的車 */
function aimAngle(s: GameState): number {
  const pl = s.player;
  let best = pl.angle;
  let bestD = 240;
  const consider = (x: number, y: number) => {
    const d = Math.hypot(x - pl.x, y - pl.y);
    const a = Math.atan2(y - pl.y, x - pl.x);
    if (d < bestD && Math.abs(wrapAngle(a - pl.angle)) < 0.6) {
      bestD = d;
      best = a;
    }
  };
  for (const pd of s.peds) if (pd.state !== "down") consider(pd.x, pd.y);
  for (const c of s.cars) if (c.driver === "ai" || c.driver === "police") consider(c.x, c.y);
  return best;
}

function shoot(s: GameState, events: GameEvent[]) {
  const pl = s.player;
  const a = aimAngle(s);
  pl.angle = a;
  pl.shootCd = SHOOT_CD;
  pl.gun = 40;
  s.shots.push({
    id: s.nextId++,
    x: pl.x + Math.cos(a) * 12,
    y: pl.y + Math.sin(a) * 12,
    vx: Math.cos(a) * SHOT_SPEED,
    vy: Math.sin(a) * SHOT_SPEED,
    life: SHOT_LIFE,
  });
  events.push({ type: "shoot" });
}

function updateShots(s: GameState, events: GameEvent[]) {
  s.shots = s.shots.filter((sh) => {
    sh.x += sh.vx * DT;
    sh.y += sh.vy * DT;
    sh.life--;
    if (sh.life <= 0) return false;
    if (isSolid(tileAt(s.map, Math.floor(sh.x / TILE), Math.floor(sh.y / TILE)))) {
      events.push({ type: "splash", x: sh.x, y: sh.y });
      return false;
    }
    for (const pd of s.peds) {
      if (pd.state === "down" || Math.hypot(pd.x - sh.x, pd.y - sh.y) > PED_R + 4) continue;
      // 嚇一跳：丟下錢、濕答答地跑走
      pd.wet = 240;
      pd.state = "flee";
      pd.timer = 90;
      pd.angle = Math.atan2(sh.vy, sh.vx) + (rand(s) - 0.5);
      dropMoney(s, pd);
      events.push({ type: "splash", x: sh.x, y: sh.y });
      events.push({ type: "scare", x: pd.x, y: pd.y });
      raiseWanted(s, events);
      return false;
    }
    for (const c of s.cars) {
      if (Math.abs(c.x - sh.x) > 30 || Math.abs(c.y - sh.y) > 30) continue;
      if (!carCircles(c).some(([cx, cy, r]) => Math.hypot(cx - sh.x, cy - sh.y) < r + 2)) continue;
      events.push({ type: "splash", x: sh.x, y: sh.y });
      if (c.driver === "ai" || c.driver === "police") {
        // 司機嚇得跳下車，車子留給你
        const wasPolice = c.driver === "police";
        ejectDriver(s, c, events, s.player);
        c.vx *= 0.3;
        c.vy *= 0.3;
        events.push({ type: "carjack" });
        if (wasPolice) raiseWanted(s, events, true);
      }
      return false;
    }
    return true;
  });
}

// ---------- 走路 ----------

function moveWalker(s: GameState, w: { x: number; y: number }, vx: number, vy: number, r: number, ignore?: Car) {
  w.x += vx * DT;
  w.y += vy * DT;
  const hit = pushOutOfTiles(s.map, w.x, w.y, r);
  if (hit) {
    w.x += hit.px;
    w.y += hit.py;
  }
  // 被車子擠開
  for (const c of s.cars) {
    if (c === ignore || Math.abs(c.x - w.x) > 40 || Math.abs(c.y - w.y) > 40) continue;
    for (const [cx, cy, cr] of carCircles(c)) {
      const dx = w.x - cx;
      const dy = w.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < cr + r && d > 1e-6) {
        w.x += (dx / d) * (cr + r - d);
        w.y += (dy / d) * (cr + r - d);
      }
    }
  }
}

function updatePlayerOnFoot(s: GameState, input: Input) {
  const p = s.player;
  if (p.down > 0) {
    p.down--;
    p.moving = false;
    return;
  }
  if (p.punch > 0) {
    p.moving = false;
    return;
  }
  const mag = Math.min(1, Math.hypot(input.dx, input.dy));
  p.moving = mag > 0.12;
  if (!p.moving) return;
  const speed = 125 * mag;
  p.angle = Math.atan2(input.dy, input.dx);
  moveWalker(s, p, (input.dx / Math.max(mag, 1e-6)) * speed, (input.dy / Math.max(mag, 1e-6)) * speed, PLAYER_R);
  p.phase += speed * DT * 0.18;
}

function walkable(t: T): boolean {
  return t === T.Sidewalk || t === T.Grass;
}

function updatePed(s: GameState, pd: Ped) {
  if (pd.wet > 0) pd.wet--;
  if (pd.state === "down") {
    pd.timer--;
    if (pd.timer <= 0) {
      pd.state = "walk";
      pd.tx = pd.x;
      pd.ty = pd.y;
    }
    return;
  }
  if (pd.state === "flee") {
    pd.timer--;
    const sp = 95;
    moveWalker(s, pd, Math.cos(pd.angle) * sp, Math.sin(pd.angle) * sp, PED_R);
    pd.phase += sp * DT * 0.2;
    if (pd.timer <= 0) {
      pd.state = "walk";
      pd.tx = pd.x;
      pd.ty = pd.y;
    }
    return;
  }
  const dx = pd.tx - pd.x;
  const dy = pd.ty - pd.y;
  const d = Math.hypot(dx, dy);
  if (d < 3) {
    // 走到格子中心：挑下一格人行道（比較常直走）
    const tx = Math.floor(pd.x / TILE);
    const ty = Math.floor(pd.y / TILE);
    const opts: Dir[] = [];
    for (const dir of [0, 1, 2, 3] as Dir[]) {
      if (dir === (pd.dir + 2) % 4) continue;
      if (walkable(tileAt(s.map, tx + DIR_VEC[dir][0], ty + DIR_VEC[dir][1]))) opts.push(dir);
    }
    if (opts.length === 0) opts.push(((pd.dir + 2) % 4) as Dir);
    pd.dir = opts.includes(pd.dir) && rand(s) < 0.75 ? pd.dir : opts[randInt(s, 0, opts.length - 1)];
    const nx = tx + DIR_VEC[pd.dir][0];
    const ny = ty + DIR_VEC[pd.dir][1];
    // 每個人走在格子裡稍微不同的位置
    const off = ((pd.id * 7) % 11) - 5;
    pd.tx = (nx + 0.5) * TILE + (pd.dir % 2 === 1 ? off : 0);
    pd.ty = (ny + 0.5) * TILE + (pd.dir % 2 === 0 ? off : 0);
    return;
  }
  pd.angle = Math.atan2(dy, dx);
  const sp = Math.min(pd.speed, d / DT);
  moveWalker(s, pd, (dx / d) * sp, (dy / d) * sp, PED_R);
  pd.phase += sp * DT * 0.2;
}

/** 有車快速衝過來，行人往旁邊跳開 */
function pedDodge(s: GameState, pd: Ped) {
  if (pd.state !== "walk") return;
  for (const c of s.cars) {
    const v = Math.hypot(c.vx, c.vy);
    if (v < 90) continue;
    const dx = pd.x - c.x;
    const dy = pd.y - c.y;
    if (Math.abs(dx) > 110 || Math.abs(dy) > 110) continue;
    const ahead = (dx * c.vx + dy * c.vy) / v;
    const side = (-dx * c.vy + dy * c.vx) / v;
    if (ahead > 0 && ahead < 100 && Math.abs(side) < 26) {
      pd.state = "flee";
      pd.timer = 40;
      // 往車子行進方向的側邊跳
      const sgn = side >= 0 ? 1 : -1;
      pd.angle = Math.atan2((c.vx / v) * sgn, (-c.vy / v) * sgn);
      return;
    }
  }
}

function hitWalkers(s: GameState, events: GameEvent[]) {
  for (const c of s.cars) {
    const v = Math.hypot(c.vx, c.vy);
    if (v < 15) continue;
    for (const [cx, cy, cr] of carCircles(c)) {
      for (const pd of s.peds) {
        if (pd.state === "down") continue;
        if (Math.hypot(pd.x - cx, pd.y - cy) > cr + PED_R) continue;
        if (v > 55) {
          pd.state = "down";
          pd.timer = 150;
          pd.angle = Math.atan2(c.vy, c.vx);
          pd.x += (c.vx / v) * 12;
          pd.y += (c.vy / v) * 12;
          if (c.driver === "player") {
            events.push({ type: "pedHit", x: pd.x, y: pd.y });
            raiseWanted(s, events);
          }
        }
      }
      const p = s.player;
      if (p.car === null && p.down === 0 && v > 70 && Math.hypot(p.x - cx, p.y - cy) < cr + PLAYER_R) {
        p.down = 70;
        p.x += (c.vx / v) * 14;
        p.y += (c.vy / v) * 14;
        events.push({ type: "playerHit" });
      }
    }
  }
}

// ---------- 生成與回收 ----------

function populate(s: GameState, initial = false) {
  const p = playerPos(s);
  const far = (o: { x: number; y: number }) => Math.hypot(o.x - p.x, o.y - p.y) > DESPAWN;

  // 回收太遠的東西（停好的車留著，是城市的一部分）
  s.cars = s.cars.filter((c) => !(far(c) && (c.driver === "ai" || (c.driver === "police" && !c.chase) || c.wrecked)));
  s.peds = s.peds.filter((pd) => !far(pd));
  s.coins = s.coins.filter((cn) => !far(cn));

  const min = initial ? 120 : SPAWN_MIN;
  const traffic = s.cars.filter((c) => c.driver === "ai" || (c.driver === "police" && !c.chase)).length;
  for (let i = traffic; i < TRAFFIC_TARGET && i < traffic + (initial ? TRAFFIC_TARGET : 1); i++) {
    const spot = randomLaneSpot(s, p, min, SPAWN_MAX);
    if (!spot) break;
    const r = rand(s);
    const kind: CarKind = r < 0.5 ? "sedan" : r < 0.7 ? "taxi" : r < 0.83 ? "van" : r < 0.93 ? "sports" : "police";
    const car = newCar(s, kind, spot.x, spot.y, spot.angle, kind === "police" ? "police" : "ai");
    const spec = CAR_SPECS[kind];
    car.vx = Math.cos(spot.angle) * spec.maxSpeed * 0.3;
    car.vy = Math.sin(spot.angle) * spec.maxSpeed * 0.3;
    s.cars.push(car);
  }

  for (let i = s.peds.length; i < PED_TARGET && i < s.peds.length + (initial ? PED_TARGET : 1); i++) {
    const spot = randomTileOf(s.map, s, [T.Sidewalk], { x: p.x, y: p.y, min: initial ? 80 : SPAWN_MIN - 100, max: SPAWN_MAX });
    if (!spot) break;
    s.peds.push(newPed(s, spot.x, spot.y));
  }

  for (let i = s.coins.length; i < COIN_TARGET && i < s.coins.length + (initial ? COIN_TARGET : 1); i++) {
    const spot = randomTileOf(s.map, s, [T.Sidewalk, T.Road, T.Parking, T.Grass], { x: p.x, y: p.y, min: initial ? 100 : 400, max: 1000 });
    if (!spot) break;
    s.coins.push({ id: s.nextId++, x: spot.x, y: spot.y, value: rand(s) < 0.12 ? 50 : 10 });
  }
}

function spawnPolice(s: GameState) {
  const p = playerPos(s);
  const chasers = s.cars.filter((c) => c.chase).length;
  if (chasers >= s.wanted) return;
  // 先找巡邏中的警車來追
  const patrol = s.cars.find((c) => c.driver === "police" && !c.chase && !c.wrecked && Math.hypot(c.x - p.x, c.y - p.y) < 1100);
  if (patrol) {
    patrol.chase = true;
    return;
  }
  const spot = randomLaneSpot(s, p, SPAWN_MIN, SPAWN_MAX);
  if (!spot) return;
  const car = newCar(s, "police", spot.x, spot.y, spot.angle, "police");
  car.chase = true;
  s.cars.push(car);
}

function respawnAtStation(s: GameState, events: GameEvent[]) {
  const p = s.player;
  p.x = s.map.station.x;
  p.y = s.map.station.y;
  p.car = null;
  p.down = 0;
  p.angle = Math.PI / 2;
  p.entering = null;
  p.exiting = null;
  p.punch = 0;
  for (const c of s.cars) {
    if (c.chase) {
      c.chase = false;
      c.ai = laneFromPosition(c.x, c.y, c.angle);
    }
  }
  events.push({ type: "free" });
}

// ---------- 一步 ----------

export function step(s: GameState, input: Input, events: GameEvent[]): void {
  s.tick++;
  if (s.bustedTicks > 0) {
    s.bustedTicks--;
    if (s.bustedTicks === 0) respawnAtStation(s, events);
    return;
  }
  if (s.wantedCooldown > 0) s.wantedCooldown--;

  if (input.action) toggleCar(s);
  const pl = s.player;
  if (pl.shootCd > 0) pl.shootCd--;
  if (pl.gun > 0) pl.gun--;
  if (pl.entering) updateEntering(s, input, events);
  if (pl.exiting) updateExiting(s, events);
  const busy = pl.entering !== null || pl.exiting !== null;
  const myCar = findCar(s, pl.car);
  if (!myCar && !busy && pl.down === 0) {
    if (input.punch && pl.punch === 0) {
      pl.punch = PUNCH_TICKS;
      events.push({ type: "punch" });
    }
    if (input.shoot && pl.shootCd === 0 && pl.punch === 0) shoot(s, events);
  }
  if (pl.punch > 0) updatePunch(s, events);
  updateShots(s, events);

  if (input.horn) {
    events.push({ type: "horn" });
    const p = playerPos(s);
    for (const pd of s.peds) {
      if (pd.state === "walk" && Math.hypot(pd.x - p.x, pd.y - p.y) < 170) {
        pd.state = "flee";
        pd.timer = 70;
        pd.angle = Math.atan2(pd.y - p.y, pd.x - p.x);
      }
    }
  }

  for (const c of s.cars) {
    let ctl: Controls;
    if (c === myCar) ctl = pl.exiting ? { throttle: Math.abs(forwardSpeed(c)) > 4 ? -1 : 0, steer: 0, handbrake: false } : playerControls(c, input);
    else if (c.driver === "ai" || c.driver === "police") ctl = aiControls(s, c);
    else {
      if (c.vx === 0 && c.vy === 0) continue;
      ctl = { throttle: 0, steer: 0, handbrake: false };
      if (Math.hypot(c.vx, c.vy) < 2) {
        c.vx = 0;
        c.vy = 0;
        continue;
      }
    }
    driveCar(s, c, ctl);
    collideCarTiles(s, c, events);
  }
  for (let i = 0; i < s.cars.length; i++) {
    for (let j = i + 1; j < s.cars.length; j++) collideCars(s, s.cars[i], s.cars[j], events);
  }

  if (!myCar) {
    if (!busy) updatePlayerOnFoot(s, input);
  } else {
    s.player.x = myCar.x;
    s.player.y = myCar.y;
    s.player.angle = myCar.angle;
  }

  for (const pd of s.peds) {
    if (s.tick % 6 === pd.id % 6) pedDodge(s, pd);
    updatePed(s, pd);
  }
  hitWalkers(s, events);

  // 撿錢
  const pp = playerPos(s);
  const reach = myCar ? 24 : 16;
  s.coins = s.coins.filter((cn) => {
    if (Math.hypot(cn.x - pp.x, cn.y - pp.y) > reach) return true;
    s.cash += cn.value;
    events.push({ type: "coin", x: cn.x, y: cn.y, value: cn.value });
    return false;
  });

  // 通緝：附近沒有警車一段時間就降一級
  if (s.wanted > 0) {
    if (s.cars.some((c) => c.chase && Math.hypot(c.x - pp.x, c.y - pp.y) < 500)) s.calm = 0;
    else if (++s.calm >= CALM_TICKS) {
      s.calm = 0;
      s.wanted--;
      events.push({ type: "calm", level: s.wanted });
      if (s.wanted === 0) {
        for (const c of s.cars) {
          if (c.chase) {
            c.chase = false;
            c.ai = laneFromPosition(c.x, c.y, c.angle);
          }
        }
      }
    }
    if (s.tick % 45 === 0) spawnPolice(s);
  }

  // 被警車貼住就被抓
  const slow = !myCar || Math.abs(forwardSpeed(myCar)) < 40;
  const touching = s.wanted > 0 && slow && s.cars.some((c) => c.chase && Math.hypot(c.x - pp.x, c.y - pp.y) < (myCar ? 46 : 34));
  s.bust = touching ? s.bust + 1 : Math.max(0, s.bust - 2);
  if (s.bust >= BUST_TICKS) {
    const fine = Math.floor(s.cash * 0.2);
    s.cash -= fine;
    s.wanted = 0;
    s.calm = 0;
    s.bust = 0;
    s.bustedTicks = BUSTED_SHOW;
    if (myCar) {
      myCar.driver = "none";
      myCar.vx = 0;
      myCar.vy = 0;
      myCar.door = 0;
      s.player.car = null;
    }
    cancelEnter(s);
    s.player.exiting = null;
    events.push({ type: "busted", fine });
  }

  if (s.tick % 20 === 0) populate(s);
}
