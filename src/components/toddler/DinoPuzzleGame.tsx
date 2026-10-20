"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "@/components/baby/ParticleCanvas";
import DinoArt from "@/components/toddler/dino/DinoArt";
import {
  ART_SIZE,
  DINOS,
  LEVELS,
  isNearSlot,
  layoutPuzzle,
  pieceRect,
  shuffledOrder,
  type DinoId,
} from "@/lib/dino/puzzle";

/** 恐龍叫聲：獅子吼放慢 */
const ROAR = "/sounds/animals/lion.mp3";

interface Drag {
  piece: number;
  pointerId: number;
  /** 手指相對碎片左上角的位置 */
  dx: number;
  dy: number;
  x: number;
  y: number;
}

export default function DinoPuzzleGame() {
  const { settings } = useSettings();
  const areaRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [level, setLevel] = useState(0);
  const [dino, setDino] = useState<number | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  /** order[托盤位置] = 碎片編號 */
  const [order, setOrder] = useState<number[]>([]);
  const [placed, setPlaced] = useState<boolean[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [done, setDone] = useState(false);
  /** 這次拼完過的恐龍，選單上打星星 */
  const [finished, setFinished] = useState<DinoId[]>([]);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    audioManager.preload(ROAR);
    const timers = timersRef;
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const playing = dino !== null;
  useEffect(() => {
    const el = areaRef.current;
    if (!playing || !el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [playing]);

  const { cols, rows } = LEVELS[level];
  const n = cols * rows;
  const L = layoutPuzzle(area.w, area.h, cols, rows);

  const start = (i: number) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    audioManager.pop();
    setDino(i);
    setOrder(shuffledOrder(n));
    setPlaced(Array(n).fill(false));
    setDrag(null);
    setDone(false);
  };

  const backToPicker = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setDino(null);
    setDrag(null);
    setDone(false);
  };

  const celebrate = (i: number) => {
    const d = DINOS[i];
    timersRef.current.push(
      setTimeout(() => {
        setDone(true);
        setFinished((f) => (f.includes(d.id) ? f : [...f, d.id]));
        audioManager.success();
        const r = areaRef.current?.getBoundingClientRect();
        if (r) {
          const cx = r.left + L.board.x + L.board.size / 2;
          const cy = r.top + L.board.y + L.board.size / 2;
          engineRef.current?.confetti(cx, cy, 50);
        }
      }, 350),
      setTimeout(() => audioManager.playFile(ROAR, 0.6), 900),
      setTimeout(() => audioManager.speak(`${d.name}！`), 1900)
    );
  };

  const toLocal = (e: React.PointerEvent) => {
    const r = areaRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>, piece: number) => {
    if (drag || placed[piece] || done) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toLocal(e);
    const from = L.tray[order.indexOf(piece)];
    setDrag({ piece, pointerId: e.pointerId, dx: p.x - from.x, dy: p.y - from.y, x: from.x, y: from.y });
    audioManager.pop();
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const p = toLocal(e);
    setDrag({ ...drag, x: p.x - drag.dx, y: p.y - drag.dy });
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || e.pointerId !== drag.pointerId || dino === null) return;
    const s = L.slot(drag.piece);
    setDrag(null);
    // 放錯就自己滑回托盤，不扣分也不發出錯誤聲
    if (!isNearSlot(drag.x, drag.y, s.x, s.y, L.cellW, L.cellH)) return;

    const next = placed.map((v, i) => v || i === drag.piece);
    setPlaced(next);
    audioManager.ding();
    const r = areaRef.current?.getBoundingClientRect();
    if (r) {
      engineRef.current?.burst(r.left + s.x + L.cellW / 2, r.top + s.y + L.cellH / 2, DINOS[dino].color, 18);
    }
    if (next.every(Boolean)) celebrate(dino);
  };

  // ---------- 選恐龍 ----------
  if (!playing) {
    return (
      <div className="flex flex-col items-center h-screen overflow-y-auto p-6 pt-20 pb-10 gap-4 select-none">
        <h1 className="text-3xl md:text-4xl font-black text-[#8BC34A] animate-bounce-in">🦖 恐龍拼圖</h1>

        <div className="flex gap-3">
          {LEVELS.map((lv, i) => (
            <button
              key={lv.label}
              onClick={() => {
                audioManager.pop();
                setLevel(i);
              }}
              className={`px-5 py-2 rounded-full text-xl font-bold shadow active:scale-95 transition ${
                level === i ? "bg-[#8BC34A] text-white" : "bg-white text-[#689F38]"
              }`}
            >
              {lv.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
          {DINOS.map((d, i) => (
            <button
              key={d.id}
              onClick={() => start(i)}
              className="relative flex flex-col items-center rounded-3xl p-2 pb-3 shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: d.color }}
            >
              <DinoArt id={d.id} className="w-full aspect-square rounded-2xl" />
              <span className="mt-2 text-2xl font-black text-white">{d.name}</span>
              {finished.includes(d.id) && (
                <span className="absolute top-1 right-2 text-3xl drop-shadow animate-bounce-in">⭐</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- 拼圖 ----------
  const d = DINOS[dino];
  const ready = L.board.size > 0;
  // 拼完後按鈕放在原本的托盤區，不會蓋到恐龍
  const trayLeft = Math.min(...L.tray.map((p) => p.x));
  const trayTop = Math.min(...L.tray.map((p) => p.y));
  const trayBox = {
    left: trayLeft,
    top: trayTop,
    width: Math.max(...L.tray.map((p) => p.x)) + L.cellW - trayLeft,
    height: Math.max(...L.tray.map((p) => p.y)) + L.cellH - trayTop,
  };

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#F1F8E9] select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ParticleCanvas engineRef={engineRef} />

      <div className="flex items-center pt-6 pb-2 pl-20 pr-4 gap-3">
        <h1 className="flex-1 text-2xl md:text-3xl font-black text-center" style={{ color: d.color }}>
          {done ? `${d.name}！🎉` : `拼出${d.name}`}
        </h1>
        <button
          onClick={backToPicker}
          className="px-4 py-2 rounded-full bg-white text-lg font-bold text-[#689F38] shadow active:scale-95"
        >
          🦕 換一隻
        </button>
      </div>

      <div ref={areaRef} className="relative flex-1">
        {ready && (
          <>
            {/* 拼板：淡淡的整張圖當提示，加上格線 */}
            <div
              className="absolute rounded-2xl bg-white shadow-lg"
              style={{ left: L.board.x - 6, top: L.board.y - 6, width: L.board.size + 12, height: L.board.size + 12 }}
            />
            {done ? (
              <DinoArt
                id={d.id}
                className="absolute animate-celebrate"
                style={{ left: L.board.x, top: L.board.y, width: L.board.size, height: L.board.size }}
              />
            ) : (
              <>
                <DinoArt
                  id={d.id}
                  className="absolute"
                  style={{
                    left: L.board.x,
                    top: L.board.y,
                    width: L.board.size,
                    height: L.board.size,
                    opacity: 0.3,
                    filter: "saturate(0.4)",
                  }}
                />
                <svg
                  className="absolute pointer-events-none"
                  style={{ left: L.board.x, top: L.board.y, width: L.board.size, height: L.board.size }}
                >
                  {Array.from({ length: n }, (_, i) => {
                    const r = pieceRect(i, cols, rows);
                    const k = L.board.size / ART_SIZE;
                    return (
                      <rect
                        key={i}
                        x={r.x * k}
                        y={r.y * k}
                        width={r.w * k}
                        height={r.h * k}
                        fill="none"
                        stroke="#9E9E9E"
                        strokeWidth={2}
                        strokeDasharray="8 6"
                      />
                    );
                  })}
                </svg>

                {/* 碎片 */}
                {Array.from({ length: n }, (_, piece) => {
                  const isDrag = drag?.piece === piece;
                  const isPlaced = placed[piece];
                  const pos = isPlaced ? L.slot(piece) : isDrag ? drag : L.tray[order.indexOf(piece)];
                  return (
                    <div
                      key={piece}
                      className="absolute overflow-hidden"
                      style={{
                        left: pos.x,
                        top: pos.y,
                        width: L.cellW,
                        height: L.cellH,
                        zIndex: isDrag ? 30 : isPlaced ? 5 : 10,
                        borderRadius: isPlaced ? 0 : 12,
                        boxShadow: isPlaced ? "none" : "0 0 0 3px #fff, 0 6px 14px rgba(0,0,0,0.25)",
                        transform: isDrag ? "scale(1.06)" : "none",
                        transition: isDrag ? "transform 0.15s" : "left 0.25s ease, top 0.25s ease, transform 0.15s",
                        cursor: isPlaced ? "default" : "grab",
                      }}
                      onPointerDown={(e) => onDown(e, piece)}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                      onPointerCancel={() => setDrag(null)}
                    >
                      <DinoArt id={d.id} view={pieceRect(piece, cols, rows)} className="w-full h-full" />
                    </div>
                  );
                })}
              </>
            )}

            {done && (
              <div
                className="absolute flex flex-wrap items-center justify-center content-center gap-4 animate-bounce-in"
                style={trayBox}
              >
                <button
                  onClick={() => start(dino)}
                  className="px-6 py-4 rounded-2xl bg-[#8BC34A] text-white text-xl font-bold shadow-lg active:scale-95"
                >
                  🔁 再拼一次
                </button>
                <button
                  onClick={() => start((dino + 1) % DINOS.length)}
                  className="px-6 py-4 rounded-2xl text-white text-xl font-bold shadow-lg active:scale-95"
                  style={{ backgroundColor: DINOS[(dino + 1) % DINOS.length].color }}
                >
                  下一隻 ➡️
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
