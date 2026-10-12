/**
 * 把歌曲旋律轉成譜面（音符、要播的音、節拍器點擊），時間單位為秒。
 */

import { midiToFreq, parseMelody } from "./music.ts";
import type { Song } from "./songs.ts";

export type Difficulty = "easy" | "normal";

export interface DifficultyConfig {
  label: string;
  emoji: string;
  /** 速度倍率：< 1 變慢 */
  tempoScale: number;
  /** 音符從頂端落到判定線的秒數 */
  approachTime: number;
  /** ≥ 這麼多拍的音符變成長按 */
  holdMinBeats: number;
  /** 長按尾巴提早結束的拍數，讓下一顆音符前有空檔 */
  holdTailGapBeats: number;
  /** 判定視窗倍率 */
  windowScale: number;
  /** true：起點不在整拍上的音只播放、不進譜 */
  onlyOnBeatNotes: boolean;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "慢慢",
    emoji: "🐢",
    tempoScale: 0.8,
    approachTime: 2.2,
    holdMinBeats: 2,
    holdTailGapBeats: 0.5,
    windowScale: 1.25,
    onlyOnBeatNotes: true,
  },
  normal: {
    label: "快快",
    emoji: "🐰",
    tempoScale: 1,
    approachTime: 1.6,
    holdMinBeats: 2,
    holdTailGapBeats: 0.5,
    windowScale: 1,
    onlyOnBeatNotes: false,
  },
};

export const LANE_COUNT = 3;
export const COUNTDOWN_BEATS = 4;

export interface ChartNote {
  id: number;
  lane: number;
  time: number;
  endTime: number;
  type: "tap" | "hold";
  midi: number;
}

/** 每個非休止音都有（不管有沒有進譜） */
export interface ToneEvent {
  time: number;
  duration: number;
  freq: number;
}

export interface ClickEvent {
  time: number;
  kind: "count" | "countGo" | "kick" | "hat";
}

export interface Chart {
  songId: string;
  difficulty: Difficulty;
  secPerBeat: number;
  firstNoteTime: number;
  endTime: number;
  notes: ChartNote[];
  tones: ToneEvent[];
  clicks: ClickEvent[];
}

const EPS = 1e-6;

/** 每個不同音高對應一軌：同音同軌、越高越右；lane = floor(rank * laneCount / distinctCount) */
export function assignLanes(midis: number[], laneCount: number): Map<number, number> {
  const distinct = [...new Set(midis)].sort((a, b) => a - b);
  const lanes = new Map<number, number>();
  distinct.forEach((m, rank) => {
    lanes.set(m, Math.min(laneCount - 1, Math.floor((rank * laneCount) / distinct.length)));
  });
  return lanes;
}

export function buildChart(song: Song, difficulty: Difficulty, laneCount = LANE_COUNT): Chart {
  const cfg = DIFFICULTIES[difficulty];
  const spb = 60 / (song.bpm * cfg.tempoScale);
  const leadInBeats = Math.max(COUNTDOWN_BEATS, Math.ceil((cfg.approachTime + 0.5) / spb));
  const firstNoteTime = leadInBeats * spb;

  const melody = parseMelody(song.melody, song.beatsPerBar);
  const lanes = assignLanes(
    melody.map((n) => n.midi).filter((m): m is number => m !== null),
    laneCount
  );

  const notes: ChartNote[] = [];
  const tones: ToneEvent[] = [];
  let beat = 0;
  let lastToneEnd = firstNoteTime;
  for (const n of melody) {
    if (n.midi !== null) {
      const time = firstNoteTime + beat * spb;
      tones.push({ time, duration: n.beats * spb, freq: midiToFreq(n.midi) });
      lastToneEnd = time + n.beats * spb;
      const onBeat = Math.abs(beat - Math.round(beat)) < EPS;
      if (onBeat || !cfg.onlyOnBeatNotes) {
        const isHold = n.beats >= cfg.holdMinBeats;
        notes.push({
          id: notes.length,
          lane: lanes.get(n.midi)!,
          time,
          endTime: isHold ? time + (n.beats - cfg.holdTailGapBeats) * spb : time,
          type: isHold ? "hold" : "tap",
          midi: n.midi,
        });
      }
    }
    beat += n.beats;
  }

  const endTime = lastToneEnd + 1.5;

  const clicks: ClickEvent[] = [];
  for (let i = 0; i < COUNTDOWN_BEATS; i++) {
    clicks.push({
      time: firstNoteTime - (COUNTDOWN_BEATS - i) * spb,
      kind: i === COUNTDOWN_BEATS - 1 ? "countGo" : "count",
    });
  }
  for (let k = 0; firstNoteTime + k * spb < endTime; k++) {
    clicks.push({ time: firstNoteTime + k * spb, kind: k % 2 === 0 ? "kick" : "hat" });
  }

  return {
    songId: song.id,
    difficulty,
    secPerBeat: spb,
    firstNoteTime,
    endTime,
    notes,
    tones,
    clicks,
  };
}
