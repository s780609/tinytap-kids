/**
 * 判定、計分、combo、星數與評級（純函式，時間單位秒）。
 * 對小朋友友善：太早按不罰、長按按到尾巴自動完成、結算至少 1 顆星。
 */

import { LANE_COUNT, type Chart, type ChartNote } from "./chart.ts";

export type Judgement = "perfect" | "good" | "miss";

export interface Windows {
  perfect: number;
  good: number;
  holdRelease: number;
}

export const BASE_WINDOWS: Windows = { perfect: 0.1, good: 0.2, holdRelease: 0.25 };

const EPS = 1e-9;

export function windowsFor(scale: number): Windows {
  return {
    perfect: BASE_WINDOWS.perfect * scale,
    good: BASE_WINDOWS.good * scale,
    holdRelease: BASE_WINDOWS.holdRelease * scale,
  };
}

/** |offset| ≤ perfect → perfect；≤ good → good；否則 null（不算這次按壓） */
export function judgeOffset(offset: number, w: Windows): Judgement | null {
  const d = Math.abs(offset);
  if (d <= w.perfect + EPS) return "perfect";
  if (d <= w.good + EPS) return "good";
  return null;
}

export const POINTS = { perfect: 100, good: 60, holdTail: 100 };
export const COMBO_BONUS_PER = 2;
export const COMBO_BONUS_CAP = 50;

export interface NoteState {
  note: ChartNote;
  head: Judgement | null;
  tail: Judgement | null;
  holding: boolean;
}

export interface Counts {
  perfect: number;
  good: number;
  miss: number;
}

export interface PlayState {
  notes: NoteState[];
  score: number;
  combo: number;
  maxCombo: number;
  counts: Counts;
  /** 每軌正在長按的音符 id */
  holdingByLane: (number | null)[];
}

export type PlayEvent = {
  lane: number;
  noteId: number;
  part: "head" | "tail";
  judgement: Judgement;
  combo: number;
};

export function createPlayState(chart: Chart, laneCount = LANE_COUNT): PlayState {
  return {
    notes: [...chart.notes]
      .sort((a, b) => a.time - b.time)
      .map((note) => ({ note, head: null, tail: null, holding: false })),
    score: 0,
    combo: 0,
    maxCombo: 0,
    counts: { perfect: 0, good: 0, miss: 0 },
    holdingByLane: Array.from({ length: laneCount }, () => null),
  };
}

/** 命中加分 = 基本分 + min(命中前的 combo, CAP) × PER，之後 combo + 1；miss 不加分、combo 歸零 */
export function applyJudgement(s: PlayState, j: Judgement, part: "head" | "tail"): void {
  if (j === "miss") {
    s.counts.miss++;
    s.combo = 0;
    return;
  }
  const base = part === "tail" && j === "perfect" ? POINTS.holdTail : POINTS[j];
  s.score += base + Math.min(s.combo, COMBO_BONUS_CAP) * COMBO_BONUS_PER;
  s.combo++;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  s.counts[j]++;
}

function judgeTail(s: PlayState, ns: NoteState, j: Judgement): PlayEvent {
  ns.tail = j;
  ns.holding = false;
  if (s.holdingByLane[ns.note.lane] === ns.note.id) s.holdingByLane[ns.note.lane] = null;
  applyJudgement(s, j, "tail");
  return { lane: ns.note.lane, noteId: ns.note.id, part: "tail", judgement: j, combo: s.combo };
}

/** 同軌最早一顆 head 未判定、且 note.time − t ≤ good 的音符（最早，不是最近）；若是 hold 就開始按住 */
export function pressLane(s: PlayState, lane: number, t: number, w: Windows): PlayEvent | null {
  if (s.holdingByLane[lane] != null) return null;
  for (const ns of s.notes) {
    if (ns.note.lane !== lane || ns.head !== null) continue;
    // 已經過了 good 視窗的音符留給 advance 判 miss
    if (t - ns.note.time > w.good + EPS) continue;
    if (ns.note.time - t > w.good + EPS) return null; // 太早：不罰
    const j = judgeOffset(t - ns.note.time, w);
    if (j === null) return null;
    ns.head = j;
    applyJudgement(s, j, "head");
    if (ns.note.type === "hold") {
      ns.holding = true;
      s.holdingByLane[lane] = ns.note.id;
    }
    return { lane, noteId: ns.note.id, part: "head", judgement: j, combo: s.combo };
  }
  return null;
}

