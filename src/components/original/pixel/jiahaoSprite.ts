/**
 * 林家豪：亂髮、粗黑框眼鏡、微胖、領口洗到變形呈波浪狀的舊 T 恤。
 */

import { blink, glow, rect, saw, type Ctx } from "./draw";

const HAIR = "#15121c";
const HAIR_LIGHT = "#2f2a3c";
const SKIN = "#efc29a";
const SKIN_SHADE = "#d39c74";
const MOUTH = "#a5654b";
const FRAME = "#08070c";
const LENS = "#d6e6ec";
const TEE = "#8f97ab";
const TEE_SHADE = "#6e7589";
const COLLAR = "#b5bccc";
const COLLAR_DARK = "#59607a";
const PANTS = "#3a3f54";
const SHOE = "#20222c";

export type JiahaoPose = "work" | "eat" | "phone" | "sleep" | "sigh" | "sit";

/** 16×16 的頭。look down 時眼鏡下移，screenGlow 會讓鏡片反光 */
function head(ctx: Ctx, x: number, y: number, opts: { down?: boolean; lens?: string; closed?: boolean } = {}) {
  const { down = false, lens = LENS, closed = false } = opts;
  const dy = down ? 1 : 0;
  // 臉：下巴比較圓，兩頰多一點肉
  rect(ctx, SKIN, x + 3, y + 3, 10, 12);
  rect(ctx, SKIN, x + 2, y + 7, 12, 6);
  rect(ctx, SKIN_SHADE, x + 2, y + 12, 1, 1);
  rect(ctx, SKIN_SHADE, x + 13, y + 12, 1, 1);
  rect(ctx, SKIN_SHADE, x + 4, y + 15, 8, 1);
  rect(ctx, SKIN_SHADE, x + 1, y + 8, 1, 3); // 耳朵
  rect(ctx, SKIN_SHADE, x + 14, y + 8, 1, 3);
  // 亂髮：高低不一的髮束，蓋住額頭
  rect(ctx, HAIR, x + 2, y + 2, 12, 4);
  rect(ctx, HAIR, x + 1, y + 4, 2, 4);
  rect(ctx, HAIR, x + 13, y + 3, 2, 4);
  rect(ctx, HAIR, x + 3, y, 2, 2);
  rect(ctx, HAIR, x + 6, y - 1, 2, 3);
  rect(ctx, HAIR, x + 9, y, 3, 2);
  rect(ctx, HAIR, x + 13, y + 1, 1, 2);
  rect(ctx, HAIR, x + 1, y + 2, 1, 2);
  rect(ctx, HAIR, x + 4, y + 6, 2, 1);
  rect(ctx, HAIR, x + 8, y + 6, 1, 2);
  rect(ctx, HAIR, x + 11, y + 6, 2, 1);
  rect(ctx, HAIR_LIGHT, x + 5, y + 3, 3, 1);
  rect(ctx, HAIR_LIGHT, x + 10, y + 2, 2, 1);
  // 粗黑框眼鏡
  rect(ctx, FRAME, x + 2, y + 8 + dy, 12, 1);
  rect(ctx, FRAME, x + 3, y + 8 + dy, 5, 4);
  rect(ctx, FRAME, x + 8, y + 8 + dy, 5, 4);
  rect(ctx, lens, x + 4, y + 9 + dy, 3, 2);
  rect(ctx, lens, x + 9, y + 9 + dy, 3, 2);
  if (closed) {
    rect(ctx, FRAME, x + 4, y + 10 + dy, 3, 1);
    rect(ctx, FRAME, x + 9, y + 10 + dy, 3, 1);
  } else {
    rect(ctx, FRAME, x + 5, y + 10 + dy, 1, 1);
    rect(ctx, FRAME, x + 10, y + 10 + dy, 1, 1);
  }
  rect(ctx, MOUTH, x + 7, y + 13, 3, 1);
}

/** 微胖的上半身和波浪領口，寬 22、高 h，頂端對齊 (x, y) */
function torso(ctx: Ctx, x: number, y: number, h: number) {
  rect(ctx, TEE, x + 2, y, 18, h);
  rect(ctx, TEE, x, y + 3, 22, h - 3);
  rect(ctx, TEE, x + 1, y + 1, 20, 2);
  rect(ctx, TEE_SHADE, x, y + h - 2, 22, 2); // 肚子的陰影
  rect(ctx, TEE_SHADE, x + 5, y + 5, 1, h - 7); // 手臂和身體的分界
  rect(ctx, TEE_SHADE, x + 16, y + 5, 1, h - 7);
  // 領口：洗到變形，一高一低的荷葉邊
  rect(ctx, SKIN, x + 7, y - 1, 8, 2);
  for (let i = 0; i < 12; i++) {
    const wave = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;
    rect(ctx, COLLAR, x + 5 + i, y + 1 + wave, 1, 1);
    rect(ctx, COLLAR_DARK, x + 5 + i, y + 2 + wave, 1, 1);
  }
}

/**
 * 全身或半身的小人，整體約 24×34。(x, y) 是左上角。
 * sleep 是橫躺的，約 40×12。
 */
