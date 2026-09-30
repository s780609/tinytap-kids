"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import {
  CATCH_TYPES,
  REEL_TURNS_NEEDED,
  createSwimmer,
  createSwimmers,
  getCatchType,
  nearestSwimmer,
  reelStep,
  updateSwimmers,
  type CatchKind,
  type Swimmer,
} from "@/lib/fishing/fishingLogic";

type Phase = "idle" | "casting" | "waiting" | "hooked" | "landing";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Geometry {
  w: number;
  h: number;
  dpr: number;
  pond: Rect;
  rodBase: { x: number; y: number };
  rodTip: { x: number; y: number };
  bucket: { x: number; y: number };
}

const SWIMMER_COUNT = 8;
const CAST_DURATION = 0.7;
const LAND_DURATION = 0.6;
const FLY_DURATION = 0.6;
const HUD_HEIGHT = 170;

export default function FishingGame() {
  const { settings } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState(0);
  const [reelAngle, setReelAngle] = useState(0);
  const [bucket, setBucket] = useState<CatchKind[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const geomRef = useRef<Geometry | null>(null);
  const swimmersRef = useRef<Swimmer[]>([]);
  const hookRef = useRef({ x: 0.5, y: 0.5, fromX: 0.5, fromY: 0, t: 0 });
  const attractedRef = useRef<Swimmer | null>(null);
  const hookedRef = useRef<Swimmer | null>(null);
  const landingRef = useRef({ stage: "toTip" as "toTip" | "toBucket", t: 0 });
  const biteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeRef = useRef(0);
  const animRef = useRef<number | null>(null);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const showMessage = useCallback((text: string, ms = 1800) => {
    setMessage(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMessage(null), ms);
  }, []);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  // ---------- 幾何 ----------
  const handleResize = useCallback(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (w < 40 || h < 40) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const pond: Rect = { x: 14, y: 84, w: w - 28, h: h - 84 - HUD_HEIGHT };
    geomRef.current = {
      w,
      h,
      dpr,
      pond,
      rodBase: { x: w / 2 - 10, y: h - 8 },
      rodTip: { x: w / 2 + 80, y: h - HUD_HEIGHT + 6 },
      bucket: { x: 62, y: h - 96 },
    };
    if (swimmersRef.current.length === 0) {
      swimmersRef.current = createSwimmers(SWIMMER_COUNT);
    }
  }, []);

  // ---------- 操作 ----------
  const cast = useCallback(() => {
    const g = geomRef.current;
    if (!g || phaseRef.current !== "idle") return;
    const hook = hookRef.current;
    hook.fromX = (g.rodTip.x - g.pond.x) / g.pond.w;
    hook.fromY = (g.rodTip.y - g.pond.y) / g.pond.h;
    hook.x = 0.25 + Math.random() * 0.55;
    hook.y = 0.25 + Math.random() * 0.55;
    hook.t = 0;
    setTurns(0);
    setPhaseBoth("casting");
    audioManager.whoosh();
  }, [setPhaseBoth]);

  const reel = useCallback(() => {
    if (phaseRef.current !== "hooked") return;
    audioManager.pop();
    setReelAngle((a) => a + 360);
    setTurns((prev) => {
      const r = reelStep(prev);
      if (r.done) {
        landingRef.current = { stage: "toTip", t: 0 };
        setPhaseBoth("landing");
      }
      return r.turns;
    });
  }, [setPhaseBoth]);

  const onButton = () => {
    if (phase === "idle") cast();
    else if (phase === "hooked") reel();
  };

  // ---------- 主迴圈 ----------
  useEffect(() => {
    handleResize();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(wrapper);

    const hookPx = (g: Geometry) => ({
      x: g.pond.x + hookRef.current.x * g.pond.w,
      y: g.pond.y + hookRef.current.y * g.pond.h,
    });

    const startBiteTimer = () => {
      if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
      biteTimerRef.current = setTimeout(() => {
        if (phaseRef.current !== "waiting") return;
        const hook = hookRef.current;
        attractedRef.current = nearestSwimmer(swimmersRef.current, hook.x, hook.y);
      }, 800 + Math.random() * 1700);
    };

    const finishCatch = () => {
      const caught = hookedRef.current;
      hookedRef.current = null;
      attractedRef.current = null;
      if (caught) {
        const type = getCatchType(caught.kind);
        setBucket((prev) => [...prev, caught.kind]);
        swimmersRef.current = swimmersRef.current.filter((s) => s.id !== caught.id);
        const pool: CatchKind[] = ["koi", "koi", "shark", "crab", "koi", "tire"];
        const fresh = createSwimmer(pool[Math.floor(Math.random() * pool.length)]);
        fresh.x = Math.random() < 0.5 ? 0.03 : 0.97;
        fresh.dir = fresh.x < 0.5 ? 1 : -1;
        swimmersRef.current.push(fresh);
        if (type.isJunk) {
          showMessage(`撿到${type.label}！池塘變乾淨了 ✨`, 2200);
          audioManager.bubble();
        } else {
          showMessage(`釣到${type.label}了！${type.emoji}`, 2000);
          audioManager.success();
        }
      }
      setTurns(0);
      setPhaseBoth("idle");
    };

    const update = (dt: number, g: Geometry) => {
      const p = phaseRef.current;
      const hook = hookRef.current;
      const attracted = attractedRef.current;

      // 一般游動（被吸引 / 上鉤的那隻另外處理）
      const free = swimmersRef.current.filter(
        (s) => s !== attracted && s !== hookedRef.current
      );
      updateSwimmers(free, dt);

      if (p === "casting") {
        hook.t = Math.min(1, hook.t + dt / CAST_DURATION);
        if (hook.t >= 1) {
          setPhaseBoth("waiting");
          startBiteTimer();
        }
      } else if (p === "waiting" && attracted) {
        const dx = hook.x - attracted.x;
        const dy = hook.y - attracted.y;
        const d = Math.hypot(dx, dy);
        const step = 0.35 * dt;
        if (d <= step || d < 0.02) {
          attracted.x = hook.x;
          attracted.y = hook.y;
          hookedRef.current = attracted;
          attractedRef.current = null;
          setPhaseBoth("hooked");
          showMessage("上鉤了！快轉圈圈收線 🔄", 2500);
          audioManager.pop();
          audioManager.ding();
        } else {
          attracted.dir = dx > 0 ? 1 : -1;
          attracted.x += (dx / d) * step;
          attracted.y += (dy / d) * step;
        }
      } else if (p === "hooked" && hookedRef.current) {
        const s = hookedRef.current;
        s.phase += dt * 10;
        s.x = hook.x + Math.sin(s.phase) * 0.012;
        s.y = hook.y + 0.01 + Math.cos(s.phase * 0.7) * 0.008;
      } else if (p === "landing") {
        const l = landingRef.current;
        if (l.stage === "toTip") {
          l.t = Math.min(1, l.t + dt / LAND_DURATION);
          const tipX = (g.rodTip.x - g.pond.x) / g.pond.w;
          const tipY = (g.rodTip.y - g.pond.y) / g.pond.h;
          if (l.t >= 1) {
            hook.x = tipX;
            hook.y = tipY;
            l.stage = "toBucket";
            l.t = 0;
          } else {
            const ease = 1 - Math.pow(1 - l.t, 2);
            hook.x = hook.x + (tipX - hook.x) * ease * 0.25;
            hook.y = hook.y + (tipY - hook.y) * ease * 0.25;
          }
          if (hookedRef.current) {
            hookedRef.current.x = hook.x;
            hookedRef.current.y = hook.y + 0.01;
          }
        } else {
          l.t = Math.min(1, l.t + dt / FLY_DURATION);
          if (l.t >= 1) finishCatch();
        }
      }
    };

    const drawEmoji = (
      ctx: CanvasRenderingContext2D,
      emoji: string,
      x: number,
      y: number,
      size: number,
      flip: boolean
    ) => {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = "#000"; // 彩色 emoji 仍受 fillStyle 透明度影響，這裡重設為不透明
      ctx.font = `${size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
    };

    const draw = (ctx: CanvasRenderingContext2D, g: Geometry, time: number) => {
      const { w, h, pond } = g;
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);

      // 草地
      ctx.fillStyle = "#A5D6A7";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#81C784";
      for (let i = 0; i < 14; i++) {
        const gx = ((i * 137) % w) + 10;
        const gy = h - HUD_HEIGHT + 20 + ((i * 53) % (HUD_HEIGHT - 40));
        ctx.beginPath();
        ctx.ellipse(gx, gy, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 池塘
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pond.x, pond.y, pond.w, pond.h, 40);
      ctx.clip();
      const water = ctx.createLinearGradient(0, pond.y, 0, pond.y + pond.h);
      water.addColorStop(0, "#81D4FA");
      water.addColorStop(1, "#0288D1");
      ctx.fillStyle = water;
      ctx.fillRect(pond.x, pond.y, pond.w, pond.h);

      // 波紋
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      for (let row = 0; row < 6; row++) {
        const y = pond.y + 30 + row * (pond.h / 6);
        ctx.beginPath();
        for (let x = pond.x; x <= pond.x + pond.w; x += 8) {
          const yy = y + Math.sin(x / 28 + time * 1.5 + row) * 4;
          if (x === pond.x) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }

      // 池底石頭與水草
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let i = 0; i < 6; i++) {
        const sx = pond.x + 30 + ((i * 173) % (pond.w - 60));
        ctx.beginPath();
        ctx.ellipse(sx, pond.y + pond.h - 10, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(46,125,50,0.55)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const sx = pond.x + 60 + ((i * 211) % (pond.w - 120));
        ctx.beginPath();
        ctx.moveTo(sx, pond.y + pond.h);
        ctx.quadraticCurveTo(
          sx + Math.sin(time * 1.2 + i) * 12,
          pond.y + pond.h - 40,
          sx + Math.sin(time * 1.2 + i) * 20,
          pond.y + pond.h - 70
        );
        ctx.stroke();
      }

      // 魚與雜物
      for (const s of swimmersRef.current) {
        const type = getCatchType(s.kind);
        const x = pond.x + s.x * pond.w;
        const y = pond.y + s.y * pond.h;
        drawEmoji(ctx, type.emoji, x, y, type.size, s.dir === 1 && !type.isJunk);
      }
      ctx.restore();

      // 荷葉
      ctx.fillStyle = "#66BB6A";
      ctx.beginPath();
      ctx.ellipse(pond.x + 60, pond.y + 40, 26, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(pond.x + pond.w - 80, pond.y + 60, 30, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // 釣竿
      const p = phaseRef.current;
      ctx.strokeStyle = "#8D6E63";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(g.rodBase.x, g.rodBase.y);
      ctx.lineTo(g.rodTip.x, g.rodTip.y);
      ctx.stroke();
      ctx.strokeStyle = "#5D4037";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.rodBase.x, g.rodBase.y);
      ctx.lineTo(g.rodBase.x + 22, g.rodBase.y - 40);
      ctx.stroke();

      // 釣線與鉤子
      let hx: number;
      let hy: number;
      if (p === "idle") {
        hx = g.rodTip.x;
        hy = g.rodTip.y + 26;
      } else if (p === "casting") {
        const hook = hookRef.current;
        const t = hook.t;
        const ease = 1 - Math.pow(1 - t, 2);
        const sx = g.pond.x + hook.fromX * g.pond.w;
        const sy = g.pond.y + hook.fromY * g.pond.h;
        const ex = g.pond.x + hook.x * g.pond.w;
        const ey = g.pond.y + hook.y * g.pond.h;
        hx = sx + (ex - sx) * ease;
        hy = sy + (ey - sy) * ease - Math.sin(t * Math.PI) * 120;
      } else {
        const px = hookPx(g);
        hx = px.x;
        hy = px.y + (p === "waiting" ? Math.sin(time * 4) * 3 : 0);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(g.rodTip.x, g.rodTip.y);
      ctx.lineTo(hx, hy - 12);
      ctx.stroke();
      // 浮標
      ctx.fillStyle = "#EF5350";
      ctx.beginPath();
      ctx.arc(hx, hy - 12, 6, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(hx, hy - 12, 6, 0, Math.PI);
      ctx.fill();
      // 鉤子
      ctx.strokeStyle = "#9E9E9E";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, hy - 6);
      ctx.lineTo(hx, hy + 4);
      ctx.arc(hx - 4, hy + 4, 4, 0, Math.PI);
      ctx.stroke();

      // 上鉤 / 收線中的魚跟著鉤子
      if (hookedRef.current && p !== "idle") {
        const s = hookedRef.current;
        const type = getCatchType(s.kind);
        const l = landingRef.current;
        if (p === "landing" && l.stage === "toBucket") {
          // 沿弧線飛向水桶
          const t = l.t;
          const ease = 1 - Math.pow(1 - t, 3);
          const sx = g.rodTip.x;
          const sy = g.rodTip.y;
          const ex = g.bucket.x;
          const ey = g.bucket.y - 30;
          const cx = (sx + ex) / 2;
          const cy = Math.min(sy, ey) - 120;
          const x = (1 - ease) * (1 - ease) * sx + 2 * (1 - ease) * ease * cx + ease * ease * ex;
          const y = (1 - ease) * (1 - ease) * sy + 2 * (1 - ease) * ease * cy + ease * ease * ey;
          drawEmoji(ctx, type.emoji, x, y, type.size * (1 - ease * 0.4), false);
        } else if (p === "landing") {
          drawEmoji(ctx, type.emoji, hx, hy + 14, type.size, false);
        } else {
          const x = pond.x + s.x * pond.w;
          const y = pond.y + s.y * pond.h;
          drawEmoji(ctx, type.emoji, x, y + 10, type.size, false);
        }
      }
    };

    let last = 0;
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const g = geomRef.current;
      if (ctx && g) {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        timeRef.current += dt;
        update(dt, g);
        draw(ctx, g, timeRef.current);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, [handleResize, setPhaseBoth, showMessage]);

  // ---------- UI ----------
  const buttonLabel =
    phase === "idle"
      ? { emoji: "🎣", text: "丟竿" }
      : phase === "hooked"
        ? { emoji: "🔄", text: "收線" }
        : phase === "landing"
          ? { emoji: "🪣", text: "放進桶" }
          : { emoji: "⏳", text: "等等…" };
  const buttonActive = phase === "idle" || phase === "hooked";

  return (
    <div className="fixed inset-0 bg-[#A5D6A7]" style={{ touchAction: "none" }}>
      <div ref={wrapperRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* 訊息 */}
      {message && (
        <div className="fixed top-5 left-0 right-0 z-30 flex justify-center pointer-events-none px-20">
          <div
            key={message}
            className="bg-white/90 backdrop-blur rounded-2xl px-4 py-2 shadow-md text-lg font-black text-[#FF69B4] animate-bounce-in text-center"
          >
            {message}
          </div>
        </div>
      )}

      {/* 水桶 */}
      <div className="fixed left-4 bottom-6 z-20 flex flex-col items-center w-28">
        <div className="relative">
          <span className="text-7xl leading-none select-none">🪣</span>
          <span className="absolute -top-1 -right-2 min-w-8 h-8 px-2 rounded-full bg-[#FFB74D] text-white text-lg font-black flex items-center justify-center shadow">
            {bucket.length}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-0.5 max-w-28 min-h-6">
          {bucket.slice(-8).map((k, i) => (
            <span key={`${k}-${i}`} className="text-base leading-none">
              {getCatchType(k).emoji}
            </span>
          ))}
        </div>
      </div>

      {/* 捲線輪：上鉤時出現 */}
      {phase === "hooked" && (
        <div className="fixed right-6 bottom-40 z-20 flex flex-col items-center animate-bounce-in">
          <button
            type="button"
            aria-label="轉動捲線輪"
            onPointerDown={reel}
            className="w-28 h-28 rounded-full shadow-xl active:scale-95 transition-transform border-[6px] border-[#5D4037] relative select-none"
            style={{
              background:
                "conic-gradient(#FFD54F 0 30deg, #F9A825 30deg 60deg, #FFD54F 60deg 90deg, #F9A825 90deg 120deg, #FFD54F 120deg 150deg, #F9A825 150deg 180deg, #FFD54F 180deg 210deg, #F9A825 210deg 240deg, #FFD54F 240deg 270deg, #F9A825 270deg 300deg, #FFD54F 300deg 330deg, #F9A825 330deg 360deg)",
              transform: `rotate(${reelAngle}deg)`,
              transition: "transform 0.45s cubic-bezier(.3,1.4,.6,1)",
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-[#5D4037] block" />
            </span>
            <span className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#EF5350] block" />
          </button>
          <div className="flex gap-1.5 mt-2">
            {Array.from({ length: REEL_TURNS_NEEDED }).map((_, i) => (
              <span
                key={i}
                className={`w-4 h-4 rounded-full block border-2 border-white shadow ${
                  i < turns ? "bg-[#81C784]" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 丟竿 / 收線按鈕 */}
      <div className="fixed right-4 bottom-6 z-20">
        <button
          type="button"
          onPointerDown={onButton}
          disabled={!buttonActive}
          className={`w-28 h-28 rounded-full text-white shadow-xl flex flex-col items-center justify-center select-none transition-transform ${
            buttonActive
              ? "bg-[#4FC3F7] active:scale-90 active:bg-[#039BE5]"
              : "bg-gray-300"
          } ${phase === "hooked" ? "animate-pulse" : ""}`}
        >
          <span className="text-4xl leading-none">{buttonLabel.emoji}</span>
          <span className="text-lg font-black mt-1">{buttonLabel.text}</span>
        </button>
      </div>

      {/* 池裡有什麼 */}
      <div className="fixed top-5 left-20 z-10 flex gap-1 pointer-events-none">
        {CATCH_TYPES.map((c) => (
          <span key={c.kind} className="text-xl leading-none opacity-70">
            {c.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
