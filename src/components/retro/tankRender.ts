/**
 * 坦克大戰純 canvas 繪圖（不含 React）。
 * 所有座標都是地圖 px（208×208），透過 R() 換成整數裝置像素，避免縫隙與模糊。
 */
import { T, GRID_N, SUB, MAP_PX, TANK_SIZE, BASE_RECT } from "@/lib/tank/constants";
import type { Dir, EnemyKind, GameState, PowerKind, Tank } from "@/lib/tank/constants";
import { BASE_RING } from "@/lib/tank/terrain";

type Ctx = CanvasRenderingContext2D;

export interface RenderCache {
  terrain: HTMLCanvasElement | null;
  trees: HTMLCanvasElement | null;
  version: number;
  grid: Uint8Array | null;
  width: number;
}

export function createRenderCache(): RenderCache {
  return { terrain: null, trees: null, version: -1, grid: null, width: 0 };
}

/** 依 unit 畫一個地圖 px 矩形：左右邊緣各自四捨五入成整數裝置像素 */
function R(ctx: Ctx, u: number, x: number, y: number, w: number, h: number): void {
  const x0 = Math.round(x * u);
  const y0 = Math.round(y * u);
  const x1 = Math.round((x + w) * u);
  const y1 = Math.round((y + h) * u);
  if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
}

// ───────── 地形 ─────────

const C = {
  ground: "#000000",
  brick: "#A4471E",
  brickDark: "#6E2A0C",
  mortar: "#9C9C9C",
  steel: "#A3ABB4",
  steelLight: "#ECEFF2",
  steelDark: "#59616B",
  water: "#2B55D6",
  waterLight: "#8FB4FF",
  tree: "#2F8F3A",
  treeDark: "#1B5E22",
  treeLight: "#7CCB5B",
  ice: "#C3D2E2",
  iceLight: "#EAF1F8",
};

function drawBrickCell(ctx: Ctx, u: number, x: number, y: number): void {
  ctx.fillStyle = C.mortar;
  R(ctx, u, x, y, 8, 8);
  ctx.fillStyle = C.brick;
  // 上排兩塊、下排錯開
  R(ctx, u, x, y, 3, 3);
  R(ctx, u, x + 4, y, 4, 3);
  R(ctx, u, x, y + 4, 1, 3);
  R(ctx, u, x + 2, y + 4, 5, 3);
  ctx.fillStyle = C.brickDark;
  R(ctx, u, x, y + 2, 3, 1);
  R(ctx, u, x + 4, y + 2, 4, 1);
  R(ctx, u, x + 2, y + 6, 5, 1);
}

function drawSteelCell(ctx: Ctx, u: number, x: number, y: number): void {
  ctx.fillStyle = C.steelDark;
  R(ctx, u, x, y, 8, 8);
  ctx.fillStyle = C.steelLight;
  R(ctx, u, x, y, 7, 7);
  ctx.fillStyle = C.steel;
  R(ctx, u, x + 1, y + 1, 6, 6);
  ctx.fillStyle = C.steelLight;
  R(ctx, u, x + 2, y + 2, 3, 3);
}

function drawTreeCell(ctx: Ctx, u: number, x: number, y: number): void {
  ctx.fillStyle = C.treeDark;
  R(ctx, u, x, y, 8, 8);
  ctx.fillStyle = C.tree;
  R(ctx, u, x + 1, y, 3, 3);
  R(ctx, u, x + 5, y + 1, 3, 3);
  R(ctx, u, x, y + 4, 3, 3);
  R(ctx, u, x + 4, y + 5, 3, 3);
  ctx.fillStyle = C.treeLight;
  R(ctx, u, x + 2, y + 1, 1, 1);
  R(ctx, u, x + 6, y + 2, 1, 1);
  R(ctx, u, x + 1, y + 5, 1, 1);
  R(ctx, u, x + 5, y + 6, 1, 1);
}

function drawIceCell(ctx: Ctx, u: number, x: number, y: number): void {
  ctx.fillStyle = C.ice;
  R(ctx, u, x, y, 8, 8);
  ctx.fillStyle = C.iceLight;
  for (let i = 0; i < 8; i += 4) {
    R(ctx, u, x + i, y + 7 - i, 2, 1);
    R(ctx, u, x + i + 1, y + 6 - i, 2, 1);
  }
}