export function drawJiahao(ctx: Ctx, x: number, y: number, pose: JiahaoPose, t = 0) {
  switch (pose) {
    case "work": {
      const typing = blink(t, 140) ? 0 : 1;
      torso(ctx, x + 1, y + 15, 18);
      head(ctx, x + 4, y, { lens: blink(t, 900) ? "#bfe8ff" : "#8ec6e8" });
      // 手在鍵盤上敲
      rect(ctx, TEE, x - 1, y + 26, 4, 5);
      rect(ctx, TEE, x + 21, y + 26, 4, 5);
      rect(ctx, SKIN, x + 1, y + 31 + typing, 4, 2);
      rect(ctx, SKIN, x + 19, y + 32 - typing, 4, 2);
      break;
    }
    case "eat": {
      const lift = saw(t, 1500) < 0.5 ? 0 : 3;
      torso(ctx, x + 1, y + 15, 18);
      head(ctx, x + 4, y, { down: lift === 0 });
      rect(ctx, TEE, x + 19, y + 24, 4, 5);
      rect(ctx, SKIN, x + 19, y + 26 - lift, 4, 3);
      // 筷子
      rect(ctx, "#b98b5a", x + 13, y + 28 - lift, 8, 1);
      rect(ctx, "#b98b5a", x + 12, y + 30 - lift, 9, 1);
      rect(ctx, TEE, x - 1, y + 25, 4, 5);
      rect(ctx, SKIN, x, y + 30, 5, 2);
      break;
    }
    case "phone": {
      torso(ctx, x + 1, y + 15, 18);
      const flick = blink(t, 260);
      head(ctx, x + 4, y, { down: true, lens: flick ? "#e9fbff" : "#9fe3ff" });
      rect(ctx, TEE, x, y + 23, 5, 7);
      rect(ctx, TEE, x + 19, y + 23, 5, 7);
      rect(ctx, SKIN, x + 4, y + 26, 5, 3);
      rect(ctx, SKIN, x + 15, y + 26, 5, 3);
      rect(ctx, "#101018", x + 8, y + 22, 8, 7);
      rect(ctx, flick ? "#c9f4ff" : "#8fdcff", x + 9, y + 23, 6, 5);
      break;
    }
    case "sleep": {
      // 枕頭、頭、棉被
      rect(ctx, "#dfe2ea", x, y + 2, 12, 8);
      rect(ctx, HAIR, x + 2, y, 8, 3);
      rect(ctx, SKIN, x + 3, y + 3, 7, 6);
      rect(ctx, FRAME, x + 4, y + 5, 3, 1);
      rect(ctx, MOUTH, x + 8, y + 7, 1, 1);
      const breath = saw(t, 2600) < 0.5 ? 0 : 1;
      rect(ctx, "#4f6484", x + 10, y + 3 - breath, 30, 9 + breath);
      rect(ctx, "#3d506d", x + 10, y + 9, 30, 3);
      rect(ctx, "#6a80a2", x + 12, y + 4 - breath, 24, 1);
      if (blink(t, 1200)) rect(ctx, "#cbd5e8", x + 4, y - 5, 2, 1);
      if (blink(t + 500, 1200)) rect(ctx, "#cbd5e8", x + 7, y - 9, 3, 1);
      break;
    }
    case "sigh": {
      const puff = saw(t, 3000);
      torso(ctx, x + 1, y + 16, 15);
      head(ctx, x + 4, y + 1, { down: true });
      rect(ctx, TEE, x, y + 22, 4, 7);
      rect(ctx, TEE, x + 20, y + 22, 4, 7);
      rect(ctx, SKIN, x, y + 29, 4, 2);
      rect(ctx, SKIN, x + 20, y + 29, 4, 2);
      rect(ctx, PANTS, x + 3, y + 31, 18, 6);
      rect(ctx, PANTS, x + 3, y + 37, 8, 7);
      rect(ctx, PANTS, x + 13, y + 37, 8, 7);
      rect(ctx, SHOE, x + 2, y + 44, 9, 2);
      rect(ctx, SHOE, x + 13, y + 44, 9, 2);
      if (puff < 0.45) rect(ctx, "#cfd6e4", x + 16 + puff * 16, y + 13 - puff * 10, 2, 1);
      break;
    }
    case "sit": {
      // 坐著發呆，只有上半身，腿由場景畫
      torso(ctx, x + 1, y + 15, 18);
      head(ctx, x + 4, y, { down: true });
      rect(ctx, TEE, x, y + 20, 4, 9);
      rect(ctx, TEE, x + 20, y + 20, 4, 9);
      rect(ctx, SKIN, x + 1, y + 29, 4, 3);
      rect(ctx, SKIN, x + 19, y + 29, 4, 3);
      break;
    }
  }
}

