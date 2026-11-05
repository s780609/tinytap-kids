/**
 * 遊戲中的場景，邏輯尺寸 180×150：辦公室、小吃店、租屋處。
 * 每個都有小動畫，t 是毫秒。
 */

import { bands, blink, digits, digitsWidth, dither, glow, pixelText, rect, saw, type Ctx } from "./draw";
import { drawJiahao } from "./jiahaoSprite";

export const SCENE_W = 180;
export const SCENE_H = 150;

/** 一排窗戶亮暗不一的大樓 */
function skyline(
  ctx: Ctx,
  buildings: readonly (readonly [number, number, number])[],
  ground: number,
  body: string,
  windowOn: string,
  t = 0
) {
  buildings.forEach(([x, w, h], n) => {
    rect(ctx, body, x, ground - h, w, h);
    for (let wy = ground - h + 3; wy < ground - 3; wy += 5) {
      for (let wx = x + 2; wx < x + w - 2; wx += 4) {
        const on = ((wx * 7 + wy * 13 + n) % 5 !== 0) !== (((wx + wy) % 11 === 0) && blink(t + wx * 37, 1700));
        if (on && (wx * 3 + wy) % 3 !== 1) rect(ctx, windowOn, wx, wy, 2, 2);
      }
    }
  });
}

// ---------- 辦公室 ----------

