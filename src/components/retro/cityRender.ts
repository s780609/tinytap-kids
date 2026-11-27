/**
 * 城市狂飆純 canvas 繪圖（不含 React）。全部用程式畫：俯視角的街道、
 * 有透視感的大樓（牆面隨鏡頭傾斜）、車子、行人、樹、錢幣、胎痕與小地圖。
 */
import { BLOCK, MAP_N, T, TILE, isRoadIndex, tileAt, type Building } from "@/lib/city/map";
import { CAR_SPECS, findCar, forwardSpeed, type Car, type GameState, type Ped } from "@/lib/city/sim";

type Ctx = CanvasRenderingContext2D;

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Fx {
  kind: "smoke" | "spark" | "text" | "drop";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  text?: string;
  color?: string;
}

/** 調亮（amt > 0）或調暗（amt < 0）顏色 */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  } else {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** 每格固定的小亂數（草地紋路用） */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 鏡頭跟著玩家，開車時往前看一點、開越快拉越遠 */
export function updateCamera(cam: Camera, s: GameState, dt: number): void {
  const car = findCar(s, s.player.car);
  let tx = s.player.x;
  let ty = s.player.y;
  let zoom = 1.45;
  if (car) {
    tx = car.x + car.vx * 0.45;
    ty = car.y + car.vy * 0.45;
    const ratio = Math.min(1, Math.abs(forwardSpeed(car)) / CAR_SPECS[car.kind].maxSpeed);
    zoom = 1.2 - ratio * 0.45;
  }
  const k = Math.min(1, dt * 4);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
  cam.zoom += (zoom - cam.zoom) * Math.min(1, dt * 1.6);
}

export function cameraScale(cam: Camera, w: number, h: number): number {
  return (Math.min(w, h) / 440) * cam.zoom;
}

// ---------- 地面 ----------

function drawGround(ctx: Ctx, s: GameState, x0: number, y0: number, x1: number, y1: number) {
  const m = s.map;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(m, tx, ty);
      const px = tx * TILE;
      const py = ty * TILE;
      switch (t) {
        case T.Road:
          ctx.fillStyle = "#44484f";
          break;
        case T.Sidewalk:
          ctx.fillStyle = "#cbc4b6";
          break;
        case T.Grass:
        case T.Tree:
          ctx.fillStyle = "#6aad4c";
          break;
        case T.Parking:
          ctx.fillStyle = "#5c6068";
          break;
        default:
          ctx.fillStyle = "#3b3f46";
      }
      ctx.fillRect(px, py, TILE + 0.5, TILE + 0.5);

      if (t === T.Sidewalk) {
        ctx.strokeStyle = "rgba(0,0,0,0.07)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE / 2, TILE / 2);
        ctx.strokeRect(px + TILE / 2 + 0.5, py + TILE / 2 + 0.5, TILE / 2, TILE / 2);
        // 路緣石
        ctx.fillStyle = "#9d968a";
        if (tileAt(m, tx, ty - 1) === T.Road) ctx.fillRect(px, py, TILE, 3);
        if (tileAt(m, tx, ty + 1) === T.Road) ctx.fillRect(px, py + TILE - 3, TILE, 3);
        if (tileAt(m, tx - 1, ty) === T.Road) ctx.fillRect(px, py, 3, TILE);
        if (tileAt(m, tx + 1, ty) === T.Road) ctx.fillRect(px + TILE - 3, py, 3, TILE);
      } else if (t === T.Grass || t === T.Tree) {
        ctx.fillStyle = "rgba(40,90,30,0.35)";
        for (let k = 0; k < 3; k++) {
          const hx = hash(tx * 3 + k, ty);
          const hy = hash(ty * 5 + k, tx);
          ctx.fillRect(px + hx * 28, py + hy * 28, 3, 2);
        }
      } else if (t === T.Parking) {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        if (tileAt(m, tx, ty - 1) !== T.Parking) ctx.fillRect(px, py, 2, 24);
        if (tileAt(m, tx, ty + 1) !== T.Parking) ctx.fillRect(px, py + 8, 2, 24);
      } else if (t === T.Road) {
        drawRoadMarks(ctx, tx, ty, px, py);
      }
    }
  }
}

