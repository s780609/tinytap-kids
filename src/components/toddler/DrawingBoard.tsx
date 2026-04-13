"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";

const COLORS = [
  "#EF5350", "#FF69B4", "#CE93D8", "#4FC3F7",
  "#81C784", "#FFD54F", "#FFB74D", "#333333",
];

const BRUSH_SIZES = [6, 14, 24];

const BG_COLORS = ["#FFFFFF", "#E3F2FD", "#E8F5E9", "#FCE4EC"];

const STAMPS = [
  { emoji: "⭐", label: "星星" },
  { emoji: "❤️", label: "愛心" },
  { emoji: "🐱", label: "貓咪" },
  { emoji: "🐶", label: "小狗" },
  { emoji: "🌸", label: "花朵" },
  { emoji: "🦋", label: "蝴蝶" },
];

export default function DrawingBoard() {
  const { settings } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [isEraser, setIsEraser] = useState(false);
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [activeStamp, setActiveStamp] = useState<string | null>(null);
  const [showStamps, setShowStamps] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const toolbarHeight = 140;

  const getCtx = useCallback(() => {
    return canvasRef.current?.getContext("2d") ?? null;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Save current content
    let imageData: ImageData | null = null;
    if (canvas.width > 0 && canvas.height > 0) {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - toolbarHeight;

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Restore content
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
    }
  }, [bgColor]);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
    resizeCanvas();
    // Save initial state
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (ctx && canvas) {
      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    }
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas, getCtx, settings.volume]);

  // Refill background when bgColor changes
  useEffect(() => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }, [bgColor, getCtx]);

  const saveToHistory = useCallback(() => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push(data);
    if (historyRef.current.length > 30) historyRef.current.shift();
  }, [getCtx]);

  const getPointerPos = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleStamp = (x: number, y: number) => {
    if (!activeStamp) return;
    const ctx = getCtx();
    if (!ctx) return;

    ctx.font = `${brushSize * 3}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(activeStamp, x, y);
    audioManager.pop();
    saveToHistory();
  };

  const startDraw = (e: React.PointerEvent) => {
    const pos = getPointerPos(e);

    if (activeStamp) {
      handleStamp(pos.x, pos.y);
      return;
    }

    isDrawing.current = true;
    lastPos.current = pos;

    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (isEraser ? brushSize * 1.5 : brushSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = isEraser ? bgColor : color;
    ctx.fill();
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing.current || !lastPos.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? bgColor : color;
    ctx.lineWidth = isEraser ? brushSize * 1.5 : brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      lastPos.current = null;
      saveToHistory();
    }
  };

  const handleUndo = () => {
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    const ctx = getCtx();
    if (ctx && prev) {
      ctx.putImageData(prev, 0, 0);
      audioManager.ding();
    }
  };

  const handleClear = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    audioManager.whoosh();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      {/* Canvas area */}
      <canvas
        ref={canvasRef}
        className="flex-1 cursor-crosshair"
        style={{ touchAction: "none" }}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-2 p-2 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)]" style={{ height: toolbarHeight }}>
        {/* Row 1: Colors */}
        <div className="flex items-center gap-1.5 justify-center">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`w-9 h-9 rounded-full border-3 transition-transform ${
                color === c && !isEraser && !activeStamp
                  ? "border-gray-800 scale-115"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              onClick={() => {
                setColor(c);
                setIsEraser(false);
                setActiveStamp(null);
                setShowStamps(false);
              }}
            />
          ))}
        </div>

        {/* Row 2: Tools */}
        <div className="flex items-center gap-2 justify-center flex-wrap">
          {/* Brush sizes */}
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                brushSize === s && !isEraser && !activeStamp
                  ? "bg-gray-200 ring-2 ring-gray-400"
                  : "bg-gray-50"
              }`}
              onClick={() => {
                setBrushSize(s);
                setIsEraser(false);
                setActiveStamp(null);
              }}
            >
              <div
                className="rounded-full bg-gray-600"
                style={{ width: s, height: s }}
              />
            </button>
          ))}

          <div className="w-px h-8 bg-gray-200" />

          {/* Eraser */}
          <button
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
              isEraser ? "bg-pink-100 ring-2 ring-pink-400" : "bg-gray-50"
            }`}
            onClick={() => {
              setIsEraser(!isEraser);
              setActiveStamp(null);
              setShowStamps(false);
            }}
          >
            🧹
          </button>

          {/* Stamps toggle */}
          <button
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
              showStamps ? "bg-yellow-100 ring-2 ring-yellow-400" : "bg-gray-50"
            }`}
            onClick={() => {
              setShowStamps(!showStamps);
              setShowBgPicker(false);
            }}
          >
            ⭐
          </button>

          {/* BG color */}
          <button
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
              showBgPicker ? "bg-blue-100 ring-2 ring-blue-400" : "bg-gray-50"
            }`}
            onClick={() => {
              setShowBgPicker(!showBgPicker);
              setShowStamps(false);
            }}
          >
            🎨
          </button>

          <div className="w-px h-8 bg-gray-200" />

          {/* Undo */}
          <button
            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg active:scale-90 transition-transform"
            onClick={handleUndo}
          >
            ↩️
          </button>

          {/* Clear */}
          <button
            className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg active:scale-90 transition-transform"
            onClick={handleClear}
          >
            🗑️
          </button>
        </div>

        {/* Conditional Row 3: Stamps or BG picker */}
        {showStamps && (
          <div className="flex items-center gap-2 justify-center">
            {STAMPS.map((s) => (
              <button
                key={s.emoji}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                  activeStamp === s.emoji
                    ? "bg-yellow-200 ring-2 ring-yellow-500 scale-110"
                    : "bg-gray-50"
                }`}
                onClick={() => {
                  setActiveStamp(activeStamp === s.emoji ? null : s.emoji);
                  setIsEraser(false);
                }}
              >
                {s.emoji}
              </button>
            ))}
          </div>
        )}

        {showBgPicker && (
          <div className="flex items-center gap-2 justify-center">
            {BG_COLORS.map((c) => (
              <button
                key={c}
                className={`w-10 h-10 rounded-full border-2 transition-transform ${
                  bgColor === c ? "border-gray-600 scale-110" : "border-gray-300"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setBgColor(c);
                  setShowBgPicker(false);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
