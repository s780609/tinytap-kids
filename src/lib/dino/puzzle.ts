/**
 * 恐龍拼圖：恐龍清單、切片、版面配置與吸附判斷（純函式，方便測試）。
 */

/** 每張恐龍圖的 SVG 座標大小（正方形） */
export const ART_SIZE = 300;

export type DinoId =
  | "trex"
  | "triceratops"
  | "stegosaurus"
  | "brachiosaurus"
  | "pteranodon"
  | "ankylosaurus"
  | "velociraptor"
  | "spinosaurus"
  | "parasaurolophus"
  | "pachycephalosaurus"
  | "plesiosaurus"
  | "baby";

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
  { id: "velociraptor", name: "迅猛龍", color: "#7E57C2" },
  { id: "spinosaurus", name: "棘龍", color: "#EF5350" },
  { id: "parasaurolophus", name: "副櫛龍", color: "#C0CA33" },
  { id: "pachycephalosaurus", name: "厚頭龍", color: "#5C6BC0" },
  { id: "plesiosaurus", name: "蛇頸龍", color: "#00838F" },
  { id: "baby", name: "恐龍寶寶", color: "#FF8A65" },
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
  /** 榫頭最多凸出多遠（px），沒有榫頭時為 0 */
  margin: number;
  /** 托盤上的碎片縮小的比例 */
  trayScale: number;
  /** 托盤上每個位置的左上角（不含榫頭、已縮小） */
  tray: Point[];
  /** 拼板上第 i 格的左上角 */
  slot: (i: number) => Point;
}

/** 有榫頭時，托盤上的碎片縮小成這個比例（拿起來就恢復原大），拼板才不會被擠小 */
export const TRAY_SCALE = 0.75;

/**
 * 在 w×h 的區域裡擺一塊正方形拼板和放碎片的托盤（碎片跟拼板上的格子一樣大）。
 * 托盤放在拼板下方或右邊、排成幾欄都試一遍，挑拼板最大的那種。
 * tabs 為 true 時碎片四周會凸出榫頭（最多 margin），托盤上的碎片縮成 TRAY_SCALE，間距也把榫頭算進去。
 */
export function layoutPuzzle(w: number, h: number, cols: number, rows: number, gap = 12, tabs = false): PuzzleLayout {
  const n = cols * rows;
  const ts = tabs ? TRAY_SCALE : 1;
  // 一片在托盤上佔的寬高（以拼板邊長為 1）
  const e = tabs ? TAB * TAB_REACH * Math.min(1 / cols, 1 / rows) : 0;
  const fw = (1 / cols + 2 * e) * ts;
  const fh = (1 / rows + 2 * e) * ts;
  let best = { size: 0, side: "bottom" as "bottom" | "right", k: n };
  for (let k = 1; k <= n; k++) {
    const r = Math.ceil(n / k);
    const bottom = Math.min(w - 2 * gap, (w - (k + 1) * gap) / (k * fw), (h - (r + 2) * gap) / (1 + r * fh));
    const right = Math.min(h - 2 * gap, (h - (r + 1) * gap) / (r * fh), (w - (k + 2) * gap) / (1 + k * fw));
    if (bottom > best.size) best = { size: bottom, side: "bottom", k };
    if (right > best.size) best = { size: right, side: "right", k };
  }

  const size = Math.max(0, best.size);
  const { k, side } = best;
  const cellW = size / cols;
  const cellH = size / rows;
  const margin = e * size;
  const footW = fw * size;
  const footH = fh * size;
  const r = Math.ceil(n / k);
  const trayW = k * footW + (k - 1) * gap;
  const trayH = r * footH + (r - 1) * gap;

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
    const rowX = trayX + (trayW - (inRow * footW + (inRow - 1) * gap)) / 2;
    tray.push({ x: rowX + (i % k) * (footW + gap) + margin * ts, y: trayY + row * (footH + gap) + margin * ts });
  }

  const slot = (i: number): Point => ({
    x: board.x + (i % cols) * cellW,
    y: board.y + Math.floor(i / cols) * cellH,
  });

  return { board, cellW, cellH, margin, trayScale: ts, tray, slot };
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

// ---------- 公母頭（榫頭） ----------

/** 榫頭大小：較短邊的比例；最多凸出榫頭大小的幾倍 */
export const TAB = 0.25;
export const TAB_REACH = 1.1;

/** 一片的四個邊：1 凸出（公頭）、-1 凹進（母頭）、0 平的（拼圖外框） */
export interface Edges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** 隨機決定每條內部邊誰凸誰凹；相鄰兩片一定一凸一凹，外框是平的 */
export function makeEdges(cols: number, rows: number, rand: () => number = Math.random): Edges[] {
  const edges: Edges[] = Array.from({ length: cols * rows }, () => ({ top: 0, right: 0, bottom: 0, left: 0 }));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (c < cols - 1) {
        const v = rand() < 0.5 ? 1 : -1;
        edges[i].right = v;
        edges[i + 1].left = -v;
      }
      if (r < rows - 1) {
        const v = rand() < 0.5 ? 1 : -1;
        edges[i].bottom = v;
        edges[i + cols].top = -v;
      }
    }
  }
  return edges;
}

/**
 * 榫頭的形狀：以邊的中點為原點，[沿著邊, 往外] 的座標（單位是榫頭大小）。
 * 左右對稱，所以相鄰那片反方向走同一條邊時剛好是同一條曲線。
 */
const KNOB: [number, number][][] = [
  [[-0.15, 0], [-0.25, 0.25], [-0.4, 0.45]],
  [[-0.6, 0.75], [-0.35, 1.05], [0, 1.05]],
  [[0.35, 1.05], [0.6, 0.75], [0.4, 0.45]],
  [[0.25, 0.25], [0.15, 0], [0.5, 0]],
];

const f2 = (v: number) => Math.round(v * 100) / 100;

/**
 * 一片的外形（SVG path），矩形左上角在 (x, y)、大小 w×h，順時針走一圈。
 * tab 為榫頭大小（px），通常是 TAB × 較短邊。
 */
export function piecePath(x: number, y: number, w: number, h: number, e: Edges, tab: number): string {
  const parts = [`M${f2(x)},${f2(y)}`];
  // 每條邊：起點、方向、往外的法線、長度、凸凹
  const sides: [number, number, number, number, number, number, number, number][] = [
    [x, y, 1, 0, 0, -1, w, e.top],
    [x + w, y, 0, 1, 1, 0, h, e.right],
    [x + w, y + h, -1, 0, 0, 1, w, e.bottom],
    [x, y + h, 0, -1, -1, 0, h, e.left],
  ];
  for (const [sx, sy, dx, dy, nx, ny, len, sign] of sides) {
    const at = (a: number, b: number) => {
      const along = len / 2 + a * tab;
      const out = b * tab * sign;
      return `${f2(sx + dx * along + nx * out)},${f2(sy + dy * along + ny * out)}`;
    };
    if (sign !== 0) {
      parts.push(`L${at(-0.5, 0)}`);
      for (const [c1, c2, p] of KNOB) parts.push(`C${at(c1[0], c1[1])} ${at(c2[0], c2[1])} ${at(p[0], p[1])}`);
    }
    parts.push(`L${f2(sx + dx * len)},${f2(sy + dy * len)}`);
  }
  parts.push("Z");
  return parts.join(" ");
}
