/**
 * 開場影片的 8 個分鏡，邏輯尺寸 180×150。t 是這個分鏡內的毫秒。
 */

import type { IntroSceneId } from "@/lib/left-on-read/intro";
import { bands, blink, digits, dither, glow, pixelText, rect, saw, type Ctx } from "./draw";
import { drawJiahao, drawJiahaoBust } from "./jiahaoSprite";
import { drawOffice, drawRoom } from "./scenes";

/** 大樓的一片窗，亮不亮由位置決定，偶爾會熄掉或亮起來 */
function windows(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, color = "#ffd98a") {
  for (let wy = y + 2; wy < y + h - 1; wy += 4) {
    for (let wx = x + 2; wx < x + w - 1; wx += 3) {
      const key = wx * 31 + wy * 17;
      const on = key % 3 !== 0;
      const flicker = key % 23 === 0 && blink(t + key * 13, 900);
      if (on !== flicker) rect(ctx, color, wx, wy, 1, 2);
    }
  }
}

const bus = (ctx: Ctx, t: number) => {
  bands(ctx, ["#5a4a8a", "#8a5a8e", "#c97a7e", "#f0a870", "#fbd08a"], 0, 0, 180, 84);
  // 遠處的稻田和電線桿往後跑，代表車已經開了
  const run = Math.max(0, t - 2200);
  rect(ctx, "#6d8f4e", 0, 84, 180, 18);
  for (let i = 0; i < 8; i++) {
    const px = ((i * 40 - run * 0.03) % 200 + 200) % 200 - 10;
    rect(ctx, "#3a3050", px, 58, 2, 28);
    rect(ctx, "#3a3050", px - 4, 62, 10, 1);
  }
  dither(ctx, "#7fa45a", 0, 90, 180, 12, Math.floor(run / 200));
  // 站牌
  rect(ctx, "#4a4250", 18, 60, 3, 50);
  rect(ctx, "#d7d0c0", 8, 52, 24, 12);
  pixelText(ctx, "嘉義", 20, 52, 11, "#3a3050", "center");
  // 地面
  rect(ctx, "#4c4a58", 0, 102, 180, 48);
  rect(ctx, "#e8dfa8", 0, 138, 180, 1);
  // 媽媽站在原地揮手，越來越遠
  const wave = blink(t, 350) ? 0 : 2;
  const mx = 36;
  rect(ctx, "#a4524d", mx, 92, 10, 18);
  rect(ctx, "#2a2730", mx + 1, 81, 8, 5);
  rect(ctx, "#efc29a", mx + 2, 84, 6, 7);
  rect(ctx, "#a4524d", mx + 10, 88 - wave, 3, 8);
  rect(ctx, "#efc29a", mx + 10, 85 - wave, 3, 3);
  rect(ctx, "#35323e", mx + 1, 110, 3, 8);
  rect(ctx, "#35323e", mx + 6, 110, 3, 8);
  // 客運：開走
  const bx = 62 + Math.min(1, run / 3800) ** 2 * 170;
  const bounce = blink(t, 180) ? 0 : 1;
  rect(ctx, "#e8e4d8", bx, 66 + bounce, 92, 42);
  rect(ctx, "#3a7a68", bx, 90 + bounce, 92, 8);
  rect(ctx, "#2a5a4c", bx, 104 + bounce, 92, 4);
  for (let i = 0; i < 5; i++) rect(ctx, "#27304a", bx + 5 + i * 17, 72 + bounce, 14, 13);
  // 窗邊的家豪，看著窗外，膝上一袋橘子
  rect(ctx, "#15121c", bx + 7, 74 + bounce, 8, 3);
  rect(ctx, "#efc29a", bx + 8, 77 + bounce, 6, 6);
  rect(ctx, "#08070c", bx + 8, 79 + bounce, 6, 1);
  rect(ctx, "#8f97ab", bx + 6, 83 + bounce, 10, 2);
  rect(ctx, "#f0962e", bx + 16, 82 + bounce, 3, 3);
  for (const wx of [bx + 18, bx + 74]) {
    rect(ctx, "#15151c", wx, 104, 14, 12);
    rect(ctx, "#6c6c78", wx + 4, 108, 6, 4);
    rect(ctx, "#15151c", wx + 6 + (blink(t, 120) ? 1 : -1), 109, 2, 2);
  }
  // 一路往上飄的排氣
  for (let i = 0; i < 3; i++) {
    const p = saw(t + i * 300, 900);
    rect(ctx, "#ffffff55", bx - 4 - p * 16, 104 - p * 6, 3, 2);
  }
};

