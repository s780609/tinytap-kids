/**
 * 釣魚池的場景：白天、黃昏、夜晚、下雨、春天、秋天、冬天。
 * 每次進來隨機一種，右上角的按鈕可以換。
 */

export type SceneId = "day" | "sunset" | "night" | "rain" | "spring" | "autumn" | "winter";

/** 會飄的東西：花瓣、葉子、雪、雨、螢火蟲 */
export type WeatherKind = "none" | "petals" | "leaves" | "snow" | "rain" | "fireflies";

export interface Scene {
  id: SceneId;
  label: string;
  emoji: string;
  grass: string;
  grassDark: string;
  waterTop: string;
  waterBottom: string;
  lilyPad: string;
  weather: WeatherKind;
  /** 整個畫面蓋一層的顏色（夜晚變暗、黃昏偏橘），null 表示不蓋 */
  tint: string | null;
  /** 水面上的月亮倒影 */
  moon?: boolean;
  /** 池邊結一圈薄冰 */
  ice?: boolean;
}

export const SCENES: Scene[] = [
  { id: "day", label: "晴天", emoji: "☀️", grass: "#A5D6A7", grassDark: "#81C784", waterTop: "#81D4FA", waterBottom: "#0288D1", lilyPad: "#66BB6A", weather: "none", tint: null },
  { id: "sunset", label: "黃昏", emoji: "🌇", grass: "#C5D99A", grassDark: "#A8C27A", waterTop: "#FFCC80", waterBottom: "#5C6BC0", lilyPad: "#7CB342", weather: "none", tint: "rgba(255,138,101,0.12)" },
  { id: "night", label: "夜晚", emoji: "🌙", grass: "#4E6E58", grassDark: "#3E5A47", waterTop: "#3949AB", waterBottom: "#1A237E", lilyPad: "#388E3C", weather: "fireflies", tint: "rgba(13,27,62,0.22)", moon: true },
  { id: "rain", label: "下雨", emoji: "🌧️", grass: "#94BFA0", grassDark: "#7AA889", waterTop: "#90A4AE", waterBottom: "#37627A", lilyPad: "#558B2F", weather: "rain", tint: "rgba(96,125,139,0.15)" },
  { id: "spring", label: "春天", emoji: "🌸", grass: "#B9E4B0", grassDark: "#9CD58F", waterTop: "#B3E5FC", waterBottom: "#039BE5", lilyPad: "#66BB6A", weather: "petals", tint: null },
  { id: "autumn", label: "秋天", emoji: "🍁", grass: "#D7C78A", grassDark: "#C2AE6A", waterTop: "#A7C7D9", waterBottom: "#3B7EA1", lilyPad: "#9E9D24", weather: "leaves", tint: "rgba(255,167,38,0.06)" },
  { id: "winter", label: "冬天", emoji: "⛄", grass: "#E8F1F5", grassDark: "#CFDDE5", waterTop: "#B2EBF2", waterBottom: "#4F9FC0", lilyPad: "#81A784", weather: "snow", tint: null, ice: true },
];

export function getScene(id: SceneId): Scene {
  return SCENES.find((s) => s.id === id)!;
}

export function pickScene(rand: () => number = Math.random): SceneId {
  return SCENES[Math.min(SCENES.length - 1, Math.floor(rand() * SCENES.length))].id;
}

/** 換到下一個場景（轉一圈回到第一個） */
export function nextScene(id: SceneId): SceneId {
  const i = SCENES.findIndex((s) => s.id === id);
  return SCENES[(i + 1) % SCENES.length].id;
}
