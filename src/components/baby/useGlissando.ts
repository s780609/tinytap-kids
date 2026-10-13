"use client";

import { useRef } from "react";

/**
 * 鍵盤的多指觸控：按下時觸發那個鍵，手指按著滑到別的鍵也會觸發（像真的鋼琴刷鍵）。
 * 鍵的元素要帶 data-key 屬性，把回傳的 handler 掛在包住所有鍵的容器上。
 */
export function useGlissando(onKey: (key: string) => void) {
  const pointers = useRef(new Map<number, string>());

  const keyAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-key]")?.dataset.key ?? null;

  const end = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      const key = keyAt(e.clientX, e.clientY);
      if (key === null) return;
      pointers.current.set(e.pointerId, key);
      onKey(key);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (prev === undefined) return;
      const key = keyAt(e.clientX, e.clientY);
      if (key === null || key === prev) return;
      pointers.current.set(e.pointerId, key);
      onKey(key);
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}