const taipei = (ctx: Ctx, t: number) => {
  bands(ctx, ["#070a1f", "#0c1030", "#151840", "#221f4f", "#3a2a5e"], 0, 0, 180, 92);
  for (let i = 0; i < 26; i++) {
    const sx = (i * 67) % 180;
    const sy = (i * 41) % 54;
    if (i % 3 !== 0 || blink(t + i * 200, 800)) rect(ctx, "#cfd8ff", sx, sy, 1, 1);
  }
  // 中間一座很高的塔，一節一節往上
  const tx = 82;
  for (let i = 0; i < 7; i++) {
    const y = 80 - i * 10;
    rect(ctx, "#1c2348", tx - 1 + 0, y, 18, 9);
    rect(ctx, "#2b3366", tx - 3, y + 7, 22, 2);
    windows(ctx, tx, y, 16, 8, t, "#a8e0d0");
  }
  rect(ctx, "#1c2348", tx + 5, 8, 6, 14);
  rect(ctx, "#1c2348", tx + 7, 0, 2, 8);
  if (blink(t, 500)) rect(ctx, "#ff5a5a", tx + 7, 0, 2, 1);
  // 前後兩排大樓
  const far: readonly (readonly [number, number, number])[] = [
    [0, 22, 44], [20, 14, 34], [36, 18, 54], [56, 22, 38], [108, 18, 46], [128, 14, 58], [144, 20, 36], [164, 16, 50],
  ];
  for (const [x, w, h] of far) {
    rect(ctx, "#141838", x, 92 - h, w, h);
    windows(ctx, x, 92 - h, w, h, t);
  }
  const near: readonly (readonly [number, number, number])[] = [
    [0, 30, 34], [34, 24, 22], [62, 30, 30], [100, 22, 24], [126, 26, 38], [156, 24, 26],
  ];
  for (const [x, w, h] of near) {
    rect(ctx, "#0b0e26", x, 108 - h, w, h);
    windows(ctx, x, 108 - h, w, h, t, "#ffe6a8");
  }
  // 高架橋上的車流
  rect(ctx, "#05061a", 0, 108, 180, 42);
  rect(ctx, "#1b1d38", 0, 112, 180, 4);
  rect(ctx, "#2c2e4c", 0, 112, 180, 1);
  for (let i = 0; i < 9; i++) {
    const a = ((i * 37 + t * 0.05) % 200) - 10;
    rect(ctx, "#fff2c0", a, 113, 3, 1);
    const b = 190 - ((i * 53 + t * 0.07) % 200);
    rect(ctx, "#ff5a4a", b, 115, 3, 1);
  }
  // 小小的家豪站在天橋欄杆邊
  rect(ctx, "#2a2c48", 0, 130, 180, 2);
  for (let i = 0; i < 180; i += 8) rect(ctx, "#2a2c48", i, 130, 1, 12);
  drawJiahao(ctx, 34, 100, "sigh", t);
  rect(ctx, "#05061a", 0, 142, 180, 8);
};