export function drawOffice(ctx: Ctx, t: number, opts: { overtime?: boolean } = {}) {
  const { overtime = false } = opts;
  // 牆和地板
  rect(ctx, overtime ? "#262b42" : "#c9c5b4", 0, 0, 180, 92);
  rect(ctx, overtime ? "#1b1f33" : "#a9a593", 0, 88, 180, 4);
  rect(ctx, overtime ? "#141728" : "#6c6f7a", 0, 92, 180, 58);
  dither(ctx, overtime ? "#1b1f33" : "#60636e", 0, 92, 180, 18);

  // 窗戶：外面是大樓
  rect(ctx, "#454a5c", 6, 10, 50, 44);
  if (overtime) rect(ctx, "#0e1226", 8, 12, 46, 40);
  else bands(ctx, ["#a8d4ea", "#bfe0ee", "#d4e9ee"], 8, 12, 46, 40);
  skyline(
    ctx,
    [[8, 12, 24], [20, 10, 34], [30, 14, 18], [44, 10, 28]],
    52,
    overtime ? "#1e2340" : "#8f9cab",
    overtime ? "#ffe08a" : "#c6d6e0",
    t
  );
  rect(ctx, "#454a5c", 31, 12, 1, 40);
  rect(ctx, "#454a5c", 8, 30, 46, 1);

  // 日光燈會閃一下
  const lit = saw(t, 4300) > 0.05;
  rect(ctx, "#8d8a7c", 64, 4, 44, 3);
  rect(ctx, lit ? "#ffffff" : "#b9b6a6", 66, 5, 40, 2);
  rect(ctx, "#8d8a7c", 124, 4, 44, 3);
  rect(ctx, "#f4f4e4", 126, 5, 40, 2);

  // 白板和時鐘
  rect(ctx, "#6f6d62", 68, 14, 46, 28);
  rect(ctx, "#f4f4ee", 70, 16, 42, 24);
  rect(ctx, "#d9534f", 73, 19, 18, 1);
  rect(ctx, "#4a7fb5", 73, 23, 28, 1);
  rect(ctx, "#4a7fb5", 73, 27, 12, 1);
  rect(ctx, "#4a4a4a", 88, 30, 18, 6);
  rect(ctx, "#f4f4ee", 89, 31, 16, 4);
  rect(ctx, "#2a2a30", 124, 14, 14, 14);
  rect(ctx, "#f4f4ee", 125, 15, 12, 12);
  rect(ctx, "#2a2a30", 130, 17, 1, 5);
  rect(ctx, "#2a2a30", 130, 21, 1 + Math.floor(saw(t, 8000) * 4), 1);

  // 後排同事的背影和螢幕
  for (const [cx, hue] of [[64, "#596d8c"], [146, "#7a6470"]] as const) {
    rect(ctx, hue, cx, 56, 20, 22);
    rect(ctx, "#2a2730", cx + 5, 46, 10, 11);
    rect(ctx, "#3a3a48", cx - 4, 66, 28, 12);
    rect(ctx, "#b8dcea", cx - 2, 68, 24, 8);
  }
  rect(ctx, "#6e6a60", 50, 78, 130, 2);

  // 桌子
  rect(ctx, "#8d6f50", 0, 110, 180, 40);
  rect(ctx, "#a4835f", 0, 110, 180, 3);
  rect(ctx, "#6d5238", 0, 142, 180, 8);

  // 家豪和他的椅背
  rect(ctx, "#31313e", 68, 66, 36, 44);
  drawJiahao(ctx, 74, 64, "work", t);

  // 正面看得到的那台螢幕：程式碼會往上捲，游標會閃
  rect(ctx, "#232333", 116, 74, 50, 34);
  rect(ctx, "#0e1420", 118, 76, 46, 28);
  const scroll = Math.floor(t / 420);
  for (let i = 0; i < 6; i++) {
    const n = (i + scroll) * 7;
    const indent = n % 3 === 0 ? 2 : n % 3 === 1 ? 6 : 10;
    const len = 10 + (n * 13) % 24;
    rect(ctx, n % 4 === 0 ? "#f26d6d" : n % 4 === 1 ? "#7fd98f" : "#8bc8f0", 119 + indent, 78 + i * 4, len, 1);
  }
  if (blink(t, 400)) rect(ctx, "#ffffff", 150, 98, 3, 2);
  dither(ctx, "#8bc8f022", 118, 76, 46, 28, Math.floor(t / 90));
  rect(ctx, "#ffe680", 118, 76, 8, 7); // 便利貼
  rect(ctx, "#bda94e", 119, 78, 6, 1);
  rect(ctx, "#232333", 137, 108, 8, 3);
  rect(ctx, "#2f2f40", 130, 110, 22, 2);

  // 馬克杯和蒸氣、快枯掉的盆栽、文件
  rect(ctx, "#e9e4d8", 18, 104, 12, 12);
  rect(ctx, "#cfc8b8", 30, 106, 3, 7);
  rect(ctx, "#3a2a20", 19, 105, 10, 2);
  if (saw(t, 1400) < 0.7) rect(ctx, "#ffffff88", 22 + (blink(t, 700) ? 1 : 0), 100 - saw(t, 1400) * 8, 1, 3);
  rect(ctx, "#a4603a", 42, 106, 12, 10);
  rect(ctx, "#6a7a3a", 45, 98, 2, 8);
  rect(ctx, "#8a7a3a", 49, 100, 1, 6);
  rect(ctx, "#8a7a3a", 41, 99, 4, 1);
  rect(ctx, "#6a7a3a", 49, 99, 5, 1);
  rect(ctx, "#f4f2ea", 4, 114, 12, 3);
  rect(ctx, "#e4e2d8", 3, 117, 13, 3);
  // 鍵盤
  rect(ctx, "#35354a", 70, 114, 30, 8);
  for (let i = 0; i < 7; i++) rect(ctx, "#5a5a70", 72 + i * 4, 116, 3, 1);
  for (let i = 0; i < 7; i++) rect(ctx, "#5a5a70", 72 + i * 4, 119, 3, 1);
}

// ---------- 小吃店 ----------

