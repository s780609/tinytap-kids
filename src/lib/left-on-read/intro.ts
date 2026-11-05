/**
 * 開場影片的時間表、字幕和憂傷的旋律。畫面在 components/original/pixel/introScenes.ts。
 */

export type IntroSceneId = "bus" | "taipei" | "mrt" | "office" | "store" | "room" | "phone" | "title";

export interface IntroShot {
  id: IntroSceneId;
  durationMs: number;
  caption: string;
}

export const INTRO_SHOTS: readonly IntroShot[] = [
  {
    id: "bus",
    durationMs: 6000,
    caption: "嘉義的客運站。媽塞給我一袋橘子，叫我到台北要記得吃飯。",
  },
  {
    id: "taipei",
    durationMs: 5000,
    caption: "台北的夜景很漂亮。只是每一盞燈，都是別人家的。",
  },
  {
    id: "mrt",
    durationMs: 5000,
    caption: "捷運上每個人都離我很近。近到我知道他在滑什麼，不知道他叫什麼。",
  },
  {
    id: "office",
    durationMs: 5000,
    caption: "二十五歲，小工程師。同事人都很好。下班說掰掰的時候最好。",
  },
  {
    id: "store",
    durationMs: 5000,
    caption: "微波便當，兩分鐘。店員問我要不要袋子。今天終於有人問我問題了。",
  },
  {
    id: "room",
    durationMs: 5000,
    caption: "租屋處六坪。橘子吃完了，袋子我還留著。不知道為什麼。",
  },
  {
    id: "phone",
    durationMs: 5000,
    caption: "半夜一點，房間裡只剩手機的光。我下載了 Swipy。",
  },
  {
    id: "title",
    durationMs: 4000,
    caption: "我以為這是愛情故事。其實是一本圖鑑。",
  },
];

const TOTAL_MS = INTRO_SHOTS.reduce((sum, s) => sum + s.durationMs, 0);

export function introShotAt(tMs: number): { index: number; localMs: number; done: boolean } {
  if (tMs >= TOTAL_MS) {
    const index = INTRO_SHOTS.length - 1;
    return { index, localMs: INTRO_SHOTS[index].durationMs, done: true };
  }
  let start = 0;
  for (let index = 0; index < INTRO_SHOTS.length; index++) {
    const { durationMs } = INTRO_SHOTS[index];
    if (tMs < start + durationMs) return { index, localMs: tMs - start, done: false };
    start += durationMs;
  }
  return { index: 0, localMs: 0, done: false };
}

export function typewriterCount(text: string, localMs: number, charsPerSec: number): number {
  return Math.min(text.length, Math.floor((localMs * charsPerSec) / 1000));
}

/** 慢板的 A 小調：左手分解和弦，右手一段往下走又走不回去的旋律 */
const BEAT = 0.75;
/** 和弦根音（每小節四拍） */
const CHORDS: readonly (readonly [number, number, number])[] = [
  [45, 52, 60], // Am
  [41, 48, 57], // F
  [48, 55, 64], // C
  [43, 50, 59], // G
  [45, 52, 60], // Am
  [41, 48, 57], // F
  [38, 45, 53], // Dm
  [40, 47, 56], // E
];
/** 右手旋律：[第幾拍, midi, 幾拍] */
const TUNE: readonly (readonly [number, number, number])[] = [
  [0, 76, 2], [2, 72, 1], [3, 71, 1],
  [4, 69, 3], [7, 72, 1],
  [8, 71, 2], [10, 67, 2],
  [12, 67, 1], [13, 69, 1], [14, 71, 2],
  [16, 72, 2], [18, 71, 1], [19, 69, 1],
  [20, 65, 3], [23, 69, 1],
  [24, 69, 2], [26, 65, 1], [27, 64, 1],
  [28, 64, 4],
];

function buildMelody(): { midi: number; time: number; duration: number }[] {
  const notes: { midi: number; time: number; duration: number }[] = [];
  for (let repeat = 0; repeat < 2; repeat++) {
    const offsetBeats = repeat * CHORDS.length * 4;
    CHORDS.forEach(([root, fifth, third], bar) => {
      [root, fifth, third, fifth].forEach((midi, beat) => {
        notes.push({ midi, time: (offsetBeats + bar * 4 + beat) * BEAT, duration: BEAT * 1.5 });
      });
    });
    for (const [beat, midi, beats] of TUNE) {
      notes.push({ midi, time: (offsetBeats + beat) * BEAT, duration: beats * BEAT * 0.95 });
    }
  }
  const totalSec = TOTAL_MS / 1000;
  return notes
    .filter((n) => n.time + n.duration <= totalSec)
    .sort((a, b) => a.time - b.time);
}

/** time 單位是秒，對應 scheduleNote */
export const INTRO_MELODY: readonly { midi: number; time: number; duration: number }[] = buildMelody();