function drawWaterCell(ctx: Ctx, u: number, x: number, y: number, phase: number): void {
  ctx.fillStyle = C.water;
  R(ctx, u, x, y, 8, 8);
  ctx.fillStyle = C.waterLight;
  const o = phase ? 3 : 0;
  R(ctx, u, x + ((1 + o) % 8), y + 2, 2, 1);
  R(ctx, u, x + ((5 + o) % 8), y + 5, 2, 1);
}

function makeCanvas(w: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = w;
  return c;
}

function rebuildCache(cache: RenderCache, s: GameState, width: number): void {
  const u = width / MAP_PX;
  const terrain = cache.terrain && cache.width === width ? cache.terrain : makeCanvas(width);
  const trees = cache.trees && cache.width === width ? cache.trees : makeCanvas(width);
  const tc = terrain.getContext("2d");
  const rc = trees.getContext("2d");
  if (!tc || !rc) return;
  tc.clearRect(0, 0, width, width);
  rc.clearRect(0, 0, width, width);
  for (let r = 0; r < GRID_N; r++) {
    for (let c = 0; c < GRID_N; c++) {
      const v = s.grid[r * GRID_N + c];
      const x = c * SUB;
      const y = r * SUB;
      if (v === T.BRICK) drawBrickCell(tc, u, x, y);
      else if (v === T.STEEL) drawSteelCell(tc, u, x, y);
      else if (v === T.ICE) drawIceCell(tc, u, x, y);
      else if (v === T.TREES) drawTreeCell(rc, u, x, y);
    }
  }
  cache.terrain = terrain;
  cache.trees = trees;
  cache.version = s.terrainVersion;
  cache.grid = s.grid;
  cache.width = width;
}

// ───────── 基地（原創像素老鷹） ─────────

/* a 深藍輪廓、b 青綠羽毛、c 金色、d 白 */
const EAGLE = [
  "................",
  "......aaaa......",
  ".....abddba.....",
  ".....abdacba....",
  "a....abbbcca...a",
  "aba..aabbaa..aba",
  "abbaabbbbbbaabba",
  ".abbbbbccbbbbba.",
  "..abbbbccbbbba..",
  "...aabbbbbbaa...",
  ".....abbbba.....",
  "....abcbbcba....",
  "...abc.aa.cba...",
  "...aa......aa...",
  "..accca..accca..",
  "................",
];
const RUBBLE = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......e........",
  "......eee.......",
  "....e.efe..e....",
  "...eeefffe.ee...",
  "..eefffeffeefe..",
  ".efeffeeeffffee.",
  ".effffefffeffffe",
  "eeffeeffffffefee",
  "efffffeffeffffff",
  "eeeeeeeeeeeeeeee",
];
const PIX: Record<string, string> = {
  a: "#1D2A5C",
  b: "#2BB3A3",
  c: "#F5C542",
  d: "#FFFFFF",
  e: "#5A5A5A",
  f: "#8E8E8E",
};

function drawBitmap(ctx: Ctx, u: number, x: number, y: number, rows: readonly string[]): void {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const col = PIX[row[c]];
      if (!col) continue;
      ctx.fillStyle = col;
      R(ctx, u, x + c, y + r, 1, 1);
    }
  }
}

// ───────── 坦克 ─────────

type Palette = { body: string; dark: string; light: string };
const PAL = {
  player: { body: "#E7B53C", dark: "#8A5A00", light: "#FFE79A" },
  enemy: { body: "#B9C1C9", dark: "#56606B", light: "#F2F5F7" },
  red: { body: "#D8433A", dark: "#7A1410", light: "#FFAAA0" },
  green: { body: "#4CAF50", dark: "#1E5E22", light: "#B9F0A8" },
  gold: { body: "#E7B53C", dark: "#7A5200", light: "#FFE79A" },
  gray: { body: "#7D858C", dark: "#3C4248", light: "#B5BCC2" },
} as const satisfies Record<string, Palette>;

