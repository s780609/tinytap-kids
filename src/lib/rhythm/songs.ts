/**
 * 動物樂團的歌曲資料：經典公版兒歌，C 大調 4/4。
 * 旋律記法見 music.ts 的 parseMelody。
 */

export interface Song {
  id: string;
  title: string;
  emoji: string;
  bpm: number;
  beatsPerBar: number;
  melody: string;
}

export const SONGS: Song[] = [
  {
    id: "twinkle",
    title: "小星星",
    emoji: "⭐",
    bpm: 96,
    beatsPerBar: 4,
    // 1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - | 5 5 4 4 | 3 3 2 - | 5 5 4 4 | 3 3 2 - | 1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -
    melody:
      "C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 | " +
      "G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | " +
      "C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2",
  },
  {
    id: "tigers",
    title: "兩隻老虎",
    emoji: "🐯",
    bpm: 100,
    beatsPerBar: 4,
    // 1 2 3 1 | 1 2 3 1 | 3 4 5 - | 3 4 5 - | 5654 3 1 | 5654 3 1 | 1 5̣ 1 - | 1 5̣ 1 -
    melody:
      "C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:2 | E4 F4 G4:2 | " +
      "G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 | " +
      "C4 G3 C4:2 | C4 G3 C4:2",
  },
  {
    id: "bee",
    title: "小蜜蜂",
    emoji: "🐝",
    bpm: 108,
    beatsPerBar: 4,
    // 5 3 3 - | 4 2 2 - | 1 2 3 4 | 5 5 5 - | 5 3 3 - | 4 2 2 - | 1 3 5 5 | 3 - - - |
    // 2 2 2 2 | 2 3 4 - | 3 3 3 3 | 3 4 5 - | 5 3 3 - | 4 2 2 - | 1 3 5 5 | 1 - - -
    melody:
      "G4 E4 E4:2 | F4 D4 D4:2 | C4 D4 E4 F4 | G4 G4 G4:2 | " +
      "G4 E4 E4:2 | F4 D4 D4:2 | C4 E4 G4 G4 | E4:4 | " +
      "D4 D4 D4 D4 | D4 E4 F4:2 | E4 E4 E4 E4 | E4 F4 G4:2 | " +
      "G4 E4 E4:2 | F4 D4 D4:2 | C4 E4 G4 G4 | C4:4",
  },
  {
    id: "london",
    title: "倫敦鐵橋",
    emoji: "🌉",
    bpm: 104,
    beatsPerBar: 4,
    // 5. 6 5 4 | 3 4 5 - | 2 3 4 - | 3 4 5 - | 5. 6 5 4 | 3 4 5 - | 2 - 5 - | 3 1 - -
    melody:
      "G4:1.5 A4:0.5 G4 F4 | E4 F4 G4:2 | D4 E4 F4:2 | E4 F4 G4:2 | " +
      "G4:1.5 A4:0.5 G4 F4 | E4 F4 G4:2 | D4:2 G4:2 | E4 C4:3",
  },
  {
    id: "farm",
    title: "王老先生有塊地",
    emoji: "🐮",
    bpm: 112,
    beatsPerBar: 4,
    // 王老先生有塊地 咿呀咿呀喲 / 他在田邊養小雞 咿呀咿呀喲 /
    // 這裡吱吱吱 那裡吱吱吱 這吱那吱 到處吱吱吱 / 王老先生有塊地 咿呀咿呀喲
    melody:
      "C4 C4 C4 G3 | A3 A3 G3:2 | E4 E4 D4 D4 | C4:3 G3 | " +
      "C4 C4 C4 G3 | A3 A3 G3:2 | E4 E4 D4 D4 | C4:3 G3:0.5 G3:0.5 | " +
      "C4 C4 C4 G3:0.5 G3:0.5 | C4 C4 C4:2 | " +
      "C4:0.5 C4:0.5 C4 C4:0.5 C4:0.5 C4 | C4:0.5 C4:0.5 C4:0.5 C4:0.5 C4 C4 | " +
      "C4 C4 C4 G3 | A3 A3 G3:2 | E4 E4 D4 D4 | C4:4",
  },
];

export function getSong(id: string): Song {
  const song = SONGS.find((s) => s.id === id);
  if (!song) throw new Error(`找不到歌曲：${id}`);
  return song;
}