/** 只在該軌正在長按時有作用：t ≥ endTime − holdRelease → tail perfect，否則 tail miss */
export function releaseLane(s: PlayState, lane: number, t: number, w: Windows): PlayEvent | null {
  const id = s.holdingByLane[lane];
  if (id == null) return null;
  const ns = s.notes.find((n) => n.note.id === id);
  if (!ns || !ns.holding) {
    s.holdingByLane[lane] = null;
    return null;
  }
  return judgeTail(s, ns, t >= ns.note.endTime - w.holdRelease - EPS ? "perfect" : "miss");
}

/** 每幀呼叫：head 超過 time + good 未按 → miss（hold 頭尾都 miss）；按住到 endTime → 自動 tail perfect */
export function advance(s: PlayState, t: number, w: Windows): PlayEvent[] {
  const events: PlayEvent[] = [];
  for (const ns of s.notes) {
    const n = ns.note;
    if (ns.head === null) {
      if (t > n.time + w.good + EPS) {
        ns.head = "miss";
        applyJudgement(s, "miss", "head");
        events.push({ lane: n.lane, noteId: n.id, part: "head", judgement: "miss", combo: s.combo });
        if (n.type === "hold") {
          ns.tail = "miss";
          applyJudgement(s, "miss", "tail");
          events.push({ lane: n.lane, noteId: n.id, part: "tail", judgement: "miss", combo: s.combo });
        }
      }
    } else if (ns.holding && t >= n.endTime) {
      events.push(judgeTail(s, ns, "perfect"));
    }
  }
  return events;
}

/** tap 數 + hold 數 × 2 */
export function totalJudgements(chart: Chart): number {
  return chart.notes.reduce((sum, n) => sum + (n.type === "hold" ? 2 : 1), 0);
}

/** (perfect + 0.6 × good) / 總數；總數 0 → 0 */
export function accuracy(c: Counts): number {
  const total = c.perfect + c.good + c.miss;
  if (total === 0) return 0;
  return (c.perfect + 0.6 * c.good) / total;
}

export function starsFor(acc: number): 1 | 2 | 3 {
  if (acc >= 0.9) return 3;
  if (acc >= 0.6) return 2;
  return 1;
}

export function rankFor(acc: number): { rank: "S" | "A" | "B" | "C"; title: string } {
  if (acc >= 0.95) return { rank: "S", title: "超級巨星" };
  if (acc >= 0.85) return { rank: "A", title: "閃亮明星" };
  if (acc >= 0.7) return { rank: "B", title: "小小樂手" };
  return { rank: "C", title: "繼續加油" };
}

export interface SongResult {
  score: number;
  maxCombo: number;
  counts: Counts;
  accuracy: number;
  stars: 1 | 2 | 3;
  rank: string;
  fullCombo: boolean;
}

export function summarize(s: PlayState): SongResult {
  const acc = accuracy(s.counts);
  return {
    score: s.score,
    maxCombo: s.maxCombo,
    counts: { ...s.counts },
    accuracy: acc,
    stars: starsFor(acc),
    rank: rankFor(acc).rank,
    fullCombo: s.counts.miss === 0 && s.counts.perfect + s.counts.good > 0,
  };
}

/** 全部判定完且 t ≥ chart.endTime */
export function isSongOver(s: PlayState, t: number, chart: Chart): boolean {
  if (t < chart.endTime) return false;
  return s.notes.every((ns) => ns.head !== null && (ns.note.type !== "hold" || ns.tail !== null));
}

/** 沒有舊紀錄為 true；分數較高才取代 */
export function isBetterResult(prev: SongResult | undefined, next: SongResult): boolean {
  return prev === undefined || next.score > prev.score;
}