/** 朝上座標的矩形 → 依方向旋轉到世界座標 */
function rotRect(
  ctx: Ctx,
  u: number,
  ox: number,
  oy: number,
  dir: Dir,
  lx: number,
  ly: number,
  lw: number,
  lh: number
): void {
  const S = TANK_SIZE;
  if (dir === 0) R(ctx, u, ox + lx, oy + ly, lw, lh);
  else if (dir === 1) R(ctx, u, ox + S - (ly + lh), oy + lx, lh, lw);
  else if (dir === 2) R(ctx, u, ox + S - lx - lw, oy + S - ly - lh, lw, lh);
  else R(ctx, u, ox + ly, oy + S - lx - lw, lh, lw);
}

export function tankPalette(t: Pick<Tank, "side" | "kind" | "hp" | "bonus">, tick: number): Palette {
  if (t.side === "player") return PAL.player;
  if (t.bonus && Math.floor(tick / 8) % 2 === 1) return PAL.red;
  if (t.kind === "armor") {
    if (t.hp >= 4) return PAL.green;
    if (t.hp === 3) return PAL.gold;
    if (t.hp === 2) return PAL.enemy;
    return PAL.gray;
  }
  return PAL.enemy;
}

/** 在 (x,y) 畫一台坦克（地圖 px），treadPhase 0/1 做履帶動畫 */
export function drawTankSprite(
  ctx: Ctx,
  u: number,
  x: number,
  y: number,
  dir: Dir,
  kind: "player" | EnemyKind,
  pal: Palette,
  treadPhase: number
): void {
  const box = (lx: number, ly: number, lw: number, lh: number, color: string) => {
    ctx.fillStyle = color;
    rotRect(ctx, u, x, y, dir, lx, ly, lw, lh);
  };
  const wide = kind === "armor";
  const narrow = kind === "fast";
  const tx0 = wide ? 0 : 1; // 履帶左邊
  const tw = wide ? 4 : 3;
  const bodyX = tx0 + tw;
  const bodyW = 16 - bodyX * 2;
  const top = narrow ? 4 : wide ? 2 : 3;
  const bottom = wide ? 15 : 14;

  // 履帶
  for (const side of [0, 1]) {
    const lx = side === 0 ? tx0 : 16 - tx0 - tw;
    box(lx, 1, tw, 14, pal.dark);
    for (let k = 0; k < 7; k++) {
      const ly = 1 + ((k * 2 + treadPhase) % 14);
      box(lx, ly, tw, 1, pal.body);
    }
  }
  // 車身
  box(bodyX, top, bodyW, bottom - top, pal.body);
  box(bodyX, top, bodyW, 1, pal.light);
  box(bodyX, bottom - 1, bodyW, 1, pal.dark);
  if (wide) {
    // 厚裝甲：兩側加板
    box(bodyX, top + 2, 1, bottom - top - 4, pal.light);
    box(bodyX + bodyW - 1, top + 2, 1, bottom - top - 4, pal.dark);
  }
  // 砲塔
  box(5, 6, 6, 6, pal.dark);
  box(6, 7, 4, 4, pal.light);
  box(7, 8, 2, 2, pal.body);
  // 砲管
  if (narrow) box(7, 0, 2, 8, pal.light);
  else if (kind === "power") {
    box(6, 1, 4, 6, pal.dark);
    box(7, 1, 2, 6, pal.light);
  } else box(7, 1, 2, 6, pal.light);
}

// ───────── 其他物件 ─────────

function drawSparkle(ctx: Ctx, u: number, x: number, y: number, ticks: number): void {
  const frame = Math.floor(ticks / 4) % 4;
  const r = [2, 4, 6, 4][frame];
  const cx = x + 8;
  const cy = y + 8;
  ctx.fillStyle = "#FFFFFF";
  R(ctx, u, cx - 1, cy - r - 1, 2, r * 2 + 2);
  R(ctx, u, cx - r - 1, cy - 1, r * 2 + 2, 2);
  ctx.fillStyle = "#9AD8FF";
  R(ctx, u, cx - 2, cy - 2, 4, 4);
  ctx.fillStyle = "#FFFFFF";
  R(ctx, u, cx - 1, cy - 1, 2, 2);
}

