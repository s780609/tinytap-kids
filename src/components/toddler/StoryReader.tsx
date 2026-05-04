"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import type { Story, SceneSprite } from "@/lib/stories/types";

interface FloatingReaction {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

let nextReactionId = 0;

function pickChineseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const preferred = voices.find((v) => v.lang === "zh-TW" && /female|woman|kid|child/i.test(v.name));
  if (preferred) return preferred;
  const tw = voices.find((v) => v.lang === "zh-TW");
  if (tw) return tw;
  const cn = voices.find((v) => v.lang.startsWith("zh"));
  return cn ?? null;
}

export default function StoryReader({ story }: { story: Story }) {
  const { settings } = useSettings();
  const [pageIndex, setPageIndex] = useState(0);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const page = story.pages[pageIndex];
  const isLast = pageIndex === story.pages.length - 1;
  const isFirst = pageIndex === 0;

  // Load voices (async on some browsers)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = pickChineseVoice(voices);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, []);

  // Audio init
  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  const stopSpeech = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speakPage = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "zh-TW";
      utter.rate = 0.9;
      utter.pitch = 1.1;
      utter.volume = settings.volume;
      if (voiceRef.current) utter.voice = voiceRef.current;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [settings.volume]
  );

  // Auto-read on page change
  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => speakPage(page.text), 350);
    return () => {
      clearTimeout(t);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [pageIndex, autoplay, page.text, speakPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpriteClick = (sprite: SceneSprite, e: React.MouseEvent<HTMLButtonElement>) => {
    audioManager.pop();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const id = nextReactionId++;
    setReactions((prev) => [...prev, { id, emoji: sprite.reaction || "✨", x, y }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 900);
  };

  const goNext = () => {
    if (isLast) return;
    audioManager.whoosh();
    setPageIndex((i) => i + 1);
  };
  const goPrev = () => {
    if (isFirst) return;
    audioManager.pop();
    setPageIndex((i) => i - 1);
  };
  const restart = () => {
    audioManager.chime();
    setPageIndex(0);
  };

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeech();
    } else {
      speakPage(page.text);
    }
  };

  const toggleAutoplay = () => {
    setAutoplay((v) => {
      const next = !v;
      if (!next) stopSpeech();
      return next;
    });
  };

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Scene area */}
      <div
        key={pageIndex}
        className={`relative flex-1 overflow-hidden animate-slide-up ${page.bgClass}`}
        style={
          page.image
            ? {
                backgroundImage: `url(${page.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {page.decoration}

        {page.sprites.map((sprite) =>
          sprite.hidden ? (
            <button
              key={sprite.id}
              type="button"
              onClick={(e) => handleSpriteClick(sprite, e)}
              className="absolute rounded-full select-none active:scale-110 transition-transform animate-pulse-glow"
              style={{
                left: `${sprite.x}%`,
                top: `${sprite.y}%`,
                width: `${sprite.size}px`,
                height: `${sprite.size}px`,
                transform: "translate(-50%, -50%)",
              }}
              aria-label={sprite.label || sprite.emoji}
            />
          ) : (
            <button
              key={sprite.id}
              type="button"
              onClick={(e) => handleSpriteClick(sprite, e)}
              className={`absolute select-none active:scale-110 transition-transform leading-none ${
                sprite.bounce ? "animate-bounce-slow" : ""
              }`}
              style={{
                left: `${sprite.x}%`,
                top: `${sprite.y}%`,
                fontSize: `${sprite.size}px`,
                transform: sprite.bounce ? undefined : "translate(-50%, -50%)",
                filter: sprite.filter,
                textShadow: "0 2px 8px rgba(0,0,0,0.18)",
              }}
              aria-label={sprite.label || sprite.emoji}
            >
              {sprite.emoji}
            </button>
          )
        )}

        {/* Page indicator (top-right) */}
        <div className="absolute top-4 right-4 bg-white/85 backdrop-blur rounded-full px-4 py-1.5 shadow-md text-sm font-black text-[#4A4A4A] z-10">
          {pageIndex + 1} / {story.pages.length}
        </div>

        {/* Speech controls (top-center, away from BackButton) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          <button
            type="button"
            onClick={toggleSpeak}
            className="bg-white/85 backdrop-blur rounded-full px-4 py-1.5 shadow-md text-sm font-bold text-[#4A4A4A] active:scale-95 transition-transform"
            aria-label={speaking ? "停止朗讀" : "朗讀"}
          >
            {speaking ? "🔇 停止" : "🔊 朗讀"}
          </button>
          <button
            type="button"
            onClick={toggleAutoplay}
            className={`backdrop-blur rounded-full px-4 py-1.5 shadow-md text-sm font-bold active:scale-95 transition-transform ${
              autoplay ? "bg-[#FFB74D] text-white" : "bg-white/85 text-[#4A4A4A]"
            }`}
            aria-label="自動朗讀"
          >
            {autoplay ? "✓ 自動朗讀" : "自動朗讀"}
          </button>
        </div>

        {/* Floating reactions on click */}
        {reactions.map((r) => (
          <div
            key={r.id}
            className="fixed z-30 pointer-events-none animate-float-up"
            style={{
              left: r.x,
              top: r.y,
              fontSize: 44,
              lineHeight: 1,
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Story text panel */}
      <div className="bg-white px-5 pt-4 pb-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] max-h-[40vh] overflow-y-auto">
        <p className="text-base md:text-lg leading-relaxed text-[#4A4A4A] font-medium">
          {page.text}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="bg-white px-4 pt-3 pb-5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={isFirst}
          className="px-4 py-3 rounded-2xl bg-gray-200 text-gray-700 font-bold text-base disabled:opacity-30 active:scale-95 transition-transform"
        >
          ◀ 上一頁
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={restart}
            className="flex-1 mx-2 px-5 py-3 rounded-2xl bg-[#FF69B4] text-white font-black text-lg active:scale-95 transition-transform shadow-md"
          >
            🌟 再講一次
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="flex-1 mx-2 px-5 py-3 rounded-2xl bg-[#4FC3F7] text-white font-black text-lg active:scale-95 transition-transform shadow-md"
          >
            下一頁 ▶
          </button>
        )}
      </div>
    </div>
  );
}