function drawRoadMarks(ctx: Ctx, tx: number, ty: number, px: number, py: number) {
  const hRoad = isRoadIndex(ty);
  const vRoad = isRoadIndex(tx);
  if (hRoad && vRoad) return; // 路口
  if (hRoad) {
    const lx = tx % BLOCK;
    if (ty % BLOCK === 0) {
      // 中線（黃色虛線）
      ctx.fillStyle = "#F2C94C";
      ctx.fillRect(px + 2, py + TILE - 1, 12, 2);
      ctx.fillRect(px + 18, py + TILE - 1, 12, 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(px, py + 2, TILE, 1.5);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(px, py + TILE - 3.5, TILE, 1.5);
    }
    if (lx === 2 || lx === BLOCK - 1) {
      // 斑馬線
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let k = 0; k < 5; k++) ctx.fillRect(px + 6, py + 1 + k * 6.4, 20, 3.4);
    }
  } else if (vRoad) {
    const ly = ty % BLOCK;
    if (tx % BLOCK === 0) {
      ctx.fillStyle = "#F2C94C";
      ctx.fillRect(px + TILE - 1, py + 2, 2, 12);
      ctx.fillRect(px + TILE - 1, py + 18, 2, 12);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(px + 2, py, 1.5, TILE);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(px + TILE - 3.5, py, 1.5, TILE);
    }
    if (ly === 2 || ly === BLOCK - 1) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let k = 0; k < 5; k++) ctx.fillRect(px + 1 + k * 6.4, py + 6, 3.4, 20);
    }
  }
}

// ---------- 大樓（透視） ----------

