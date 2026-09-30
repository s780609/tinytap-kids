"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import {
  carveField,
  createSandField,
  pourField,
  relaxField,
  TOOL_PROFILES,
  type SandField,
  type ToolProfile,
} from "@/lib/sand/sandField";

type Mode =
  | { kind: "hand" }
  | { kind: "pour" }
  | { kind: "mold"; tool: ToolProfile };

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Geometry {
  w: number;
  h: number;
  dpr: number;
  tableTop: number;
  sandLeft: number;
  sandRight: number;
  cols: number;
}

const COL_W = 2; // 每欄沙的寬度（px）
const HAND_RADIUS = 20;
const RIM_W = 14; // 沙盤兩側木邊寬度
const TABLE_H = 72; // 桌面 + 桌腳高度
const REPOSE_DIFF = 2; // 相鄰欄允許的最大高度差（約 45°，推出的沙會堆成沙丘）
const REPOSE_RATE = 0.3; // 每幀崩落速度
const LOCAL_RELAX_PASSES = 30; // 互動後在手指附近立即崩落的輪數
const POUR_REPOSE_DIFF = 1.4; // 倒沙處用較鬆的沙，自然堆成沙錐
const MAX_PARTICLES = 300;

const SAND_BASE = "#E9CB96";
const SAND_GRAINS = ["#D6B27C", "#F6E0B5", "#C9A46E"];

function resampleField(
  old: SandField | null,
  cols: number,
  maxH: number
): SandField {
  if (!old || old.h.length < 2) return createSandField(cols, maxH);
  const f: SandField = { h: new Float64Array(cols), maxH };
  for (let i = 0; i < cols; i++) {
    const src = Math.round((i * (old.h.length - 1)) / Math.max(1, cols - 1));
    f.h[i] = Math.min(maxH, old.h[src]);
  }
  return f;
}

function makeSandPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const off = document.createElement("canvas");
  off.width = 64;
  off.height = 64;
  const c = off.getContext("2d");
  if (!c) return null;
  c.fillStyle = SAND_BASE;
  c.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 260; i++) {
    c.fillStyle = SAND_GRAINS[i % SAND_GRAINS.length];
    c.beginPath();
    c.arc(
      Math.random() * 64,
      Math.random() * 64,
      0.6 + Math.random() * 0.9,
      0,
      Math.PI * 2
    );
    c.fill();
  }
  return ctx.createPattern(off, "repeat");
}

/** 工具底部最深處（px），用來避免工具壓穿桌面 */
const toolMaxDepth = (tool: ToolProfile) => {
  let m = 0;
  for (let dx = -tool.halfWidth; dx <= tool.halfWidth; dx += 2) {
    m = Math.max(m, tool.profile(dx));
  }
  return m;
};

const colX = (g: Geometry, i: number) => g.sandLeft + i * COL_W + COL_W / 2;
const xToCol = (g: Geometry, x: number) => (x - g.sandLeft - COL_W / 2) / COL_W;
const surfaceY = (g: Geometry, f: SandField, x: number) => {
  const i = Math.max(0, Math.min(f.h.length - 1, Math.round(xToCol(g, x))));
  return g.tableTop - f.h[i];
};