/** 大頭半身像，寬 64、高 70：標題、配對、畢業畫面用 */
export function drawJiahaoBust(
  ctx: Ctx,
  x: number,
  y: number,
  opts: { t?: number; phoneGlow?: boolean; gradCap?: boolean } = {}
) {
  const { t = 0, phoneGlow = false, gradCap = false } = opts;
  // 身體：肩膀很寬，整個是圓的
  rect(ctx, TEE, x + 6, y + 48, 52, 22);
  rect(ctx, TEE, x + 2, y + 54, 60, 16);
  rect(ctx, TEE_SHADE, x + 2, y + 66, 60, 4);
  rect(ctx, TEE_SHADE, x + 12, y + 56, 1, 14);
  rect(ctx, TEE_SHADE, x + 51, y + 56, 1, 14);
  // 脖子
  rect(ctx, SKIN_SHADE, x + 23, y + 42, 18, 8);
  rect(ctx, SKIN, x + 22, y + 47, 20, 4);
  // 波浪領口：比小人更明顯
  for (let i = 0; i < 32; i++) {
    const wave = [0, 1, 2, 3, 3, 2, 1, 0][i % 8];
    rect(ctx, COLLAR, x + 16 + i, y + 48 + wave + Math.abs(i - 16) * -0.12, 1, 2);
    rect(ctx, COLLAR_DARK, x + 16 + i, y + 50 + wave + Math.abs(i - 16) * -0.12, 1, 1);
  }
  // 臉
  rect(ctx, SKIN, x + 16, y + 12, 32, 34);
  rect(ctx, SKIN, x + 13, y + 22, 38, 18);
  rect(ctx, SKIN, x + 18, y + 46, 28, 2);
  rect(ctx, SKIN_SHADE, x + 13, y + 36, 3, 4);
  rect(ctx, SKIN_SHADE, x + 48, y + 36, 3, 4);
  rect(ctx, SKIN_SHADE, x + 18, y + 47, 28, 1);
  rect(ctx, SKIN_SHADE, x + 9, y + 25, 4, 9); // 耳朵
  rect(ctx, SKIN_SHADE, x + 51, y + 25, 4, 9);
  // 亂髮
  rect(ctx, HAIR, x + 14, y + 8, 36, 12);
  rect(ctx, HAIR, x + 11, y + 12, 6, 14);
  rect(ctx, HAIR, x + 47, y + 11, 6, 14);
  const spikes: readonly (readonly [number, number, number, number])[] = [
    [13, 5, 6, 5], [20, 2, 6, 7], [27, 0, 5, 9], [33, 3, 7, 6], [41, 1, 6, 8], [47, 6, 5, 6], [9, 10, 4, 6], [52, 12, 3, 6],
  ];
  for (const [sx, sy, sw, sh] of spikes) rect(ctx, HAIR, x + sx, y + sy, sw, sh);
  const fringe: readonly (readonly [number, number])[] = [[17, 5], [22, 3], [26, 7], [31, 4], [36, 6], [41, 3], [45, 5]];
  for (const [fx, fh] of fringe) rect(ctx, HAIR, x + fx, y + 19, 4, fh);
  rect(ctx, HAIR_LIGHT, x + 22, y + 10, 8, 2);
  rect(ctx, HAIR_LIGHT, x + 36, y + 8, 6, 2);
  // 粗黑框眼鏡
  const lens = phoneGlow ? (blink(t, 240) ? "#e6fbff" : "#9fe3ff") : LENS;
  rect(ctx, FRAME, x + 10, y + 27, 44, 3);
  rect(ctx, FRAME, x + 15, y + 26, 16, 13);
  rect(ctx, FRAME, x + 33, y + 26, 16, 13);
  rect(ctx, lens, x + 18, y + 29, 10, 7);
  rect(ctx, lens, x + 36, y + 29, 10, 7);
  rect(ctx, "#ffffff", x + 19, y + 30, 3, 1);
  rect(ctx, "#ffffff", x + 37, y + 30, 3, 1);
  // 眼睛和嘴
  const closed = !phoneGlow && saw(t, 3400) > 0.95;
  if (closed) {
    rect(ctx, FRAME, x + 20, y + 33, 6, 1);
    rect(ctx, FRAME, x + 38, y + 33, 6, 1);
  } else {
    rect(ctx, FRAME, x + 22, y + 31, 3, 3);
    rect(ctx, FRAME, x + 40, y + 31, 3, 3);
  }
  rect(ctx, SKIN_SHADE, x + 30, y + 40, 4, 1);
  rect(ctx, MOUTH, x + 27, y + 43, 10, 1);
  rect(ctx, MOUTH, x + 26, y + 42, 1, 1);
  // 鬍渣
  for (const [sx, sy] of [[20, 44], [24, 46], [40, 46], [44, 44], [30, 46], [35, 45]] as const) {
    rect(ctx, SKIN_SHADE, x + sx, y + sy, 1, 1);
  }
  if (phoneGlow) glow(ctx, "#bfeeff", x + 32, y + 66, 12, t);
  if (gradCap) {
    rect(ctx, "#101018", x + 12, y + 2, 40, 8);
    rect(ctx, "#101018", x + 2, y - 2, 60, 5);
    rect(ctx, "#2a2a3a", x + 2, y - 2, 60, 1);
    rect(ctx, "#e8c64a", x + 50, y + 2, 2, 16);
    rect(ctx, "#e8c64a", x + 48, y + 17, 6, 4);
  }
}
