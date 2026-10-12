/**
 * 遊玩畫面的換算：時鐘、音符座標、軌道、倒數、預排程游標（純函式，不碰 DOM）。
 */

import type { Chart, ChartNote } from "./chart.ts";

export interface ClockAnchor {
  /** AudioContext 時間（秒） */
  contextTime: number;
  /** 對應的 performance.now()（毫秒） */
  performanceTime: number;
}

/** 把 performance 時間（毫秒）換成歌曲時間（秒） */
export function songTimeAt(perfMs: number, a: ClockAnchor, startCtxTime: number): number {
  return a.contextTime + (perfMs - a.performanceTime) / 1000 - startCtxTime;
}

/** 線性：songTime = noteTime → lineY；songTime = noteTime − approachTime → topY（可外插） */
export function noteY(
  noteTime: number,
  songTime: number,
  approachTime: number,
  topY: number,
  lineY: number
): number {
  return lineY + ((songTime - noteTime) / approachTime) * (lineY - topY);
}

/** songTime ≥ time − approachTime 且 songTime ≤ endTime + pastSec */
export function isNoteVisible(
  n: ChartNote,
  songTime: number,
  approachTime: number,
  pastSec: number
): boolean {
  return songTime >= n.time - approachTime && songTime <= n.endTime + pastSec;
}

/** x 在 [left, left + width] 內時回傳軌道編號，否則 null */
export function laneAt(x: number, left: number, width: number, laneCount: number): number | null {
  if (width <= 0 || x < left || x > left + width) return null;
  return Math.min(laneCount - 1, Math.floor(((x - left) * laneCount) / width));
}

/** 第一顆音符前 4 拍依序 "3" / "2" / "1" / "開始！"，其他時間 null */
export function countdownLabel(songTime: number, chart: Chart): "3" | "2" | "1" | "開始！" | null {
  const start = chart.firstNoteTime - 4 * chart.secPerBeat;
  if (songTime < start || songTime >= chart.firstNoteTime) return null;
  const k = Math.floor((songTime - start) / chart.secPerBeat);
  return (["3", "2", "1", "開始！"] as const)[Math.min(3, Math.max(0, k))];
}

/** 回傳新游標 i：events[from..i) 的 time 都 < horizon */
export function takeDue<T extends { time: number }>(events: T[], from: number, horizon: number): number {
  let i = from;
  while (i < events.length && events[i].time < horizon) i++;
  return i;
}

/** 目前在一拍裡的位置，[0, 1) */
export function beatPhase(songTime: number, chart: Chart): number {
  const x = (songTime - chart.firstNoteTime) / chart.secPerBeat;
  const p = x - Math.floor(x);
  return p >= 1 || p < 0 ? 0 : p;
}

/** 歌曲進度 [0, 1]：(songTime − firstNoteTime) / (endTime − firstNoteTime) */
export function songProgress(songTime: number, chart: Chart): number {
  const span = chart.endTime - chart.firstNoteTime;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (songTime - chart.firstNoteTime) / span));
}
