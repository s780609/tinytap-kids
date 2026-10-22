/**
 * 小精靈純 canvas 繪圖（不含 React）。
 * u = 每格幾個裝置像素；模擬裡的座標是格子中心（整數），畫的時候 +0.5。
 */
import { COLS, DX, DY, FRUIT_TILE, MAZE_ROWS, ROWS, charAt } from "@/lib/pacman/maze";
import type { Dir } from "@/lib/pacman/maze";
import type { FruitKind } from "@/lib/pacman/levels";
import { DYING_FREEZE, DYING_TICKS, FLASH_TICKS, ghostPos, posOf } from "@/lib/pacman/sim";
import type { GameState, Ghost, GhostId } from "@/lib/pacman/sim";

type Ctx = CanvasRenderingContext2D;

export const FRUIT_EMOJI: Record<FruitKind, string> = {
  cherry: "🍒",
  strawberry: "🍓",
  orange: "🍊",
  apple: "🍎",
  melon: "🍈",
  rocket: "🚀",
  bell: "🔔",
  key: "🔑",
};

const C = {
  wall: "#3B4BFF",
  wallFlash: "#FFFFFF",
  door: "#FFB8FF",
  dot: "#FFB8AE",
  pac: "#FFE600",
  frightBody: "#2337FF",
  frightFace: "#FFB8AE",
  flashBody: "#F5F5F5",
  flashFace: "#FF2A2A",
  eyeWhite: "#FFFFFF",
  pupil: "#1A2BD6",
  popup: "#00FFFF",
  ready: "#FFE600",
};

const GHOST_COLOR: Record<GhostId, string> = {
  red: "#FF2A2A",
  pink: "#FFB8FF",
  cyan: "#00F0FF",
  orange: "#FFB852",
};

// ───────── 迷宮（畫一次存在離屏 canvas） ─────────

/** 牆線離格子邊緣多遠（格） */
const INSET = 0.32;

const isWall = (c: number, r: number) => charAt(c, r) === "#";
/** 牆的這一側要不要畫線：迷宮範圍外和 _ 都不畫 */
function isSpace(c: number, r: number): boolean {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
  const ch = MAZE_ROWS[r][c];
  return ch !== "#" && ch !== "_";
}

type Seg = [number, number, number, number];
type Corner = { ax: number; ay: number; px: number; py: number; bx: number; by: number };

/** 牆邊線段與內凹轉角（格座標） */
function buildWallShapes(): { segs: Seg[]; corners: Corner[] } {
  const segs: Seg[] = [];
  const corners: Corner[] = [];
  const i = INSET;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isWall(c, r)) continue;
      const L = isSpace(c - 1, r);
      const R = isSpace(c + 1, r);
      const U = isSpace(c, r - 1);
      const D = isSpace(c, r + 1);
      const x0 = c + (L ? i : 0);
      const x1 = c + 1 - (R ? i : 0);
      const y0 = r + (U ? i : 0);
      const y1 = r + 1 - (D ? i : 0);
      if (U) segs.push([x0, r + i, x1, r + i]);
      if (D) segs.push([x0, r + 1 - i, x1, r + 1 - i]);
      if (L) segs.push([c + i, y0, c + i, y1]);
      if (R) segs.push([c + 1 - i, y0, c + 1 - i, y1]);
      for (const dx of [-1, 1]) {
        for (const dy of [-1, 1]) {
          if (isSpace(c + dx, r) || isSpace(c, r + dy) || !isSpace(c + dx, r + dy)) continue;
          const px = c + (dx < 0 ? i : 1 - i);
          const py = r + (dy < 0 ? i : 1 - i);
          corners.push({ ax: c + (dx < 0 ? 0 : 1), ay: py, px, py, bx: px, by: r + (dy < 0 ? 0 : 1) });
        }
      }
    }
  }
  return { segs, corners };
}

const WALLS = buildWallShapes();

export interface RenderCache {
  maze: HTMLCanvasElement | null;
  flash: HTMLCanvasElement | null;
  u: number;
}

export function createRenderCache(): RenderCache {
  return { maze: null, flash: null, u: 0 };
}

function drawMaze(u: number, color: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = COLS * u;
  c.height = ROWS * u;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, u * 0.14);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of WALLS.segs) {
    ctx.moveTo(x0 * u, y0 * u);
    ctx.lineTo(x1 * u, y1 * u);
  }
  for (const k of WALLS.corners) {
    ctx.moveTo(k.ax * u, k.ay * u);
    ctx.arcTo(k.px * u, k.py * u, k.bx * u, k.by * u, INSET * u);
    ctx.lineTo(k.bx * u, k.by * u);
  }
  ctx.stroke();
  // 鬼屋門
  ctx.fillStyle = C.door;
  for (let r = 0; r < ROWS; r++) {
    const col = MAZE_ROWS[r].indexOf("-");
    if (col >= 0) ctx.fillRect(col * u, (r + 0.42) * u, u, Math.max(2, u * 0.16));
  }
  return c;
}

// ───────── 角色 ─────────

/** 小精靈；mouth = 嘴巴張開的半角（弧度），dying 時張到 π 就消失 */
function drawPac(ctx: Ctx, u: number, x: number, y: number, dir: Dir, mouth: number): void {
  const cx = (x + 0.5) * u;
  const cy = (y + 0.5) * u;
  const r = u * 0.65;
  const facing = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][dir];
  ctx.fillStyle = C.pac;
  ctx.beginPath();
  if (mouth >= Math.PI - 0.01) return;
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, facing + mouth, facing - mouth + Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

