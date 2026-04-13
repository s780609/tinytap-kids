"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ANIMALS, type AnimalInfo } from "@/components/svg/animals";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { shuffleArray, pickRandom } from "@/lib/utils/random";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "@/components/baby/ParticleCanvas";

type GameMode = "tap-to-hear" | "find-animal";

export default function AnimalSoundGame() {
  const { settings } = useSettings();
  const [mode, setMode] = useState<GameMode>("tap-to-hear");
  const [animals, setAnimals] = useState<AnimalInfo[]>([]);
  const [targetAnimal, setTargetAnimal] = useState<AnimalInfo | null>(null);
  const [tappedId, setTappedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [matched, setMatched] = useState(false);
  const [roundCount, setRoundCount] = useState(0);
  const engineRef = useRef<ParticleEngine | null>(null);

  const setupTapToHear = useCallback(() => {
    const shuffled = shuffleArray(ANIMALS);
    setAnimals(shuffled.slice(0, 4));
    setTargetAnimal(null);
    setTappedId(null);
    setMatched(false);
    setWrongId(null);
  }, []);

  const setupFindAnimal = useCallback(() => {
    const shuffled = shuffleArray(ANIMALS);
    const selection = shuffled.slice(0, 4);
    const target = pickRandom(selection);
    setAnimals(selection);
    setTargetAnimal(target);
    setTappedId(null);
    setMatched(false);
    setWrongId(null);
    // Play the target animal sound after a short delay
    setTimeout(() => {
      audioManager.playFile(target.soundFile);
    }, 500);
  }, []);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
    audioManager.preloadAll();
    setupTapToHear();
  }, [setupTapToHear, settings.volume]);

  const nextRound = useCallback(() => {
    const newCount = roundCount + 1;
    setRoundCount(newCount);

    // Switch mode every 3 rounds
    if (newCount % 3 === 0) {
      const nextMode = mode === "tap-to-hear" ? "find-animal" : "tap-to-hear";
      setMode(nextMode);
      if (nextMode === "tap-to-hear") {
        setupTapToHear();
      } else {
        setupFindAnimal();
      }
    } else {
      if (mode === "tap-to-hear") {
        setupTapToHear();
      } else {
        setupFindAnimal();
      }
    }
  }, [roundCount, mode, setupTapToHear, setupFindAnimal]);

  const handleTapToHear = (animal: AnimalInfo) => {
    setTappedId(animal.name);
    audioManager.playFile(animal.soundFile);
    setTimeout(() => setTappedId(null), 600);
  };

  const handleFindAnimal = (animal: AnimalInfo, e: React.PointerEvent) => {
    if (matched) return;

    if (animal.name === targetAnimal?.name) {
      setMatched(true);
      setTappedId(animal.name);
      engineRef.current?.confetti(e.clientX, e.clientY, 25);
      audioManager.success();
      setTimeout(() => {
        audioManager.playFile("/sounds/voices/great-job.mp3");
      }, 300);
      setTimeout(() => nextRound(), 2200);
    } else {
      setWrongId(animal.name);
      audioManager.wrong();
      setTimeout(() => {
        setWrongId(null);
        // Replay the target sound
        if (targetAnimal) audioManager.playFile(targetAnimal.soundFile);
      }, 600);
    }
  };

  const replaySound = () => {
    if (targetAnimal) audioManager.playFile(targetAnimal.soundFile);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-6 relative">
      <ParticleCanvas engineRef={engineRef} />

      {/* Title */}
      <div className="text-center">
        {mode === "tap-to-hear" ? (
          <p className="text-xl md:text-2xl font-bold text-[#4A4A4A]">
            Tap an animal to hear it!
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xl md:text-2xl font-bold text-[#4A4A4A]">
              Which animal makes this sound?
            </p>
            <button
              onClick={replaySound}
              className="px-6 py-3 rounded-2xl bg-[#81C784] text-white font-bold text-lg active:scale-95 transition-transform"
            >
              🔊 Play Again
            </button>
          </div>
        )}
      </div>

      {/* Animals grid */}
      <div className="grid grid-cols-2 gap-5 md:gap-8">
        {animals.map((animal) => {
          const AnimalComp = animal.component;
          const isActive = tappedId === animal.name;
          const isWrong = wrongId === animal.name;

          return (
            <button
              key={animal.name}
              className={`
                p-4 md:p-6 rounded-3xl bg-white shadow-lg
                active:scale-95 transition-all duration-200
                select-none cursor-pointer
                ${isActive ? "scale-110 ring-4 ring-[#81C784]" : ""}
                ${isWrong ? "animate-wobble" : ""}
                ${matched && tappedId === animal.name ? "animate-celebrate" : ""}
              `}
              onPointerDown={(e) => {
                if (mode === "tap-to-hear") {
                  handleTapToHear(animal);
                } else {
                  handleFindAnimal(animal, e);
                }
              }}
            >
              <AnimalComp size={80} />
              <p className="text-sm font-bold text-[#4A4A4A] mt-1">
                {animal.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Match celebration */}
      {matched && (
        <div className="animate-celebrate text-3xl font-black text-[#81C784]">
          好棒！
        </div>
      )}

      {/* Skip / Next button for tap-to-hear mode */}
      {mode === "tap-to-hear" && (
        <button
          onClick={nextRound}
          className="px-6 py-3 rounded-2xl bg-[#CE93D8] text-white font-bold active:scale-95 transition-transform"
        >
          Next →
        </button>
      )}
    </div>
  );
}
