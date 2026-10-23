/**
 * 復古雷電純 canvas 繪圖（不含 React）。
 * canvas 本身就是 240×320，交給 CSS image-rendering: pixelated 放大；飛機與地形用 Kenney Pixel Shmup 素材（CC0）。
 */
import { H, W } from "@/lib/raiden/constants";
import type { EnemyKind } from "@/lib/raiden/constants";
import { ENEMIES, isBoss } from "@/lib/raiden/enemies";
import { BOSS_ENTER, pathPos } from "@/lib/raiden/paths";
import { BOMB_TICKS, findEnemy } from "@/lib/raiden/sim";
import type { Enemy, GameState, Item } from "@/lib/raiden/sim";
import { MAP_ROWS, TILE } from "@/lib/raiden/tilemap";
import { missileItemKind, weaponItemKind } from "@/lib/raiden/weapons";
import { mapCanvas, ship, silhouette, tile, tinted } from "./raidenSprites";
import type { Frame, Sprites } from "./raidenSprites";

type Ctx = CanvasRenderingContext2D;

/** 敵機用哪一架（ships.png 編號）；大魔王放大兩倍 */
const SHIP_OF: Partial<Record<EnemyKind, number>> = {
  dart: 10,
  fighter: 9,
  carrier: 17,
  gunship: 7,
  boss1: 2,
  boss2: 1,
  boss3: 15,
};
const PLAYER_SHIP = 0;
const TILE_TANK = 28;
const TILE_BOAT = 29;
const TILE_TURRET = 16;
const TILE_BARREL = 30;
const TILE_BULLET = 0;
const TILE_PLASMA = 2;
const TILE_MISSILE = 12;
const TILE_POWER = 25;
const BOOM_FRAMES = [4, 5, 6, 7, 8];

/** 武器球顏色（色相）：紅散彈、藍雷射（原色）、紫電漿 */
const WEAPON_HUE = { vulcan: 2, laser: -1, plasma: 285 } as const;
const OUTLINE = "#2B2D42";

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

