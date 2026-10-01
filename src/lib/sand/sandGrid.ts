/**
 * 格子沙（falling sand 細胞自動機，側視圖）。
 * 畫面切成固定大小的格子，每格最多一粒沙；第 0 列在最上面。
 * 所有函式皆為純運算，方便測試。
 */

export const EMPTY = 0;
/** 鬆沙：往下掉，下面被擋住就往左下 / 右下滑 */
export const LOOSE = 1;
/** 被模具壓過的紮實沙：只會直直往下掉，不會往旁邊滑，所以能維持形狀 */
export const PACKED = 2;
/** 工具本體（手指 / 模具）暫時佔住的格子，沙進不來 */
export const WALL = 3;

const KIND_MASK = 3;
const TINT_SHIFT = 2;
/** 每粒沙帶的色差種類數，跟著沙粒一起移動 */
export const TINT_COUNT = 4;

/** 被擠開的沙最遠落在工具外側幾格內 */
const DISPLACE_SPREAD = 10;
/** 每粒被擠開的沙試幾個落點，挑最低的（沙堆才不會變成細高的柱子） */
const DISPLACE_TRIES = 3;

export interface SandGrid {
  cols: number;
  rows: number;
  /** 每格一個位元組：低 2 位元是種類，其餘是色差 */
  cells: Uint8Array;
}

export interface ToolProfile {
  id: string;
  label: string;
  emoji: string;
  color: string;
  /** 工具半寬（px） */
  halfWidth: number;
  /** 工具本體高度（px），從底緣往上畫 */
  bodyHeight: number;
  /**
   * 回傳距離中心 dx（px）處塑形面相對工具底緣的位置（px）。
   * 正值 = 在底緣下方（實心，往下壓沙）；負值 = 在底緣上方（倒扣模具的凹槽）。
   */
  profile: (dx: number) => number;
}

type Rand = () => number;
type Inside = (col: number, row: number) => boolean;

export const kindOf = (cell: number) => cell & KIND_MASK;
export const tintOf = (cell: number) => cell >> TINT_SHIFT;

const looseGrain = (rand: Rand) =>
  LOOSE | (Math.floor(rand() * TINT_COUNT) << TINT_SHIFT);

const isSand = (cell: number) => {
  const kind = cell & KIND_MASK;
  return kind === LOOSE || kind === PACKED;
};

export function createSandGrid(
  cols: number,
  rows: number,
  rand: Rand = Math.random
): SandGrid {
  const cells = new Uint8Array(cols * rows);
  const base = rows * 0.22;
  const bump = rows * 0.18;
  const center = cols / 2;
  const sigma = cols / 6;
  for (let c = 0; c < cols; c++) {
    const d = (c - center) / sigma;
    const height = Math.min(rows - 1, Math.round(base + bump * Math.exp(-d * d)));
    for (let r = rows - height; r < rows; r++) {
      cells[r * cols + c] = looseGrain(rand);
    }
  }
  return { cols, rows, cells };
}

export function countSand(g: SandGrid): number {
  let n = 0;
  for (let i = 0; i < g.cells.length; i++) if (isSand(g.cells[i])) n++;
  return n;
}

/**
 * 模擬一步：由下往上掃，每粒沙往下掉一格；下面被擋住的鬆沙改往左下 / 右下滑。
 * 每列隨機決定掃描方向，避免沙堆偏向某一邊。
 */
