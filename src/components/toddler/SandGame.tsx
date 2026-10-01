"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import {
  clearWall,
  createSandGrid,
  displace,
  fillPacked,
  LOOSE,
  PACKED,
  packBelow,
  pourGrid,
  stampWall,
  stepGrid,
  TINT_COUNT,
  TOOL_PROFILES,
  type SandGrid,
  type ToolProfile,
} from "@/lib/sand/sandGrid";

type Mode =
  | { kind: "hand" }
  | { kind: "pour" }
  | { kind: "mold"; tool: ToolProfile };

interface Geometry {
  w: number;
  h: number;
  dpr: number;
  tableTop: number;
  /** 格子左上角（px） */
  sandLeft: number;
  gridTop: number;
}

/** 把格子畫到小張的離屏 canvas，再放大貼到畫面上 */
interface SandImage {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageData: ImageData;
  px: Uint32Array;
}

/** 工具本體佔住的格子範圍 */
interface ToolShape {
  c0: number;
  r0: number;
  c1: number;
  r1: number;
  inside: (col: number, row: number) => boolean;
}

const CELL = 3; // 每粒沙的邊長（px）
const HAND_RADIUS = 20;
const RIM_W = 14; // 沙盤兩側木邊寬度
const MOLD_WALL = 8; // 模具杯壁厚度
const TABLE_H = 72; // 桌面 + 桌腳高度
const STEPS_PER_FRAME = 3; // 每幀模擬幾步（落下速度）
const POUR_GRAINS = 2; // 倒沙時每步落下的沙粒數
const POUR_SPREAD = 4; // 桶口寬度（格）

const SAND_COLORS = ["#E9CB96", "#DDBB83", "#F3DCAE", "#D6B27C"];
const PACKED_SHADE = 0.9; // 紮實沙顏色深一點

