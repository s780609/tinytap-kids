"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FRUITS, type FruitInfo } from "@/components/svg/fruits";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { pickRandom, randomInt, shuffleArray } from "@/lib/utils/random";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "@/components/baby/ParticleCanvas";

export default function CountingGame() {
  const { settings } = useSettings();
  const [count, setCount] = useState(1);
  const [fruit, setFruit] = useState<FruitInfo>(FRUITS[0]);
  const [options, setOptions] = useState<number[]>([]);
  const [matched, setMatched] = useState(false);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const engineRef = useRef<ParticleEngine | null>(null);

  const newRound = useCallback(() => {
    const newCount = randomInt(1, 5);
    const newFruit = pickRandom(FRUITS);

    // Generate 3 options: correct + 2 wrong
    const wrongOptions = new Set<number>();
    while (wrongOptions.size < 2) {
      const wrong = randomInt(1, 5);
      if (wrong !== newCount) wrongOptions.add(wrong);
    }

    setCount(newCount);
    setFruit(newFruit);
    setOptions(shuffleArray([newCount, ...Array.from(wrongOptions)]));
    setMatched(false);
    setWrongId(null);
  }, []);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
    newRound();
  }, [newRound, settings.volume]);

  const handleAnswer = (num: number, e: React.PointerEvent) => {
    if (matched) return;

    if (num === count) {
      setMatched(true);
      engineRef.current?.confetti(e.clientX, e.clientY, 25);
      audioManager.success();
      setScore((s) => s + 1);
      setTimeout(() => {
        audioManager.playFile("/sounds/voices/great-job.mp3");
      }, 200);
      setTimeout(() => newRound(), 2000);
    } else {
      setWrongId(num);
      audioManager.wrong();
      setTimeout(() => setWrongId(null), 500);
    }
  };

  const FruitComp = fruit.component;

  // Position fruits in a friendly layout
  const fruitPositions = Array.from({ length: count }, (_, i) => {
    if (count === 1) return { row: 0, col: 0, total: 1 };
    if (count <= 3) return { row: 0, col: i, total: count };
    if (count === 4) return { row: Math.floor(i / 2), col: i % 2, total: 2 };
    // count === 5
    if (i < 3) return { row: 0, col: i, total: 3 };
    return { row: 1, col: i - 3, total: 2 };
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6 relative">
      <ParticleCanvas engineRef={engineRef} />

      {/* Score */}
      <p className="text-lg font-bold text-[#FFB74D] z-10">
        分數：{score}
      </p>

      {/* Question */}
      <p className="text-xl md:text-2xl font-bold text-[#4A4A4A] z-10">
        有幾個{fruit.label}？
      </p>

      {/* Fruit display */}
      <div className="z-10 flex flex-col items-center gap-3 p-6 bg-white/60 rounded-3xl min-h-[180px] justify-center">
        {/* Group by rows */}
        {[0, 1].map((row) => {
          const rowFruits = fruitPositions.filter((p) => p.row === row);
          if (rowFruits.length === 0) return null;
          return (
            <div key={row} className="flex gap-4 justify-center">
              {rowFruits.map((_, idx) => (
                <div
                  key={`${row}-${idx}`}
                  className="animate-bounce-in"
                  style={{ animationDelay: `${(row * 3 + idx) * 0.1}s` }}
                >
                  <FruitComp size={65} />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Answer buttons */}
      <div className="flex gap-5 z-10">
        {options.map((num) => (
          <button
            key={num}
            className={`
              w-20 h-20 md:w-24 md:h-24 rounded-2xl
              flex items-center justify-center
              text-3xl md:text-4xl font-black text-white
              shadow-lg active:scale-95 transition-all duration-200
              select-none cursor-pointer
              ${wrongId === num ? "animate-wobble" : ""}
              ${matched && num === count ? "ring-4 ring-[#81C784] scale-110 bg-[#81C784]" : "bg-[#4FC3F7]"}
            `}
            onPointerDown={(e) => handleAnswer(num, e)}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Match celebration */}
      {matched && (
        <div className="animate-celebrate text-3xl font-black text-[#81C784] z-10">
          答對了！好棒！
        </div>
      )}
    </div>
  );
}
