"use client";

import { useRef, useState } from "react";
import type { Dir } from "@/lib/tank/constants";
import { dirFromPad } from "@/lib/tank/input";

interface NesPadProps {
  onDir: (dir: Dir | null) => void;
  /** 不給就不顯示發射鈕（例如小精靈） */
  onFire?: (down: boolean) => void;
}

/** col / row：在 3×3 格裡的位置（0 起算） */
const ARROWS: { dir: Dir; col: number; row: number; label: string; path: string }[] = [
  { dir: 0, col: 1, row: 0, label: "上", path: "M12 6l6 9H6z" },
  { dir: 1, col: 2, row: 1, label: "右", path: "M18 12l-9 6V6z" },
  { dir: 2, col: 1, row: 2, label: "下", path: "M12 18l-6-9h12z" },
  { dir: 3, col: 0, row: 1, label: "左", path: "M6 12l9-6v12z" },
];

/**
 * 十字鍵每一格都用絕對定位、由 --pad-size 直接算出位置和大小，不用 CSS grid：
 * iOS Safari 會把 SVG 的預設寬度（300px）算進 grid 欄寬，把十字鍵撐爆。
 */
const CELL = "calc(var(--pad-size) * 0.88 / 3)";
const cellPos = (n: number) => `calc(var(--pad-size) * 0.06 + var(--pad-size) * 0.88 / 3 * ${n})`;
const cellStyle = (col: number, row: number): React.CSSProperties => ({
  position: "absolute",
  left: cellPos(col),
  top: cellPos(row),
  width: CELL,
  height: CELL,
});

/**
 * 紅白機手把：左邊十字鍵（手指按住可滑動換方向）、右邊發射鈕（多指各自追蹤）。
 * 回傳兩個 grid 子元素，分別放在 .tank-layout 的 pad / fire 區；沒有 onFire 時只回傳 pad 區。
 */
export default function NesPad({ onDir, onFire }: NesPadProps) {
  const [dir, setDir] = useState<Dir | null>(null);
  const [firing, setFiring] = useState(false);
  const padPointer = useRef<number | null>(null);
  const lastDir = useRef<Dir | null>(null);
  const firePointers = useRef<Set<number>>(new Set());

  const emitDir = (d: Dir | null) => {
    if (d === lastDir.current) return;
    lastDir.current = d;
    setDir(d);
    onDir(d);
  };

  const padFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    emitDir(dirFromPad(dx, dy, rect.width / 2));
  };

  const onPadDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    padPointer.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 指標已失效時略過
    }
    padFromEvent(e);
  };
  const onPadMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (padPointer.current !== e.pointerId) return;
    padFromEvent(e);
  };
  const onPadUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (padPointer.current !== e.pointerId) return;
    padPointer.current = null;
    emitDir(null);
  };

  const onFireDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 指標已失效時略過
    }
    firePointers.current.add(e.pointerId);
    if (firePointers.current.size === 1) {
      setFiring(true);
      onFire?.(true);
    }
  };
  const onFireUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!firePointers.current.delete(e.pointerId)) return;
    if (firePointers.current.size === 0) {
      setFiring(false);
      onFire?.(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center" style={{ gridArea: "pad" }}>
        <div
          role="group"
          aria-label="方向鍵"
          className="relative shrink-0 rounded-full bg-black/20"
          style={{
            width: "var(--pad-size)",
            height: "var(--pad-size)",
            touchAction: "none",
          }}
          onPointerDown={onPadDown}
          onPointerMove={onPadMove}
          onPointerUp={onPadUp}
          onPointerCancel={onPadUp}
          onLostPointerCapture={onPadUp}
        >
          <div className="bg-[#222]" style={cellStyle(1, 1)} />
          {ARROWS.map((a) => (
            <div
              key={a.dir}
              aria-label={a.label}
              className={`flex items-center justify-center overflow-hidden bg-[#222] shadow-[inset_0_-3px_0_rgba(0,0,0,0.5)] ${
                dir === a.dir ? "brightness-200" : ""
              } ${a.dir === 0 ? "rounded-t-md" : a.dir === 2 ? "rounded-b-md" : a.dir === 1 ? "rounded-r-md" : "rounded-l-md"}`}
              style={cellStyle(a.col, a.row)}
            >
              <svg
                viewBox="0 0 24 24"
                fill={dir === a.dir ? "#FFE082" : "#777"}
                className="block shrink-0"
                style={{ width: "calc(var(--pad-size) * 0.17)", height: "calc(var(--pad-size) * 0.17)" }}
              >
                <path d={a.path} />
              </svg>
            </div>
          ))}
        </div>
      </div>
      {onFire && (
        <div className="flex items-center justify-center" style={{ gridArea: "fire" }}>
          <button
            type="button"
            aria-label="發射"
            className={`rounded-full border-4 border-[#3a0d0d] font-black text-white shadow-[0_6px_0_#3a0d0d] transition-transform ${
              firing ? "translate-y-1 bg-[#ff5a4f] shadow-[0_2px_0_#3a0d0d]" : "bg-[#D32F2F]"
            }`}
            style={{
              width: "var(--fire-size)",
              height: "var(--fire-size)",
              fontSize: "calc(var(--fire-size) * 0.2)",
              touchAction: "none",
            }}
            onPointerDown={onFireDown}
            onPointerUp={onFireUp}
            onPointerCancel={onFireUp}
            onLostPointerCapture={onFireUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            發射
          </button>
        </div>
      )}
    </>
  );
}
