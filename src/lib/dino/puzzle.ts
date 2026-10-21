/**
 * 恐龍拼圖：恐龍清單、切片、版面配置與吸附判斷（純函式，方便測試）。
 */

/** 每張恐龍圖的 SVG 座標大小（正方形） */
export const ART_SIZE = 300;

export type DinoId = "trex" | "triceratops" | "stegosaurus" | "brachiosaurus" | "pteranodon" | "ankylosaurus";

export interface Dino {
  id: DinoId;
  name: string;
  color: string;
}

export const DINOS: Dino[] = [
  { id: "trex", name: "暴龍", color: "#66BB6A" },
  { id: "triceratops", name: "三角龍", color: "#FFA726" },
  { id: "stegosaurus", name: "劍龍", color: "#26A69A" },
  { id: "brachiosaurus", name: "腕龍", color: "#42A5F5" },
  { id: "pteranodon", name: "翼手龍", color: "#EC407A" },
  { id: "ankylosaurus", name: "甲龍", color: "#8D6E63" },
];

export const LEVELS = [
  { label: "🐣 4 片", cols: 2, rows: 2 },
  { label: "🦕 6 片", cols: 3, rows: 2 },
  { label: "🦖 8 片", cols: 4, rows: 2 },
];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

/** 第 i 片在原圖上的範圍（由左到右、由上到下編號） */
export function pieceRect(i: number, cols: number, rows: number): Rect {
  const w = ART_SIZE / cols;
  const h = ART_SIZE / rows;
  return { x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h };
}

export interface PuzzleLayout {
  board: { x: number; y: number; size: number };
  cellW: number;
  cellH: number;
  /** 托盤上每個位置的左上角 */
  tray: Point[];
  /** 拼板上第 i 格的左上角 */
  slot: (i: number) => Point;
}

/**
 * 在 w×h 的區域裡擺一塊正方形拼板和放碎片的托盤（碎片跟拼板上的格子一樣大）。
 * 托盤放在拼板下方或右邊、排成幾欄都試一遍，挑拼板最大的那種。
 */
export function layoutPuzzle(w: number, h: number, cols: number, rows: number, gap = 12): PuzzleLayout {
  const n = cols * rows;
  let best = { size: 0, side: "bottom" as "bottom" | "right", k: n };
  for (let k = 1; k <= n; k++) {
    const r = Math.ceil(n / k);
    const bottom = Math.min(
      w - 2 * gap,
      ((w - (k + 1) * gap) * cols) / k,
      (h - (r + 2) * gap) / (1 + r / rows)
    );
    const right = Math.min(
      h - 2 * gap,
      ((h - (r + 1) * gap) * rows) / r,
      (w - (k + 2) * gap) / (1 + k / cols)
    );
    if (bottom > best.size) best = { size: bottom, side: "bottom", k };
    if (right > best.size) best = { size: right, side: "right", k };
  }

  const size = Math.max(0, best.size);
  const { k, side } = best;
  const cellW = size / cols;
  const cellH = size / rows;
  const r = Math.ceil(n / k);
  const trayW = k * cellW + (k - 1) * gap;
  const trayH = r * cellH + (r - 1) * gap;

  let board: PuzzleLayout["board"];
  let trayX: number;
  let trayY: number;
  if (side === "bottom") {
    const y0 = (h - (size + gap + trayH)) / 2;
    board = { x: (w - size) / 2, y: y0, size };
    trayX = (w - trayW) / 2;
    trayY = y0 + size + gap;
  } else {
    const x0 = (w - (size + gap + trayW)) / 2;
    board = { x: x0, y: (h - size) / 2, size };
    trayX = x0 + size + gap;
    trayY = (h - trayH) / 2;
  }

  const tray: Point[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / k);
    // 最後一排沒排滿時置中
    const inRow = Math.min(k, n - row * k);
    const rowX = trayX + (trayW - (inRow * cellW + (inRow - 1) * gap)) / 2;
    tray.push({ x: rowX + (i % k) * (cellW + gap), y: trayY + row * (cellH + gap) });
  }

  const slot = (i: number): Point => ({
    x: board.x + (i % cols) * cellW,
    y: board.y + Math.floor(i / cols) * cellH,
  });

  return { board, cellW, cellH, tray, slot };
}

/** 碎片（左上角 x,y）的中心有沒有落在那一格裡 */
export function isNearSlot(x: number, y: number, slotX: number, slotY: number, cellW: number, cellH: number): boolean {
  return Math.abs(x - slotX) <= cellW / 2 && Math.abs(y - slotY) <= cellH / 2;
}

/** 0..n-1 打亂的順序（不會剛好照原順序，托盤才不會一眼就是答案） */
export function shuffledOrder(n: number, rand: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return order;
  do {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (order.every((v, i) => v === i));
  return order;
}
