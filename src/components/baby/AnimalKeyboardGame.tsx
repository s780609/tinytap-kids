"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { ANIMAL_KEYS, animalRate } from "@/lib/piano/keyboard";
import { useGlissando } from "./useGlissando";

export default function AnimalKeyboardGame() {
  const { settings } = useSettings();
  const [lit, setLit] = useState<Set<number>>(new Set());
  /** 舞台上的大動物；count 變了就重新播放跳出動畫 */
  const [star, setStar] = useState<{ midi: number; count: number } | null>(null);
  const tokensRef = useRef<Record<number, number>>({});

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    ANIMAL_KEYS.forEach((k) => audioManager.preload(k.sound));
  }, []);

  const pressKey = (midi: number) => {
    const key = ANIMAL_KEYS.find((k) => k.midi === midi);
    if (!key) return;
    audioManager.playFile(key.sound, animalRate(midi));
    setStar((prev) => ({ midi, count: (prev?.count ?? 0) + 1 }));

    const token = (tokensRef.current[midi] ?? 0) + 1;
    tokensRef.current[midi] = token;
    setLit((prev) => new Set(prev).add(midi));
    setTimeout(() => {
      if (tokensRef.current[midi] !== token) return;
      setLit((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }, 300);
  };

  const glissando = useGlissando((key) => pressKey(Number(key)));
  const starKey = star ? ANIMAL_KEYS.find((k) => k.midi === star.midi) : null;

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gradient-to-b from-[#E1F5FE] to-[#F1F8E9] select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1 className="pt-6 pl-20 pr-6 text-3xl font-black text-[#43A047] text-center animate-bounce-in">
        🐮 動物鍵盤
      </h1>

      {/* 舞台：剛剛按到的動物跳出來 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {star && starKey ? (
          <div key={star.count} className="flex flex-col items-center animate-bounce-in">
            <span className="text-[8rem] leading-none">{starKey.emoji}</span>
            <span
              className="mt-2 px-5 py-1 rounded-full text-2xl font-black text-white shadow"
              style={{ backgroundColor: starKey.color }}
            >
              {starKey.name}
            </span>
          </div>
        ) : (
          <span className="text-2xl font-black text-[#90A4AE] animate-pulse">按按看！👇</span>
        )}
      </div>

      {/* 鍵盤本體 */}
      <div className="mx-2 mb-1 rounded-[2rem] bg-[#8D6E63] p-3 shadow-2xl h-[50%] flex">
        <div className="flex-1 flex" {...glissando}>
          {ANIMAL_KEYS.map((k) => {
            const down = lit.has(k.midi);
            return (
              <div
                key={k.midi}
                data-key={k.midi}
                className="flex-1 mx-[3px] rounded-2xl flex flex-col items-center justify-end pb-4 transition-transform duration-75"
                style={{
                  backgroundColor: k.color,
                  transform: down ? "translateY(6px)" : "none",
                  filter: down ? "brightness(1.15)" : "none",
                  boxShadow: down
                    ? "inset 0 -2px 0 rgba(0,0,0,0.2)"
                    : "inset 0 -10px 0 rgba(0,0,0,0.2)",
                }}
              >
                <span
                  className={`text-4xl leading-none pointer-events-none transition-transform ${
                    down ? "scale-125" : ""
                  }`}
                >
                  {k.emoji}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ElevenLabs 免費方案要求註明來源 */}
      <p className="pb-2 text-center text-[10px] text-[#90A4AE]">部分音效：elevenlabs.io</p>
    </div>
  );
}
