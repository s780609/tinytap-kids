"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
}

/** 要按住多久才返回：寶寶亂拍不會跳出遊戲，大人按住就能離開 */
const HOLD_MS = 800;
/** 進度環的周長（半徑 25） */
const RING = 2 * Math.PI * 25;

export default function BackButton({ className = "" }: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  // 回到上一層路徑：/toddler/fishing → /toddler，/toddler → /
  const parentPath = pathname.replace(/\/[^/]+\/?$/, "") || "/";

  const [holding, setHolding] = useState(false);
  const [hint, setHint] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    },
    []
  );

  const startHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    setHolding(true);
    setHint(false);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setHolding(false);
      router.push(parentPath);
    }, HOLD_MS);
  };

  /** 還沒按滿就放開：取消，放開時順便提示要按住 */
  const cancelHold = (showHint: boolean) => {
    if (!holdTimerRef.current) return;
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    setHolding(false);
    if (showHint) {
      setHint(true);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setHint(false), 1500);
    }
  };

  return (
    <>
      <button
        onPointerDown={startHold}
        onPointerUp={() => cancelHold(true)}
        onPointerLeave={() => cancelHold(false)}
        onPointerCancel={() => cancelHold(false)}
        // 鍵盤（Enter / 空白鍵）觸發的 click：detail 為 0，直接返回
        onClick={(e) => {
          if (e.detail === 0) router.push(parentPath);
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={`
          fixed top-4 left-4 z-40
          w-14 h-14 rounded-full
          bg-white/80 backdrop-blur
          flex items-center justify-center
          shadow-md transition-transform
          select-none cursor-pointer
          ${holding ? "scale-90" : ""}
          ${className}
        `}
        style={{ touchAction: "none", WebkitTouchCallout: "none" }}
        aria-label="按住返回上一頁"
      >
        {/* 按住時外圈慢慢填滿 */}
        <svg className="absolute inset-0 -rotate-90 pointer-events-none" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r="25"
            fill="none"
            stroke="#FF69B4"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={holding ? 0 : RING}
            style={{ transition: holding ? `stroke-dashoffset ${HOLD_MS}ms linear` : "none" }}
          />
        </svg>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4A4A4A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {hint && (
        <div className="fixed top-6 left-20 z-40 px-3 py-1.5 rounded-full bg-white/90 shadow text-sm font-bold text-[#4A4A4A] pointer-events-none animate-bounce-in">
          按住返回
        </div>
      )}
    </>
  );
}