export function drawEatery(ctx: Ctx, t: number, opts: { eating?: boolean } = {}) {
  const { eating = false } = opts;
  if (eating) {
    drawEateryInside(ctx, t);
    return;
  }
  // 黃昏的街
  bands(ctx, ["#2a2452", "#46306a", "#7a4476", "#c0607a", "#ee9a70"], 0, 0, 180, 66);
  rect(ctx, "#2a2348", 0, 66, 180, 30);
  skyline(ctx, [[0, 26, 50], [24, 22, 40], [120, 28, 58], [146, 34, 44]], 70, "#2a2348", "#ffd98a", t);
  // 店面
  rect(ctx, "#4a3528", 44, 22, 92, 74);
  rect(ctx, "#ffe2a4", 50, 44, 80, 52);
  rect(ctx, "#f2c677", 50, 88, 80, 8);
  // 招牌：燈管偶爾閃
  const signOn = saw(t, 3100) > 0.08;
  rect(ctx, "#2a1a14", 42, 14, 96, 24);
  rect(ctx, signOn ? "#c9352b" : "#6b2a24", 44, 16, 92, 20);
  pixelText(ctx, "林記小吃", 90, 18, 14, signOn ? "#ffe9a8" : "#a8785a", "center");
  // 店內：老闆、大鍋和往上飄的蒸氣
  rect(ctx, "#f4f4f4", 92, 54, 14, 18);
  rect(ctx, "#efc29a", 94, 44, 10, 10);
  rect(ctx, "#f4f4f4", 93, 41, 12, 4);
  rect(ctx, "#6d7074", 62, 70, 24, 16);
  rect(ctx, "#8a8d92", 60, 68, 28, 3);
  for (let i = 0; i < 4; i++) {
    const p = saw(t + i * 500, 2000);
    rect(ctx, "#ffffffaa", 66 + i * 5 + (blink(t + i * 300, 500) ? 1 : 0), 66 - p * 20, 2, 2);
  }
  rect(ctx, "#8a5a3a", 50, 86, 80, 10);
  rect(ctx, "#6d452c", 50, 86, 80, 2);
  // 門口的紅色塑膠椅
  rect(ctx, "#d33b35", 112, 100, 12, 3);
  rect(ctx, "#a82c28", 113, 103, 2, 7);
  rect(ctx, "#a82c28", 121, 103, 2, 7);
  // 地面
  rect(ctx, "#2d2a3e", 0, 96, 180, 54);
  rect(ctx, "#3a364e", 0, 96, 180, 2);
  dither(ctx, "#ffe2a422", 44, 98, 92, 22);
  // 路燈
  rect(ctx, "#1a1826", 16, 40, 3, 60);
  rect(ctx, "#1a1826", 16, 40, 12, 2);
  rect(ctx, "#fff0b8", 24, 42, 6, 2);
  glow(ctx, "#fff0b833", 27, 46, 12, t);
  // 兩個人一起走過去的影子
  const px = 200 - saw(t, 13000) * 260;
  for (const off of [0, 11]) {
    rect(ctx, "#15131f", px + off, 102, 8, 18);
    rect(ctx, "#15131f", px + off + 1, 95, 6, 7);
    rect(ctx, "#15131f", px + off + 1, 120, 2, 8);
    rect(ctx, "#15131f", px + off + 5, 120, 2, 8);
  }
  // 家豪站在路邊，機車的大燈掃過去
  drawJiahao(ctx, 76, 98, "sigh", t);
  const sx = saw(t, 5400) * 300 - 60;
  rect(ctx, "#181622", sx, 134, 22, 6);
  rect(ctx, "#181622", sx + 8, 126, 8, 8);
  rect(ctx, "#fff7c8", sx + 22, 134, 2, 3);
  dither(ctx, "#fff7c855", sx + 24, 130, 26, 12);
  rect(ctx, "#ff5a4a", sx - 1, 134, 1, 2);
}

