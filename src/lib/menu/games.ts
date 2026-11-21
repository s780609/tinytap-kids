/**
 * 遊戲選單：三個模式與每個模式裡的遊戲（首頁和各模式頁共用同一份）。
 */

export type GameMode = "baby" | "toddler" | "retro";

export interface ModeInfo {
  id: GameMode;
  label: string;
  emoji: string;
  /** 適合年齡 */
  age: string;
  color: string;
}

export const MODES: ModeInfo[] = [
  { id: "baby", label: "寶寶", emoji: "🎈", age: "1 歲", color: "#FF69B4" },
  { id: "toddler", label: "幼兒", emoji: "⭐", age: "3 歲", color: "#4FC3F7" },
  { id: "retro", label: "懷舊", emoji: "🕹️", age: "大小孩／大人", color: "#5C6BC0" },
];

export interface GameInfo {
  mode: GameMode;
  path: string;
  title: string;
  emoji: string;
  color: string;
}

const g = (mode: GameMode, slug: string, title: string, emoji: string, color: string): GameInfo => ({
  mode,
  path: `/${mode}/${slug}`,
  title,
  emoji,
  color,
});

export const GAMES: GameInfo[] = [
  g("baby", "balloons", "氣球點點樂", "🎈", "#FF69B4"),
  g("baby", "piano", "寶寶鋼琴", "🎹", "#EF5350"),
  g("baby", "animals", "動物鍵盤", "🐮", "#8D6E63"),
  g("baby", "peekaboo", "躲貓貓", "👀", "#66BB6A"),
  g("baby", "hatch", "敲敲蛋", "🥚", "#FF8A65"),
  g("baby", "wipe", "擦窗戶", "🫧", "#29B6F6"),
  g("toddler", "drawing", "畫畫板", "🎨", "#FF69B4"),
  g("toddler", "memory", "記憶翻牌", "🃏", "#81C784"),
  g("toddler", "counting", "數一數", "🔢", "#FFB74D"),
  g("toddler", "racing", "賽車", "🏎️", "#EF5350"),
  g("toddler", "sand", "玩沙沙", "🏖️", "#D4A26A"),
  g("toddler", "fishing", "釣魚", "🎣", "#4FC3F7"),
  g("toddler", "pinball", "太空彈珠台", "🪐", "#7E57C2"),
  g("toddler", "night-market", "夜市彈珠台", "🏮", "#F9A825"),
  g("toddler", "rhythm", "動物樂團", "🎶", "#26A69A"),
  g("toddler", "puzzle", "拼圖", "🧩", "#8BC34A"),
  g("toddler", "kitchen", "小小廚房", "🍳", "#FF8A65"),
  g("retro", "tank", "坦克大戰", "🧱", "#8D6E63"),
  g("retro", "pacman", "小精靈", "🟡", "#1A237E"),
  g("retro", "raiden", "復古雷電", "✈️", "#C62828"),
];

export function gamesOf(mode: GameMode): GameInfo[] {
  return GAMES.filter((x) => x.mode === mode);
}

export function isGameMode(v: unknown): v is GameMode {
  return MODES.some((m) => m.id === v);
}
