"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SHAPES, type ShapeInfo } from "@/components/svg/shapes";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { pickRandom, randomFloat, randomInt } from "@/lib/utils/random";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "@/components/baby/ParticleCanvas";

interface Bubble {
  id: number;
  shape: ShapeInfo;
  x: number;
  y: number;
  size: number;
  color: string;
  animDelay: number;
  animDuration: number;
}

const BUBBLE_COLORS = [
  "rgba(255,105,180,0.35)",
  "rgba(79,195,247,0.35)",
  "rgba(255,213,79,0.35)",
  "rgba(129,199,132,0.35)",
  "rgba(206,147,216,0.35)",
];

let bubbleId = 0;

function createBubble(): Bubble {
  return {
    id: bubbleId++,
    shape: pickRandom(SHAPES),
    x: randomFloat(10, 85),
    y: randomFloat(15, 80),
    size: randomInt(90, 130),
    color: pickRandom(BUBBLE_COLORS),
    animDelay: randomFloat(0, 3),
    animDuration: randomFloat(3.5, 5.5),
  };
}

export default function BubbleShapeGame() {
  const { settings } = useSettings();
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [revealed, setRevealed] = useState<{
    shape: ShapeInfo;
    x: number;
    y: number;
  } | null>(null);
  const engineRef = useRef<ParticleEngine | null>(null);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);

    const initial: Bubble[] = [];
    for (let i = 0; i < 5; i++) {
      initial.push(createBubble());
    }
    setBubbles(initial);
  }, [settings.volume]);

  const popBubble = useCallback(
    (bubble: Bubble, clientX: number, clientY: number) => {
      // Pop effect
      engineRef.current?.burst(clientX, clientY, bubble.shape.defaultColor, 18);
      audioManager.bubble();

      // Show revealed shape
      setRevealed({ shape: bubble.shape, x: clientX, y: clientY });

      // Play voice
      setTimeout(() => {
        audioManager.playFile(bubble.shape.voiceFile);
      }, 300);

      // Remove bubble and add new one
      setBubbles((prev) => {
        const filtered = prev.filter((b) => b.id !== bubble.id);
        return filtered;
      });

      // Hide revealed shape and add new bubble
      setTimeout(() => {
        setRevealed(null);
        setBubbles((prev) => [...prev, createBubble()]);
      }, 2500);
    },
    []
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#E8F5E9] to-[#E3F2FD] overflow-hidden">
      <ParticleCanvas engineRef={engineRef} />

      {/* Bubbles */}
      {bubbles.map((b) => {
        const ShapeComp = b.shape.component;
        return (
          <div
            key={b.id}
            className="absolute cursor-pointer select-none animate-bubble-float"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.size,
              height: b.size,
              transform: "translate(-50%, -50%)",
              animationDelay: `${b.animDelay}s`,
              animationDuration: `${b.animDuration}s`,
              zIndex: 10,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              popBubble(b, e.clientX, e.clientY);
            }}
          >
            {/* Bubble background */}
            <div
              className="w-full h-full rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.6), ${b.color})`,
                border: "2px solid rgba(255,255,255,0.4)",
                boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              <div className="opacity-60">
                <ShapeComp size={b.size * 0.45} color={b.shape.defaultColor} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Revealed shape overlay */}
      {revealed && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/20 animate-celebrate">
          <div className="flex flex-col items-center gap-4 bg-white/90 backdrop-blur rounded-3xl p-8 shadow-2xl">
            <revealed.shape.component
              size={140}
              color={revealed.shape.defaultColor}
            />
            <p className="text-2xl md:text-3xl font-black text-[#4A4A4A]">
              This is a {revealed.shape.label}!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
