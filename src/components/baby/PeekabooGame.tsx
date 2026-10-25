"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import {
  HIDERS,
  SPOTS,
  SPOT_COUNT,
  initialHiders,
  pickHider,
  pickSpots,
  type SpotKind,
} from "@/lib/peekaboo/peekaboo";
import { HiderArt, callHider } from "./HiderArt";

/** 動物露臉多久後再躲回去 */
const SHOW_MS = 2600;
/** 蓋子關回去的動畫時間，關好了才換動物，換的瞬間看不到 */
const CLOSE_MS = 450;

interface SpotState {
  /** 這一格是哪種藏身處（SPOTS 的編號） */
  spot: number;
  hider: number;
  open: boolean;
  /** 動物有沒有畫出來：關好之後才不畫，伺服器端一開始也不畫，避免亂數造成 hydration 不一致 */
  shown: boolean;
  /** 每次點開或再點一下就 +1，讓動物重新播放跳出動畫 */
  pops: number;
}

const BACKGROUNDS: Record<SpotKind, string> = {
  bush: "linear-gradient(#B3E5FC, #C8E6C9)",
  door: "linear-gradient(#FFF3E0, #FFE0B2)",
  box: "linear-gradient(#F3E5F5, #E1BEE7)",
  curtain: "linear-gradient(#FFFDE7, #FFF59D)",
  blanket: "linear-gradient(#FFF8E1, #FFE0B2)",
  umbrella: "linear-gradient(#E1F5FE, #B3E5FC)",
  rock: "linear-gradient(#E3F2FD, #DCEDC8)",
  window: "linear-gradient(#B3E5FC, #81D4FA)",
};


