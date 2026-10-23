"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "@/components/baby/ParticleCanvas";
import {
  ART_SIZE,
  LEVELS,
  TAB,
  isNearSlot,
  layoutPuzzle,
  makeEdges,
  piecePath,
  pieceRect,
  shuffledOrder,
  type Edges,
  type Rect,
} from "@/lib/dino/puzzle";

/** 拼圖主題：恐龍、魚……換圖、名字、顏色與拼完的聲音，玩法共用 */
export interface PuzzleTheme {
  title: string;
  items: { id: string; name: string; color: string }[];
  /** 整張圖或其中一塊（view 是要裁出來的範圍，座標同 0~ART_SIZE 的原圖） */
  Art: (props: { id: string; view?: Rect; className?: string; style?: React.CSSProperties }) => React.JSX.Element;
  /** 背景、標題與按鈕的主色、淺色按鈕上的字 */
  bg: string;
  accent: string;
  accentText: string;
  /** 難度按鈕的小圖示（4 / 6 / 8 片），不給就用預設的 🐣 🦕 🦖 */
  levelIcons?: string[];
  /** 回選單與下一張的按鈕，例如「🦕 換一隻」「下一隻 ➡️」 */
  switchLabel: string;
  nextLabel: string;
  /** 要先載入的音檔 */
  preload?: string[];
  /** 拼完後（彩帶之後）的音效，例如恐龍吼一聲 */
  cheer: () => void;
}

interface Drag {
  piece: number;
  pointerId: number;
  /** 手指相對碎片左上角的位置 */
  dx: number;
  dy: number;
  x: number;
  y: number;
}