function ghostBody(ctx: Ctx, cx: number, cy: number, r: number, frame: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0);
  const bottom = cy + r;
  ctx.lineTo(cx + r, bottom);
  const n = 6;
  for (let k = 1; k <= n; k++) {
    const px = cx + r - (2 * r * k) / n;
    const up = (k + frame) % 2 === 1;
    ctx.lineTo(px, up ? bottom - r * 0.28 : bottom);
  }
  ctx.closePath();
  ctx.fill();
}

function ghostEyes(ctx: Ctx, cx: number, cy: number, r: number, dir: Dir): void {
  const ex = r * 0.38;
  const ey = cy - r * 0.2;
  const ox = DX[dir] * r * 0.14;
  const oy = DY[dir] * r * 0.14;
  for (const s of [-1, 1]) {
    ctx.fillStyle = C.eyeWhite;
    ctx.beginPath();
    ctx.ellipse(cx + s * ex + ox * 0.5, ey + oy * 0.5, r * 0.26, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.pupil;
    ctx.beginPath();
    ctx.arc(cx + s * ex + ox * 1.3, ey + oy * 1.3, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGhost(ctx: Ctx, u: number, s: GameState, g: Ghost): void {
  const { x, y: gy } = ghostPos(g);
  const y = g.state === "house" ? gy + Math.sin(s.tick / 8 + x) * 0.25 : gy;
  const cx = (x + 0.5) * u;
  const cy = (y + 0.5) * u;
  const r = u * 0.65;
  const frame = Math.floor(s.tick / 8) % 2;
  if (g.state === "eaten" || g.state === "entering") {
    ghostEyes(ctx, cx, cy, r, g.dir);
    return;
  }
  if (g.fright) {
    const flashing = s.frightTicks < FLASH_TICKS && Math.floor(s.frightTicks / 12) % 2 === 0;
    ctx.fillStyle = flashing ? C.flashBody : C.frightBody;
    ghostBody(ctx, cx, cy, r, frame);
    const face = flashing ? C.flashFace : C.frightFace;
    ctx.fillStyle = face;
    const e = r * 0.2;
    ctx.fillRect(cx - r * 0.42, cy - r * 0.42, e, e);
    ctx.fillRect(cx + r * 0.22, cy - r * 0.42, e, e);
    ctx.strokeStyle = face;
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = cx - r * 0.6 + (r * 1.2 * k) / 6;
      const py = cy + r * 0.32 + (k % 2 === 0 ? 0 : -r * 0.16);
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    return;
  }
  ctx.fillStyle = GHOST_COLOR[g.id];
  ghostBody(ctx, cx, cy, r, frame);
  ghostEyes(ctx, cx, cy, r, g.dir);
}

// ───────── 主畫面 ─────────

export function drawGame(ctx: Ctx, u: number, s: GameState, cache: RenderCache): void {
  if (cache.u !== u || !cache.maze || !cache.flash) {
    cache.maze = drawMaze(u, C.wall);
    cache.flash = drawMaze(u, C.wallFlash);
    cache.u = u;
  }
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, COLS * u, ROWS * u);

  const flash = s.phase === "cleared" && s.phaseTicks < 120 && Math.floor(s.phaseTicks / 15) % 2 === 0;
  ctx.drawImage(flash ? cache.flash : cache.maze, 0, 0);

  // 豆子與大力丸
  const blinkOff = s.phase === "playing" && Math.floor(s.tick / 12) % 2 === 1;
  ctx.fillStyle = C.dot;
  const d = Math.max(2, Math.round(u * 0.22));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = s.dots[r * COLS + c];
      if (v === 1) {
        ctx.fillRect(Math.round((c + 0.5) * u - d / 2), Math.round((r + 0.5) * u - d / 2), d, d);
      } else if (v === 2 && !blinkOff) {
        ctx.beginPath();
        ctx.arc((c + 0.5) * u, (r + 0.5) * u, u * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (s.fruit) {
    ctx.font = `${Math.round(u * 1.2)}px sans-serif`;
    ctx.fillText(FRUIT_EMOJI[s.fruit.kind], (FRUIT_TILE.col + 0.5) * u, (FRUIT_TILE.row + 0.55) * u);
  }

  const dyingAnim = s.phase === "dying" && s.phaseTicks <= DYING_TICKS - DYING_FREEZE;
  const showGhosts = s.phase !== "cleared" && s.phase !== "over" && !dyingAnim;
  if (showGhosts) for (const g of s.ghosts) drawGhost(ctx, u, s, g);

  // 小精靈：吃到鬼定格時讓分數顯示在那裡
  if (s.phase !== "over" && s.freezeTicks === 0) {
    const p = posOf(s.pac);
    let mouth: number;
    if (dyingAnim) {
      const k = 1 - s.phaseTicks / (DYING_TICKS - DYING_FREEZE);
      mouth = Math.min(Math.PI, 0.2 + k * 1.15 * Math.PI);
    } else if (s.phase === "ready") {
      mouth = 0.35;
    } else {
      mouth = s.pac.moving ? 0.05 + Math.abs(Math.sin(s.tick * 0.35)) * 0.75 : 0.35;
    }
    drawPac(ctx, u, p.x, p.y, s.pac.dir, mouth);
  }

  if (s.popup) {
    ctx.fillStyle = C.popup;
    ctx.font = `900 ${Math.round(u * 0.75)}px sans-serif`;
    ctx.fillText(String(s.popup.points), (s.popup.x + 0.5) * u, (s.popup.y + 0.5) * u);
  }

  if (s.phase === "ready") {
    ctx.fillStyle = C.ready;
    ctx.font = `900 ${Math.round(u * 0.95)}px sans-serif`;
    ctx.fillText("準備！", (FRUIT_TILE.col + 0.5) * u, (FRUIT_TILE.row + 0.5) * u);
  }
}
