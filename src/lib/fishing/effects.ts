/**
 * 釣魚池的小特效（水花、漣漪、泡泡、墨汁、閃光、彩帶、驚嘆號）與天氣粒子。
 * 座標都是畫布上的 CSS 像素；只有資料和更新，畫在元件裡。
 */

import type { WeatherKind } from "./scenes.ts";

export type EffectKind = "ripple" | "drop" | "bubble" | "ink" | "sparkle" | "confetti" | "exclaim";

export interface Effect {
  kind: EffectKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 大小（半徑或字級） */
  size: number;
  age: number;
  life: number;
  rot: number;
  vr: number;
  color: string;
}

const CONFETTI_COLORS = ["#FF69B4", "#FFD54F", "#4FC3F7", "#81C784", "#FF8A65", "#BA68C8"];
const GRAVITY = 900;

function make(kind: EffectKind, x: number, y: number, partial: Partial<Effect> = {}): Effect {
  return { kind, x, y, vx: 0, vy: 0, size: 10, age: 0, life: 1, rot: 0, vr: 0, color: "#FFFFFF", ...partial };
}

/** 落水 / 咬餌的水花：一圈漣漪加幾滴往上噴的水 */
export function splash(x: number, y: number, strength = 1, rand: () => number = Math.random): Effect[] {
  const out: Effect[] = [
    make("ripple", x, y, { size: 26 * strength, life: 0.9 }),
    make("ripple", x, y, { size: 44 * strength, life: 1.3 }),
  ];
  const drops = Math.round(6 * strength);
  for (let i = 0; i < drops; i++) {
    const a = -Math.PI / 2 + (rand() - 0.5) * 1.8;
    const v = (160 + rand() * 160) * Math.sqrt(strength);
    out.push(
      make("drop", x, y, {
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        size: 2.5 + rand() * 2.5,
        life: 0.5 + rand() * 0.3,
        color: "rgba(225,245,254,0.95)",
      })
    );
  }
  return out;
}

export function bubbles(x: number, y: number, count = 5, rand: () => number = Math.random): Effect[] {
  const out: Effect[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      make("bubble", x + (rand() - 0.5) * 24, y + (rand() - 0.5) * 10, {
        vy: -(50 + rand() * 60),
        size: 3 + rand() * 5,
        life: 0.9 + rand() * 0.8,
        rot: rand() * Math.PI * 2,
      })
    );
  }
  return out;
}

/** 章魚噴的墨汁：幾團慢慢散開、變淡 */
export function inkCloud(x: number, y: number, rand: () => number = Math.random): Effect[] {
  const out: Effect[] = [];
  for (let i = 0; i < 6; i++) {
    out.push(
      make("ink", x + (rand() - 0.5) * 30, y + (rand() - 0.5) * 20, {
        vx: (rand() - 0.5) * 50,
        vy: (rand() - 0.5) * 30,
        size: 14 + rand() * 14,
        life: 1.6 + rand() * 0.8,
        color: rand() < 0.5 ? "#311B92" : "#4A148C",
      })
    );
  }
  return out;
}

export function sparkles(x: number, y: number, count = 3, rand: () => number = Math.random): Effect[] {
  const out: Effect[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      make("sparkle", x + (rand() - 0.5) * 50, y + (rand() - 0.5) * 36, {
        size: 6 + rand() * 6,
        life: 0.6 + rand() * 0.4,
        color: "#FFF59D",
      })
    );
  }
  return out;
}

/** 從畫面上方灑下的彩帶 */
export function confetti(w: number, count = 90, rand: () => number = Math.random): Effect[] {
  const out: Effect[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      make("confetti", rand() * w, -20 - rand() * 200, {
        vx: (rand() - 0.5) * 120,
        vy: 120 + rand() * 160,
        size: 6 + rand() * 6,
        life: 3 + rand() * 1.5,
        rot: rand() * Math.PI * 2,
        vr: (rand() - 0.5) * 10,
        color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length) % CONFETTI_COLORS.length],
      })
    );
  }
  return out;
}

/** 浮標上方跳出的「！」 */
export function exclaim(x: number, y: number): Effect {
  return make("exclaim", x, y, { size: 40, life: 1.4, color: "#EF5350" });
}

/** 更新所有特效並移除結束的 */
export function updateEffects(effects: Effect[], dt: number): Effect[] {
  for (const e of effects) {
    e.age += dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.rot += e.vr * dt;
    if (e.kind === "drop") e.vy += GRAVITY * dt;
    else if (e.kind === "bubble") e.x += Math.sin(e.age * 8 + e.rot) * 12 * dt;
    else if (e.kind === "confetti") e.vx *= 1 - 0.5 * dt;
    else if (e.kind === "ink") {
      e.vx *= 1 - 1.5 * dt;
      e.vy *= 1 - 1.5 * dt;
    }
  }
  return effects.filter((e) => e.age < e.life);
}

/** 0～1 的進度 */
export function effectProgress(e: Effect): number {
  return Math.min(1, e.age / e.life);
}

// ---------- 天氣 ----------

export interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  rot: number;
}

const WEATHER_COUNT: Record<WeatherKind, number> = {
  none: 0,
  petals: 18,
  leaves: 14,
  snow: 45,
  rain: 70,
  fireflies: 16,
};

function weatherParticle(
  kind: WeatherKind,
  w: number,
  h: number,
  rand: () => number,
  fromTop: boolean
): WeatherParticle {
  const y = fromTop ? -20 - rand() * 40 : rand() * h;
  const p: WeatherParticle = { x: rand() * w, y, vx: 0, vy: 0, size: 4, phase: rand() * Math.PI * 2, rot: rand() * Math.PI * 2 };
  if (kind === "rain") {
    p.vx = -60;
    p.vy = 700 + rand() * 300;
    p.size = 10 + rand() * 8;
  } else if (kind === "snow") {
    p.vy = 30 + rand() * 40;
    p.size = 2 + rand() * 3;
  } else if (kind === "petals" || kind === "leaves") {
    p.vx = 15 + rand() * 25;
    p.vy = 35 + rand() * 30;
    p.size = kind === "petals" ? 5 + rand() * 3 : 14 + rand() * 6;
  } else if (kind === "fireflies") {
    p.y = rand() * h;
    p.size = 2 + rand() * 2;
  }
  return p;
}

export function createWeather(
  kind: WeatherKind,
  w: number,
  h: number,
  rand: () => number = Math.random
): WeatherParticle[] {
  return Array.from({ length: WEATHER_COUNT[kind] }, () => weatherParticle(kind, w, h, rand, false));
}

/** 往下飄，掉出畫面就從上面重新出現；螢火蟲在原地慢慢飛 */
export function updateWeather(
  list: WeatherParticle[],
  kind: WeatherKind,
  dt: number,
  w: number,
  h: number,
  rand: () => number = Math.random
): void {
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    p.phase += dt;
    if (kind === "fireflies") {
      p.x += Math.cos(p.phase * 0.7 + p.rot) * 18 * dt;
      p.y += Math.sin(p.phase * 0.9 + p.rot * 2) * 14 * dt;
      if (p.x < 0) p.x += w;
      else if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h;
      else if (p.y > h) p.y -= h;
      continue;
    }
    const sway = kind === "rain" ? 0 : Math.sin(p.phase * 1.5 + p.rot) * 20;
    p.x += (p.vx + sway) * dt;
    p.y += p.vy * dt;
    p.rot += dt * (kind === "leaves" ? 1.5 : 0.8);
    if (p.y > h + 20 || p.x > w + 40 || p.x < -40) list[i] = weatherParticle(kind, w, h, rand, true);
  }
}
