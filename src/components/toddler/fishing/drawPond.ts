/**
 * 釣魚池的 Canvas 繪圖：場景（草地、池塘、天氣）、特效、釣竿。
 */

import { effectProgress, type Effect, type WeatherParticle } from "@/lib/fishing/effects";
import type { Scene } from "@/lib/fishing/scenes";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function drawEmoji(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  x: number,
  y: number,
  size: number,
  flip: boolean,
  glow?: string
) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 22;
  }
  ctx.fillStyle = "#000"; // 彩色 emoji 仍受 fillStyle 透明度影響，這裡重設為不透明
  ctx.font = `${size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 0, 0);
  ctx.restore();
}

/** 草地 + 池塘（水、波紋、石頭、水草、月亮倒影、薄冰），畫完後池塘仍是 clip 狀態，要呼叫 endPond */
export function beginPond(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pond: Rect,
  hudHeight: number,
  scene: Scene,
  time: number
) {
  // 草地
  ctx.fillStyle = scene.grass;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = scene.grassDark;
  for (let i = 0; i < 14; i++) {
    const gx = ((i * 137) % w) + 10;
    const gy = h - hudHeight + 20 + ((i * 53) % (hudHeight - 40));
    ctx.beginPath();
    ctx.ellipse(gx, gy, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 池塘
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pond.x, pond.y, pond.w, pond.h, 40);
  ctx.clip();
  const water = ctx.createLinearGradient(0, pond.y, 0, pond.y + pond.h);
  water.addColorStop(0, scene.waterTop);
  water.addColorStop(1, scene.waterBottom);
  ctx.fillStyle = water;
  ctx.fillRect(pond.x, pond.y, pond.w, pond.h);

  // 月亮倒影：一顆淡黃的圓，被水波切成幾條
  if (scene.moon) {
    const mx = pond.x + pond.w * 0.35;
    const my = pond.y + 110;
    ctx.fillStyle = "rgba(255,249,196,0.85)";
    for (let i = -3; i <= 3; i++) {
      const yy = my + i * 7;
      const half = Math.sqrt(Math.max(0, 26 * 26 - (i * 7) ** 2));
      const shift = Math.sin(time * 2 + i) * 4;
      ctx.fillRect(mx - half + shift, yy - 2.5, half * 2, 5);
    }
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 12; i++) {
      const sx = pond.x + ((i * 97) % pond.w);
      const sy = pond.y + 20 + ((i * 61) % (pond.h * 0.45));
      const a = 0.3 + 0.3 * Math.sin(time * 3 + i);
      ctx.globalAlpha = a;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // 波紋
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  for (let row = 0; row < 6; row++) {
    const y = pond.y + 30 + row * (pond.h / 6);
    ctx.beginPath();
    for (let x = pond.x; x <= pond.x + pond.w; x += 8) {
      const yy = y + Math.sin(x / 28 + time * 1.5 + row) * 4;
      if (x === pond.x) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  // 池底石頭與水草
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let i = 0; i < 6; i++) {
    const sx = pond.x + 30 + ((i * 173) % (pond.w - 60));
    ctx.beginPath();
    ctx.ellipse(sx, pond.y + pond.h - 10, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(46,125,50,0.55)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const sx = pond.x + 60 + ((i * 211) % (pond.w - 120));
    ctx.beginPath();
    ctx.moveTo(sx, pond.y + pond.h);
    ctx.quadraticCurveTo(
      sx + Math.sin(time * 1.2 + i) * 12,
      pond.y + pond.h - 40,
      sx + Math.sin(time * 1.2 + i) * 20,
      pond.y + pond.h - 70
    );
    ctx.stroke();
  }
}

/** 結束池塘 clip，畫池邊的薄冰與荷葉 */
export function endPond(ctx: CanvasRenderingContext2D, pond: Rect, scene: Scene) {
  ctx.restore();

  if (scene.ice) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(pond.x + 3, pond.y + 3, pond.w - 6, pond.h - 6, 38);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = scene.lilyPad;
  ctx.beginPath();
  ctx.ellipse(pond.x + 60, pond.y + 40, 26, 16, 0, 0, Math.PI * 2);
  ctx.ellipse(pond.x + pond.w - 80, pond.y + 60, 30, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  if (scene.id === "spring") {
    drawEmoji(ctx, "🌸", pond.x + 66, pond.y + 36, 20, false);
  } else if (scene.id === "autumn") {
    drawEmoji(ctx, "🍂", pond.x + pond.w - 76, pond.y + 56, 22, false);
  } else if (scene.id === "night") {
    drawEmoji(ctx, "🐸", pond.x + pond.w - 80, pond.y + 54, 24, false);
  }
}

/** 天氣粒子（畫在最上層） */
export function drawWeather(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  list: WeatherParticle[]
) {
  const kind = scene.weather;
  if (kind === "none") return;
  ctx.save();
  if (kind === "rain") {
    ctx.strokeStyle = "rgba(225,245,254,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const p of list) {
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.size * 0.08, p.y - p.size);
    }
    ctx.stroke();
  } else if (kind === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const p of list) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "petals") {
    ctx.fillStyle = "rgba(248,187,208,0.95)";
    for (const p of list) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (kind === "leaves") {
    list.forEach((p, i) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(p.rot) * 0.8);
      drawEmoji(ctx, i % 2 === 0 ? "🍁" : "🍂", 0, 0, p.size, false);
      ctx.restore();
    });
  } else if (kind === "fireflies") {
    for (const p of list) {
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(p.phase * 2.2 + p.rot * 3));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6);
      g.addColorStop(0, `rgba(238,255,65,${a})`);
      g.addColorStop(1, "rgba(238,255,65,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.3;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawEffects(ctx: CanvasRenderingContext2D, effects: Effect[]) {
  for (const e of effects) {
    const p = effectProgress(e);
    ctx.save();
    if (e.kind === "ripple") {
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const r = 4 + e.size * p;
      ctx.ellipse(e.x, e.y, r, r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.kind === "drop") {
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === "bubble") {
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - p)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.kind === "ink") {
      ctx.globalAlpha = 0.55 * (1 - p);
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * (1 + p * 1.2), 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === "sparkle") {
      ctx.globalAlpha = Math.sin(p * Math.PI);
      ctx.fillStyle = e.color;
      drawStar(ctx, e.x, e.y, e.size);
    } else if (e.kind === "confetti") {
      ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1;
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot);
      ctx.fillStyle = e.color;
      ctx.fillRect(-e.size / 2, -e.size / 4, e.size, e.size / 2);
    } else if (e.kind === "exclaim") {
      // 先彈大再縮回，最後淡出
      const pop = p < 0.15 ? p / 0.15 : 1 + Math.sin(Math.min(1, (p - 0.15) / 0.2) * Math.PI) * 0.15;
      ctx.globalAlpha = p > 0.75 ? (1 - p) / 0.25 : 1;
      ctx.translate(e.x, e.y - p * 10);
      ctx.scale(pop, pop);
      ctx.font = `900 ${e.size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#FFFFFF";
      ctx.strokeText("！", 0, 0);
      ctx.fillStyle = e.color;
      ctx.fillText("！", 0, 0);
    }
    ctx.restore();
  }
}