function drawEateryInside(ctx: Ctx, t: number) {
  rect(ctx, "#d9b98a", 0, 0, 180, 96);
  dither(ctx, "#ccaa78", 0, 0, 180, 40);
  // 牆上的菜單和電視
  rect(ctx, "#8d2f28", 8, 10, 58, 40);
  for (let i = 0; i < 5; i++) {
    rect(ctx, "#ffe9a8", 12, 15 + i * 7, 26 + (i * 13) % 20, 2);
    rect(ctx, "#ffe9a8", 56, 15 + i * 7, 6, 2);
  }
  rect(ctx, "#20202a", 122, 8, 46, 32);
  rect(ctx, blink(t, 700) ? "#6db0d8" : "#5a9cc4", 124, 10, 42, 26);
  rect(ctx, "#d9534f", 124, 30, 42, 6);
  rect(ctx, "#ffffff", 126 + (saw(t, 2600) * 30 | 0), 32, 10, 2);
  rect(ctx, "#efc29a", 140, 16, 10, 12);
  rect(ctx, "#20202a", 141, 14, 8, 3);
  // 吊扇在轉
  rect(ctx, "#6d5a48", 88, 0, 2, 8);
  const blade = Math.floor(t / 120) % 3;
  rect(ctx, "#8d7a66", 76 + blade * 2, 8, 26 - blade * 4, 2);
  // 靠牆的位子
  rect(ctx, "#5e4630", 0, 96, 180, 54);
  rect(ctx, "#4a3524", 0, 96, 180, 3);
  // 對面的空椅子，放著他的背包
  rect(ctx, "#b84038", 26, 76, 22, 3);
  rect(ctx, "#963028", 28, 79, 2, 18);
  rect(ctx, "#963028", 44, 79, 2, 18);
  rect(ctx, "#39485e", 28, 62, 18, 14);
  rect(ctx, "#2a3648", 32, 66, 10, 6);
  rect(ctx, "#2a3648", 33, 58, 8, 4);
  // 家豪
  drawJiahao(ctx, 86, 56, "eat", t);
  // 桌子、碗、蒸氣
  rect(ctx, "#e8e2d2", 50, 90, 130, 8);
  rect(ctx, "#c9c2ae", 50, 98, 130, 4);
  rect(ctx, "#8d6f50", 60, 102, 4, 48);
  rect(ctx, "#8d6f50", 166, 102, 4, 48);
  rect(ctx, "#f4f4f4", 92, 82, 20, 8);
  rect(ctx, "#5f8fb0", 92, 86, 20, 1);
  rect(ctx, "#d4813e", 94, 82, 16, 2);
  for (let i = 0; i < 3; i++) {
    const p = saw(t + i * 600, 1800);
    rect(ctx, "#ffffff99", 96 + i * 5, 80 - p * 14, 1, 3);
  }
  rect(ctx, "#b0413a", 134, 80, 6, 10);
  rect(ctx, "#f4efe0", 134, 77, 6, 3);
  rect(ctx, "#3a2a20", 146, 82, 5, 8);
}

// ---------- 租屋處 ----------

