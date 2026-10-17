export interface AppSettings {
  volume: number;
  defaultMode: "ask" | "baby" | "toddler";
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
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
