"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { HIDERS, SPOTS, initialHiders, pickHider, type SpotKind } from "@/lib/peekaboo/peekaboo";

/** 動物露臉多久後再躲回去 */
const SHOW_MS = 2600;
/** 蓋子關回去的動畫時間，關好了才換動物，換的瞬間看不到 */
const CLOSE_MS = 450;

interface SpotState {
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
  const [spots, setSpots] = useState<SpotState[]>(() =>
    initialHiders(SPOTS.length).map((hider) => ({ hider, open: false, shown: false, pops: 0 }))
  );
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** 每個藏身處最後一次打開的編號：連點時只有最後那次的計時器算數 */
  const tokensRef = useRef<number[]>(SPOTS.map(() => 0));

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    HIDERS.forEach((h) => audioManager.preload(h.sound));
    const timers = timersRef;
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const update = (i: number, patch: (s: SpotState, all: SpotState[]) => Partial<SpotState>) =>
    setSpots((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch(s, prev) } : s)));

  const later = (ms: number, fn: () => void) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const tapSpot = (i: number) => {
    const s = spots[i];
    audioManager.playFile(HIDERS[s.hider].sound);
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
      <h1 className="pt-6 pl-20 pr-6 text-3xl font-black text-[#66BB6A] text-center animate-bounce-in">
        👀 躲貓貓
      </h1>

      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-3 pt-5">
        {SPOTS.map((spot, i) => {
          const s = spots[i];
          const hider = HIDERS[s.hider];
          return (
            <button
              key={spot.kind}
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
                  <span key={s.pops} className="text-[5.5rem] leading-none animate-bounce-in">
                    {hider.emoji}
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
