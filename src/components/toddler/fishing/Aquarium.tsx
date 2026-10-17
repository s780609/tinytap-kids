"use client";

import { useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { getCatchType, type CatchKind } from "@/lib/fishing/fishingLogic";

interface AquariumProps {
  fish: CatchKind[];
  onClose: () => void;
}

/** 水族箱最多放幾隻，太多會擠成一團 */
const MAX_SHOWN = 24;

/** 依序號算出固定的亂數（0～1），每次打開位置都一樣、也不會在 render 裡呼叫 Math.random */
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** 水族箱：水桶裡的魚在玻璃缸裡游來游去，點一下會跳起來並說出名字 */
export default function Aquarium({ fish, onClose }: AquariumProps) {
  const [jumping, setJumping] = useState<number | null>(null);
  const shown = fish.slice(-MAX_SHOWN);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-[#B3E5FC] via-[#4FC3F7] to-[#0277BD]">
      {/* 光線 */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[repeating-linear-gradient(100deg,transparent_0_60px,rgba(255,255,255,0.5)_60px_90px)]" />

      {/* 泡泡 */}
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={`b${i}`}
          className="absolute bottom-0 rounded-full border-2 border-white/70 pointer-events-none animate-aquarium-bubble"
          style={{
            left: `${5 + hash(i + 100) * 90}%`,
            width: 8 + hash(i + 200) * 14,
            height: 8 + hash(i + 200) * 14,
            animationDuration: `${5 + hash(i + 300) * 5}s`,
            animationDelay: `${-hash(i + 400) * 8}s`,
          }}
        />
      ))}

      {/* 沙子和水草 */}
      <div className="absolute left-0 right-0 bottom-0 h-20 bg-[#FFE0B2] rounded-t-[50%]" />
      <div className="absolute left-0 right-0 bottom-3 flex justify-around text-5xl pointer-events-none select-none">
        <span>🌿</span>
        <span>🪸</span>
        <span>🐚</span>
        <span>🌿</span>
        <span>🪨</span>
        <span>🪸</span>
      </div>

      {/* 魚 */}
      {shown.map((kind, i) => {
        const type = getCatchType(kind);
        const bottomDweller = kind === "crab" || kind === "treasure";
        const top = bottomDweller ? 72 + hash(i) * 8 : 14 + hash(i) * 52;
        return (
          <div
            key={i}
            className="absolute animate-aquarium-swim"
            style={{
              top: `${top}%`,
              animationDuration: `${(bottomDweller ? 18 : 9) + hash(i + 7) * 8}s`,
              animationDelay: `${-hash(i + 13) * 16}s`,
            }}
          >
            <div
              className="animate-aquarium-bob"
              style={{ animationDuration: `${2 + hash(i + 21) * 2}s` }}
            >
              <button
                type="button"
                aria-label={type.label}
                onClick={() => {
                  setJumping(i);
                  audioManager.bubble();
                  audioManager.speak(type.label);
                }}
                onAnimationEnd={() => setJumping((j) => (j === i ? null : j))}
                className={`leading-none select-none ${jumping === i ? "animate-fish-jump" : ""}`}
                style={{
                  fontSize: Math.min(90, type.size * 1.3),
                  filter: type.glow ? `drop-shadow(0 0 10px ${type.glow})` : undefined,
                }}
              >
                {type.emoji}
              </button>
            </div>
          </div>
        );
      })}

      {shown.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-white text-2xl font-black">
          水族箱空空的，先去釣魚吧！
        </p>
      )}

      <div className="absolute top-5 left-0 right-0 text-center pointer-events-none">
        <span className="bg-white/85 rounded-2xl px-4 py-2 text-xl font-black text-[#0288D1] shadow">
          🐠 我的水族箱
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-14 h-14 rounded-full bg-white/85 shadow text-2xl font-black text-gray-500 active:scale-90 transition-transform"
        aria-label="關閉水族箱"
      >
        ✕
      </button>
    </div>
  );
}
