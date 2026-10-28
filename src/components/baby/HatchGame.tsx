"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "./ParticleCanvas";
import { ANIMALS } from "@/components/svg/animals";
import { CatchIcon } from "@/components/toddler/fishing/CatchIcon";
import type { CatchKind } from "@/lib/fishing/fishingLogic";
import { EGG_STYLES, HATCHLINGS, applyTap, newEgg, tapResult, type EggState, type Hatchling } from "@/lib/hatch/hatch";
import { EggHalf, Nest } from "./EggArt";

/** 孵出來後停多久再換下一顆蛋（期間每點一下重新計時） */
const SHOW_MS = 3200;
/** 孵出來後多久內再點不算（等蛋殼飛走） */
const HATCH_LOCK_MS = 600;
/** 下面一排最多顯示幾隻孵過的動物 */
const SHELF = 8;

function HatchlingArt({ h, size }: { h: Hatchling; size: number }) {
  if (h.kind === "sea") return <CatchIcon kind={h.name as CatchKind} size={size} />;
  const Comp = ANIMALS.find((a) => a.name === h.name)?.component;
  return Comp ? <Comp size={size} /> : null;
}

function callHatchling(h: Hatchling) {
  if (h.sound) {
    audioManager.playFile(h.sound);
    setTimeout(() => audioManager.speak(`${h.label}！`), 900);
  } else {
    audioManager.speak(`${h.label}！`);
  }
}

// 伺服器端先畫固定的第一顆蛋；載入後才隨機挑動物，避免 hydration 不一致
const FIRST: EggState = { round: 0, style: 0, hatchling: 0, cracks: 0, hatched: false };

export default function HatchGame() {
  const { settings } = useSettings();
  const [egg, setEgg] = useState<EggState>(FIRST);
  const [history, setHistory] = useState<number[]>([]);
  /** 每點一下 +1，讓蛋重新搖一下、動物重新跳一下 */
  const [taps, setTaps] = useState(0);
  const engineRef = useRef<ParticleEngine | null>(null);
  const eggRef = useRef<HTMLDivElement>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hatchedAtRef = useRef(0);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    HATCHLINGS.forEach((h) => h.sound && audioManager.preload(h.sound));
    const id = setTimeout(() => setEgg((cur) => ({ ...cur, hatchling: newEgg(null, []).hatchling })), 0);
    return () => {
      clearTimeout(id);
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    };
  }, []);

  /** 孵出來後過一陣子換下一顆蛋 */
  const scheduleNext = (current: EggState, hist: number[]) => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    nextTimerRef.current = setTimeout(() => {
      nextTimerRef.current = null;
      audioManager.whoosh();
      setEgg(newEgg(current, hist));
    }, SHOW_MS);
  };

  const tap = () => {
    const result = tapResult(egg);
    const h = HATCHLINGS[egg.hatchling];
    // 剛孵出來時等蛋殼飛走的動畫跑完
    if (result === "again" && performance.now() - hatchedAtRef.current < HATCH_LOCK_MS) return;
    setTaps((t) => t + 1);

    if (result === "crack") {
      audioManager.pop();
      navigator.vibrate?.(15);
      setEgg(applyTap(egg));
      return;
    }

    if (result === "hatch") {
      const next = applyTap(egg);
      const hist = [...history, egg.hatchling];
      hatchedAtRef.current = performance.now();
      setEgg(next);
      setHistory(hist);
      audioManager.success();
      setTimeout(() => callHatchling(h), 250);
      const r = eggRef.current?.getBoundingClientRect();
      if (r) {
        engineRef.current?.confetti(r.left + r.width / 2, r.top + r.height * 0.35, 40);
        engineRef.current?.sparkle(r.left + r.width / 2, r.top + r.height * 0.4, 12);
      }
      scheduleNext(next, hist);
      return;
    }

    // 已經孵出來：再叫一次，並且多留一會兒
    callHatchling(h);
    scheduleNext(egg, history);
  };

  const style = EGG_STYLES[egg.style];
  const h = HATCHLINGS[egg.hatchling];

  return (
    <div
      className="fixed inset-0 flex flex-col items-center select-none overflow-hidden"
      style={{ touchAction: "none", background: "linear-gradient(#B3E5FC 0%, #E1F5FE 55%, #C5E1A5 55%, #AED581 100%)" }}
      onPointerDown={tap}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ParticleCanvas engineRef={engineRef} />

      {/* 背景：太陽、雲 */}
      <span className="absolute right-[8%] top-[6%] w-16 h-16 rounded-full bg-[#FFE082] shadow-[0_0_40px_#FFE082] pointer-events-none" />
      <span className="absolute left-[12%] top-[18%] w-24 h-8 rounded-full bg-white/80 pointer-events-none" />
      <span className="absolute left-[16%] top-[14%] w-12 h-10 rounded-full bg-white/80 pointer-events-none" />

      <h1 className="relative mt-5 text-3xl font-black text-[#FF8A65] animate-bounce-in pointer-events-none">🥚 敲敲蛋</h1>
      <p className="relative mt-1 text-base font-bold text-[#5D4037]/70 pointer-events-none">
        {egg.hatched ? `是${h.label}！` : "誰在蛋裡面？點點看！"}
      </p>

      <div className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center pointer-events-none">
        <div key={egg.round} className="hatch-roll-in flex flex-col items-center">
          <div key={egg.hatched ? "open" : `wobble-${taps}`} className={egg.hatched ? undefined : "hatch-wobble"}>
            <div ref={eggRef} className="hatch-egg relative">
              {egg.hatched && (
                <span key={`pop-${taps}`} className="hatch-rise absolute left-1/2 bottom-[34%] z-[1] w-[92%] aspect-square">
                  <HatchlingArt h={h} size={200} />
                </span>
              )}
              <EggHalf style={style} cracks={egg.cracks} part="bottom" className="absolute inset-0 z-[2] w-full h-full" />
              <EggHalf
                style={style}
                cracks={egg.cracks}
                part="top"
                className={`absolute inset-0 z-[3] w-full h-full ${egg.hatched ? "hatch-fly" : ""}`}
              />
            </div>
          </div>
          <Nest className="hatch-nest relative z-[4]" />
        </div>
      </div>

      {/* 孵過的動物 */}
      <div className="hatch-shelf pointer-events-none">
        {history.slice(-SHELF).map((idx, i, arr) => (
          <span
            key={history.length - arr.length + i}
            className="w-12 h-12 rounded-full bg-white/80 shadow flex items-center justify-center overflow-hidden animate-bounce-in"
          >
            <HatchlingArt h={HATCHLINGS[idx]} size={40} />
          </span>
        ))}
      </div>
    </div>
  );
}