/** 格子位元組 → 像素顏色（ImageData 的 little-endian ABGR）；空格與牆為透明 */
const PALETTE = (() => {
  const pal = new Uint32Array(256);
  const kinds: [number, number][] = [
    [LOOSE, 1],
    [PACKED, PACKED_SHADE],
  ];
  for (let tint = 0; tint < TINT_COUNT; tint++) {
    const hex = parseInt(SAND_COLORS[tint].slice(1), 16);
    for (const [kind, k] of kinds) {
      const r = Math.round(((hex >> 16) & 255) * k);
      const g = Math.round(((hex >> 8) & 255) * k);
      const b = Math.round((hex & 255) * k);
      pal[kind | (tint << 2)] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
  }
  return pal;
})();

/** 畫面大小改變時保留原本的沙：欄位就近對應，從底部對齊 */
function resizeGrid(old: SandGrid | null, cols: number, rows: number): SandGrid {
  if (!old || old.cols < 2) return createSandGrid(cols, rows);
  if (old.cols === cols && old.rows === rows) return old;
  const g: SandGrid = { cols, rows, cells: new Uint8Array(cols * rows) };
  const keep = Math.min(rows, old.rows);
  for (let c = 0; c < cols; c++) {
    const src = Math.round((c * (old.cols - 1)) / Math.max(1, cols - 1));
    for (let k = 0; k < keep; k++) {
      g.cells[(rows - 1 - k) * cols + c] =
        old.cells[(old.rows - 1 - k) * old.cols + src];
    }
  }
  return g;
}

/** 工具塑形面最深處（px，相對底緣），用來避免工具壓穿桌面；倒扣模具為 0 */
const toolMaxDepth = (tool: ToolProfile) => {
  let m = 0;
  for (let dx = -tool.halfWidth; dx <= tool.halfWidth; dx += 2) {
    m = Math.max(m, tool.profile(dx));
  }
  return m;
};

const cellX = (g: Geometry, c: number) => g.sandLeft + (c + 0.5) * CELL;
const cellY = (g: Geometry, r: number) => g.gridTop + (r + 0.5) * CELL;
const xToCol = (g: Geometry, x: number) => Math.floor((x - g.sandLeft) / CELL);
const yToRow = (g: Geometry, y: number) => Math.floor((y - g.gridTop) / CELL);

const handShape = (g: Geometry, x: number, y: number): ToolShape => ({
  c0: xToCol(g, x - HAND_RADIUS),
  r0: yToRow(g, y - HAND_RADIUS),
  c1: xToCol(g, x + HAND_RADIUS),
  r1: yToRow(g, y + HAND_RADIUS),
  inside: (c, r) => {
    const dx = cellX(g, c) - x;
    const dy = cellY(g, r) - y;
    return dx * dx + dy * dy <= HAND_RADIUS * HAND_RADIUS;
  },
});

/** 模具：杯壁到底緣、中間到塑形面，以上全部算工具本體（沙不會留在模具上方） */
const moldShape = (
  g: Geometry,
  tool: ToolProfile,
  x: number,
  y: number
): ToolShape => {
  const hw = tool.halfWidth;
  return {
    c0: xToCol(g, x - hw - MOLD_WALL),
    r0: 0,
    c1: xToCol(g, x + hw + MOLD_WALL),
    r1: yToRow(g, y + toolMaxDepth(tool)),
    inside: (c, r) => {
      const dx = Math.abs(cellX(g, c) - x);
      if (dx > hw + MOLD_WALL) return false;
      return cellY(g, r) < (dx > hw ? y : y + tool.profile(cellX(g, c) - x));
    },
  };
};

const toolShape = (g: Geometry, m: Mode, x: number, y: number) =>
  m.kind === "mold" ? moldShape(g, m.tool, x, y) : handShape(g, x, y);

export default function SandGame() {
  const { settings } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>({ kind: "hand" });

  const modeRef = useRef<Mode>({ kind: "hand" });
  const gridRef = useRef<SandGrid | null>(null);
  const geomRef = useRef<Geometry | null>(null);
  const imageRef = useRef<SandImage | null>(null);
  const pointerRef = useRef({
    active: false,
    x: 0,
    y: 0,
    procX: 0,
    procY: 0,
    fresh: false, // 剛按下、還沒處理過
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
    const cols = Math.max(2, Math.floor((w - RIM_W * 2) / CELL));
    const rows = Math.max(2, Math.floor(tableTop / CELL));
    const sandLeft = Math.round((w - cols * CELL) / 2);
    const gridTop = tableTop - rows * CELL;
    geomRef.current = { w, h, dpr, tableTop, sandLeft, gridTop };
    gridRef.current = resizeGrid(gridRef.current, cols, rows);

    const img = imageRef.current;
    if (!img || img.canvas.width !== cols || img.canvas.height !== rows) {
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const offCtx = off.getContext("2d");
      if (offCtx) {
        const imageData = offCtx.createImageData(cols, rows);
        imageRef.current = {
          canvas: off,
          ctx: offCtx,
          imageData,
          px: new Uint32Array(imageData.data.buffer),
        };
      }
    }
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

    // ---------- 互動：手指 / 模具 ----------
    const applyToolAt = (
      g: Geometry,
      f: SandGrid,
      m: Mode,
      x: number,
      y: number,
      dir: number,
      filled: boolean
    ) => {
      const s = toolShape(g, m, x, y);
      const moved = displace(f, s.c0, s.r0, s.c1, s.r1, s.inside, dir);
      if (m.kind === "mold") {
        const hw = m.tool.halfWidth;
        if (filled) {
          // 模具剛拿出來時凹槽裡裝滿紮實沙（像裝滿沙再倒扣的水桶），點在沙面上就有形狀
          fillPacked(
            f,
            xToCol(g, x - hw),
            yToRow(g, y - m.tool.bodyHeight),
            xToCol(g, x + hw),
            yToRow(g, y),
            (c, r) => {
              const dx = cellX(g, c) - x;
              const cy = cellY(g, r);
              return Math.abs(dx) <= hw && cy < y && cy >= y + m.tool.profile(dx);
            }
          );
        }
        // 塑形面底下碰到的沙壓成紮實，拿起模具後才留得住形狀
        for (let c = xToCol(g, x - hw); c <= xToCol(g, x + hw); c++) {
          const dx = cellX(g, c) - x;
          if (Math.abs(dx) > hw) continue;
          const faceY = y + m.tool.profile(dx);
          packBelow(f, c, Math.ceil((faceY - g.gridTop) / CELL - 0.5));
        }
      }
      return moved;
    };

    const processPointer = (now: number, g: Geometry, f: SandGrid) => {
      const p = pointerRef.current;
      if (!p.active) return;

      const m = modeRef.current;
      if (m.kind === "pour") return; // 倒沙在主迴圈裡跟著模擬步數加沙

      // 工具最低只能碰到桌面
      const floor =
        g.tableTop - (m.kind === "mold" ? toolMaxDepth(m.tool) : HAND_RADIUS);
      if (p.y > floor) p.y = floor;
      if (p.procY > floor) p.procY = floor;

      // 把上一幀到這一幀的位移切成小步，快速滑動也不會跳格
      const dx = p.x - p.procX;
      const dy = p.y - p.procY;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / CELL));
      const dir = dist > 0.5 ? dx / dist : 0;
      let movedTotal = 0;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        movedTotal += applyToolAt(
          g,
          f,
          m,
          p.procX + dx * t,
          p.procY + dy * t,
          dir,
          p.fresh && s === 1
        );
      }
      p.fresh = false;
      if (movedTotal > 2) playSandSound(now, 140);
      p.procX = p.x;
      p.procY = p.y;
    };

    /** 模擬一幀：工具本體當成牆讓沙靠著，倒沙則每步從桶口加沙 */
    const simulate = (now: number, g: Geometry, f: SandGrid) => {
      const p = pointerRef.current;
      const m = modeRef.current;
      const pouring = p.active && m.kind === "pour";
      const s = p.active && !pouring ? toolShape(g, m, p.x, p.y) : null;
      if (s) stampWall(f, s.c0, s.r0, s.c1, s.r1, s.inside);
      let poured = 0;
      for (let k = 0; k < STEPS_PER_FRAME; k++) {
        if (pouring) {
          poured += pourGrid(
            f,
            xToCol(g, p.x),
            yToRow(g, p.y + 6),
            POUR_GRAINS,
            POUR_SPREAD
          );
        }
        stepGrid(f);
      }
      if (s) clearWall(f, s.c0, s.r0, s.c1, s.r1);
      if (poured > 0) playSandSound(now, 260);
    };

    // ---------- 繪製 ----------
    const draw = (ctx: CanvasRenderingContext2D, g: Geometry, f: SandGrid) => {
      const { w, h, tableTop } = g;
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

      // 沙子：一格一個像素，放大時不做平滑才看得到顆粒
      const img = imageRef.current;
      if (img && img.px.length === f.cells.length) {
        const cells = f.cells;
        const px = img.px;
        for (let i = 0; i < cells.length; i++) px[i] = PALETTE[cells[i]];
        img.ctx.putImageData(img.imageData, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          img.canvas,
          g.sandLeft,
          g.gridTop,
          f.cols * CELL,
          f.rows * CELL
        );
      }

      // 沙盤木邊
      ctx.fillStyle = "#8D6E63";
      ctx.beginPath();
      ctx.roundRect(0, tableTop - 18, RIM_W, 20, 4);
      ctx.roundRect(w - RIM_W, tableTop - 18, RIM_W, 20, 4);
      ctx.fill();

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
        // 桶子傾斜，桶口朝向手指位置，看起來才像在倒沙
        ctx.save();
        ctx.translate(p.x - 18, p.y - 18);
        ctx.rotate((125 * Math.PI) / 180);
        ctx.fillStyle = "#000";
        ctx.font = "44px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🪣", 0, 0);
        ctx.restore();
      } else {
        // 模具剖面：外側是杯壁，底緣在 p.y，凹槽沿 profile 描出（透明，看得到沙填進去）
        const tool = m.tool;
        const hw = tool.halfWidth;
        const wall = MOLD_WALL;
        const top = p.y - tool.bodyHeight;
        ctx.beginPath();
        ctx.moveTo(p.x - hw - wall, p.y);
        ctx.lineTo(p.x - hw - wall, top);
        ctx.lineTo(p.x + hw + wall, top);
        ctx.lineTo(p.x + hw + wall, p.y);
        ctx.lineTo(p.x + hw, p.y);
        for (let dx = hw; dx >= -hw; dx -= 2) {
          ctx.lineTo(p.x + dx, p.y + tool.profile(dx));
        }
        ctx.lineTo(p.x - hw, p.y);
        ctx.closePath();
        ctx.fillStyle = tool.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.stroke();
        // 把手
        ctx.beginPath();
        ctx.roundRect(p.x - 14, top - 18, 28, 20, 8);
        ctx.fill();
        ctx.stroke();
      }
    };

    // 指標事件發生時立即處理，避免快速點放在同一幀內被漏掉
    processRef.current = (now: number) => {
      const g = geomRef.current;
      const f = gridRef.current;
      if (g && f) processPointer(now, g, f);
    };

    // ---------- 主迴圈 ----------
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const g = geomRef.current;
      const f = gridRef.current;
      if (ctx && g && f) {
        processPointer(now, g, f);
        simulate(now, g, f);
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
    p.fresh = true;
    audioManager.init();
    processRef.current(performance.now());
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointerRef.current;
    if (!p.active) return;
    const { x, y } = getPos(e);
    p.x = x;
    p.y = y;
    processRef.current(performance.now());
  };

  const onPointerUp = () => {
    pointerRef.current.active = false;
  };

  const handleReset = () => {
    const f = gridRef.current;
    if (!f) return;
    gridRef.current = createSandGrid(f.cols, f.rows);
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