const mrt = (ctx: Ctx, t: number) => {
  // 整節車廂在晃
  const sway = Math.round(Math.sin(t / 240) * 1.4);
  ctx.save();
  ctx.translate(0, sway);
  rect(ctx, "#cfd3d6", 0, -4, 180, 158);
  rect(ctx, "#eef0f1", 0, -4, 180, 12);
  rect(ctx, "#ffffff", 20, 0, 60, 2);
  rect(ctx, "#ffffff", 100, 0, 60, 2);
  // 窗戶外是隧道，光一條一條閃過
  rect(ctx, "#101320", 10, 22, 160, 44);
  const tunnel = (t * 0.25) % 80;
  for (let i = -1; i < 3; i++) rect(ctx, "#ffe9b0", 10 + i * 80 + tunnel, 28, 22, 2);
  rect(ctx, "#1a1e2e", 10, 50, 160, 4);
  rect(ctx, "#8b8f94", 88, 22, 4, 44);
  // 路線圖
  rect(ctx, "#2a7fbf", 20, 12, 140, 2);
  for (let i = 0; i < 8; i++) {
    rect(ctx, i === (Math.floor(t / 1600) % 8) && blink(t, 300) ? "#ff5a4a" : "#ffffff", 28 + i * 18, 11, 4, 4);
  }
  // 吊環跟著晃
  for (let i = 0; i < 7; i++) {
    const rx = 18 + i * 25 + Math.round(Math.sin(t / 240 + i) * 2);
    rect(ctx, "#7a7e84", rx + 2, 6, 1, 12);
    rect(ctx, "#f2f2f2", rx, 18, 5, 5);
    rect(ctx, "#cfd3d6", rx + 1, 19, 3, 3);
  }
  // 擠滿的人：每個人都低頭滑手機
  const people: readonly (readonly [number, number, string, string])[] = [
    [-4, 50, "#4f5c75", "#2a2730"],
    [18, 44, "#8a4f5c", "#3a2a20"],
    [42, 54, "#3f6a55", "#15121c"],
    [108, 52, "#6a5a8a", "#2a2730"],
    [130, 42, "#b58a3e", "#3a2a20"],
    [156, 50, "#39485e", "#15121c"],
  ];
  for (const [px, py, cloth, hair] of people) {
    rect(ctx, cloth, px, py + 22, 26, 110);
    rect(ctx, "#efc29a", px + 6, py + 6, 14, 16);
    rect(ctx, hair, px + 5, py, 16, 8);
    rect(ctx, "#101018", px + 9, py + 30, 8, 10);
    rect(ctx, blink(t + px * 40, 700) ? "#bfe8ff" : "#8fd0f0", px + 10, py + 31, 6, 7);
    dither(ctx, "#bfe8ff33", px + 6, py + 14, 14, 8);
  }
  // 中間被夾住的家豪，抱著背包
  drawJiahao(ctx, 66, 62, "stand", 0);
  rect(ctx, "#39485e", 70, 80, 16, 16);
  rect(ctx, "#2a3648", 74, 84, 8, 6);
  // 前排的肩膀把畫面塞滿
  rect(ctx, "#2f3442", 0, 126, 72, 28);
  rect(ctx, "#46323a", 104, 122, 80, 32);
  ctx.restore();
};

const office = (ctx: Ctx, t: number) => {
  drawOffice(ctx, t, { overtime: true });
  // 其他螢幕一台一台熄掉，時鐘走到很晚
  rect(ctx, "#0b0d1a", 60, 68, 24, 8);
  if (t < 2200) rect(ctx, "#b8dcea", 62, 68, 24, 8);
  rect(ctx, "#0b0d1a", 142, 68, 24, 8);
  if (t < 1100) rect(ctx, "#b8dcea", 144, 68, 24, 8);
  // 同事揮手下班
  if (t > 1100 && t < 3600) {
    const x = 166 - (t - 1100) * 0.05;
    rect(ctx, "#596d8c", x, 58, 12, 26);
    rect(ctx, "#efc29a", x + 2, 48, 8, 10);
    rect(ctx, "#2a2730", x + 2, 46, 8, 4);
    rect(ctx, "#596d8c", x - 3, 52 + (blink(t, 300) ? 0 : 2), 3, 8);
  }
};

