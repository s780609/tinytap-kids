import type { Path } from "./constants.ts";

const SWOOP_IN = 50;
const SWOOP_SPEED = 2.2;
const SWOOP_R = 40;
const SWOOP_TURN = 0.04;

/** 敵人出生後第 age tick 的位置；scroll 為地面每 tick 捲動距離（地面單位用） */
export function pathPos(p: Path, age: number, scroll: number): { x: number; y: number } {
  switch (p.type) {
    case "line":
      return { x: p.x + p.vx * age, y: p.y + p.vy * age };
    case "ground":
      return { x: p.x + p.vx * age, y: p.y + (scroll + p.vy) * age };
    case "sine":
      return { x: p.x + p.amp * Math.sin(age * p.freq), y: -14 + p.vy * age };
    case "swoop": {
      // 先往下衝，再畫半圈轉向側邊，最後往上飛走
      const y1 = -14 + SWOOP_SPEED * SWOOP_IN;
      if (age <= SWOOP_IN) return { x: p.x, y: -14 + SWOOP_SPEED * age };
      const a = (age - SWOOP_IN) * SWOOP_TURN;
      if (a <= Math.PI) {
        const cx = p.x + p.side * SWOOP_R;
        return { x: cx - p.side * SWOOP_R * Math.cos(a), y: y1 + SWOOP_R * Math.sin(a) };
      }
      const k = age - SWOOP_IN - Math.PI / SWOOP_TURN;
      return { x: p.x + 2 * p.side * SWOOP_R, y: y1 - SWOOP_SPEED * k };
    }
    case "hover": {
      // 減速降到 y 停住，停 stay tick 後往上（-1）或往下（1）加速離開
      const enter = 70;
      if (age <= enter) {
        const k = age / enter;
        return { x: p.x, y: -20 + (p.y + 20) * (1 - (1 - k) * (1 - k)) };
      }
      if (age <= enter + p.stay) return { x: p.x, y: p.y };
      const k = age - enter - p.stay;
      return { x: p.x, y: p.y + p.leave * 0.02 * k * k };
    }
    case "boss": {
      // 從上方降下，之後左右慢慢晃
      const enter = 150;
      if (age <= enter) return { x: 120, y: -60 + (116 * age) / enter };
      const k = age - enter;
      return { x: 120 + 64 * Math.sin(k * 0.012), y: 56 + 10 * Math.sin(k * 0.021) };
    }
  }
}

export const BOSS_ENTER = 150;