/**
 * 釣竿：bend（0～1）越大，竿尖越往 pull 的方向彎。回傳實際的竿尖位置（釣線從這裡出去）。
 */
export function drawRod(
  ctx: CanvasRenderingContext2D,
  base: { x: number; y: number },
  tip: { x: number; y: number },
  pull: { x: number; y: number },
  bend: number
) {
  const dx = pull.x - tip.x;
  const dy = pull.y - tip.y;
  const d = Math.hypot(dx, dy) || 1;
  const bent = { x: tip.x + (dx / d) * bend * 34, y: tip.y + (dy / d) * bend * 34 };
  const ctrl = { x: base.x + (tip.x - base.x) * 0.6, y: base.y + (tip.y - base.y) * 0.6 };

  ctx.save();
  ctx.strokeStyle = "#8D6E63";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.quadraticCurveTo(ctrl.x, ctrl.y, bent.x, bent.y);
  ctx.stroke();
  ctx.strokeStyle = "#5D4037";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(base.x + 22, base.y - 40);
  ctx.stroke();
  ctx.restore();
  return bent;
}

/** 整個畫面蓋一層顏色（夜晚、黃昏） */
export function drawTint(ctx: CanvasRenderingContext2D, w: number, h: number, scene: Scene) {
  if (!scene.tint) return;
  ctx.fillStyle = scene.tint;
  ctx.fillRect(0, 0, w, h);
}
