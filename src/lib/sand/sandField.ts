/**
 * 一維沙子高度場（側視圖）。
 * 每一欄代表畫面上固定寬度的一條沙柱，h[i] 為該欄的沙高（px）。
 * 所有函式皆為純運算，方便測試。
 */

export interface SandField {
  h: Float64Array;
  maxH: number;
}

export interface ToolProfile {
  id: string;
  label: string;
  emoji: string;
  color: string;
  /** 工具半寬（px） */
  halfWidth: number;
  /** 工具本體高度（px），從中心往上畫 */
  bodyHeight: number;
  /** 回傳工具中心以下、距離 dx（px）處底部的深度（px，>= 0） */
  profile: (dx: number) => number;
}

export function createSandField(cols: number, maxH: number): SandField {
  const h = new Float64Array(cols);
  const base = maxH * 0.22;
  const bump = maxH * 0.18;
  const center = cols / 2;
  const sigma = cols / 6;
  for (let i = 0; i < cols; i++) {
    const d = (i - center) / sigma;
    h[i] = base + bump * Math.exp(-d * d);
  }
  return { h, maxH };
}

export function totalSand(f: SandField): number {
  let s = 0;
  for (let i = 0; i < f.h.length; i++) s += f.h[i];
  return s;
}

/**
 * 安息角鬆弛：相鄰兩欄高度差超過 maxDiff 時，把多出的一半移到低的那欄。
 * 左→右、右→左各掃一次。rate 為 1 時一次就把差距修正到 maxDiff。
 */
export function relaxField(
  f: SandField,
  maxDiff: number,
  rate = 1,
  from = 0,
  to = f.h.length
): void {
  const h = f.h;
  const start = Math.max(0, from);
  const end = Math.min(h.length, to);
  const step = (i: number, j: number) => {
    const d = h[i] - h[j];
    if (d > maxDiff) {
      const t = ((d - maxDiff) / 2) * rate;
      h[i] -= t;
      h[j] += t;
    } else if (-d > maxDiff) {
      const t = ((-d - maxDiff) / 2) * rate;
      h[j] -= t;
      h[i] += t;
    }
  };
  for (let i = start; i < end - 1; i++) step(i, i + 1);
  for (let i = end - 2; i >= start; i--) step(i, i + 1);
}

/** 從 startCol 開始往 dir 方向逐欄堆放 amount 的沙，權重遞減；到邊界或超過 maxH 就丟棄。 */
function depositSide(
  f: SandField,
  startCol: number,
  dir: 1 | -1,
  amount: number,
  spread = 24
): void {
  const h = f.h;
  let remaining = amount;
  // 第一輪：三角形權重分布
  const weightSum = (spread * (spread + 1)) / 2;
  for (let k = 0; k < spread && remaining > 0; k++) {
    const i = startCol + dir * k;
    if (i < 0 || i >= h.length) return;
    const want = (amount * (spread - k)) / weightSum;
    const room = f.maxH - h[i];
    const put = Math.min(want, room, remaining);
    if (put > 0) {
      h[i] += put;
      remaining -= put;
    }
  }
  // 第二輪：把放不下的往外繼續填
  let i = startCol;
  while (remaining > 1e-6 && i >= 0 && i < h.length) {
    const room = f.maxH - h[i];
    if (room > 0) {
      const put = Math.min(room, remaining);
      h[i] += put;
      remaining -= put;
    }
    i += dir;
  }
}

/**
 * 用工具「壓 / 挖」沙：範圍 [centerCol - halfWidthCols, centerCol + halfWidthCols] 內，
 * 每欄沙高被截斷到 cap(dxCols)；多出的沙依 dir 堆到外側。
 * dir > 0.3 只堆右邊、dir < -0.3 只堆左邊，否則兩側平分。
 * 回傳被移動的沙量。
 */
export function carveField(
  f: SandField,
  centerCol: number,
  halfWidthCols: number,
  cap: (dxCols: number) => number,
  dir: number
): number {
  const h = f.h;
  const c = Math.round(centerCol);
  const hw = Math.max(0, Math.round(halfWidthCols));
  const lo = Math.max(0, c - hw);
  const hi = Math.min(h.length - 1, c + hw);
  let excess = 0;
  for (let i = lo; i <= hi; i++) {
    const allowed = Math.max(0, cap(i - c));
    if (h[i] > allowed) {
      excess += h[i] - allowed;
      h[i] = allowed;
    }
  }
  if (excess <= 0) return 0;

  if (dir > 0.3) {
    depositSide(f, hi + 1, 1, excess);
  } else if (dir < -0.3) {
    depositSide(f, lo - 1, -1, excess);
  } else {
    depositSide(f, hi + 1, 1, excess / 2);
    depositSide(f, lo - 1, -1, excess / 2);
  }
  return excess;
}

/**
 * 在 centerCol 附近倒入 amount 的沙（高斯分布，radiusCols 約為 2 個標準差）。
 * 回傳實際加入量（受 maxH 限制）。
 */
export function pourField(
  f: SandField,
  centerCol: number,
  radiusCols: number,
  amount: number
): number {
  const h = f.h;
  const c = Math.round(centerCol);
  const r = Math.max(1, Math.round(radiusCols));
  const sigma = r / 2;
  const weights: number[] = [];
  let wSum = 0;
  for (let k = -r; k <= r; k++) {
    const w = Math.exp(-(k * k) / (2 * sigma * sigma));
    weights.push(w);
    wSum += w;
  }
  let added = 0;
  for (let k = -r; k <= r; k++) {
    const i = c + k;
    if (i < 0 || i >= h.length) continue;
    const want = (amount * weights[k + r]) / wSum;
    const put = Math.min(want, f.maxH - h[i]);
    if (put > 0) {
      h[i] += put;
      added += put;
    }
  }
  return added;
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
    halfWidth: 60,
    bodyHeight: 30,
    profile: (dx) => {
      const tooth = Math.floor((dx + 60) / 24) % 2 === 0;
      return tooth ? 24 : 8;
    },
  },
  {
    id: "wave",
    label: "波浪",
    emoji: "🌊",
    color: "#81C784",
    halfWidth: 54,
    bodyHeight: 26,
    profile: (dx) => 16 + 9 * Math.sin(dx / 9),
  },
  {
    id: "bowl",
    label: "圓碗",
    emoji: "🥣",
    color: "#FFD54F",
    halfWidth: 42,
    bodyHeight: 18,
    profile: (dx) => Math.sqrt(Math.max(0, 42 * 42 - dx * dx)),
  },
];