const store = (ctx: Ctx, t: number) => {
  // 超商的白光
  rect(ctx, "#f2f4f0", 0, 0, 180, 150);
  rect(ctx, "#4bab7f", 0, 0, 180, 8);
  rect(ctx, "#e8634e", 0, 8, 180, 3);
  rect(ctx, "#ffffff", 20, 14, 50, 2);
  rect(ctx, "#ffffff", 110, 14, 50, 2);
  // 後面的貨架
  for (let row = 0; row < 3; row++) {
    const y = 24 + row * 18;
    rect(ctx, "#b5b8b6", 0, y + 14, 74, 2);
    for (let i = 0; i < 9; i++) {
      const colors = ["#d9534f", "#4a7fb5", "#e6b84c", "#7fb069", "#b56fa8"];
      rect(ctx, colors[(i + row * 2) % colors.length], 2 + i * 8, y + 3 + (i % 2), 6, 11 - (i % 2));
    }
  }
  // 櫃檯、店員、微波爐
  rect(ctx, "#c9ccc8", 0, 96, 180, 54);
  rect(ctx, "#a4a8a4", 0, 96, 180, 3);
  rect(ctx, "#4bab7f", 92, 54, 18, 26);
  rect(ctx, "#efc29a", 95, 40, 12, 14);
  rect(ctx, "#3a2a20", 94, 37, 14, 6);
  rect(ctx, "#4bab7f", 94, 38, 14, 2);
  rect(ctx, "#2a2a2a", 98, 47, 1, 1);
  rect(ctx, "#2a2a2a", 103, 47, 1, 1);
  rect(ctx, "#a5654b", 99, 51 - (blink(t, 400) ? 0 : 1), 4, 1);
  // 微波爐：盤子在轉，數字倒數
  const left = Math.max(0, 120 - Math.floor(t / 1000) * 24 - Math.floor(t / 42) % 24);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  rect(ctx, "#6f7377", 122, 52, 52, 40);
  rect(ctx, "#3a3d40", 124, 54, 34, 34);
  rect(ctx, left > 0 ? "#ffd27a" : "#55585c", 126, 56, 30, 30);
  const plate = Math.floor(t / 150) % 4;
  rect(ctx, "#c98f4a", 132 + [0, 2, 0, -2][plate], 68, 18, 8);
  rect(ctx, "#7fb069", 137 + [0, 2, 0, -2][plate], 66, 6, 2);
  rect(ctx, "#101418", 160, 56, 12, 9);
  digits(ctx, `${mm.slice(1)}${ss}`, 160, 58, "#ff5a4a");
  rect(ctx, "#a4a8a4", 160, 68, 12, 3);
  rect(ctx, "#a4a8a4", 160, 74, 12, 3);
  // 背對鏡頭的家豪，等微波爐
  drawJiahao(ctx, 60, 74, "sigh", t);
  rect(ctx, "#c9ccc8", 0, 118, 180, 32);
  rect(ctx, "#8d918d", 0, 118, 180, 2);
  // 櫃檯上的塑膠袋
  rect(ctx, "#ffffff", 26, 104, 18, 16);
  rect(ctx, "#dfe2df", 28, 110, 14, 1);
  rect(ctx, "#ffffff", 28, 100, 3, 5);
  rect(ctx, "#ffffff", 39, 100, 3, 5);
  // 店員問話的方框
  if (t > 2500 && blink(t, 800)) {
    rect(ctx, "#ffffff", 68, 20, 40, 16);
    rect(ctx, "#2a2a2a", 68, 20, 40, 1);
    rect(ctx, "#2a2a2a", 68, 35, 40, 1);
    rect(ctx, "#2a2a2a", 68, 20, 1, 16);
    rect(ctx, "#2a2a2a", 107, 20, 1, 16);
    rect(ctx, "#ffffff", 92, 35, 4, 4);
    pixelText(ctx, "袋子?", 88, 21, 12, "#2a2a2a", "center");
  }
};