function Cover({ kind, open }: { kind: SpotKind; open: boolean }) {
  const t = `transform ${CLOSE_MS}ms cubic-bezier(0.34, 1.3, 0.64, 1)`;
  if (kind === "bush") {
    return (
      <div
        className="absolute inset-x-0 bottom-0 h-[85%] pointer-events-none"
        style={{ transform: open ? "translateY(80%)" : "none", transition: t }}
      >
        {[
          ["8%", "30%", "46%"],
          ["38%", "18%", "52%"],
          ["62%", "32%", "44%"],
          ["22%", "50%", "58%"],
        ].map(([left, top, size], i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left,
              top,
              width: size,
              aspectRatio: "1",
              background: "radial-gradient(circle at 35% 30%, #81C784, #388E3C)",
            }}
          />
        ))}
        <span className="absolute inset-x-0 bottom-0 h-[45%] bg-[#388E3C] rounded-t-3xl" />
      </div>
    );
  }
  if (kind === "door") {
    return (
      <div className="absolute inset-[8%] pointer-events-none" style={{ perspective: "600px" }}>
        <div
          className="absolute inset-0 rounded-2xl bg-[#8D6E63] border-[6px] border-[#5D4037]"
          style={{
            transformOrigin: "left center",
            transform: open ? "rotateY(-110deg)" : "none",
            transition: t,
          }}
        >
          <span className="absolute left-[12%] right-[12%] top-[10%] h-[34%] rounded-lg border-4 border-[#6D4C41]" />
          <span className="absolute left-[12%] right-[12%] bottom-[10%] h-[34%] rounded-lg border-4 border-[#6D4C41]" />
          <span className="absolute right-[10%] top-1/2 w-5 h-5 -mt-2.5 rounded-full bg-[#FFD54F] border-2 border-[#F9A825]" />
        </div>
      </div>
    );
  }
  if (kind === "box") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
        <div
          className="absolute left-[10%] right-[10%] bottom-[6%] h-[58%] rounded-xl bg-[#EC407A]"
          style={{ transform: open ? "translateY(110%)" : "none", transition: t }}
        >
          <span className="absolute left-1/2 -ml-[9%] w-[18%] inset-y-0 bg-[#FFD54F]" />
        </div>
        <div
          className="absolute left-[5%] right-[5%] top-[24%] h-[16%] rounded-lg bg-[#F06292]"
          style={{
            transform: open ? "translateY(-190%) rotate(-18deg)" : "none",
            transition: t,
          }}
        >
          <span className="absolute left-1/2 -ml-[8%] w-[16%] inset-y-0 bg-[#FFD54F]" />
          <span className="absolute left-1/2 -translate-x-1/2 -top-7 text-4xl leading-none">🎀</span>
        </div>
      </div>
    );
  }
  if (kind === "blanket") {
    // 格子花的棉被往下滑開
    return (
      <div
        className="absolute inset-x-[4%] bottom-0 h-[80%] pointer-events-none rounded-t-[2rem] border-4 border-[#0288D1]"
        style={{
          transform: open ? "translateY(88%)" : "none",
          transition: t,
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.35) 0 12px, transparent 12px 24px), repeating-linear-gradient(90deg, #4FC3F7 0 24px, #29B6F6 24px 48px)",
        }}
      >
        <span className="absolute inset-x-[10%] top-[8%] h-[14%] rounded-full bg-white/80" />
      </div>
    );
  }
  if (kind === "umbrella") {
    // 雨傘往上掀開
    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ transform: open ? "translateY(-80%) rotate(-14deg)" : "none", transition: t }}
      >
        {/* 傘柄（從傘面中間往下，最後彎一個勾） */}
        <span className="absolute left-1/2 -ml-1 top-[60%] w-2 h-[26%] bg-[#5D4037]" />
        <span className="absolute left-1/2 -ml-1 top-[82%] w-8 h-8 rounded-b-full border-b-[8px] border-l-[8px] border-[#5D4037]" />
        {/* 上半圓的傘面，紅黃相間 */}
        <span
          className="absolute -left-[4%] -right-[4%] top-[16%] h-[48%]"
          style={{
            borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
            background: "repeating-conic-gradient(from -90deg at 50% 100%, #E53935 0 22.5deg, #FFEB3B 22.5deg 45deg)",
          }}
        />
        {/* 傘面下緣一圈波浪 */}
        <span
          className="absolute -left-[4%] -right-[4%] top-[61%] h-[8%]"
          style={{ background: "radial-gradient(circle at 50% 0, #C62828 60%, transparent 62%) 0 0 / 25% 100% repeat-x" }}
        />
        <span className="absolute left-1/2 -ml-2 top-[12%] w-4 h-4 rounded-full bg-[#5D4037]" />
      </div>
    );
  }
  if (kind === "rock") {
    // 大石頭滾到旁邊
    return (
      <div
        className="absolute left-[6%] right-[6%] bottom-[4%] h-[78%] pointer-events-none"
        style={{
          transform: open ? "translateX(125%) rotate(100deg)" : "none",
          transition: t,
          borderRadius: "48% 52% 42% 58% / 58% 54% 46% 42%",
          background: "radial-gradient(circle at 35% 30%, #BDBDBD, #757575)",
          boxShadow: "inset -10px -12px 0 rgba(0,0,0,0.15)",
        }}
      >
        <span className="absolute left-[20%] top-[28%] w-[16%] h-[10%] rounded-full bg-white/30" />
        <span className="absolute right-[22%] bottom-[24%] w-[12%] h-[8%] rounded-full bg-black/15" />
      </div>
    );
  }
  if (kind === "window") {
    // 兩片木窗板往外打開
    return (
      <div className="absolute inset-[8%] pointer-events-none" style={{ perspective: "600px" }}>
        <span className="absolute inset-0 rounded-xl border-[6px] border-[#5D4037]" />
        {(["left", "right"] as const).map((side) => (
          <span
            key={side}
            className="absolute top-0 bottom-0 w-1/2 bg-[#A1887F] border-4 border-[#6D4C41]"
            style={{
              [side]: 0,
              transformOrigin: `${side} center`,
              transform: open ? `rotateY(${side === "left" ? -105 : 105}deg)` : "none",
              transition: t,
              backgroundImage: "repeating-linear-gradient(0deg, #8D6E63 0 4px, transparent 4px 18px)",
            }}
          />
        ))}
      </div>
    );
  }
  // curtain
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      <span className="absolute inset-x-0 top-0 h-[10%] bg-[#B71C1C] z-10" />
      {(["left", "right"] as const).map((side) => (
        <span
          key={side}
          className="absolute top-0 bottom-0 w-1/2"
          style={{
            [side]: 0,
            background:
              "repeating-linear-gradient(90deg, #E53935 0 14px, #C62828 14px 28px)",
            transform: open ? `translateX(${side === "left" ? "-92%" : "92%"})` : "none",
            transition: t,
          }}
        />
      ))}
    </div>
  );
}

