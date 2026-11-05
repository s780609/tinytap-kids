"use client";

import { useRef, useState } from "react";
import { stickVector } from "@/lib/raiden/stick";

/** 搖桿頭最多離中心多遠（佔底座半徑的比例） */
const TRAVEL = 0.55;

const ARROWS = [
  { rot: 0, label: "上" },
  { rot: 90, label: "右" },
  { rot: 180, label: "下" },
  { rot: 270, label: "左" },
];

interface RaidenStickProps {
  /** 方向 -1～1（往下、往右是正）；放開時給 0,0 */
  onMove: (dx: number, dy: number) => void;
  className?: string;
}

/**
 * 虛擬搖桿：按住底座任何地方，搖桿頭跟著手指推，推越遠飛越快、可以斜著飛。
 * 自己吃掉 pointerdown，不會同時觸發「畫面任何地方拖曳」。
 */
export default function RaidenStick({ onMove, className = "" }: RaidenStickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const update = (e: React.PointerEvent) => {
    const r = baseRef.current!.getBoundingClientRect();
    const radius = (r.width / 2) * TRAVEL;
    const ox = e.clientX - (r.left + r.width / 2);
    const oy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(ox, oy);
    const k = d > radius ? radius / d : 1;
    setKnob({ x: ox * k, y: oy * k });
    const v = stickVector(ox, oy, radius);
    onMove(v.dx, v.dy);
  };

  const release = (e: React.PointerEvent) => {
    if (pointerRef.current !== e.pointerId) return;
    pointerRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="搖桿：按住往上下左右推來移動"
      className={`rounded-full border-4 border-[#2a3038] bg-[#1c232b] shadow-[inset_0_4px_10px_rgba(0,0,0,0.6)] ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (pointerRef.current !== null) return;
        pointerRef.current = e.pointerId;
        setActive(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (pointerRef.current === e.pointerId) update(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      {/* 上下左右的箭頭 */}
      {ARROWS.map((a) => (
        <svg
          key={a.rot}
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ transform: `rotate(${a.rot}deg)` }}
          aria-hidden
        >
          <path d="M50 7 L59 19 L41 19 Z" fill="rgba(255,255,255,0.45)" />
        </svg>
      ))}
      {/* 搖桿頭 */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[46%] w-[46%] rounded-full border-4 border-[#7f1414] bg-[#D32F2F] shadow-[0_5px_0_#5a0000,inset_0_-6px_0_rgba(0,0,0,0.2),inset_0_5px_0_rgba(255,255,255,0.3)]"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          transition: active ? "none" : "transform 0.12s ease-out",
        }}
      />
    </div>
  );
}