/** 牆面上的一排排窗戶 */
function windows(ctx: Ctx, ax: number, ay: number, bx: number, by: number, ax2: number, ay2: number, bx2: number, by2: number) {
  ctx.strokeStyle = "rgba(255,236,170,0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  for (const t of [0.3, 0.62]) {
    ctx.moveTo(ax + (ax2 - ax) * t, ay + (ay2 - ay) * t);
    ctx.lineTo(bx + (bx2 - bx) * t, by + (by2 - by) * t);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBuilding(ctx: Ctx, b: Building, cam: Camera, time: number) {
  const x0 = b.x * TILE;
  const y0 = b.y * TILE;
  const x1 = (b.x + b.w) * TILE;
  const y1 = (b.y + b.h) * TILE;
  const k = 1 + b.height * 0.55;
  const rx = (x: number) => cam.x + (x - cam.x) * k;
  const ry = (y: number) => cam.y + (y - cam.y) * k;
  const X0 = rx(x0);
  const Y0 = ry(y0);
  const X1 = rx(x1);
  const Y1 = ry(y1);
  const quad = (pts: number[], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  };
  // 地面上的影子
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x0 + 4, y0 + 6, x1 - x0, y1 - y0);
  // 看得到的牆
  if (cam.y < y0) {
    quad([x0, y0, x1, y0, X1, Y0, X0, Y0], shade(b.color, -0.42));
    windows(ctx, x0 + 4, y0, x1 - 4, y0, X0 + 4, Y0, X1 - 4, Y0);
  }
  if (cam.y > y1) {
    quad([x0, y1, x1, y1, X1, Y1, X0, Y1], shade(b.color, -0.3));
    windows(ctx, x0 + 4, y1, x1 - 4, y1, X0 + 4, Y1, X1 - 4, Y1);
  }
  if (cam.x < x0) {
    quad([x0, y0, x0, y1, X0, Y1, X0, Y0], shade(b.color, -0.36));
    windows(ctx, x0, y0 + 4, x0, y1 - 4, X0, Y0 + 4, X0, Y1 - 4);
  }
  if (cam.x > x1) {
    quad([x1, y0, x1, y1, X1, Y1, X1, Y0], shade(b.color, -0.24));
    windows(ctx, x1, y0 + 4, x1, y1 - 4, X1, Y0 + 4, X1, Y1 - 4);
  }
  // 屋頂
  const w = X1 - X0;
  const h = Y1 - Y0;
  ctx.fillStyle = b.color;
  ctx.fillRect(X0, Y0, w, h);
  ctx.strokeStyle = shade(b.color, -0.2);
  ctx.lineWidth = 4;
  ctx.strokeRect(X0 + 2, Y0 + 2, w - 4, h - 4);
  ctx.strokeStyle = shade(b.color, 0.25);
  ctx.lineWidth = 1;
  ctx.strokeRect(X0 + 0.5, Y0 + 0.5, w - 1, h - 1);

  const cx = X0 + w / 2;
  const cy = Y0 + h / 2;
  if (b.police) {
    ctx.fillStyle = "#1A237E";
    ctx.fillRect(X0 + 8, Y0 + 8, w - 16, h - 16);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.min(26, h * 0.32)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("警察局", cx, cy);
    // 屋頂的紅藍警示燈
    const on = Math.floor(time * 3) % 2 === 0;
    ctx.fillStyle = on ? "#FF1744" : "#7f0f20";
    ctx.beginPath();
    ctx.arc(X0 + 14, Y0 + 14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = on ? "#0d2a6b" : "#2979FF";
    ctx.beginPath();
    ctx.arc(X1 - 14, Y0 + 14, 5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  switch (b.roof) {
    case "ac":
      for (let i = 0; i < 2 + ((b.x + b.y) % 2); i++) {
        const ax = X0 + 10 + i * 24;
        const ay = Y0 + 10 + (i % 2) * (h - 38);
        if (ax + 18 > X1 - 6) break;
        ctx.fillStyle = "#B0BEC5";
        ctx.fillRect(ax, ay, 18, 18);
        ctx.strokeStyle = "#607D8B";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ax + 9, ay + 9, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax + 3, ay + 9);
        ctx.lineTo(ax + 15, ay + 9);
        ctx.moveTo(ax + 9, ay + 3);
        ctx.lineTo(ax + 9, ay + 15);
        ctx.stroke();
      }
      break;
    case "tank":
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.arc(cx + 4, cy + 5, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#78909C";
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#546E7A";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "garden":
      ctx.fillStyle = "#7CB342";
      ctx.fillRect(X0 + 8, Y0 + 8, w - 16, h - 16);
      for (const [fx, fy] of [
        [0.3, 0.35],
        [0.7, 0.6],
        [0.45, 0.75],
      ]) {
        ctx.fillStyle = "#33691E";
        ctx.beginPath();
        ctx.arc(X0 + w * fx, Y0 + h * fy, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "helipad": {
      const r = Math.min(w, h) * 0.3;
      ctx.fillStyle = "#37474F";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFD600";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${r * 1.1}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("H", cx, cy + 1);
      break;
    }
    default:
      ctx.fillStyle = shade(b.color, 0.35);
      ctx.fillRect(cx - 10, cy - 6, 20, 12);
      ctx.strokeStyle = shade(b.color, -0.25);
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 10, cy - 6, 20, 12);
  }
}

// ---------- 車子 ----------

function drawCar(ctx: Ctx, c: Car, time: number) {
  const spec = CAR_SPECS[c.kind];
  const L = spec.length;
  const W = spec.width;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  // 影子
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.roundRect(-L / 2 + 3, -W / 2 + 4, L, W, 6);
  ctx.fill();

  const body = c.wrecked ? "#3a3a3a" : c.color;
  // 車身
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2, L, W, c.kind === "sports" ? 8 : 5);
  ctx.fill();
  ctx.strokeStyle = shade(c.wrecked ? "#3a3a3a" : c.color, -0.35);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (c.kind === "police" && !c.wrecked) {
    // 黑色引擎蓋與後車廂
    ctx.fillStyle = "#212121";
    ctx.beginPath();
    ctx.roundRect(L / 2 - 10, -W / 2, 10, W, [0, 5, 5, 0]);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-L / 2, -W / 2, 8, W, [5, 0, 0, 5]);
    ctx.fill();
  }
  if (c.kind === "sports" && !c.wrecked) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(-L / 2 + 2, -3, L - 4, 2);
    ctx.fillRect(-L / 2 + 2, 1, L - 4, 2);
  }

  const glass = c.wrecked ? "#78909C" : "#263845";
  if (c.kind === "van") {
    // 駕駛艙在前面，後面是貨箱
    ctx.fillStyle = glass;
    ctx.fillRect(L / 2 - 13, -W / 2 + 2, 6, W - 4);
    ctx.fillStyle = shade(body, 0.15);
    ctx.fillRect(-L / 2 + 3, -W / 2 + 2, L - 18, W - 4);
    ctx.strokeStyle = shade(body, -0.2);
    ctx.lineWidth = 1;
    for (let x = -L / 2 + 9; x < L / 2 - 16; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, -W / 2 + 3);
      ctx.lineTo(x, W / 2 - 3);
      ctx.stroke();
    }
  } else {
    const front = c.kind === "sports" ? 0.04 : 0.1;
    // 前擋風玻璃
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(L * (front + 0.2), -W / 2 + 2.5);
    ctx.lineTo(L * front + 2, -W / 2 + 4);
    ctx.lineTo(L * front + 2, W / 2 - 4);
    ctx.lineTo(L * (front + 0.2), W / 2 - 2.5);
    ctx.closePath();
    ctx.fill();
    // 後擋風玻璃
    ctx.beginPath();
    ctx.moveTo(-L * 0.36, -W / 2 + 3);
    ctx.lineTo(-L * 0.24, -W / 2 + 4);
    ctx.lineTo(-L * 0.24, W / 2 - 4);
    ctx.lineTo(-L * 0.36, W / 2 - 3);
    ctx.closePath();
    ctx.fill();
    // 車頂
    ctx.fillStyle = c.kind === "police" && !c.wrecked ? "#FAFAFA" : shade(body, 0.12);
    ctx.fillRect(-L * 0.24, -W / 2 + 3.5, L * (front + 0.24), W - 7);
    // 玻璃反光
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L * front + 4, -W / 2 + 5);
    ctx.lineTo(L * (front + 0.16), -W / 2 + 4);
    ctx.stroke();
  }

  if (!c.wrecked) {
    if (c.kind === "taxi") {
      ctx.fillStyle = "#FFF59D";
      ctx.fillRect(-4, -5, 8, 10);
      ctx.strokeStyle = "#212121";
      ctx.lineWidth = 1;
      ctx.strokeRect(-4, -5, 8, 10);
      ctx.fillStyle = "#212121";
      ctx.fillRect(-4, -5, 4, 2.5);
      ctx.fillRect(0, 2.5, 4, 2.5);
    }
    if (c.kind === "police") {
      // 警示燈：追捕時紅藍閃
      const flash = c.chase ? Math.floor(time * 8) % 2 : -1;
      ctx.fillStyle = flash === 0 ? "#FF1744" : "#B71C1C";
      ctx.fillRect(-3, -W / 2 + 2, 5, W / 2 - 2);
      ctx.fillStyle = flash === 1 ? "#448AFF" : "#0D47A1";
      ctx.fillRect(-3, 0, 5, W / 2 - 2);
      if (c.chase) {
        const glow = ctx.createRadialGradient(0, flash === 0 ? -5 : 5, 0, 0, flash === 0 ? -5 : 5, 30);
        glow.addColorStop(0, flash === 0 ? "rgba(255,23,68,0.45)" : "rgba(68,138,255,0.45)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(-30, -30, 60, 60);
      }
    }
    // 車燈
    ctx.fillStyle = "#FFF8E1";
    ctx.fillRect(L / 2 - 3, -W / 2 + 2, 3, 4);
    ctx.fillRect(L / 2 - 3, W / 2 - 6, 3, 4);
    ctx.fillStyle = c.braking ? "#FF1744" : "#B71C1C";
    ctx.fillRect(-L / 2, -W / 2 + 2, 2.5, 4);
    ctx.fillRect(-L / 2, W / 2 - 6, 2.5, 4);
    if (c.braking) {
      ctx.fillStyle = "rgba(255,23,68,0.35)";
      ctx.beginPath();
      ctx.arc(-L / 2, -W / 2 + 4, 5, 0, Math.PI * 2);
      ctx.arc(-L / 2, W / 2 - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 駕駛座車門（左側）打開
  if (c.door > 0) {
    const hingeX = L * 0.2;
    const dl = L * 0.32;
    ctx.fillStyle = "#151515";
    ctx.fillRect(hingeX - dl, -W / 2, dl, 3);
    ctx.save();
    ctx.translate(hingeX, -W / 2);
    ctx.rotate(-c.door * 1.15);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(-dl, -4.5, dl, 4.5, 1.5);
    ctx.fill();
    ctx.strokeStyle = shade(body, -0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = glass;
    ctx.fillRect(-dl * 0.78, -3.8, dl * 0.45, 2);
    ctx.restore();
  }
  // 受損的刮痕
  if (c.hp < CAR_SPECS[c.kind].hp * 0.5) {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(L * 0.3, -W / 2 + 1);
    ctx.lineTo(L * 0.2, -W / 2 + 6);
    ctx.moveTo(-L * 0.1, W / 2 - 1);
    ctx.lineTo(-L * 0.2, W / 2 - 5);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- 人 ----------

const SKIN = "#F1C9A5";

interface PersonExtra {
  cap?: string;
  /** 出拳伸出去的程度 0～1 */
  punch?: number;
  gun?: boolean;
  wet?: boolean;
}

function drawPerson(ctx: Ctx, x: number, y: number, angle: number, shirt: string, hair: string, phase: number, moving: boolean, down: boolean, time: number, extra: PersonExtra = {}) {
  const { cap, punch = 0, gun = false, wet = false } = extra;
  if (wet) {
    // 頭上滴水
    ctx.fillStyle = "rgba(79,195,247,0.9)";
    for (let k = 0; k < 3; k++) {
      const t = (time * 1.6 + k / 3) % 1;
      ctx.beginPath();
      ctx.arc(x - 6 + k * 6, y - 10 + t * 8, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.save();
  ctx.translate(x, y);
  if (down) {
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(1, 2, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#37474F";
    ctx.fillRect(-11, -3, 7, 6);
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(8, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 頭上轉圈圈的小星星（暈頭轉向）
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#FFEB3B";
    for (let k = 0; k < 3; k++) {
      const a = time * 4 + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 9, -10 + Math.sin(a) * 3, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(2, 2, 6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // 腳
  const swing = moving ? Math.sin(phase) * 4 : 0;
  ctx.fillStyle = "#37474F";
  ctx.beginPath();
  ctx.ellipse(swing, -2.5, 2.5, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(-swing, 2.5, 2.5, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // 手（出拳時右手往前伸）
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(-swing * 0.8, -6, 1.8, 0, Math.PI * 2);
  if (punch <= 0 && !gun) ctx.arc(swing * 0.8, 6, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (punch > 0) {
    const fx = 3 + punch * 10;
    ctx.strokeStyle = shirt;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(fx - 2, 3);
    ctx.stroke();
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(fx, 3, 2.8, 0, Math.PI * 2);
    ctx.fill();
    if (punch > 0.8) {
      // 揮拳的速度線
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fx + 4, 0);
      ctx.lineTo(fx + 8, -1);
      ctx.moveTo(fx + 4, 3);
      ctx.lineTo(fx + 9, 3);
      ctx.moveTo(fx + 4, 6);
      ctx.lineTo(fx + 8, 7);
      ctx.stroke();
    }
  } else if (gun) {
    // 卡通水槍：橘色槍身、藍色水箱
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(6, 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FF9800";
    ctx.beginPath();
    ctx.roundRect(5, 2, 10, 4, 1.5);
    ctx.fill();
    ctx.fillStyle = "#29B6F6";
    ctx.beginPath();
    ctx.arc(9, 1.5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#E65100";
    ctx.fillRect(14.5, 3, 2, 2);
  }
  // 身體（肩膀）
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // 頭
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(1, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cap ?? hair;
  ctx.beginPath();
  ctx.arc(0, 0, 3.6, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(0.3, 0, 3.6, Math.PI * 1.5, Math.PI * 0.5, true);
  ctx.fill();
  if (cap) {
    // 帽簷
    ctx.fillRect(2.5, -2.5, 3, 5);
  }
  ctx.restore();
}

function drawPed(ctx: Ctx, p: Ped, time: number) {
  drawPerson(ctx, p.x, p.y, p.angle, p.shirt, p.hair, p.phase, p.state !== "down", p.state === "down", time, { wet: p.wet > 0 });
}

// ---------- 主畫面 ----------

export function drawGame(ctx: Ctx, s: GameState, cam: Camera, fx: Fx[], w: number, h: number, dpr: number, time: number): void {
  const scale = cameraScale(cam, w, h);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#2d3036";
  ctx.fillRect(0, 0, w, h);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (w / 2 - cam.x * scale), dpr * (h / 2 - cam.y * scale));

  const halfW = w / 2 / scale;
  const halfH = h / 2 / scale;
  const x0 = Math.max(0, Math.floor((cam.x - halfW) / TILE) - 1);
  const x1 = Math.min(MAP_N - 1, Math.floor((cam.x + halfW) / TILE) + 1);
  const y0 = Math.max(0, Math.floor((cam.y - halfH) / TILE) - 1);
  const y1 = Math.min(MAP_N - 1, Math.floor((cam.y + halfH) / TILE) + 1);
  drawGround(ctx, s, x0, y0, x1, y1);

  // 胎痕
  ctx.lineCap = "round";
  ctx.lineWidth = 3;
  for (const sk of s.skids) {
    const age = (s.tick - sk.tick) / 1200;
    if (age >= 1) continue;
    ctx.strokeStyle = `rgba(20,20,22,${0.45 * (1 - age)})`;
    ctx.beginPath();
    ctx.moveTo(sk.x1, sk.y1);
    ctx.lineTo(sk.x2, sk.y2);
    ctx.stroke();
  }

  const inView = (x: number, y: number, m = 60) => Math.abs(x - cam.x) < halfW + m && Math.abs(y - cam.y) < halfH + m;

  // 錢
  for (const cn of s.coins) {
    if (!inView(cn.x, cn.y)) continue;
    const bob = Math.sin(time * 4 + cn.id) * 2;
    const glow = ctx.createRadialGradient(cn.x, cn.y + bob, 0, cn.x, cn.y + bob, 16);
    glow.addColorStop(0, cn.value >= 50 ? "rgba(0,229,255,0.55)" : "rgba(255,214,0,0.5)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cn.x - 16, cn.y - 16 + bob, 32, 32);
    if (cn.value >= 50) {
      ctx.fillStyle = "#00E5FF";
      ctx.beginPath();
      ctx.moveTo(cn.x, cn.y - 9 + bob);
      ctx.lineTo(cn.x + 8, cn.y - 2 + bob);
      ctx.lineTo(cn.x, cn.y + 9 + bob);
      ctx.lineTo(cn.x - 8, cn.y - 2 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.moveTo(cn.x - 3, cn.y - 4 + bob);
      ctx.lineTo(cn.x, cn.y - 7 + bob);
      ctx.lineTo(cn.x + 1, cn.y - 3 + bob);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#FFC107";
      ctx.beginPath();
      ctx.arc(cn.x, cn.y + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FF8F00";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#7a4a00";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", cn.x, cn.y + bob + 0.5);
    }
  }

  for (const p of s.peds) if (inView(p.x, p.y)) drawPed(ctx, p, time);

  // 水槍的水
  for (const sh of s.shots) {
    ctx.strokeStyle = "rgba(129,212,250,0.6)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sh.x - sh.vx * 0.035, sh.y - sh.vy * 0.035);
    ctx.lineTo(sh.x, sh.y);
    ctx.stroke();
    ctx.fillStyle = "#4FC3F7";
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(sh.x - 1, sh.y - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const pl = s.player;
  const inT = pl.entering?.phase === "in" ? pl.entering.t / 12 : 0;
  if (pl.car === null && inT < 1) {
    if (!pl.entering) {
      // 自己腳下有一圈光，方便找到自己
      const pulse = (Math.sin(time * 5) + 1) / 2;
      ctx.strokeStyle = `rgba(0,230,118,${0.5 + pulse * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, 11 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1 - inT;
    const punch = pl.punch > 0 ? Math.sin(((16 - pl.punch) / 16) * Math.PI) : 0;
    drawPerson(ctx, pl.x, pl.y, pl.angle, "#00C853", "#3E2723", pl.phase, pl.moving, pl.down > 0, time, {
      cap: "#E53935",
      punch,
      gun: pl.gun > 0 && pl.punch === 0,
    });
    ctx.globalAlpha = 1;
  }

  for (const c of s.cars) if (inView(c.x, c.y)) drawCar(ctx, c, time);

  // 玩家坐的車頭上有個小箭頭
  const myCar = findCar(s, pl.car);
  if (myCar) {
    const bob = Math.sin(time * 5) * 2;
    ctx.fillStyle = "#00E676";
    ctx.beginPath();
    ctx.moveTo(myCar.x, myCar.y - 26 + bob);
    ctx.lineTo(myCar.x - 6, myCar.y - 34 + bob);
    ctx.lineTo(myCar.x + 6, myCar.y - 34 + bob);
    ctx.closePath();
    ctx.fill();
  }

  // 大樓：遠的先畫，近的蓋在上面
  const margin = 200;
  const visible = s.map.buildings.filter(
    (b) =>
      (b.x + b.w) * TILE > cam.x - halfW - margin &&
      b.x * TILE < cam.x + halfW + margin &&
      (b.y + b.h) * TILE > cam.y - halfH - margin &&
      b.y * TILE < cam.y + halfH + margin
  );
  const dist = (b: Building) => Math.hypot((b.x + b.w / 2) * TILE - cam.x, (b.y + b.h / 2) * TILE - cam.y);
  visible.sort((a, b) => dist(b) - dist(a));
  for (const b of visible) drawBuilding(ctx, b, cam, time);

  // 樹冠
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileAt(s.map, tx, ty) !== T.Tree) continue;
      const cx = (tx + 0.5) * TILE + (hash(tx, ty) - 0.5) * 6;
      const cy = (ty + 0.5) * TILE + (hash(ty, tx) - 0.5) * 6;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.arc(cx + 5, cy + 6, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2E7D32";
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#43A047";
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 4, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#66BB6A";
      ctx.beginPath();
      ctx.arc(cx - 7, cy - 7, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 特效：煙、火花、跳字
  for (const f of fx) {
    const a = f.life / f.max;
    if (f.kind === "smoke") {
      ctx.fillStyle = `rgba(90,90,90,${0.45 * a})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 6 + (1 - a) * 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.kind === "drop") {
      ctx.fillStyle = `rgba(79,195,247,${a})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.kind === "spark") {
      ctx.fillStyle = `rgba(255,${180 + Math.floor(a * 75)},60,${a})`;
      ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3);
    } else if (f.text) {
      ctx.fillStyle = f.color ?? "#FFEB3B";
      ctx.globalAlpha = a;
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }
}

/** 特效往前跑一格，順便讓壞掉的車冒煙 */
export function updateFx(fx: Fx[], s: GameState, dt: number): Fx[] {
  for (const c of s.cars) {
    const ratio = c.hp / CAR_SPECS[c.kind].hp;
    if (ratio < 0.4 && Math.random() < (c.wrecked ? 0.35 : 0.15)) {
      fx.push({ kind: "smoke", x: c.x + (Math.random() - 0.5) * 10, y: c.y + (Math.random() - 0.5) * 10, vx: 6, vy: -18, life: 1.2, max: 1.2 });
    }
  }
  for (const f of fx) {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.life -= dt;
  }
  const alive = fx.filter((f) => f.life > 0);
  return alive.length > 400 ? alive.slice(alive.length - 400) : alive;
}

// ---------- 小地圖 ----------

export function buildMinimap(s: GameState): HTMLCanvasElement {
  const px = 3;
  const c = document.createElement("canvas");
  c.width = MAP_N * px;
  c.height = MAP_N * px;
  const ctx = c.getContext("2d")!;
  for (let ty = 0; ty < MAP_N; ty++) {
    for (let tx = 0; tx < MAP_N; tx++) {
      const t = tileAt(s.map, tx, ty);
      ctx.fillStyle =
        t === T.Road ? "#55595f" : t === T.Sidewalk ? "#9e988c" : t === T.Grass || t === T.Tree ? "#5b9a43" : t === T.Parking ? "#6c7078" : "#2b2f36";
      ctx.fillRect(tx * px, ty * px, px, px);
    }
  }
  for (const b of s.map.buildings) {
    if (!b.police) continue;
    ctx.fillStyle = "#3D5AFE";
    ctx.fillRect(b.x * px, b.y * px, b.w * px, b.h * px);
  }
  return c;
}

export function drawMinimap(ctx: Ctx, s: GameState, img: HTMLCanvasElement, size: number, dpr: number, time: number): void {
  const px = img.width / MAP_N;
  const span = 44 * TILE; // 顯示範圍（世界像素）
  const pp = findCar(s, s.player.car) ?? s.player;
  const k = size / span;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#1b1e23";
  ctx.fillRect(0, 0, size, size);
  const sx = (pp.x - span / 2) / TILE;
  const sy = (pp.y - span / 2) / TILE;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx * px, sy * px, (span / TILE) * px, (span / TILE) * px, 0, 0, size, size);
  const toMap = (x: number, y: number) => [(x - pp.x) * k + size / 2, (y - pp.y) * k + size / 2];
  for (const cn of s.coins) {
    const [x, y] = toMap(cn.x, cn.y);
    ctx.fillStyle = cn.value >= 50 ? "#00E5FF" : "#FFD600";
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  const flash = Math.floor(time * 6) % 2 === 0;
  for (const c of s.cars) {
    if (c.driver !== "police" || c.wrecked) continue;
    const [x, y] = toMap(c.x, c.y);
    ctx.fillStyle = c.chase ? (flash ? "#FF1744" : "#2979FF") : "#90CAF9";
    ctx.beginPath();
    ctx.arc(x, y, c.chase ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // 自己：白色箭頭
  const a = s.player.car !== null ? (findCar(s, s.player.car)?.angle ?? 0) : s.player.angle;
  ctx.translate(size / 2, size / 2);
  ctx.rotate(a);
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#00C853";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.stroke();
}
