/**
 * 復古雷電純 canvas 繪圖（不含 React）。
 * canvas 本身就是 240×320，交給 CSS image-rendering: pixelated 放大，整個畫面自然是像素風。
 */
import { H, W } from "@/lib/raiden/constants";
import { ENEMIES, isBoss } from "@/lib/raiden/enemies";
import { BOSS_ENTER } from "@/lib/raiden/paths";
import { BOMB_TICKS, findEnemy } from "@/lib/raiden/sim";
import type { Enemy, GameState, Item } from "@/lib/raiden/sim";
import { missileItemKind, weaponItemKind } from "@/lib/raiden/weapons";

type Ctx = CanvasRenderingContext2D;

const WEAPON_COLOR = { vulcan: "#E53935", laser: "#1E88E5", plasma: "#8E24AA" } as const;

/** 0～1 的固定雜湊（背景隨機擺設用） */
function hash(a: number, b: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rect(ctx: Ctx, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function circle(ctx: Ctx, color: string, x: number, y: number, r: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx: Ctx, color: string, pts: number[]): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

// ───────── 背景 ─────────

const BAND = 40;

function drawBackground(ctx: Ctx, s: GameState): void {
  const terrain = s.def.terrain;
  ctx.fillStyle = ["#4C8C3A", "#1D4F91", "#555B63"][terrain];
  ctx.fillRect(0, 0, W, H);
  const off = s.scrollY % BAND;
  const base = Math.floor(s.scrollY / BAND);
  for (let i = -2; i <= H / BAND + 1; i++) {
    const b = base - i;
    const y = i * BAND + off;
    if (terrain === 0) drawGrassBand(ctx, b, y);
    else if (terrain === 1) drawSeaBand(ctx, b, y, s.tick);
    else drawFortBand(ctx, b, y, s.tick);
  }
}

function drawGrassBand(ctx: Ctx, b: number, y: number): void {
  if (hash(b, 1) < 0.5) rect(ctx, hash(b, 2) < 0.5 ? "#5FA347" : "#3E7530", hash(b, 3) * 180, y, 40 + hash(b, 4) * 60, BAND);
  if (b % 9 === 0) {
    rect(ctx, "#B59A6A", 0, y + 14, W, 12);
    rect(ctx, "#9C8357", 0, y + 14, W, 2);
  }
  if (b % 9 !== 0 && hash(b, 5) < 0.3) {
    const hx = 10 + hash(b, 6) * 200;
    rect(ctx, "#8D6E63", hx, y + 12, 16, 12);
    rect(ctx, "#C62828", hx - 2, y + 8, 20, 6);
  }
  const trees = Math.floor(hash(b, 7) * 6);
  for (let k = 0; k < trees; k++) {
    const tx = hash(b, 10 + k) * W;
    const ty = y + hash(b, 20 + k) * BAND;
    const r = 4 + hash(b, 30 + k) * 3;
    circle(ctx, "#2D5E23", tx, ty, r);
    circle(ctx, "#3F7D2E", tx - 1, ty - 1, r * 0.6);
  }
}

function drawSeaBand(ctx: Ctx, b: number, y: number, tick: number): void {
  for (let k = 0; k < 5; k++) {
    const wx = (hash(b, 40 + k) * W + Math.sin(tick / 40 + k) * 3) | 0;
    rect(ctx, "#3D74B8", wx, y + hash(b, 50 + k) * BAND, 8, 1);
  }
  if (hash(b, 41) < 0.18) {
    const ix = hash(b, 42) * W;
    const r = 18 + hash(b, 43) * 22;
    circle(ctx, "#D9C27A", ix, y + BAND / 2, r);
    circle(ctx, "#4C8C3A", ix, y + BAND / 2, r * 0.72);
    circle(ctx, "#2D5E23", ix + r * 0.2, y + BAND / 2 - r * 0.1, r * 0.3);
  }
}

function drawFortBand(ctx: Ctx, b: number, y: number, tick: number): void {
  rect(ctx, "#474C53", 0, y, W, 1);
  for (let x = 0; x < W; x += 60) rect(ctx, "#474C53", x, y, 1, BAND);
  for (let x = 4; x < W; x += 60) {
    rect(ctx, "#6C727B", x, y + 4, 2, 2);
    rect(ctx, "#6C727B", x + 50, y + 34, 2, 2);
  }
  if (b % 7 === 0) {
    for (let x = 0; x < W; x += 12) {
      rect(ctx, "#F9A825", x, y + 16, 6, 6);
      rect(ctx, "#212121", x + 6, y + 16, 6, 6);
    }
  } else if (hash(b, 60) < 0.4) {
    rect(ctx, "#3B4046", hash(b, 61) * 160, y + 8, 60 + hash(b, 62) * 30, 24);
  }
  if (hash(b, 63) < 0.5 && Math.floor(tick / 30 + b) % 2 === 0) rect(ctx, "#FF5252", hash(b, 64) * W, y + 20, 2, 2);
}

// ───────── 敵人 ─────────

function drawEnemy(ctx: Ctx, s: GameState, e: Enemy): void {
  // 受傷時閃白；電漿光束每 tick 都在打，所以用一閃一閃的，不然會整隻變白
  const f = e.flash > 0 && Math.floor(s.tick / 2) % 2 === 0;
  const c = (color: string) => (f ? "#FFFFFF" : color);
  const { x, y } = e;
  const t = s.tick;
  switch (e.kind) {
    case "dart":
      poly(ctx, c("#1B5E20"), [x, y + 6, x - 6, y - 5, x, y - 2, x + 6, y - 5]);
      poly(ctx, c("#43A047"), [x, y + 4, x - 4, y - 3, x, y - 1, x + 4, y - 3]);
      break;
    case "fighter":
      poly(ctx, c("#FF8F00"), [x - 8, y - 2, x + 8, y - 2, x + 3, y + 3, x - 3, y + 3]);
      rect(ctx, c("#9EA7B0"), x - 2, y - 7, 4, 15);
      rect(ctx, c("#5D6670"), x - 4, y - 7, 8, 2);
      rect(ctx, c("#4FC3F7"), x - 1, y + 2, 2, 3);
      break;
    case "carrier": {
      rect(ctx, c("#5B6630"), x - 12, y - 2, 24, 5);
      rect(ctx, c("#7D8A3C"), x - 4, y - 9, 8, 18);
      rect(ctx, c("#5B6630"), x - 7, y - 9, 14, 3);
      const spin = Math.floor(t / 2) % 2 === 0;
      for (const px of [x - 9, x + 9]) rect(ctx, "#DDDDDD", spin ? px - 4 : px - 1, y + 3, spin ? 8 : 2, 1);
      rect(ctx, c("#FFD54F"), x - 1, y - 1, 2, 2);
      break;
    }
    case "tank":
      if (s.def.terrain === 1) {
        // 海上關卡：砲艇
        rect(ctx, "#E3F2FD", x - 2, y - 12, 4, 4);
        poly(ctx, c("#8A8F96"), [x, y + 9, x - 5, y + 3, x - 5, y - 8, x + 5, y - 8, x + 5, y + 3]);
        rect(ctx, c("#5F656C"), x - 3, y - 4, 6, 6);
      } else {
        rect(ctx, c("#2E2E1E"), x - 7, y - 7, 3, 14);
        rect(ctx, c("#2E2E1E"), x + 4, y - 7, 3, 14);
        rect(ctx, c("#6B6B3A"), x - 4, y - 6, 8, 12);
      }
      drawBarrel(ctx, c("#3A3A26"), x, y, e.aim, 8, 2);
      circle(ctx, c("#8A8A4E"), x, y, 3);
      break;
    case "turret":
      poly(ctx, c("#5F656C"), [x - 4, y - 8, x + 4, y - 8, x + 8, y - 4, x + 8, y + 4, x + 4, y + 8, x - 4, y + 8, x - 8, y + 4, x - 8, y - 4]);
      circle(ctx, c("#8A9099"), x, y, 5);
      drawBarrel(ctx, c("#2F3439"), x - 2 * Math.sin(e.aim), y + 2 * Math.cos(e.aim), e.aim, 10, 2);
      drawBarrel(ctx, c("#2F3439"), x + 2 * Math.sin(e.aim), y - 2 * Math.cos(e.aim), e.aim, 10, 2);
      break;
    case "gunship": {
      rect(ctx, c("#3E4B57"), x - 15, y - 3, 30, 6);
      poly(ctx, c("#5D6D7E"), [x - 7, y - 12, x + 7, y - 12, x + 9, y + 6, x, y + 13, x - 9, y + 6]);
      rect(ctx, c("#81D4FA"), x - 3, y + 4, 6, 4);
      rect(ctx, c("#212121"), x - 14, y + 2, 3, 5);
      rect(ctx, c("#212121"), x + 11, y + 2, 3, 5);
      const a = t * 0.5;
      ctx.strokeStyle = "rgba(230,230,230,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const k of [0, Math.PI / 2]) {
        ctx.moveTo(x + Math.cos(a + k) * 16, y - 2 + Math.sin(a + k) * 16);
        ctx.lineTo(x - Math.cos(a + k) * 16, y - 2 - Math.sin(a + k) * 16);
      }
      ctx.stroke();
      break;
    }
    case "boss1":
    case "boss2":
    case "boss3":
      drawBoss(ctx, s, e, c);
      break;
  }
}

function drawBarrel(ctx: Ctx, color: string, x: number, y: number, a: number, len: number, w: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
  ctx.stroke();
}

function drawBoss(ctx: Ctx, s: GameState, e: Enemy, c: (color: string) => string): void {
  const { x, y } = e;
  const t = s.tick;
  const angry = e.phase > 0 && Math.floor(t / 10) % 2 === 0;
  if (e.kind === "boss1") {
    // 鋼鐵巨蟹：雙履帶大戰車
    for (const side of [-1, 1]) {
      rect(ctx, c("#2B2B2B"), x + side * 26 - 6, y - 22, 12, 44);
      for (let k = 0; k < 6; k++) rect(ctx, c("#555"), x + side * 26 - 6, y - 22 + ((k * 8 + t) % 44), 12, 2);
      poly(ctx, c("#6D4C41"), [x + side * 20, y + 14, x + side * 32, y + 26, x + side * 24, y + 28]);
    }
    rect(ctx, c("#8D6E63"), x - 20, y - 18, 40, 36);
    rect(ctx, c("#6D4C41"), x - 20, y + 12, 40, 6);
    circle(ctx, c("#A1887F"), x, y, 12);
    circle(ctx, c(angry ? "#FF1744" : "#5D4037"), x, y, 5);
    for (const ox of [-6, 6]) rect(ctx, c("#3E2723"), x + ox - 1, y + 8, 3, 14);
  } else if (e.kind === "boss2") {
    // 空中堡壘：大翅膀轟炸機
    poly(ctx, c("#455A64"), [x - 42, y - 2, x + 42, y - 2, x + 34, y + 10, x - 34, y + 10]);
    poly(ctx, c("#607D8B"), [x - 10, y - 22, x + 10, y - 22, x + 12, y + 18, x, y + 24, x - 12, y + 18]);
    for (const ox of [-30, -18, 18, 30]) {
      rect(ctx, c("#37474F"), x + ox - 3, y - 6, 6, 14);
      rect(ctx, Math.floor(t / 3) % 2 ? "#FF9800" : "#FFC107", x + ox - 2, y - 10, 4, 4);
    }
    rect(ctx, c(angry ? "#FF1744" : "#81D4FA"), x - 3, y + 8, 6, 6);
  } else {
    // 最終核心：六角形要塞，外圈會轉
    const pts: number[] = [];
    for (let k = 0; k < 6; k++) pts.push(x + Math.cos(k * (Math.PI / 3)) * 34, y + Math.sin(k * (Math.PI / 3)) * 30);
    poly(ctx, c("#263238"), pts);
    const a = t * 0.02;
    for (let k = 0; k < 8; k++) {
      const ang = a + (k * Math.PI) / 4;
      circle(ctx, c("#546E7A"), x + Math.cos(ang) * 24, y + Math.sin(ang) * 21, 4);
    }
    const pulse = 8 + Math.sin(t * 0.15) * 2;
    circle(ctx, c("#B71C1C"), x, y, pulse + 3);
    circle(ctx, c(angry ? "#FFFFFF" : "#FF1744"), x, y, pulse);
  }
}

function drawBossBar(ctx: Ctx, s: GameState): void {
  const boss = s.enemies.find((e) => isBoss(e.kind) && e.hp > 0);
  if (!boss || boss.age < BOSS_ENTER) return;
  rect(ctx, "rgba(0,0,0,0.5)", 19, 5, 202, 6);
  rect(ctx, "#FF1744", 20, 6, 200 * (boss.hp / boss.maxHp), 4);
}

// ───────── 道具、子彈、玩家 ─────────

function drawItem(ctx: Ctx, it: Item, tick: number): void {
  const { x, y } = it;
  switch (it.kind) {
    case "weapon": {
      const color = WEAPON_COLOR[weaponItemKind(it.age)];
      circle(ctx, "#FFFFFF", x, y, 7);
      circle(ctx, color, x, y, 6);
      poly(ctx, "#FFFFFF", [x, y - 3, x + 3, y, x, y + 3, x - 3, y]);
      break;
    }
    case "missile": {
      const homing = missileItemKind(it.age) === "homing";
      rect(ctx, "#FFFFFF", x - 7, y - 5, 14, 10);
      rect(ctx, homing ? "#43A047" : "#FBC02D", x - 6, y - 4, 12, 8);
      poly(ctx, "#FFFFFF", [x, y - 3, x + 3, y + 2, x - 3, y + 2]);
      break;
    }
    case "bomb":
      circle(ctx, "#FFFFFF", x, y, 7);
      circle(ctx, "#FB8C00", x, y, 6);
      circle(ctx, "#3E2723", x, y + 1, 3);
      rect(ctx, "#3E2723", x - 1, y - 5, 2, 3);
      break;
    case "medal": {
      const w = Math.max(1, Math.abs(Math.cos(tick * 0.15)) * 5);
      ctx.fillStyle = "#FFC107";
      ctx.beginPath();
      ctx.ellipse(x, y, w, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      rect(ctx, "#FFF59D", x - w * 0.4, y - 3, Math.max(1, w * 0.5), 2);
      break;
    }
    case "life":
      circle(ctx, "#FFFFFF", x, y, 7);
      circle(ctx, "#E53935", x, y, 6);
      break;
  }
}

function drawPlayer(ctx: Ctx, s: GameState): void {
  const p = s.player;
  if (!p.alive) return;
  if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) return;
  const { x, y } = p;
  rect(ctx, Math.floor(s.tick / 2) % 2 ? "#FF9800" : "#FFEB3B", x - 1, y + 8, 2, 3 + (s.tick % 3));
  poly(ctx, "#B71C1C", [x - 9, y + 4, x, y - 3, x + 9, y + 4, x + 9, y + 6, x - 9, y + 6]);
  poly(ctx, "#E53935", [x - 8, y + 4, x, y - 2, x + 8, y + 4]);
  poly(ctx, "#ECEFF1", [x, y - 10, x + 3, y - 3, x + 3, y + 8, x - 3, y + 8, x - 3, y - 3]);
  rect(ctx, "#E53935", x - 1, y - 2, 2, 8);
  rect(ctx, "#29B6F6", x - 1, y - 6, 2, 3);
  rect(ctx, "#B71C1C", x - 5, y + 6, 3, 3);
  rect(ctx, "#B71C1C", x + 2, y + 6, 3, 3);
}

function drawPlasma(ctx: Ctx, s: GameState): void {
  const target = findEnemy(s, s.plasmaTarget);
  const p = s.player;
  if (!target || !p.alive) return;
  const sx = p.x;
  const sy = p.y - 10;
  const mx = (sx + target.x) / 2 + Math.sin(s.tick * 0.3) * 14;
  const my = Math.min(sy, target.y) - 20;
  const w = 1 + Math.ceil(s.weapon.level / 3);
  for (const [color, lw] of [
    ["#6A1B9A", w + 2],
    ["#CE93D8", w],
    ["#FFFFFF", 1],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, target.x, target.y);
    ctx.stroke();
  }
  circle(ctx, "#E1BEE7", target.x, target.y, 3 + (s.tick % 3));
}

export function drawGame(ctx: Ctx, s: GameState): void {
  ctx.imageSmoothingEnabled = false;
  ctx.lineCap = "butt";
  drawBackground(ctx, s);

  // 地面單位在下層
  for (const e of s.enemies) if (e.hp > 0 && ENEMIES[e.kind].ground) drawEnemy(ctx, s, e);
  for (const it of s.items) drawItem(ctx, it, s.tick);

  for (const b of s.shots) {
    if (b.kind === "vulcan") {
      rect(ctx, "#FF5A3C", b.x - 1.5, b.y - 4, 3, 8);
      rect(ctx, "#FFD08A", b.x - 0.5, b.y - 3, 1, 6);
    } else if (b.kind === "laser") {
      rect(ctx, "#1565C0", b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      rect(ctx, "#81D4FA", b.x - b.w / 2 + 1, b.y - b.h / 2, Math.max(1, b.w - 2), b.h);
      rect(ctx, "#FFFFFF", b.x - 0.5, b.y - b.h / 2, 1, b.h);
    } else {
      rect(ctx, "#AB47BC", b.x - 2, b.y - 6, 4, 12);
      rect(ctx, "#F3E5F5", b.x - 0.5, b.y - 5, 1, 10);
    }
  }
  for (const m of s.missiles) {
    rect(ctx, "#FF9800", m.x - 1, m.y + 3, 2, 2);
    rect(ctx, m.kind === "homing" ? "#66BB6A" : "#FDD835", m.x - 1.5, m.y - 4, 3, 7);
  }
  drawPlasma(ctx, s);

  for (const e of s.enemies) if (e.hp > 0 && !ENEMIES[e.kind].ground) drawEnemy(ctx, s, e);
  drawPlayer(ctx, s);

  for (const b of s.booms) {
    const k = b.age / b.life;
    const r = b.size * (0.35 + k * 0.65);
    if (k < 0.6) {
      circle(ctx, "#FF6D00", b.x, b.y, r);
      circle(ctx, "#FFEB3B", b.x, b.y, r * (0.7 - k));
    } else {
      circle(ctx, "rgba(90,90,90,0.7)", b.x, b.y, r);
    }
  }

  for (const b of s.ebullets) {
    circle(ctx, "#FF4081", b.x, b.y, b.r + 0.5);
    circle(ctx, "#FFE0B2", b.x, b.y, b.r - 1);
  }

  if (s.bomb) {
    const k = (BOMB_TICKS - s.bomb.ticks) / BOMB_TICKS;
    ctx.fillStyle = `rgba(255,200,80,${Math.max(0, 0.5 - k)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - k)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(s.bomb.x, s.bomb.y, k * 360, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawBossBar(ctx, s);
}

