/**
 * 寶寶鋼琴與動物鍵盤的鍵盤配置、示範兒歌時間表（純函式，方便測試）。
 */

import { parseMelody } from "../rhythm/music.ts";
import type { Song } from "../rhythm/songs.ts";

/** 鋼琴音域：C4（Do）到 C5（高音 Do） */
export const KEYBOARD_LOW = 60;
export const KEYBOARD_HIGH = 72;

/** 白鍵的彩虹色，依序對應 Do Re Mi Fa Sol La Si Do */
export const RAINBOW = [
  "#EF5350",
  "#FF9800",
  "#FFD54F",
  "#66BB6A",
  "#29B6F6",
  "#5C6BC0",
  "#AB47BC",
  "#EC407A",
];

const SOLFEGE: Record<number, string> = { 0: "Do", 2: "Re", 4: "Mi", 5: "Fa", 7: "Sol", 9: "La", 11: "Si" };
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export interface PianoKey {
  midi: number;
  black: boolean;
  /** 白鍵：自己是第幾個白鍵；黑鍵：左邊那個白鍵的編號 */
  whiteIndex: number;
  /** 白鍵才有 */
  label?: string;
  color?: string;
}

export function buildKeys(low: number, high: number): PianoKey[] {
  const keys: PianoKey[] = [];
  let whiteIndex = -1;
  for (let midi = low; midi <= high; midi++) {
    const pc = ((midi % 12) + 12) % 12;
    if (BLACK_PITCH_CLASSES.has(pc)) {
      keys.push({ midi, black: true, whiteIndex });
    } else {
      whiteIndex++;
      keys.push({
        midi,
        black: false,
        whiteIndex,
        label: SOLFEGE[pc],
        color: RAINBOW[whiteIndex % RAINBOW.length],
      });
    }
  }
  return keys;
}

export interface DemoNote {
  midi: number;
  /** 從開始彈算起的秒數 */
  time: number;
  duration: number;
}

/** 把兒歌旋律換成自動彈奏的時間表（休止只推進時間） */
export function demoNotes(song: Song): DemoNote[] {
  const secPerBeat = 60 / song.bpm;
  const notes: DemoNote[] = [];
  let beat = 0;
  for (const n of parseMelody(song.melody)) {
    if (n.midi !== null) {
      notes.push({ midi: n.midi, time: beat * secPerBeat, duration: n.beats * secPerBeat });
    }
    beat += n.beats;
  }
  return notes;
}

/** 只留下每個音都在鍵盤範圍內的歌 */
export function songsInRange(songs: Song[], low: number, high: number): Song[] {
  return songs.filter((s) => demoNotes(s).every((n) => n.midi >= low && n.midi <= high));
}

export interface AnimalKey {
  midi: number;
  emoji: string;
  name: string;
  sound: string;
  color: string;
}

/** 動物鍵盤：體型大的叫低音、小的叫高音（Do Re Mi Fa Sol La） */
export const ANIMAL_KEYS: AnimalKey[] = [
  { midi: 60, emoji: "🐘", name: "大象", sound: "/sounds/animals/elephant.mp3", color: "#90A4AE" },
  { midi: 62, emoji: "🐮", name: "牛", sound: "/sounds/animals/cow.mp3", color: "#A1887F" },
  { midi: 64, emoji: "🦁", name: "獅子", sound: "/sounds/animals/lion.mp3", color: "#FFB74D" },
  { midi: 65, emoji: "🐶", name: "狗狗", sound: "/sounds/animals/dog.mp3", color: "#81C784" },
  { midi: 67, emoji: "🐱", name: "貓咪", sound: "/sounds/animals/cat.mp3", color: "#F48FB1" },
  { midi: 69, emoji: "🦆", name: "鴨子", sound: "/sounds/animals/duck.mp3", color: "#4FC3F7" },
];

/** 叫聲的播放速度：C4 原速，每高一個半音快 2^(1/12) 倍 */
export function animalRate(midi: number, baseMidi = KEYBOARD_LOW): number {
  return Math.pow(2, (midi - baseMidi) / 12);
}