export function stepGrid(g: SandGrid, rand: Rand = Math.random): void {
  const { cols, rows, cells } = g;
  for (let r = rows - 2; r >= 0; r--) {
    const leftToRight = rand() < 0.5;
    for (let k = 0; k < cols; k++) {
      const c = leftToRight ? k : cols - 1 - k;
      const i = r * cols + c;
      const v = cells[i];
      if (v === EMPTY) continue;
      const kind = v & KIND_MASK;
      if (kind === WALL) continue;
      const below = i + cols;
      if (cells[below] === EMPTY) {
        cells[below] = v;
        cells[i] = EMPTY;
        continue;
      }
      if (kind !== LOOSE) continue;
      const left = c > 0 && cells[below - 1] === EMPTY;
      const right = c < cols - 1 && cells[below + 1] === EMPTY;
      if (!left && !right) continue;
      const to = left && right ? (rand() < 0.5 ? below - 1 : below + 1) : left ? below - 1 : below + 1;
      cells[to] = v;
      cells[i] = EMPTY;
    }
  }
}

/**
 * 工具「推 / 壓」沙：[c0, c1] × [r0, r1] 內 inside 為 true 的沙粒被擠到範圍外側，
 * 落在外側附近最低的空位，並變回鬆沙。
 * dir > 0.3 只擠到右邊、dir < -0.3 只擠到左邊，否則擠到離得近的那一側；
 * 該側沒有空間（貼著邊界）就改擠到另一側，完全沒有空位的沙會被丟棄。
 * 回傳被移動的沙粒數。
 */
export function displace(
  g: SandGrid,
  c0: number,
  r0: number,
  c1: number,
  r1: number,
  inside: Inside,
  dir: number,
  rand: Rand = Math.random
): number {
  const { cols, rows, cells } = g;
  const cLo = Math.max(0, c0);
  const cHi = Math.min(cols - 1, c1);
  const rLo = Math.max(0, r0);
  const rHi = Math.min(rows - 1, r1);
  const mid = (c0 + c1) / 2;
  const rightLo = c1 + 1;
  const rightHi = Math.min(cols - 1, c1 + DISPLACE_SPREAD);
  const leftLo = Math.max(0, c0 - DISPLACE_SPREAD);
  const leftHi = c0 - 1;
  const hasRight = rightLo <= rightHi;
  const hasLeft = leftLo <= leftHi;

  let moved = 0;
  for (let r = rLo; r <= rHi; r++) {
    for (let c = cLo; c <= cHi; c++) {
      const i = r * cols + c;
      const v = cells[i];
      if (!isSand(v) || !inside(c, r)) continue;
      cells[i] = EMPTY;
      moved++;

      let toRight = dir > 0.3 ? true : dir < -0.3 ? false : c >= mid;
      if (toRight && !hasRight) toRight = false;
      else if (!toRight && !hasLeft) toRight = true;
      if (toRight ? !hasRight : !hasLeft) continue;
      const lo = toRight ? rightLo : leftLo;
      const span = (toRight ? rightHi : leftHi) - lo + 1;

      let bestRow = -1;
      let bestCol = 0;
      for (let t = 0; t < DISPLACE_TRIES; t++) {
        const tc = lo + Math.floor(rand() * span);
        let tr = r;
        while (tr >= 0 && cells[tr * cols + tc] !== EMPTY) tr--;
        if (tr > bestRow) {
          bestRow = tr;
          bestCol = tc;
        }
      }
      if (bestRow >= 0) {
        cells[bestRow * cols + bestCol] = LOOSE | (tintOf(v) << TINT_SHIFT);
      }
    }
  }
  return moved;
}

/** 從 (col, row) 開始往下，把連續的沙標成紮實；起點不是沙就不做事。 */
export function packBelow(g: SandGrid, col: number, row: number): void {
  if (col < 0 || col >= g.cols) return;
  for (let r = Math.max(0, row); r < g.rows; r++) {
    const i = r * g.cols + col;
    const v = g.cells[i];
    if (!isSand(v)) return;
    g.cells[i] = PACKED | (tintOf(v) << TINT_SHIFT);
  }
}

/**
 * 把 [c0, c1] × [r0, r1] 內 inside 為 true 的空格填成紮實沙（模具裡預先裝好的沙）。
 * 回傳填入的粒數。
 */
