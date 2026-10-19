export const DEFAULT_MODES = ["ask", "baby", "toddler", "retro"] as const;

export interface AppSettings {
  volume: number;
  defaultMode: (typeof DEFAULT_MODES)[number];
  timerEnabled: boolean;
  timerMinutes: number;
  /** 釣魚遊戲：點捲線輪也能收線（不會畫圈的小小孩用） */
  fishingTapReel: boolean;
}

const STORAGE_KEY = "tinytap-settings";

const DEFAULT_SETTINGS: AppSettings = {
  volume: 0.7,
  defaultMode: "ask",
  timerEnabled: false,
  timerMinutes: 15,
  fishingTapReel: false,
};

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const merged: AppSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    // 讀到不認識的模式（例如舊版或手動改壞）就回到每次詢問
    if (!(DEFAULT_MODES as readonly string[]).includes(merged.defaultMode)) merged.defaultMode = "ask";
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage might be full or unavailable
  }
}
