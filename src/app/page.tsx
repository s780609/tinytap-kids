"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BigButton from "@/components/ui/BigButton";
import VolumeSlider from "@/components/ui/VolumeSlider";
import ParentSettings from "@/components/ui/ParentSettings";
import { useSettings } from "@/lib/settings/SettingsContext";
import { audioManager } from "@/lib/audio/AudioManager";

export default function HomePage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [showVolume, setShowVolume] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInited = useRef(false);

  useEffect(() => {
    if (settings.defaultMode !== "ask" && !hasInited.current) {
      hasInited.current = true;
      router.push(`/${settings.defaultMode}`);
    }
  }, [settings.defaultMode, router]);

  const handleModeSelect = (mode: "baby" | "toddler") => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
    audioManager.preloadAll();
    audioManager.ding();
    router.push(`/${mode}`);
  };

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => setShowSettings(true), 800);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-16 h-16 rounded-full bg-[#FFD54F]/20 animate-bubble-float" />
        <div className="absolute top-[20%] right-[10%] w-12 h-12 rounded-full bg-[#4FC3F7]/20 animate-bubble-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-[15%] left-[15%] w-20 h-20 rounded-full bg-[#CE93D8]/20 animate-bubble-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[25%] right-[8%] w-14 h-14 rounded-full bg-[#81C784]/20 animate-bubble-float" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Parent settings trigger (top-right invisible area) */}
      <div
        className="fixed top-0 right-0 w-20 h-20 z-30"
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
      />

      {/* Title */}
      <div className="animate-title-bounce z-10">
        <h1 className="text-5xl md:text-6xl font-black text-[#FF69B4] drop-shadow-sm">
          TinyTap
        </h1>
        <p className="text-2xl md:text-3xl font-bold text-[#4FC3F7] text-center -mt-1">
          兒童樂園
        </p>
      </div>

      {/* Mode buttons */}
      <div className="flex flex-col gap-5 w-full max-w-sm z-10 mt-4">
        <BigButton color="#FF69B4" onClick={() => handleModeSelect("baby")}>
          <span className="text-5xl mb-2">🎈</span>
          <span>寶寶模式</span>
          <span className="text-base font-normal opacity-80">適合 1 歲</span>
        </BigButton>

        <BigButton color="#4FC3F7" onClick={() => handleModeSelect("toddler")}>
          <span className="text-5xl mb-2">⭐</span>
          <span>幼兒模式</span>
          <span className="text-base font-normal opacity-80">適合 3 歲</span>
        </BigButton>
      </div>

      {/* Volume button */}
      <button
        onClick={() => setShowVolume(true)}
        className="fixed bottom-6 left-6 z-30 w-14 h-14 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-md active:scale-90 transition-transform"
        aria-label="音量"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF69B4">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
      </button>

      {/* Modals */}
      {showVolume && <VolumeSlider onClose={() => setShowVolume(false)} />}
      {showSettings && (
        <ParentSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
