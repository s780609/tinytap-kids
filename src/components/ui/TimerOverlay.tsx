"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/settings/SettingsContext";
import { usePathname } from "next/navigation";

export default function TimerOverlay() {
  const { settings } = useSettings();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number>(Date.now());

  const isPlaying = pathname !== "/";

  useEffect(() => {
    if (!settings.timerEnabled || !isPlaying) {
      setShow(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    startRef.current = Date.now();
    timerRef.current = setTimeout(
      () => setShow(true),
      settings.timerMinutes * 60 * 1000
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [settings.timerEnabled, settings.timerMinutes, isPlaying]);

  const handleExtend = () => {
    setShow(false);
    timerRef.current = setTimeout(() => setShow(true), 5 * 60 * 1000);
  };

  const handleStop = () => {
    setShow(false);
    window.location.href = "/";
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="text-6xl mb-4">🌙</div>
        <h2 className="text-2xl font-bold text-[#4A4A4A] mb-2">
          該休息囉！
        </h2>
        <p className="text-lg text-gray-500 mb-6">休息一下吧！</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleExtend}
            className="w-full py-4 rounded-2xl bg-[#4FC3F7] text-white font-bold text-lg active:scale-95 transition-transform"
          >
            再玩 5 分鐘
          </button>
          <button
            onClick={handleStop}
            className="w-full py-4 rounded-2xl bg-[#FF69B4] text-white font-bold text-lg active:scale-95 transition-transform"
          >
            好，不玩了
          </button>
        </div>
      </div>
    </div>
  );
}