const room = (ctx: Ctx, t: number) => {
  drawRoom(ctx, t, { mode: "night", pose: "sigh" });
  // 桌上那只空的橘色網袋
  for (let j = 0; j < 3; j++) dither(ctx, "#f0962e", 113, 69 + j * 3, 10, 2, j);
  // 電風扇慢慢轉
  rect(ctx, "#31344c", 150, 110, 4, 24);
  rect(ctx, "#31344c", 144, 134, 16, 3);
  rect(ctx, "#44486a", 142, 96, 20, 20);
  const fan = Math.floor(t / 140) % 2;
  rect(ctx, "#8d92b2", fan ? 144 : 151, fan ? 105 : 98, fan ? 16 : 2, fan ? 2 : 16);
};

const phone = (ctx: Ctx, t: number) => {
  rect(ctx, "#06070f", 0, 0, 180, 150);
  // 黑暗裡只看得到被手機照亮的臉
  drawJiahaoBust(ctx, 58, 8, { t, phoneGlow: true });
  rect(ctx, "#06070fcc", 0, 0, 180, 18);
  dither(ctx, "#06070f", 0, 18, 180, 12);
  dither(ctx, "#06070f", 0, 0, 62, 150);
  dither(ctx, "#06070f", 118, 0, 62, 150);
  // 鏡片裡有卡片在滑
  const slide = Math.floor(saw(t, 1400) * 8);
  rect(ctx, "#ff7a9c", 76 + slide, 38, 5, 4);
  rect(ctx, "#ff7a9c", 94 + slide, 38, 5, 4);
  // 前景的手和手機
  glow(ctx, "#a8e8ff55", 90, 112, 40, t);
  glow(ctx, "#d8f6ff77", 90, 112, 20, t);
  rect(ctx, "#101018", 70, 86, 40, 64);
  rect(ctx, "#f9e9ef", 73, 90, 34, 58);
  rect(ctx, "#ff6f91", 73, 90, 34, 8);
  pixelText(ctx, "Swipy", 90, 89, 9, "#ffffff", "center");
  // 螢幕上的卡片左右滑
  const cardX = 76 + Math.sin(t / 500) * 3;
  rect(ctx, "#ffffff", cardX, 102, 28, 30);
  rect(ctx, "#c3d9e8", cardX + 2, 104, 24, 18);
  rect(ctx, "#4a2f24", cardX + 9, 107, 10, 7);
  rect(ctx, "#f4cfae", cardX + 10, 110, 8, 6);
  rect(ctx, "#d9605f", cardX + 8, 116, 12, 6);
  rect(ctx, "#ff6f91", 82, 136, 6, 6);
  rect(ctx, "#8d92b2", 92, 136, 6, 6);
  rect(ctx, "#efc29a", 62, 110, 10, 26);
  rect(ctx, "#efc29a", 108, 112, 8, 22);
  rect(ctx, "#d39c74", 108, 112, 2, 22);
};

const title = (ctx: Ctx, t: number) => {
  rect(ctx, "#05060e", 0, 0, 180, 150);
  // 一則訊息從下面升上來，然後被標成已讀
  const rise = Math.min(1, t / 900);
  const by = 112 - rise * 10;
  rect(ctx, "#f4efe0", 36, by, 90, 17);
  rect(ctx, "#8d8a7c", 36, by + 17, 90, 2);
  pixelText(ctx, "妳好，我是家豪", 39, by + 1, 12, "#1a1a24");
  if (t > 1500) pixelText(ctx, "已讀", 129, by + 6, 11, "#a8acc8");
  if (t > 500) {
    const reveal = Math.min(1, (t - 500) / 500);
    pixelText(ctx, "已讀不回", 90, 42, 32, reveal >= 1 ? "#f6f1de" : "#6a6a7a", "center");
    if (reveal >= 1) rect(ctx, "#ff6f91", 28, 80, 124, 2);
  }
};

export const INTRO_SCENES: Record<IntroSceneId, (ctx: Ctx, tMs: number) => void> = {
  bus,
  taipei,
  mrt,
  office,
  store,
  room,
  phone,
  title,
};