/** 以 (x, y) 為中心畫一格圖；rot 為順時針弧度（0 = 原本朝上） */
function blit(ctx: Ctx, f: Frame, x: number, y: number, rot = 0, scale = 1, alpha = 1): void {
  const w = f.sw * scale;
  const h = f.sh * scale;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (rot === 0) {
    ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  } else {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(rot);
    ctx.drawImage(f.img, f.sx, f.sy, f.sw, f.sh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  if (alpha !== 1) ctx.globalAlpha = 1;
}

/** 旋轉角量化成 16 個方向，像素圖轉起來比較不會閃 */
const snap = (a: number) => Math.round(a / (Math.PI / 8)) * (Math.PI / 8);

// ───────── 背景與雲 ─────────

function drawBackground(ctx: Ctx, s: GameState, sp: Sprites): void {
  const map = mapCanvas(sp, s.def.terrain);
  const mapH = MAP_ROWS * TILE;
  const top = (((mapH - H - Math.round(s.scrollY)) % mapH) + mapH) % mapH;
  const first = Math.min(H, mapH - top);
  ctx.drawImage(map, 0, top, W, first, 0, 0, W, first);
  if (first < H) ctx.drawImage(map, 0, 0, W, H - first, 0, first, W, H - first);
  if (s.def.terrain === 1) {
    // 海面的小波光
    for (let k = 0; k < 14; k++) {
      const band = Math.floor((s.scrollY + k * 40) / 320);
      const x = hash(band, k) * W;
      const y = (k * 40 + s.scrollY) % 320;
      if (Math.floor(s.tick / 20 + k) % 3 !== 0) rect(ctx, "#FFFFFF", x, H - y, 3, 1);
    }
  }
}

const CLOUD_BAND = 160;

function drawClouds(ctx: Ctx, s: GameState): void {
  const scroll = s.scrollY * 1.8;
  const base = Math.floor(scroll / CLOUD_BAND);
  ctx.fillStyle = s.def.terrain === 2 ? "rgba(120,110,100,0.35)" : "rgba(255,255,255,0.55)";
  for (let i = -1; i <= H / CLOUD_BAND + 1; i++) {
    const b = base - i;
    if (hash(b, 90) < 0.45) continue;
    const cy = i * CLOUD_BAND + (scroll % CLOUD_BAND) + hash(b, 91) * 60;
    const cx = hash(b, 92) * W;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const r = 10 + hash(b, 100 + k) * 14;
      ctx.moveTo(cx + (k - 2) * 14 + r, cy + hash(b, 110 + k) * 10);
      ctx.arc(cx + (k - 2) * 14, cy + hash(b, 110 + k) * 10, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

// ───────── 敵人 ─────────

/** 飛機朝向：看路線前一刻往哪裡飛；停著時朝下 */
function heading(s: GameState, e: Enemy): number {
  const prev = pathPos(e.path, Math.max(0, e.age - 3), s.def.scroll);
  const dx = e.x - prev.x;
  const dy = e.y - prev.y;
  if (Math.hypot(dx, dy) < 0.5) return Math.PI;
  return snap(Math.atan2(dy, dx) + Math.PI / 2);
}

function flashing(s: GameState, e: Enemy): boolean {
  // 電漿光束每 tick 都在打，所以用一閃一閃的，不然會整隻變白
  return e.flash > 0 && Math.floor(s.tick / 2) % 2 === 0;
}

function drawGround(ctx: Ctx, s: GameState, sp: Sprites, e: Enemy): void {
  const white = flashing(s, e);
  if (e.kind === "tank") {
    const n = s.def.terrain === 1 ? TILE_BOAT : TILE_TANK;
    const f = tile(sp, n);
    const rot = snap(e.aim + Math.PI / 2);
    if (n === TILE_BOAT) {
      // 砲艇後面的浪花
      circle(ctx, "rgba(255,255,255,0.8)", e.x, e.y - 9, 3);
      circle(ctx, "rgba(255,255,255,0.5)", e.x, e.y - 13, 2);
      blit(ctx, f, e.x, e.y, 0);
    } else {
      blit(ctx, f, e.x, e.y, rot);
    }
    if (white) blit(ctx, silhouette(sp, `t${n}`, f, "#FFFFFF"), e.x, e.y, n === TILE_BOAT ? 0 : rot);
    if (n === TILE_BOAT) blit(ctx, tile(sp, TILE_BARREL), e.x, e.y, rot);
  } else {
    const base = tile(sp, TILE_TURRET);
    blit(ctx, base, e.x, e.y);
    if (white) blit(ctx, silhouette(sp, `t${TILE_TURRET}`, base, "#FFFFFF"), e.x, e.y);
    blit(ctx, tile(sp, TILE_BARREL), e.x + Math.cos(e.aim) * 3, e.y + Math.sin(e.aim) * 3, snap(e.aim + Math.PI / 2));
  }
}

function drawAir(ctx: Ctx, s: GameState, sp: Sprites, e: Enemy): void {
  const n = SHIP_OF[e.kind] ?? 9;
  const f = ship(sp, n);
  const boss = isBoss(e.kind);
  const scale = boss ? 2 : 1;
  const rot = boss ? Math.PI : heading(s, e);
  blit(ctx, f, e.x, e.y, rot, scale);
  if (flashing(s, e)) blit(ctx, silhouette(sp, `s${n}`, f, "#FFFFFF"), e.x, e.y, rot, scale, 0.85);
  if (!boss) return;
  // 大魔王：第二階段以後一閃一閃變紅；中間有發光的核心
  if (e.phase > 0 && Math.floor(s.tick / 10) % 2 === 0) blit(ctx, silhouette(sp, `s${n}`, f, "#FF1744"), e.x, e.y, rot, scale, 0.35);
  const pulse = 3 + Math.sin(s.tick * 0.2) * 1.5;
  if (e.kind === "boss3") {
    for (let k = 0; k < 4; k++) {
      const a = s.tick * 0.03 + (k * Math.PI) / 2;
      blit(ctx, tile(sp, TILE_TURRET), e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 18);
    }
    circle(ctx, OUTLINE, e.x, e.y + 2, pulse + 4);
    circle(ctx, "#FF1744", e.x, e.y + 2, pulse + 2);
    circle(ctx, "#FFCDD2", e.x, e.y + 2, pulse * 0.5);
  } else {
    circle(ctx, OUTLINE, e.x, e.y + 8, pulse + 2);
    circle(ctx, e.phase > 0 ? "#FF1744" : "#FFC107", e.x, e.y + 8, pulse);
  }
}

function drawShadow(ctx: Ctx, sp: Sprites, f: Frame, key: string, x: number, y: number, rot: number, scale: number, lift: number): void {
  blit(ctx, silhouette(sp, key, f, "#000000"), x + lift * 0.6, y + lift, rot, scale * 0.8, 0.25);
}

function drawBossBar(ctx: Ctx, s: GameState): void {
  const boss = s.enemies.find((e) => isBoss(e.kind) && e.hp > 0);
  if (!boss || boss.age < BOSS_ENTER) return;
  rect(ctx, OUTLINE, 18, 4, 204, 8);
  rect(ctx, "#5C1A1A", 20, 6, 200, 4);
  rect(ctx, "#FF1744", 20, 6, 200 * (boss.hp / boss.maxHp), 4);
  rect(ctx, "#FF8A80", 20, 6, 200 * (boss.hp / boss.maxHp), 1);
}

// ───────── 道具、子彈、玩家 ─────────

function badge(ctx: Ctx, x: number, y: number, fill: string): void {
  rect(ctx, OUTLINE, x - 7, y - 7, 14, 14);
  rect(ctx, OUTLINE, x - 8, y - 6, 16, 12);
  rect(ctx, fill, x - 6, y - 6, 12, 12);
  rect(ctx, "rgba(255,255,255,0.35)", x - 6, y - 6, 12, 2);
}

function drawItem(ctx: Ctx, sp: Sprites, it: Item, tick: number): void {
  const { x, y } = it;
  // 道具外圈的光暈，提醒可以撿
  circle(ctx, `rgba(255,255,255,${0.25 + 0.2 * Math.sin(tick * 0.2)})`, x, y, 10);
  switch (it.kind) {
    case "weapon": {
      const hue = WEAPON_HUE[weaponItemKind(it.age)];
      const f = tile(sp, TILE_POWER);
      blit(ctx, hue < 0 ? f : tinted(sp, `p`, f, hue), x, y);
      break;
    }
    case "missile": {
      const homing = missileItemKind(it.age) === "homing";
      badge(ctx, x, y, homing ? "#43A047" : "#FBC02D");
      blit(ctx, tile(sp, TILE_MISSILE), x, y, Math.PI / 4);
      break;
    }
    case "bomb":
      badge(ctx, x, y, "#FB8C00");
      circle(ctx, OUTLINE, x, y + 1, 4);
      rect(ctx, OUTLINE, x - 1, y - 5, 2, 3);
      rect(ctx, "#FFEB3B", x, y - 6, 1, 1);
      break;
    case "medal": {
      const w = Math.max(1, Math.abs(Math.cos(tick * 0.15)) * 5);
      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      ctx.ellipse(x, y, w + 1, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFC107";
      ctx.beginPath();
      ctx.ellipse(x, y, w, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      rect(ctx, "#FFF59D", x - w * 0.4, y - 3, Math.max(1, w * 0.5), 2);
      break;
    }
    case "life":
      badge(ctx, x, y, "#E53935");
      break;
  }
}

function drawPlayer(ctx: Ctx, s: GameState, sp: Sprites): void {
  const p = s.player;
  if (!p.alive) return;
  if (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) return;
  const flame = Math.floor(s.tick / 2) % 2 === 0;
  rect(ctx, flame ? "#FF9800" : "#FFEB3B", p.x - 2, p.y + 10, 4, 3 + (s.tick % 3));
  rect(ctx, "#FFF59D", p.x - 1, p.y + 10, 2, 2);
  blit(ctx, ship(sp, PLAYER_SHIP), p.x, p.y);
}

function drawPlasma(ctx: Ctx, s: GameState): void {
  const target = findEnemy(s, s.plasmaTarget);
  const p = s.player;
  if (!target || !p.alive) return;
  const sx = p.x;
  const sy = p.y - 12;
  const mx = (sx + target.x) / 2 + Math.sin(s.tick * 0.3) * 14;
  const my = Math.min(sy, target.y) - 20;
  const w = 1 + Math.ceil(s.weapon.level / 3);
  for (const [color, lw] of [
    ["#4A148C", w + 3],
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

function drawShots(ctx: Ctx, s: GameState, sp: Sprites): void {
  for (const b of s.shots) {
    if (b.kind === "vulcan") {
      blit(ctx, tile(sp, TILE_BULLET), b.x, b.y, snap(Math.atan2(b.vy, b.vx) + Math.PI / 2));
    } else if (b.kind === "laser") {
      rect(ctx, "rgba(66,165,245,0.45)", b.x - b.w / 2 - 1, b.y - b.h / 2, b.w + 2, b.h);
      rect(ctx, "#1E88E5", b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      rect(ctx, "#B3E5FC", b.x - b.w / 2 + 1, b.y - b.h / 2, Math.max(1, b.w - 2), b.h);
      rect(ctx, "#FFFFFF", b.x - 0.5, b.y - b.h / 2, 1, b.h);
    } else {
      blit(ctx, tinted(sp, "plasma", tile(sp, TILE_PLASMA), 285), b.x, b.y);
    }
  }
  for (const m of s.missiles) {
    const f = tile(sp, TILE_MISSILE);
    const rot = snap(Math.atan2(m.vy, m.vx) + Math.PI / 2);
    rect(ctx, Math.floor(s.tick / 2) % 2 ? "#FF9800" : "#FFEB3B", m.x - 1 - m.vx, m.y - 1 - m.vy, 2, 2);
    blit(ctx, m.kind === "homing" ? tinted(sp, "homing", f, 110) : f, m.x, m.y, rot);
  }
}

// ───────── 主畫面 ─────────

export function drawGame(ctx: Ctx, s: GameState, sp: Sprites): void {
  ctx.imageSmoothingEnabled = false;
  ctx.lineCap = "butt";
  drawBackground(ctx, s, sp);

  // 地面：戰車、砲台、道具
  for (const e of s.enemies) if (e.hp > 0 && ENEMIES[e.kind].ground) drawGround(ctx, s, sp, e);

  // 空中單位的影子（落在地面上、比本體小一點）
  for (const e of s.enemies) {
    if (e.hp <= 0 || ENEMIES[e.kind].ground) continue;
    const n = SHIP_OF[e.kind] ?? 9;
    const boss = isBoss(e.kind);
    drawShadow(ctx, sp, ship(sp, n), `s${n}`, e.x, e.y, boss ? Math.PI : heading(s, e), boss ? 2 : 1, boss ? 26 : 16);
  }
  if (s.player.alive) drawShadow(ctx, sp, ship(sp, PLAYER_SHIP), `s${PLAYER_SHIP}`, s.player.x, s.player.y, 0, 1, 18);

  drawClouds(ctx, s);
  for (const it of s.items) drawItem(ctx, sp, it, s.tick);
  drawShots(ctx, s, sp);
  drawPlasma(ctx, s);

  for (const e of s.enemies) if (e.hp > 0 && !ENEMIES[e.kind].ground) drawAir(ctx, s, sp, e);
  drawPlayer(ctx, s, sp);

  for (const b of s.booms) {
    const k = b.age / b.life;
    const frame = BOOM_FRAMES[Math.min(BOOM_FRAMES.length - 1, Math.floor(k * BOOM_FRAMES.length))];
    const scale = b.size >= 24 ? 3 : b.size >= 12 ? 2 : 1;
    blit(ctx, tile(sp, frame), b.x, b.y, 0, scale, k > 0.8 ? 0.6 : 1);
  }

  for (const b of s.ebullets) {
    circle(ctx, OUTLINE, b.x, b.y, b.r + 1.5);
    circle(ctx, "#FF4D8D", b.x, b.y, b.r + 0.5);
    circle(ctx, "#FFE0EC", b.x - 0.5, b.y - 0.5, b.r - 1.2);
  }

  if (s.bomb) {
    const k = (BOMB_TICKS - s.bomb.ticks) / BOMB_TICKS;
    ctx.fillStyle = `rgba(255,220,120,${Math.max(0, 0.55 - k)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - k)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(s.bomb.x, s.bomb.y, k * 360, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawBossBar(ctx, s);
}
