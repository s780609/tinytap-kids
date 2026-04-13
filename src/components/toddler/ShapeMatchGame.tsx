"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SHAPES, type ShapeInfo } from "@/components/svg/shapes";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { shuffleArray } from "@/lib/utils/random";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "@/components/baby/ParticleCanvas";

export default function ShapeMatchGame() {
  const { settings } = useSettings();
  const [target, setTarget] = useState<ShapeInfo | null>(null);
  const [options, setOptions] = useState<ShapeInfo[]>([]);
  const [matched, setMatched] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const engineRef = useRef<ParticleEngine | null>(null);

  const newRound = useCallback(() => {
    const shuffled = shuffleArray(SHAPES);
    const t = shuffled[0];
    const distractors = shuffled.slice(1, 3);
    setTarget(t);
    setOptions(shuffleArray([t, ...distractors]));
    setMatched(false);
    setWrongId(null);
  }, []);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
    newRound();
  }, [newRound, settings.volume]);

  const handleTap = (shape: ShapeInfo, e: React.PointerEvent) => {
    if (matched) return;

    if (shape.name === target?.name) {
      setMatched(true);
      engineRef.current?.confetti(e.clientX, e.clientY, 25);
      audioManager.success();
      setTimeout(() => {
        audioManager.playFile(shape.voiceFile);
      }, 200);
      setTimeout(() => newRound(), 2000);
    } else {
      setWrongId(shape.name);
      audioManager.wrong();
      setTimeout(() => setWrongId(null), 500);
    }
  };

  if (!target) return null;

  const TargetComponent = target.component;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8 relative">
      <ParticleCanvas engineRef={engineRef} />

      {/* Target */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-xl md:text-2xl font-bold text-[#4A4A4A]">
          Find the {target.label}!
        </p>
        <div
          className={`p-4 rounded-3xl bg-white/50 ${matched ? "animate-celebrate" : "animate-pulse-glow"}`}
        >
          <TargetComponent size={100} color={target.defaultColor} />
        </div>
      </div>

      {/* Options */}
      <div className="flex gap-6 md:gap-10 flex-wrap justify-center">
        {options.map((shape) => {
          const ShapeComp = shape.component;
          const isWrong = wrongId === shape.name;
          const isCorrectAndMatched = matched && shape.name === target.name;

          return (
            <button
              key={shape.name}
              className={`
                p-5 rounded-3xl bg-white shadow-lg
                active:scale-95 transition-all duration-200
                select-none cursor-pointer
                ${isWrong ? "animate-wobble" : ""}
                ${isCorrectAndMatched ? "ring-4 ring-[#81C784] scale-110" : ""}
              `}
              onPointerDown={(e) => handleTap(shape, e)}
            >
              <ShapeComp size={90} color={shape.defaultColor} />
            </button>
          );
        })}
      </div>

      {/* Match celebration */}
      {matched && (
        <div className="animate-celebrate text-3xl font-black text-[#81C784]">
          Great job! 好棒！
        </div>
      )}
    </div>
  );
}
