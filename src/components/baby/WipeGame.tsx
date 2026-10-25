"use client";

import { useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { HIDERS, pickHider } from "@/lib/peekaboo/peekaboo";
import { HiderArt, callHider } from "./HiderArt";
import { clearedRatio, createGrid, wipeLine, type WipeGrid } from "@/lib/wipe/wipeGrid";

/** 手指擦的粗細（半徑，CSS px） */
const BRUSH = 38;
const CELL = 24;
/** 擦掉這麼多就算擦乾淨 */
const DONE_RATIO = 0.65;
/** 慶祝多久後重新起霧 */
const CELEBRATE_MS = 2600;
/** 起霧的淡入時間：霧完全蓋住後才換下一張圖 */
const FOG_FADE_MS = 600;

const SCENES = [
  { bg: "linear-gradient(#81D4FA, #C5E1A5)", deco: ["☀️", "🌳", "🌼"] },
  { bg: "linear-gradient(#FFCC80, #FFF59D)", deco: ["🌈", "🌻", "🦋"] },
  { bg: "linear-gradient(#CE93D8, #F8BBD0)", deco: ["⭐", "🎈", "🌸"] },
  { bg: "linear-gradient(#80CBC4, #B2EBF2)", deco: ["☁️", "🐚", "🌊"] },
];

/** 在 canvas 上畫一層新的霧，回傳新的「擦了多少」格子 */
function paintFog(wrapper: HTMLDivElement, canvas: HTMLCanvasElement): WipeGrid | null {
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  if (w < 10 || h < 10) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  const fog = ctx.createLinearGradient(0, 0, w, h);
  fog.addColorStop(0, "rgba(236,239,241,0.97)");
  fog.addColorStop(1, "rgba(207,216,220,0.97)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, w, h);

  // 水珠
  for (let i = 0; i < 40; i++) {
    const x = (((i * 97) % 100) / 100) * w;
    const y = (((i * 61) % 100) / 100) * h;
    const r = 4 + ((i * 13) % 9);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(144,164,174,0.35)";
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y + r * 0.4, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(96,125,139,0.55)";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("擦一擦 👋", w / 2, h / 2);

  return createGrid(w, h, CELL);
}

export default function WipeGame() {
  const { settings } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<WipeGrid | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const lastSoundRef = useRef(0);
  const doneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 一開始固定第一隻，避免伺服器與瀏覽器亂數不同；之後才隨機
  const [pic, setPic] = useState(0);
  const [scene, setScene] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  /** 畫一層新的霧，並重設「擦了多少」 */
  const drawFog = () => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const grid = paintFog(wrapper, canvas);
    if (grid) gridRef.current = grid;
    pointersRef.current.clear();
  };

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const timers = timersRef;
    const pointers = pointersRef.current;
    if (!wrapper || !canvas) return;
    // 畫面大小改變（轉向）時重新起霧
    const ro = new ResizeObserver(() => {
      if (doneRef.current) return;
      const grid = paintFog(wrapper, canvas);
      if (grid) gridRef.current = grid;
      pointers.clear();
    });
    ro.observe(wrapper);
    return () => {
      ro.disconnect();
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const celebrate = () => {
    doneRef.current = true;
    setDone(true);
    audioManager.success();
    timersRef.current.push(setTimeout(() => callHider(HIDERS[pic]), 350));
    timersRef.current.push(
      setTimeout(() => {
        // 先讓霧淡入蓋住，再換下一張圖，小朋友不會先看到答案
        drawFog();
        doneRef.current = false;
        setDone(false);
        timersRef.current.push(
          setTimeout(() => {
            setPic((p) => pickHider([p]));
            setScene((s) => (s + 1) % SCENES.length);
          }, FOG_FADE_MS)
        );
      }, CELEBRATE_MS)
    );
  };

  const wipe = (id: number, x: number, y: number) => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !grid || doneRef.current) return;
    const last = pointersRef.current.get(id) ?? { x, y };
    pointersRef.current.set(id, { x, y });

    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = BRUSH * 2;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();

    const added = wipeLine(grid, last.x, last.y, x, y, BRUSH);
    const now = performance.now();
    if (added > 0 && now - lastSoundRef.current > 180) {
      lastSoundRef.current = now;
      audioManager.bubble();
    }
    if (clearedRatio(grid) >= DONE_RATIO) celebrate();
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const animal = HIDERS[pic];
  const sc = SCENES[scene];

  return (
    <div
      className="fixed inset-0 flex flex-col bg-[#ECEFF1] select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <h1 className="pt-6 pb-3 pl-20 pr-6 text-3xl font-black text-[#29B6F6] text-center animate-bounce-in">
        🫧 擦窗戶
      </h1>

      <div ref={wrapperRef} className="relative flex-1 mx-3 mb-3 rounded-3xl overflow-hidden shadow-inner border-8 border-white">
        {/* 霧底下的圖 */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: sc.bg }}>
          <span className="absolute top-[8%] left-[10%] text-5xl">{sc.deco[0]}</span>
          <span className="absolute bottom-[10%] left-[12%] text-5xl">{sc.deco[1]}</span>
          <span className="absolute bottom-[14%] right-[10%] text-5xl">{sc.deco[2]}</span>
          <span
            key={`${pic}-${done}`}
            className={`leading-none ${done ? "animate-bounce-in" : ""}`}
          >
            <HiderArt hider={animal} size={190} />
          </span>
          {done && (
            <span className="absolute top-[12%] px-5 py-1 rounded-full bg-white/90 text-3xl font-black text-[#FF7043] shadow animate-bounce-in">
              {animal.label}！🎉
            </span>
          )}
        </div>

        {/* 霧 */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ opacity: done ? 0 : 1, transition: `opacity ${FOG_FADE_MS}ms ease` }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const p = pos(e);
            wipe(e.pointerId, p.x, p.y);
          }}
          onPointerMove={(e) => {
            if (!pointersRef.current.has(e.pointerId)) return;
            const p = pos(e);
            wipe(e.pointerId, p.x, p.y);
          }}
          onPointerUp={(e) => pointersRef.current.delete(e.pointerId)}
          onPointerCancel={(e) => pointersRef.current.delete(e.pointerId)}
        />
      </div>
    </div>
  );
}
