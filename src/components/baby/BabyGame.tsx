"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { BALLOON_COLORS } from "@/lib/utils/colors";
import { pickRandom, randomFloat, randomInt } from "@/lib/utils/random";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "./ParticleCanvas";

interface Balloon {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  popping: boolean;
  animDelay: number;
}

const BALLOON_COUNT = 8;
let nextId = 0;

function createBalloon(): Balloon {
  return {
    id: nextId++,
    x: randomFloat(10, 90),
    y: randomFloat(15, 85),
    color: pickRandom(BALLOON_COLORS),
    size: randomInt(70, 110),
    popping: false,
    animDelay: randomFloat(0, 2),
  };
}

export default function BabyGame() {
  const { settings } = useSettings();
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const engineRef = useRef<ParticleEngine | null>(null);
  const feedbackSounds = useRef(["/sounds/feedback/laugh.mp3", "/sounds/voices/wow.mp3", "/sounds/voices/great-job.mp3"]);
  const feedbackIndex = useRef(0);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
    audioManager.preloadAll();

    const initial: Balloon[] = [];
    for (let i = 0; i < BALLOON_COUNT; i++) {
      initial.push(createBalloon());
    }
    setBalloons(initial);
  }, [settings.volume]);

  const popBalloon = useCallback(
    (id: number, clientX: number, clientY: number) => {
      setBalloons((prev) => {
        const idx = prev.findIndex((b) => b.id === id && !b.popping);
        if (idx === -1) return prev;

        const balloon = prev[idx];
        const next = [...prev];
        next[idx] = { ...balloon, popping: true };

        // Particle burst
        engineRef.current?.burst(clientX, clientY, balloon.color, 20);

        // Sound
        audioManager.pop();
        const sounds = feedbackSounds.current;
        feedbackIndex.current = (feedbackIndex.current + 1) % sounds.length;
        setTimeout(() => {
          audioManager.playFile(sounds[feedbackIndex.current]);
        }, 100);

        // Spawn new balloon after delay
        setTimeout(() => {
          setBalloons((cur) => {
            const filtered = cur.filter((b) => b.id !== id);
            return [...filtered, createBalloon()];
          });
        }, 350);

        return next;
      });
    },
    []
  );

  const handleBackgroundTap = useCallback(
    (e: React.PointerEvent) => {
      // Only trigger if tapping empty space (not a balloon)
      if ((e.target as HTMLElement).dataset.balloon) return;
      engineRef.current?.sparkle(e.clientX, e.clientY, 8);
      audioManager.ding();
    },
    []
  );

  return (
    <div
      className="fixed inset-0 bg-gradient-to-b from-[#E3F2FD] to-[#FFF0F5] overflow-hidden"
      onPointerDown={handleBackgroundTap}
    >
      <ParticleCanvas engineRef={engineRef} />

      {balloons.map((b) => (
        <div
          key={b.id}
          data-balloon="true"
          className={`absolute cursor-pointer select-none ${b.popping ? "animate-pop" : "animate-balloon-float"}`}
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.size,
            height: b.size * 1.2,
            animationDelay: `${b.animDelay}s`,
            animationDuration: `${2.5 + b.animDelay}s`,
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            popBalloon(b.id, e.clientX, e.clientY);
          }}
        >
          {/* Balloon body */}
          <svg
            viewBox="0 0 100 130"
            width="100%"
            height="100%"
            data-balloon="true"
          >
            {/* Balloon */}
            <ellipse
              cx="50"
              cy="50"
              rx="42"
              ry="48"
              fill={b.color}
              data-balloon="true"
            />
            {/* Shine */}
            <ellipse
              cx="36"
              cy="36"
              rx="12"
              ry="16"
              fill="rgba(255,255,255,0.3)"
              transform="rotate(-20 36 36)"
              data-balloon="true"
            />
            {/* Knot */}
            <polygon
              points="46,96 54,96 50,102"
              fill={b.color}
              data-balloon="true"
            />
            {/* String */}
            <path
              d="M50,102 Q52,115 48,128"
              stroke="#ccc"
              strokeWidth="1.5"
              fill="none"
              data-balloon="true"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