export default function PeekabooGame() {
  const { settings } = useSettings();
  // 一開始固定前 4 種（伺服器端畫的跟瀏覽器一樣），載入後再隨機換
  const [spots, setSpots] = useState<SpotState[]>(() =>
    initialHiders(SPOT_COUNT).map((hider, i) => ({ spot: i, hider, open: false, shown: false, pops: 0 }))
  );
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** 每個藏身處最後一次打開的編號：連點時只有最後那次的計時器算數 */
  const tokensRef = useRef<number[]>(Array.from({ length: SPOT_COUNT }, () => 0));

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    HIDERS.forEach((h) => h.sound && audioManager.preload(h.sound));
    const timers = timersRef;
    return () => timers.current.forEach(clearTimeout);
  }, []);

  /** 換一批藏身處（全部關起來、換新的動物） */
  const shuffleSpots = (previous: number[]) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    tokensRef.current = tokensRef.current.map((t) => t + 1);
    const kinds = pickSpots(SPOT_COUNT, Math.random, previous);
    const hiders = initialHiders(SPOT_COUNT);
    setSpots(kinds.map((spot, i) => ({ spot, hider: hiders[i], open: false, shown: false, pops: 0 })));
  };

  // 載入後隨機挑這次的 4 個藏身處（伺服器端先畫固定的，避免 hydration 不一致）
  useEffect(() => {
    const id = setTimeout(() => shuffleSpots([]), 0);
    return () => clearTimeout(id);
  }, []);

  const update = (i: number, patch: (s: SpotState, all: SpotState[]) => Partial<SpotState>) =>
    setSpots((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch(s, prev) } : s)));

  const later = (ms: number, fn: () => void) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const tapSpot = (i: number) => {
    const s = spots[i];
    callHider(HIDERS[s.hider]);
    if (s.open) {
      // 已經打開：再叫一次、再跳一下
      update(i, (cur) => ({ pops: cur.pops + 1 }));
      return;
    }
    audioManager.pop();
    const token = ++tokensRef.current[i];
    update(i, (cur) => ({ open: true, shown: true, pops: cur.pops + 1 }));
    later(SHOW_MS, () => {
      if (tokensRef.current[i] !== token) return;
      update(i, () => ({ open: false }));
      later(CLOSE_MS, () => {
        if (tokensRef.current[i] !== token) return;
        update(i, (cur, all) => ({
          shown: false,
          // 換一隻：不要跟自己或其他藏身處現在的動物一樣
          hider: pickHider(all.map((x) => x.hider)),
        }));
      });
    });
  };

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gradient-to-b from-[#E8F5E9] to-[#FFF8E1] select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="pt-5 pl-20 pr-4 flex items-center justify-center gap-3">
        <h1 className="text-3xl font-black text-[#66BB6A] text-center animate-bounce-in">👀 躲貓貓</h1>
        <button
          type="button"
          onClick={() => {
            audioManager.whoosh();
            shuffleSpots(spots.map((x) => x.spot));
          }}
          className="px-4 py-2 rounded-full bg-white/85 text-base font-black text-[#43A047] shadow active:scale-95 transition-transform"
        >
          🔄 換地方
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-3 pt-5">
        {spots.map((s, i) => {
          const spot = SPOTS[s.spot];
          const hider = HIDERS[s.hider];
          return (
            <button
              key={`${i}-${spot.kind}`}
              type="button"
              aria-label={`打開${spot.label}`}
              onPointerDown={() => tapSpot(i)}
              className="relative rounded-3xl shadow-lg overflow-hidden"
              style={{ background: BACKGROUNDS[spot.kind] }}
            >
              {s.shown && (
                <span className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {s.open && (
                    <span
                      key={`wow-${s.pops}`}
                      className="mb-1 px-3 py-0.5 rounded-full bg-white text-xl font-black text-[#FF7043] shadow animate-bounce-in"
                    >
                      哇！
                    </span>
                  )}
                  <span key={s.pops} className="leading-none animate-bounce-in">
                    <HiderArt hider={hider} size={130} />
                  </span>
                </span>
              )}
              <Cover kind={spot.kind} open={s.open} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