export default function PuzzleGame({ theme }: { theme: PuzzleTheme }) {
  const { settings } = useSettings();
  const areaRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 預設最難的 8 片
  const [level, setLevel] = useState(LEVELS.length - 1);
  const [item, setItem] = useState<number | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  /** order[托盤位置] = 碎片編號 */
  const [order, setOrder] = useState<number[]>([]);
  const [placed, setPlaced] = useState<boolean[]>([]);
  /** 每片四邊的公母頭 */
  const [edges, setEdges] = useState<Edges[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [done, setDone] = useState(false);
  /** 這次拼完過的，選單上打星星 */
  const [finished, setFinished] = useState<string[]>([]);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    theme.preload?.forEach((f) => audioManager.preload(f));
    const timers = timersRef;
    return () => timers.current.forEach(clearTimeout);
  }, [theme]);

  const playing = item !== null;
  useEffect(() => {
    const el = areaRef.current;
    if (!playing || !el) return;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [playing]);

  const { cols, rows } = LEVELS[level];
  const n = cols * rows;
  const L = layoutPuzzle(area.w, area.h, cols, rows, 12, true);
  /** 榫頭大小與凸出距離（px），每片的方塊要往外多留 M */
  const tab = TAB * Math.min(L.cellW, L.cellH);
  const M = L.margin;
  /** 原圖座標換成畫面 px 的比例 */
  const k = L.board.size / ART_SIZE;

  const start = (i: number) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    audioManager.pop();
    setItem(i);
    setOrder(shuffledOrder(n));
    setEdges(makeEdges(cols, rows));
    setPlaced(Array(n).fill(false));
    setDrag(null);
    setDone(false);
  };

  const backToPicker = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setItem(null);
    setDrag(null);
    setDone(false);
  };

  const celebrate = (i: number) => {
    const d = theme.items[i];
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
      setTimeout(theme.cheer, 900),
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
    // 托盤上的碎片是縮小的，拿起來變回原大時，手指仍按在碎片上同一個位置
    const dx = (p.x - from.x) / L.trayScale;
    const dy = (p.y - from.y) / L.trayScale;
    setDrag({ piece, pointerId: e.pointerId, dx, dy, x: p.x - dx, y: p.y - dy });
    audioManager.pop();
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const p = toLocal(e);
    setDrag({ ...drag, x: p.x - drag.dx, y: p.y - drag.dy });
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || e.pointerId !== drag.pointerId || item === null) return;
    const s = L.slot(drag.piece);
    setDrag(null);
    // 放錯就自己滑回托盤，不扣分也不發出錯誤聲
    if (!isNearSlot(drag.x, drag.y, s.x, s.y, L.cellW, L.cellH)) return;

    const next = placed.map((v, i) => v || i === drag.piece);
    setPlaced(next);
    audioManager.ding();
    const r = areaRef.current?.getBoundingClientRect();
    if (r) {
      engineRef.current?.burst(r.left + s.x + L.cellW / 2, r.top + s.y + L.cellH / 2, theme.items[item].color, 18);
    }
    if (next.every(Boolean)) celebrate(item);
  };

  // ---------- 選一張圖 ----------
  if (!playing) {
    return (
      <div className="flex flex-col items-center h-screen overflow-y-auto p-6 pt-20 pb-10 gap-4 select-none">
        <h1 className="text-3xl md:text-4xl font-black animate-bounce-in" style={{ color: theme.accent }}>
          {theme.title}
        </h1>

        <div className="flex flex-wrap justify-center gap-2">
          {LEVELS.map((lv, i) => (
            <button
              key={lv.label}
              onClick={() => {
                audioManager.pop();
                setLevel(i);
              }}
              className="px-4 py-2 rounded-full text-lg font-bold shadow active:scale-95 transition"
              style={level === i ? { backgroundColor: theme.accent, color: "white" } : { backgroundColor: "white", color: theme.accentText }}
            >
              {theme.levelIcons ? `${theme.levelIcons[i]} ${lv.cols * lv.rows} 片` : lv.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
          {theme.items.map((d, i) => (
            <button
              key={d.id}
              onClick={() => start(i)}
              className="relative flex flex-col items-center rounded-3xl p-2 pb-3 shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: d.color }}
            >
              <theme.Art id={d.id} className="w-full aspect-square rounded-2xl" />
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
  const d = theme.items[item];
  const ready = L.board.size > 0;
  // 拼完後按鈕放在原本的托盤區，不會蓋到圖
  const trayLeft = Math.min(...L.tray.map((p) => p.x));
  const trayTop = Math.min(...L.tray.map((p) => p.y));
  const trayBox = {
    left: trayLeft,
    top: trayTop,
    width: Math.max(...L.tray.map((p) => p.x)) + L.cellW * L.trayScale - trayLeft,
    height: Math.max(...L.tray.map((p) => p.y)) + L.cellH * L.trayScale - trayTop,
  };

  return (
    <div
      className="fixed inset-0 flex flex-col select-none overflow-hidden"
      style={{ touchAction: "none", backgroundColor: theme.bg }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <ParticleCanvas engineRef={engineRef} />

      <div className="flex items-center pt-6 pb-2 pl-20 pr-4 gap-3">
        <h1 className="flex-1 text-2xl md:text-3xl font-black text-center" style={{ color: d.color }}>
          {done ? `${d.name}！🎉` : `拼出${d.name}`}
        </h1>
        <button
          onClick={backToPicker}
          className="px-4 py-2 rounded-full bg-white text-lg font-bold shadow active:scale-95"
          style={{ color: theme.accentText }}
        >
          {theme.switchLabel}
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
              <theme.Art
                id={d.id}
                className="absolute animate-celebrate"
                style={{ left: L.board.x, top: L.board.y, width: L.board.size, height: L.board.size }}
              />
            ) : (
              <>
                <theme.Art
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
                  {edges.length === n &&
                    Array.from({ length: n }, (_, i) => {
                      if (placed[i]) return null;
                      const r = pieceRect(i, cols, rows);
                      return (
                        <path
                          key={i}
                          d={piecePath(r.x * k, r.y * k, L.cellW, L.cellH, edges[i], tab)}
                          fill="none"
                          stroke="#9E9E9E"
                          strokeWidth={2}
                          strokeDasharray="8 6"
                        />
                      );
                    })}
                </svg>

                {/* 碎片 */}
                {edges.length === n &&
                  Array.from({ length: n }, (_, piece) => {
                    const isDrag = drag?.piece === piece;
                    const isPlaced = placed[piece];
                    const inTray = !isDrag && !isPlaced;
                    const pos = isPlaced ? L.slot(piece) : isDrag ? drag : L.tray[order.indexOf(piece)];
                    const r = pieceRect(piece, cols, rows);
                    // 方塊往外多留 M 給凸出去的公頭，用 clip-path 裁成拼圖片的形狀
                    const shape = piecePath(M, M, L.cellW, L.cellH, edges[piece], tab);
                    const m = M / k;
                    return (
                      <div
                        key={piece}
                        className="absolute pointer-events-none"
                        style={{
                          left: pos.x - M,
                          top: pos.y - M,
                          width: L.cellW + 2 * M,
                          height: L.cellH + 2 * M,
                          zIndex: isDrag ? 30 : isPlaced ? 5 : 10,
                          filter: isPlaced ? "none" : "drop-shadow(0 5px 6px rgba(0,0,0,0.3))",
                          // 縮放以碎片本體的左上角為準，托盤上的位置才對得上
                          transformOrigin: `${M}px ${M}px`,
                          transform: isDrag ? "scale(1.06)" : inTray ? `scale(${L.trayScale})` : "none",
                          transition: isDrag ? "transform 0.15s" : "left 0.25s ease, top 0.25s ease, transform 0.15s",
                        }}
                      >
                        <div
                          className="w-full h-full pointer-events-auto"
                          style={{ clipPath: `path('${shape}')`, cursor: isPlaced ? "default" : "grab" }}
                          onPointerDown={(e) => onDown(e, piece)}
                          onPointerMove={onMove}
                          onPointerUp={onUp}
                          onPointerCancel={() => setDrag(null)}
                        >
                          <theme.Art
                            id={d.id}
                            view={{ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m }}
                            className="w-full h-full"
                          />
                        </div>
                        {!isPlaced && (
                          <svg className="absolute inset-0 w-full h-full overflow-visible">
                            <path d={shape} fill="none" stroke="white" strokeWidth={3} strokeLinejoin="round" />
                          </svg>
                        )}
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
                  onClick={() => start(item)}
                  className="px-6 py-4 rounded-2xl text-white text-xl font-bold shadow-lg active:scale-95"
                  style={{ backgroundColor: theme.accent }}
                >
                  🔁 再拼一次
                </button>
                <button
                  onClick={() => start((item + 1) % theme.items.length)}
                  className="px-6 py-4 rounded-2xl text-white text-xl font-bold shadow-lg active:scale-95"
                  style={{ backgroundColor: theme.items[(item + 1) % theme.items.length].color }}
                >
                  {theme.nextLabel}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
