"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ANIMALS, type AnimalInfo } from "@/components/svg/animals";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { shuffleArray } from "@/lib/utils/random";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "@/components/baby/ParticleCanvas";

interface Card {
  id: number;
  animal: AnimalInfo;
  flipped: boolean;
  matched: boolean;
}

export default function MemoryMatchGame() {
  const { settings } = useSettings();
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const lockRef = useRef(false);
  const engineRef = useRef<ParticleEngine | null>(null);
  const totalPairs = 6;

  const initGame = useCallback(() => {
    const selected = shuffleArray(ANIMALS).slice(0, totalPairs);
    const pairs = shuffleArray([...selected, ...selected]).map(
      (animal, idx) => ({
        id: idx,
        animal,
        flipped: false,
        matched: false,
      })
    );
    setCards(pairs);
    setFlippedIds([]);
    setMatchCount(0);
    setGameComplete(false);
    lockRef.current = false;
  }, []);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
    initGame();
  }, [initGame, settings.volume]);

  const handleCardTap = useCallback(
    (id: number, e: React.PointerEvent) => {
      if (lockRef.current) return;

      const card = cards.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return;

      audioManager.pop();

      const newFlipped = [...flippedIds, id];
      setFlippedIds(newFlipped);
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, flipped: true } : c))
      );

      if (newFlipped.length === 2) {
        lockRef.current = true;
        const [firstId, secondId] = newFlipped;
        const first = cards.find((c) => c.id === firstId)!;
        const second = cards.find((c) => c.id === secondId)!;

        if (first.animal.name === second.animal.name) {
          // Match!
          setTimeout(() => {
            engineRef.current?.confetti(e.clientX, e.clientY, 25);
            audioManager.success();
            setCards((prev) =>
              prev.map((c) =>
                c.id === firstId || c.id === secondId
                  ? { ...c, matched: true }
                  : c
              )
            );
            setFlippedIds([]);
            lockRef.current = false;

            const newCount = matchCount + 1;
            setMatchCount(newCount);

            if (newCount >= totalPairs) {
              setTimeout(() => {
                setGameComplete(true);
                audioManager.chime();
                audioManager.playFile("/sounds/voices/great-job.mp3");
              }, 500);
            }
          }, 400);
        } else {
          // No match
          setTimeout(() => {
            audioManager.wrong();
            setCards((prev) =>
              prev.map((c) =>
                c.id === firstId || c.id === secondId
                  ? { ...c, flipped: false }
                  : c
              )
            );
            setFlippedIds([]);
            lockRef.current = false;
          }, 1000);
        }
      }
    },
    [cards, flippedIds, matchCount]
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4 relative">
      <ParticleCanvas engineRef={engineRef} />

      <p className="text-xl md:text-2xl font-bold text-[#4A4A4A] z-10">
        找出一樣的配對！
      </p>

      {/* Score */}
      <p className="text-lg font-semibold text-[#FF69B4] z-10">
        {matchCount} / {totalPairs} 對
      </p>

      {/* Card grid */}
      <div className="grid grid-cols-4 gap-2.5 md:gap-4 z-10 w-full max-w-lg">
        {cards.map((card) => {
          const AnimalComp = card.animal.component;
          const isFlipped = card.flipped || card.matched;

          return (
            <button
              key={card.id}
              className={`
                aspect-square rounded-2xl transition-all duration-300 select-none
                flex items-center justify-center
                ${card.matched ? "opacity-70 scale-95" : "active:scale-95 cursor-pointer"}
                ${!isFlipped ? "bg-[#4FC3F7] shadow-lg" : "bg-white shadow-md"}
              `}
              onPointerDown={(e) => handleCardTap(card.id, e)}
              disabled={card.matched}
            >
              {isFlipped ? (
                <div className="animate-bounce-in">
                  <AnimalComp size={50} />
                </div>
              ) : (
                <span className="text-3xl md:text-4xl select-none">❓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Game complete overlay */}
      {gameComplete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-celebrate">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black text-[#FF69B4] mb-2">
              太厲害了！
            </h2>
            <p className="text-xl text-gray-500 mb-6">好棒！全部配對成功！</p>
            <button
              onClick={initGame}
              className="px-8 py-4 rounded-2xl bg-[#4FC3F7] text-white font-bold text-xl active:scale-95 transition-transform"
            >
              再玩一次
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