function drawShield(ctx: Ctx, u: number, x: number, y: number, tick: number): void {
  if (Math.floor(tick / 3) % 2 === 0) return;
  ctx.fillStyle = "#FFFFFF";
  for (let i = 0; i < 18; i += 3) {
    R(ctx, u, x - 1 + i, y - 1, 1, 1);
    R(ctx, u, x + 16 - i, y + 16, 1, 1);
    R(ctx, u, x - 1, y + 16 - i, 1, 1);
    R(ctx, u, x + 16, y - 1 + i, 1, 1);
  }
}

const POWER_COLOR: Record<PowerKind, string> = {
  star: "#F5C542",
  helmet: "#4FC3F7",
  clock: "#FFFFFF",
  shovel: "#C58B4A",
  grenade: "#4CAF50",
  tank: "#E7B53C",
};

function drawPowerUp(ctx: Ctx, u: number, kind: PowerKind, x: number, y: number): void {
  ctx.fillStyle = "#FFFFFF";
  R(ctx, u, x, y, 16, 16);
  ctx.fillStyle = "#7B1FA2";
  R(ctx, u, x + 1, y + 1, 14, 14);
  const col = POWER_COLOR[kind];
  ctx.fillStyle = col;
  switch (kind) {
    case "star":
      R(ctx, u, x + 7, y + 3, 2, 10);
      R(ctx, u, x + 3, y + 6, 10, 2);
      R(ctx, u, x + 5, y + 8, 2, 4);
      R(ctx, u, x + 9, y + 8, 2, 4);
      R(ctx, u, x + 6, y + 5, 4, 5);
      break;
    case "helmet":
      R(ctx, u, x + 4, y + 5, 8, 6);
      R(ctx, u, x + 3, y + 9, 10, 2);
      R(ctx, u, x + 6, y + 4, 4, 1);
      break;
    case "clock":
      R(ctx, u, x + 4, y + 4, 8, 8);
      ctx.fillStyle = "#7B1FA2";
      R(ctx, u, x + 7, y + 5, 1, 4);
      R(ctx, u, x + 7, y + 8, 3, 1);
      break;
    case "shovel":
      R(ctx, u, x + 7, y + 3, 2, 6);
      R(ctx, u, x + 5, y + 3, 6, 1);
      R(ctx, u, x + 5, y + 9, 6, 4);
      break;
    case "grenade":
      R(ctx, u, x + 4, y + 6, 8, 7);
      R(ctx, u, x + 6, y + 3, 4, 3);
      ctx.fillStyle = "#1B5E20";
      R(ctx, u, x + 4, y + 9, 8, 1);
      break;
    case "tank":
      drawTankSprite(ctx, u * 0.75, (x + 2) / 0.75, (y + 2) / 0.75, 0, "player", PAL.player, 0);
      break;
  }
}

/** 3×5 像素數字 */
const DIGITS: Record<string, string> = {
  "0": "111101101101111",
  "1": "010110010010111",
  "2": "111001111100111",
  "3": "111001111001111",
  "4": "101101111001001",
  "5": "111100111001111",
  "6": "111100111101111",
  "7": "111001010010010",
  "8": "111101111101111",
  "9": "111101111001111",
};

function drawNumber(ctx: Ctx, u: number, cx: number, cy: number, n: number): void {
  const str = String(n);
  const w = str.length * 4 - 1;
  let x = Math.round(cx - w / 2);
  const y = Math.round(cy - 2.5);
  ctx.fillStyle = "#FFFFFF";
  for (const ch of str) {
    const bits = DIGITS[ch];
    if (bits) {
      for (let i = 0; i < 15; i++) if (bits[i] === "1") R(ctx, u, x + (i % 3), y + Math.floor(i / 3), 1, 1);
    }
    x += 4;
  }
}

function drawBoom(ctx: Ctx, u: number, cx: number, cy: number, big: boolean, ticks: number): void {
  const total = big ? 24 : 12;
  const frames = big ? 5 : 3;
  const frame = Math.min(frames - 1, Math.floor(((total - ticks) / total) * frames));
  const radius = big ? [4, 7, 10, 14, 12][frame] : [2, 4, 6][frame];
  const layers: [number, string][] = [
    [1, "#B71C1C"],
    [0.75, "#FF7043"],
    [0.5, "#FFD54F"],
    [0.25, "#FFFFFF"],
  ];
  for (const [k, color] of layers) {
    const r = Math.max(1, Math.round(radius * k));
    ctx.fillStyle = color;
    R(ctx, u, cx - r, cy - r / 2, r * 2, r);
    R(ctx, u, cx - r / 2, cy - r, r, r * 2);
  }
}