export function fillPacked(
  g: SandGrid,
  c0: number,
  r0: number,
  c1: number,
  r1: number,
  inside: Inside,
  rand: Rand = Math.random
): number {
  const cHi = Math.min(g.cols - 1, c1);
  const rHi = Math.min(g.rows - 1, r1);
  let added = 0;
  for (let r = Math.max(0, r0); r <= rHi; r++) {
    for (let c = Math.max(0, c0); c <= cHi; c++) {
      const i = r * g.cols + c;
      if (g.cells[i] !== EMPTY || !inside(c, r)) continue;
      g.cells[i] = PACKED | (tintOf(looseGrain(rand)) << TINT_SHIFT);
      added++;
    }
  }
  return added;
}

/**
 * 在 (col, row) 附近 spreadCols 寬的範圍內放入最多 count 粒鬆沙，只放進空格。
 * 回傳實際加入的粒數。
 */
export function pourGrid(
  g: SandGrid,
  col: number,
  row: number,
  count: number,
  spreadCols: number,
  rand: Rand = Math.random
): number {
  const r = Math.max(0, Math.min(g.rows - 1, row));
  let added = 0;
  for (let k = 0; k < count; k++) {
    const c = col + Math.round((rand() - 0.5) * spreadCols);
    if (c < 0 || c >= g.cols) continue;
    const i = r * g.cols + c;
    if (g.cells[i] !== EMPTY) continue;
    g.cells[i] = looseGrain(rand);
    added++;
  }
  return added;
}

/** 把 [c0, c1] × [r0, r1] 內 inside 為 true 的空格暫時變成牆，讓沙靠在工具上。 */
export function stampWall(
  g: SandGrid,
  c0: number,
  r0: number,
  c1: number,
  r1: number,
  inside: Inside
): void {
  const cHi = Math.min(g.cols - 1, c1);
  const rHi = Math.min(g.rows - 1, r1);
  for (let r = Math.max(0, r0); r <= rHi; r++) {
    for (let c = Math.max(0, c0); c <= cHi; c++) {
      const i = r * g.cols + c;
      if (g.cells[i] === EMPTY && inside(c, r)) g.cells[i] = WALL;
    }
  }
}

/** 清掉 [c0, c1] × [r0, r1] 內的牆。 */
export function clearWall(
  g: SandGrid,
  c0: number,
  r0: number,
  c1: number,
  r1: number
): void {
  const cHi = Math.min(g.cols - 1, c1);
  const rHi = Math.min(g.rows - 1, r1);
  for (let r = Math.max(0, r0); r <= rHi; r++) {
    for (let c = Math.max(0, c0); c <= cHi; c++) {
      const i = r * g.cols + c;
      if (g.cells[i] === WALL) g.cells[i] = EMPTY;
    }
  }
}

export const TOOL_PROFILES: ToolProfile[] = [
  {
    id: "flat",
    label: "壓平",
    emoji: "🟦",
    color: "#4FC3F7",
    halfWidth: 48,
    bodyHeight: 26,
    profile: () => 12,
  },
  {
    id: "castle",
    label: "城堡",
    emoji: "🏰",
    color: "#EF5350",
    halfWidth: 65,
    bodyHeight: 58,
    // 倒扣的城堡模具：5 段，塔（高 46）與城牆（高 28）交錯，最外側為模具邊緣
    profile: (dx) => {
      const seg = Math.floor((dx + 65) / 26);
      return seg % 2 === 0 ? -46 : -28;
    },
  },
  {
    id: "wave",
    label: "波浪",
    emoji: "🌊",
    color: "#81C784",
    halfWidth: 54,
    bodyHeight: 44,
    profile: (dx) => -(22 + 9 * Math.sin(dx / 9)),
  },
  {
    id: "dome",
    label: "小山",
    emoji: "⛰️",
    color: "#FFD54F",
    halfWidth: 42,
    bodyHeight: 54,
    profile: (dx) => -Math.sqrt(Math.max(0, 42 * 42 - dx * dx)),
  },
];