export function drawRoom(ctx: Ctx, t: number, opts: { mode?: "night" | "day"; pose?: "phone" | "sleep" | "sigh" } = {}) {
  const { mode = "night", pose = "sigh" } = opts;
  const night = mode === "night";
  // 牆和地板
  rect(ctx, night ? "#1a1d33" : "#c9c0a8", 0, 0, 180, 104);
  dither(ctx, night ? "#1f2340" : "#bfb69c", 0, 0, 180, 40);
  rect(ctx, night ? "#11132a" : "#8d7d68", 0, 104, 180, 46);
  rect(ctx, night ? "#0c0e1f" : "#776956", 0, 104, 180, 2);

  // 小窗：外面的大樓、對面的燈
  rect(ctx, "#39394c", 120, 12, 44, 40);
  if (night) rect(ctx, "#0b0e24", 122, 14, 40, 36);
  else bands(ctx, ["#c0e2f0", "#d6ecf0"], 122, 14, 40, 36);
  skyline(ctx, [[122, 16, 26], [138, 12, 34], [150, 12, 20]], 50, night ? "#171a33" : "#a9b0ba", night ? "#ffe08a" : "#d5dde2", t);
  rect(ctx, "#39394c", 141, 14, 2, 36);
  // 破窗簾
  rect(ctx, night ? "#33365a" : "#95a4ae", 118, 10, 8, 44);
  rect(ctx, night ? "#282a48" : "#7f8e98", 120, 10, 2, 44);
  if (night) {
    // 窗外偶爾有車燈掃過天花板
    const sweep = saw(t, 6000);
    if (sweep < 0.4) {
      const lx = 180 - (sweep / 0.4) * 240;
      dither(ctx, "#ffeec844", lx, 0, 46, 22, 0);
      dither(ctx, "#ffeec855", lx + 10, 22, 26, 12, 1);
    }
  } else {
    // 白天：窗戶的光落到地板，灰塵在飄
    dither(ctx, "#fff6d060", 92, 56, 44, 52);
    dither(ctx, "#fff6d090", 92, 108, 54, 40);
    for (let i = 0; i < 4; i++) {
      const p = saw(t + i * 1700, 6000);
      rect(ctx, "#fff8e0", 100 + i * 10, 64 + p * 40, 1, 1);
    }
  }

  // 天花板的水漬，形狀有點像台灣
  const stain = night ? "#242845" : "#ad9f84";
  rect(ctx, stain, 54, 7, 5, 2);
  rect(ctx, stain, 52, 9, 7, 3);
  rect(ctx, stain, 51, 12, 7, 3);
  rect(ctx, stain, 50, 15, 6, 3);
  rect(ctx, stain, 51, 18, 3, 2);

  // 曬衣架上的 T 恤
  rect(ctx, "#6a6a70", 6, 20, 46, 2);
  rect(ctx, "#6a6a70", 8, 22, 2, 80);
  rect(ctx, night ? "#5a6078" : "#8f97ab", 16, 24, 14, 18);
  rect(ctx, night ? "#70768e" : "#b5bccc", 19, 24, 2, 2);
  rect(ctx, night ? "#70768e" : "#b5bccc", 22, 25, 2, 2);
  rect(ctx, night ? "#70768e" : "#b5bccc", 25, 24, 2, 2);
  rect(ctx, night ? "#4a4e62" : "#6e7589", 34, 24, 12, 22);

  // 書桌：筆電、泡麵碗疊成一座塔、橘子袋
  rect(ctx, night ? "#3a2f33" : "#8d6f50", 120, 82, 58, 5);
  rect(ctx, night ? "#2a2226" : "#6d5238", 124, 87, 3, 26);
  rect(ctx, night ? "#2a2226" : "#6d5238", 170, 87, 3, 26);
  for (let i = 0; i < 4; i++) {
    rect(ctx, i % 2 ? "#d9d3c4" : "#c94a3a", 160 - i, 78 - i * 4, 12 + i * 2, 4);
  }
  rect(ctx, "#2a2a36", 128, 70, 24, 12);
  rect(ctx, night ? "#242a44" : "#3a4258", 130, 72, 20, 8);
  rect(ctx, "#1a1a24", 126, 81, 28, 2);

  // 單人床
  rect(ctx, night ? "#2b2f4a" : "#6a7a94", 10, 104, 104, 26);
  rect(ctx, night ? "#3a3f5e" : "#8a9ab4", 10, 96, 104, 10);
  rect(ctx, night ? "#1b1e33" : "#4a5468", 10, 130, 104, 4);
  rect(ctx, night ? "#1b1e33" : "#4a5468", 12, 134, 4, 10);
  rect(ctx, night ? "#1b1e33" : "#4a5468", 108, 134, 4, 10);
  rect(ctx, night ? "#46465e" : "#d4d6dc", 12, 92, 22, 8);

  if (pose === "sleep") {
    drawJiahao(ctx, 12, 90, "sleep", t);
    return;
  }
  // 坐在床邊：腿垂到床沿外
  rect(ctx, "#3a3f54", 63, 101, 18, 8);
  rect(ctx, "#3a3f54", 64, 109, 7, 21);
  rect(ctx, "#3a3f54", 73, 109, 7, 21);
  rect(ctx, "#20222c", 63, 130, 8, 3);
  rect(ctx, "#20222c", 73, 130, 8, 3);
  drawJiahao(ctx, 60, 70, pose === "phone" ? "phone" : "sit", t);
  if (pose === "phone") {
    // 手機是這個房間唯一的光
    glow(ctx, "#a8e8ff44", 72, 96, 34, t);
    glow(ctx, "#d8f6ff66", 72, 96, 16, t);
  }
}

// ---------- 領薪日：手機上的銀行通知 ----------

export function drawPaydaySlip(ctx: Ctx, t: number, net: string) {
  drawOffice(ctx, t);
  rect(ctx, "#00000066", 0, 0, 180, 150);
  rect(ctx, "#101018", 56, 22, 68, 112);
  rect(ctx, "#e9f3e4", 60, 28, 60, 98);
  rect(ctx, "#2f7d5b", 60, 28, 60, 14);
  pixelText(ctx, "入帳通知", 90, 28, 12, "#ffffff", "center");
  const center = (text: string, y: number, color: string) => digits(ctx, text, 90 - digitsWidth(text, 2) / 2, y, color, 2);
  center("+36,000", 52, "#2f7d5b");
  center("-12,500", 72, "#c9352b");
  rect(ctx, "#8d9c88", 66, 90, 48, 1);
  center(net, 100, blink(t, 500) ? "#101018" : "#2f7d5b");
}