/** 主繪圖：width = canvas 裝置像素寬（正方形） */
export function drawGame(ctx: Ctx, width: number, s: GameState, cache: RenderCache): void {
  const u = width / MAP_PX;
  const tick = s.tick;
  if (cache.version !== s.terrainVersion || cache.grid !== s.grid || cache.width !== width) {
    rebuildCache(cache, s, width);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, width, width);

  // 地形（含冰）
  if (cache.terrain) ctx.drawImage(cache.terrain, 0, 0);
  // 鏟子最後 3 秒：外圈磚/鋼交替閃爍
  if (s.shovel > 0 && s.shovel <= 180 && Math.floor(s.shovel / 16) % 2 === 0) {
    for (const [c, r] of BASE_RING) {
      if (s.grid[r * GRID_N + c] === T.STEEL) {
        ctx.fillStyle = C.ground;
        R(ctx, u, c * SUB, r * SUB, SUB, SUB);
        drawBrickCell(ctx, u, c * SUB, r * SUB);
      }
    }
  }
  // 水（動畫）
  const phase = Math.floor(tick / 30) % 2;
  for (let r = 0; r < GRID_N; r++) {
    for (let c = 0; c < GRID_N; c++) {
      if (s.grid[r * GRID_N + c] === T.WATER) drawWaterCell(ctx, u, c * SUB, r * SUB, phase);
    }
  }
  // 基地
  drawBitmap(ctx, u, BASE_RECT.x, BASE_RECT.y, s.baseAlive ? EAGLE : RUBBLE);

  // 出生閃光
  for (const sp of s.sparkles) drawSparkle(ctx, u, sp.x, sp.y, sp.ticks);
  if (s.playerSparkle) drawSparkle(ctx, u, s.playerSparkle.x, s.playerSparkle.y, s.playerSparkle.ticks);

  // 坦克
  const tanks = s.player ? [...s.enemies, s.player] : s.enemies;
  for (const t of tanks) {
    const moving = t.side === "enemy" ? s.freeze <= 0 : t.moving || t.slide > 0;
    const tread = moving ? (t.dir === 0 || t.dir === 2 ? t.y : t.x) & 1 : 0;
    drawTankSprite(ctx, u, t.x, t.y, t.dir, t.kind, tankPalette(t, tick), tread);
    if (t.side === "player" && t.shield > 0) drawShield(ctx, u, t.x, t.y, tick);
  }

  // 子彈
  ctx.fillStyle = "#FFFFFF";
  for (const b of s.bullets) {
    ctx.fillStyle = b.side === "player" ? "#FFFFFF" : "#FFD9D9";
    R(ctx, u, b.x + 1, b.y, 2, 4);
    R(ctx, u, b.x, b.y + 1, 4, 2);
  }

  // 樹林蓋在坦克上
  if (cache.trees) ctx.drawImage(cache.trees, 0, 0);

  // 道具（最後 3 秒快閃）
  const pu = s.powerUp;
  if (pu) {
    const rate = pu.ticks <= 180 ? 4 : 10;
    if (Math.floor(pu.ticks / rate) % 2 === 0) drawPowerUp(ctx, u, pu.kind, pu.x, pu.y);
  }

  // 特效
  for (const f of s.fx) {
    if (f.kind === "score") drawNumber(ctx, u, f.x, f.y, f.value);
    else drawBoom(ctx, u, f.x, f.y, f.kind === "boomL", f.ticks);
  }
}

/** 小圖示（結算表、HUD）：在 size×size 的 canvas 上畫一台朝上的坦克 */
export function drawTankIcon(ctx: Ctx, size: number, kind: "player" | EnemyKind): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const pal = kind === "player" ? PAL.player : kind === "armor" ? PAL.green : PAL.enemy;
  drawTankSprite(ctx, size / 16, 0, 0, 0, kind, pal, 0);
}