export default function SandGame() {
  const { settings } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>({ kind: "hand" });

  const modeRef = useRef<Mode>({ kind: "hand" });
  const fieldRef = useRef<SandField | null>(null);
  const geomRef = useRef<Geometry | null>(null);
  const patternRef = useRef<CanvasPattern | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef({
    active: false,
    x: 0,
    y: 0,
    procX: 0,
    procY: 0,
  });
  const lastSoundRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const processRef = useRef<(now: number) => void>(() => {});

  const selectMode = (m: Mode) => {
    setMode(m);
    audioManager.ding();
  };

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

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

    const tableTop = h - TABLE_H;
    const sandLeft = RIM_W;
    const sandRight = w - RIM_W;
    const cols = Math.max(2, Math.floor((sandRight - sandLeft) / COL_W));
    const maxH = Math.max(40, tableTop - 60);
    geomRef.current = { w, h, dpr, tableTop, sandLeft, sandRight, cols };
    fieldRef.current = resampleField(fieldRef.current, cols, maxH);

    const ctx = canvas.getContext("2d");
    if (ctx && !patternRef.current) patternRef.current = makeSandPattern(ctx);
  }, []);

  useEffect(() => {
    handleResize();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(wrapper);

    const playSandSound = (now: number, gap: number) => {
      if (now - lastSoundRef.current > gap) {
        lastSoundRef.current = now;
        audioManager.sand();
      }
    };

    const spawnParticles = (x: number, y: number, count: number, dirX: number) => {
      const list = particlesRef.current;
      for (let k = 0; k < count && list.length < MAX_PARTICLES; k++) {
        list.push({
          x: x + (Math.random() - 0.5) * 6,
          y,
          vx: dirX * (1 + Math.random() * 2.5) + (Math.random() - 0.5),
          vy: -(1 + Math.random() * 3),
        });
      }
    };

    // ---------- 互動：手指 / 模具 / 倒沙 ----------
    const applyHandAt = (g: Geometry, f: SandField, x: number, y: number, dir: number) => {
      const moved = carveField(
        f,
        xToCol(g, x),
        HAND_RADIUS / COL_W,
        (dxCols) => {
          const dx = dxCols * COL_W;
          const bottom = y + Math.sqrt(Math.max(0, HAND_RADIUS * HAND_RADIUS - dx * dx));
          return g.tableTop - bottom;
        },
        dir
      );
      if (moved > 1) {
        const side = dir > 0.3 ? 1 : dir < -0.3 ? -1 : 0;
        const px = x + side * HAND_RADIUS;
        spawnParticles(
          px,
          surfaceY(g, f, px) - 2,
          Math.min(3, Math.ceil(moved / 6)),
          side || (Math.random() < 0.5 ? -1 : 1)
        );
      }
      return moved;
    };

    const applyMoldAt = (
      g: Geometry,
      f: SandField,
      tool: ToolProfile,
      x: number,
      y: number,
      dir: number
    ) => {
      const moved = carveField(
        f,
        xToCol(g, x),
        tool.halfWidth / COL_W,
        (dxCols) => g.tableTop - (y + tool.profile(dxCols * COL_W)),
        dir
      );
      if (moved > 1) {
        const n = Math.min(2, Math.ceil(moved / 10));
        const lx = x - tool.halfWidth - 2;
        const rx = x + tool.halfWidth + 2;
        spawnParticles(lx, surfaceY(g, f, lx) - 2, n, -1);
        spawnParticles(rx, surfaceY(g, f, rx) - 2, n, 1);
      }
      return moved;
    };

    const applyPourAt = (g: Geometry, f: SandField, x: number, y: number) => {
      const c = Math.round(xToCol(g, x));
      const added = pourField(f, c, 12 / COL_W, 3.2);
      relaxField(f, POUR_REPOSE_DIFF, 0.5, c - 30, c + 30);
      // 從水桶口落下的沙粒
      const list = particlesRef.current;
      for (let k = 0; k < 3 && list.length < MAX_PARTICLES; k++) {
        list.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + 6,
          vx: (Math.random() - 0.5) * 0.6,
          vy: 2 + Math.random() * 2,
        });
      }
      return added;
    };

    const processPointer = (now: number, g: Geometry, f: SandField) => {
      const p = pointerRef.current;
      if (!p.active) return;

      const m = modeRef.current;
      if (m.kind === "pour") {
        const added = applyPourAt(g, f, p.x, p.y);
        if (added > 0.5) playSandSound(now, 260);
        p.procX = p.x;
        p.procY = p.y;
        return;
      }

      // 工具最低只能碰到桌面
      const floor =
        g.tableTop - (m.kind === "mold" ? toolMaxDepth(m.tool) : HAND_RADIUS);
      if (p.y > floor) p.y = floor;
      if (p.procY > floor) p.procY = floor;

      // 手指 / 模具：把上一幀到這一幀的位移切成小步，快速滑動也不會跳格
      const dx = p.x - p.procX;
      const dy = p.y - p.procY;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / 3));
      const dir = dist > 0.5 ? dx / dist : 0;
      let movedTotal = 0;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const x = p.procX + dx * t;
        const y = p.procY + dy * t;
        movedTotal +=
          m.kind === "mold"
            ? applyMoldAt(g, f, m.tool, x, y, dir)
            : applyHandAt(g, f, x, y, dir);
      }
      // 推出的沙馬上在附近多崩落幾輪，形成沙丘而不是直立的沙柱
      const c = Math.round(xToCol(g, p.x));
      for (let k = 0; k < LOCAL_RELAX_PASSES; k++) {
        relaxField(f, REPOSE_DIFF, 1, c - 120, c + 120);
      }
      if (movedTotal > 3) playSandSound(now, 140);
      p.procX = p.x;
      p.procY = p.y;
    };

    const updateParticles = (g: Geometry, f: SandField) => {
      const list = particlesRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const pt = list[i];
        pt.vy += 0.45;
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (
          pt.x < g.sandLeft ||
          pt.x > g.sandRight ||
          pt.y > g.h ||
          (pt.vy > 0 && pt.y >= surfaceY(g, f, pt.x))
        ) {
          list.splice(i, 1);
        }
      }
    };

    // ---------- 繪製 ----------
    const draw = (ctx: CanvasRenderingContext2D, g: Geometry, f: SandField) => {
      const { w, h, tableTop, sandLeft, sandRight } = g;
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);

      // 天空
      const sky = ctx.createLinearGradient(0, 0, 0, tableTop);
      sky.addColorStop(0, "#BDE3FF");
      sky.addColorStop(1, "#FFF6E5");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // 太陽
      ctx.fillStyle = "rgba(255, 224, 130, 0.45)";
      ctx.beginPath();
      ctx.arc(w - 64, 72, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFE082";
      ctx.beginPath();
      ctx.arc(w - 64, 72, 30, 0, Math.PI * 2);
      ctx.fill();

      // 雲
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      const cloud = (cx: number, cy: number, s: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 16 * s, 0, Math.PI * 2);
        ctx.arc(cx + 18 * s, cy - 8 * s, 20 * s, 0, Math.PI * 2);
        ctx.arc(cx + 40 * s, cy, 16 * s, 0, Math.PI * 2);
        ctx.fill();
      };
      cloud(w * 0.12, 90, 1);
      cloud(w * 0.5, 50, 0.75);

      // 桌腳
      ctx.fillStyle = "#8D6E63";
      const legW = 18;
      ctx.fillRect(w * 0.14, tableTop + 16, legW, h - tableTop - 16);
      ctx.fillRect(w * 0.86 - legW, tableTop + 16, legW, h - tableTop - 16);

      // 桌面
      ctx.fillStyle = "#A1887F";
      ctx.beginPath();
      ctx.roundRect(2, tableTop, w - 4, 20, 6);
      ctx.fill();
      ctx.fillStyle = "#BCAAA4";
      ctx.fillRect(6, tableTop + 2, w - 12, 3);

      // 沙子
      const path = new Path2D();
      path.moveTo(sandLeft, tableTop + 1);
      for (let i = 0; i < f.h.length; i++) {
        path.lineTo(colX(g, i), tableTop - f.h[i]);
      }
      path.lineTo(sandRight, tableTop + 1);
      path.closePath();
      ctx.fillStyle = patternRef.current ?? SAND_BASE;
      ctx.fill(path);
      // 底部暗一點，看起來有厚度
      const shade = ctx.createLinearGradient(0, tableTop - f.maxH, 0, tableTop);
      shade.addColorStop(0, "rgba(160,120,70,0)");
      shade.addColorStop(1, "rgba(160,120,70,0.22)");
      ctx.fillStyle = shade;
      ctx.fill(path);
      // 沙面描邊
      ctx.beginPath();
      for (let i = 0; i < f.h.length; i++) {
        const x = colX(g, i);
        const y = tableTop - f.h[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(150,110,60,0.55)";
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.stroke();

      // 沙盤木邊
      ctx.fillStyle = "#8D6E63";
      ctx.beginPath();
      ctx.roundRect(0, tableTop - 18, RIM_W, 20, 4);
      ctx.roundRect(w - RIM_W, tableTop - 18, RIM_W, 20, 4);
      ctx.fill();

      // 沙粒
      ctx.fillStyle = "#D6B27C";
      for (const pt of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // 工具
      const p = pointerRef.current;
      if (!p.active) return;
      const m = modeRef.current;
      if (m.kind === "hand") {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, HAND_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (m.kind === "pour") {
        const top = p.y + 6;
        const bottom = Math.max(top, surfaceY(g, f, p.x));
        ctx.strokeStyle = "rgba(214,178,124,0.85)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, top);
        ctx.lineTo(p.x, bottom);
        ctx.stroke();
        ctx.font = "44px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🪣", p.x, p.y - 22);
      } else {
        const tool = m.tool;
        const hw = tool.halfWidth;
        ctx.beginPath();
        ctx.moveTo(p.x - hw, p.y - tool.bodyHeight);
        ctx.lineTo(p.x + hw, p.y - tool.bodyHeight);
        for (let dx = hw; dx >= -hw; dx -= 2) {
          ctx.lineTo(p.x + dx, p.y + tool.profile(dx));
        }
        ctx.closePath();
        ctx.fillStyle = tool.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.stroke();
        // 把手
        ctx.beginPath();
        ctx.roundRect(p.x - 14, p.y - tool.bodyHeight - 18, 28, 20, 8);
        ctx.fill();
        ctx.stroke();
      }
    };

    // 指標事件發生時立即處理，避免快速點放在同一幀內被漏掉
    processRef.current = (now: number) => {
      const g = geomRef.current;
      const f = fieldRef.current;
      if (g && f) processPointer(now, g, f);
    };

    // ---------- 主迴圈 ----------
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const g = geomRef.current;
      const f = fieldRef.current;
      if (ctx && g && f) {
        processPointer(now, g, f);
        relaxField(f, REPOSE_DIFF, REPOSE_RATE);
        updateParticles(g, f);
        draw(ctx, g, f);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [handleResize]);

  // ---------- 指標事件 ----------
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
    const p = pointerRef.current;
    p.active = true;
    p.x = x;
    p.y = y;
    p.procX = x;
    p.procY = y;
    audioManager.init();
    processRef.current(performance.now());
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointerRef.current;
    if (!p.active) return;
    const { x, y } = getPos(e);
    p.x = x;
    p.y = y;
    if (modeRef.current.kind !== "pour") processRef.current(performance.now());
  };

  const onPointerUp = () => {
    pointerRef.current.active = false;
  };

  const handleReset = () => {
    const g = geomRef.current;
    const f = fieldRef.current;
    if (!g || !f) return;
    fieldRef.current = createSandField(g.cols, f.maxH);
    particlesRef.current = [];
    audioManager.whoosh();
  };

  const isSelected = (kind: Mode["kind"], toolId?: string) =>
    mode.kind === kind && (mode.kind !== "mold" || mode.tool.id === toolId);

  const toolBtn = (
    key: string,
    selected: boolean,
    emoji: string,
    label: string,
    onClick: () => void
  ) => (
    <button
      key={key}
      className={`w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center transition-all ${
        selected ? "bg-amber-100 ring-2 ring-amber-400 scale-105" : "bg-gray-50"
      }`}
      onClick={onClick}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <span className="text-[10px] font-bold text-gray-600 mt-0.5">{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-[#BDE3FF]">
      <div ref={wrapperRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      <div className="shrink-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] px-2 pt-2 pb-3 overflow-x-auto overflow-y-hidden">
        <div className="flex items-center gap-2 flex-nowrap py-1 w-max mx-auto">
          {toolBtn("hand", isSelected("hand"), "👆", "推沙", () =>
            selectMode({ kind: "hand" })
          )}
          {toolBtn("pour", isSelected("pour"), "🪣", "倒沙", () =>
            selectMode({ kind: "pour" })
          )}

          <div className="w-px h-10 bg-gray-200 shrink-0" />

          {TOOL_PROFILES.map((t) =>
            toolBtn(t.id, isSelected("mold", t.id), t.emoji, t.label, () =>
              selectMode({ kind: "mold", tool: t })
            )
          )}

          <div className="w-px h-10 bg-gray-200 shrink-0" />

          <button
            className="w-12 h-12 shrink-0 rounded-2xl bg-gray-50 flex flex-col items-center justify-center active:scale-90 transition-transform"
            onClick={handleReset}
          >
            <span className="text-xl leading-none">🔄</span>
            <span className="text-[10px] font-bold text-gray-600 mt-0.5">重來</span>
          </button>
        </div>
      </div>
    </div>
  );
}
