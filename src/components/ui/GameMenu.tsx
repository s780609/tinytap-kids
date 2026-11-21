"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VolumeSlider from "@/components/ui/VolumeSlider";
import ParentSettings from "@/components/ui/ParentSettings";
import { useSettings } from "@/lib/settings/SettingsContext";
import { audioManager } from "@/lib/audio/AudioManager";
import { MODES, gamesOf, isGameMode, type GameMode } from "@/lib/menu/games";

/** 記住上次看的模式，回到首頁時直接停在那一頁 */
const LAST_MODE_KEY = "tinytap-last-mode";

function rememberMode(mode: GameMode) {
  try {
    localStorage.setItem(LAST_MODE_KEY, mode);
  } catch {
    // 無痕模式等存不了就算了
  }
}

/**
 * 首頁與三個模式頁共用的遊戲選單：上面切換模式，下面直接列出遊戲，
 * 點一下就進遊戲；從遊戲返回只要一層就回到這裡。
 * mode 為 null 時是首頁：依家長設定或上次看的模式決定顯示哪一頁。
 */
export default function GameMenu({ mode }: { mode: GameMode | null }) {
  const router = useRouter();
  const { settings } = useSettings();
  const [homeMode, setHomeMode] = useState<GameMode>("baby");
  const [showVolume, setShowVolume] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInited = useRef(false);

  const current = mode ?? homeMode;
  const info = MODES.find((m) => m.id === current)!;

  // 模式頁：記住這次看的模式
  useEffect(() => {
    if (mode) rememberMode(mode);
  }, [mode]);

  // 首頁：家長設了預設模式就直接過去；沒設就停在上次看的模式
  useEffect(() => {
    if (mode || hasInited.current) return;
    hasInited.current = true;
    if (settings.defaultMode !== "ask") {
      router.replace(`/${settings.defaultMode}`);
      return;
    }
    const id = setTimeout(() => {
      try {
        const saved = localStorage.getItem(LAST_MODE_KEY);
        if (isGameMode(saved)) setHomeMode(saved);
      } catch {
        // 讀不到就用寶寶模式
      }
    }, 0);
    return () => clearTimeout(id);
  }, [mode, settings.defaultMode, router]);

  const switchMode = (m: GameMode) => {
    if (m === current) return;
    audioManager.pop();
    // 換模式不留在上一頁的紀錄裡，返回鍵不會在模式之間跳來跳去
    router.replace(`/${m}`);
  };

  const openGame = (path: string) => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
    audioManager.preloadAll();
    audioManager.ding();
    router.push(path);
  };

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => setShowSettings(true), 800);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden select-none">
      {/* 家長設定：長按右上角 */}
      <div
        className="fixed top-0 right-0 w-20 h-20 z-30"
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
      />

      <header className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={() => setShowVolume(true)}
          className="w-12 h-12 shrink-0 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-md active:scale-90 transition-transform"
          aria-label="音量"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF69B4">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
        </button>
        <h1 className="flex-1 text-center leading-none">
          <span className="text-3xl md:text-4xl font-black text-[#FF69B4]">TinyTap</span>
          <span className="ml-2 text-lg md:text-xl font-bold text-[#4FC3F7]">兒童樂園</span>
        </h1>
        <span className="w-12 shrink-0" />
      </header>

      {/* 模式分頁 */}
      <nav className="flex gap-2 px-4 pt-3 pb-1 w-full max-w-3xl mx-auto" aria-label="模式">
        {MODES.map((m) => {
          const active = m.id === current;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => switchMode(m.id)}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center rounded-2xl py-2 shadow transition-transform active:scale-95 ${
                active ? "text-white scale-[1.03]" : "bg-white/85"
              }`}
              style={active ? { backgroundColor: m.color } : { color: m.color }}
            >
              <span className="text-lg md:text-xl font-black leading-tight">
                {m.emoji} {m.label}
              </span>
              <span className={`text-xs font-bold ${active ? "text-white/85" : "opacity-70"}`}>{m.age}</span>
            </button>
          );
        })}
      </nav>

      {/* 遊戲 */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-6">
        <div
          key={current}
          className="grid grid-cols-2 sm:grid-cols-3 landscape:grid-cols-5 lg:grid-cols-5 gap-3 w-full max-w-5xl mx-auto menu-fade"
        >
          {gamesOf(current).map((game) => (
            <button
              key={game.path}
              type="button"
              onClick={() => openGame(game.path)}
              className="flex flex-col items-center justify-center gap-1 rounded-3xl aspect-[5/4] landscape:aspect-[3/2] shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: game.color }}
            >
              <span className="text-4xl landscape:text-3xl md:text-5xl leading-none">{game.emoji}</span>
              <span className="text-lg landscape:text-base md:text-2xl font-black text-white">{game.title}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs font-bold text-gray-400">
          {info.label}模式・{gamesOf(current).length} 個遊戲
        </p>
      </main>

      {showVolume && <VolumeSlider onClose={() => setShowVolume(false)} />}
      {showSettings && <ParentSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
