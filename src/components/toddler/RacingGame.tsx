"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { randomInt, pickRandom } from "@/lib/utils/random";

interface RoadItem {
  id: number;
  type: "coin" | "obstacle";
  x: number;
  y: number;
}

interface FlyingCoin {
  id: number;
  startX: number;
  startY: number;
  progress: number; // 0→1
}

const CAR_SIZE = 50;
const ITEM_SIZE = 40;
const ROAD_SPEED_INITIAL = 3;
const SPAWN_INTERVAL = 60;
const GAME_DURATION = 120; // seconds
const TARGET_COINS = 30;

type GamePhase = "countdown" | "playing" | "finished";

let nextItemId = 0;
let nextCoinAnimId = 0;

export default function RacingGame() {
  const { settings } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState<FlyingCoin[]>([]);
  const [phase, setPhase] = useState<GamePhase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gameStateRef = useRef({
    carX: 0.5,
    targetCarX: 0.5,
    items: [] as RoadItem[],
    roadOffset: 0,
    frameCount: 0,
    speed: ROAD_SPEED_INITIAL,
    score: 0,
    width: 0,
    height: 0,
    roadLeft: 0,
    roadWidth: 300,
    playing: false,
  });
  const animRef = useRef<number | null>(null);

  // Steering state (not React state for perf — wheelAngle is synced via setWheelAngle)
  const steerRef = useRef({
    dragging: false,
    startPointerAngle: 0,
    startWheelAngle: 0,
    currentAngle: 0,
    centerX: 0,
    centerY: 0,
  });

  const computeRoad = useCallback((width: number) => {
    const roadWidth = Math.min(width * 0.8, 300);
    const roadLeft = (width - roadWidth) / 2;
    return { roadWidth, roadLeft };
  }, []);

  const startCountdown = useCallback(() => {
    setPhase("countdown");
    setCountdown(3);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setWheelAngle(0);
    setFlyingCoins([]);
    steerRef.current.currentAngle = 0;

    const gs = gameStateRef.current;
    gs.carX = 0.5;
    gs.targetCarX = 0.5;
    gs.items = [];
    gs.roadOffset = 0;
    gs.frameCount = 0;
    gs.speed = ROAD_SPEED_INITIAL;
    gs.score = 0;
    gs.playing = false;
    nextItemId = 0;

    let c = 3;
    const cdInterval = setInterval(() => {
      c--;
      if (c > 0) {
        setCountdown(c);
        audioManager.pop();
      } else {
        clearInterval(cdInterval);
        setPhase("playing");
        gs.playing = true;
        audioManager.chime();

        // Start game timer
        if (timerRef.current) clearInterval(timerRef.current);
        let remaining = GAME_DURATION;
        timerRef.current = setInterval(() => {
          remaining--;
          setTimeLeft(remaining);
          if (remaining <= 0) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            gs.playing = false;
            setPhase("finished");
            audioManager.success();
          }
        }, 1000);
      }
    }, 1000);
    audioManager.pop();
  }, []);

  const initGame = startCountdown;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gs = gameStateRef.current;
    const { width, height, roadLeft, roadWidth } = gs;

    // Grass
    ctx.fillStyle = "#81C784";
    ctx.fillRect(0, 0, width, height);

    // Road
    ctx.fillStyle = "#616161";
    ctx.fillRect(roadLeft, 0, roadWidth, height);

    // Lane markings
    ctx.strokeStyle = "#FFD54F";
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    const laneCount = 3;
    const laneWidth = roadWidth / laneCount;
    for (let i = 1; i < laneCount; i++) {
      const x = roadLeft + laneWidth * i;
      ctx.beginPath();
      for (let y = -gs.roadOffset % 35; y < height; y += 35) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 20);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Road edges
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(roadLeft, 0);
    ctx.lineTo(roadLeft, height);
    ctx.moveTo(roadLeft + roadWidth, 0);
    ctx.lineTo(roadLeft + roadWidth, height);
    ctx.stroke();

    // Items
    for (const item of gs.items) {
      const ix = roadLeft + item.x * roadWidth;
      const iy = item.y;

      if (item.type === "coin") {
        ctx.fillStyle = "#FFD54F";
        ctx.beginPath();
        ctx.arc(ix, iy, ITEM_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#F9A825";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#F9A825";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", ix, iy);
      } else {
        ctx.fillStyle = "#8D6E63";
        const r = ITEM_SIZE / 2;
        ctx.beginPath();
        ctx.moveTo(ix - r, iy + r * 0.5);
        ctx.lineTo(ix - r * 0.6, iy - r);
        ctx.lineTo(ix + r * 0.3, iy - r * 0.8);
        ctx.lineTo(ix + r, iy - r * 0.2);
        ctx.lineTo(ix + r * 0.7, iy + r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#5D4037";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Car — smooth position
    const carPx = roadLeft + gs.carX * roadWidth;
    const carY = height - 150;

    // Car body
    ctx.fillStyle = "#EF5350";
    ctx.beginPath();
    ctx.roundRect(carPx - CAR_SIZE / 2, carY - CAR_SIZE * 0.6, CAR_SIZE, CAR_SIZE * 1.2, 8);
    ctx.fill();

    // Roof
    ctx.fillStyle = "#C62828";
    ctx.beginPath();
    ctx.roundRect(carPx - CAR_SIZE * 0.35, carY - CAR_SIZE * 0.3, CAR_SIZE * 0.7, CAR_SIZE * 0.5, 5);
    ctx.fill();

    // Windshield
    ctx.fillStyle = "#90CAF9";
    ctx.beginPath();
    ctx.roundRect(carPx - CAR_SIZE * 0.28, carY - CAR_SIZE * 0.25, CAR_SIZE * 0.56, CAR_SIZE * 0.2, 3);
    ctx.fill();

    // Wheels
    ctx.fillStyle = "#333";
    ctx.fillRect(carPx - CAR_SIZE / 2 - 4, carY - CAR_SIZE * 0.4, 8, 16);
    ctx.fillRect(carPx + CAR_SIZE / 2 - 4, carY - CAR_SIZE * 0.4, 8, 16);
    ctx.fillRect(carPx - CAR_SIZE / 2 - 4, carY + CAR_SIZE * 0.25, 8, 16);
    ctx.fillRect(carPx + CAR_SIZE / 2 - 4, carY + CAR_SIZE * 0.25, 8, 16);

    // Headlights
    ctx.fillStyle = "#FFD54F";
    ctx.beginPath();
    ctx.arc(carPx - CAR_SIZE * 0.3, carY - CAR_SIZE * 0.55, 4, 0, Math.PI * 2);
    ctx.arc(carPx + CAR_SIZE * 0.3, carY - CAR_SIZE * 0.55, 4, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const gameLoop = useCallback(() => {
    const gs = gameStateRef.current;

    // Always lerp car + draw, but only spawn/move items when playing
    gs.frameCount++;
    if (gs.playing) {
      gs.roadOffset += gs.speed;
    }

    // Smooth car movement — lerp toward target
    const diff = gs.targetCarX - gs.carX;
    gs.carX += diff * 0.12; // smooth interpolation factor

    // Clamp car within road
    const margin = (CAR_SIZE / 2 + 4) / gs.roadWidth;
    gs.carX = Math.max(margin, Math.min(1 - margin, gs.carX));

    if (!gs.playing) {
      draw();
      animRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Spawn items
    if (gs.frameCount % SPAWN_INTERVAL === 0) {
      const lanePositions = [0.167, 0.5, 0.833];
      const laneX = pickRandom(lanePositions);
      const type = pickRandom(
        Math.random() < 0.6 ? (["coin"] as const) : (["obstacle"] as const)
      );
      gs.items.push({ id: nextItemId++, type, x: laneX, y: -ITEM_SIZE });
    }

    // Move items
    for (const item of gs.items) {
      item.y += gs.speed;
    }

    // Collision check
    const carY = gs.height - 150;
    const carPxNorm = gs.carX;
    for (let i = gs.items.length - 1; i >= 0; i--) {
      const item = gs.items[i];
      const distX = Math.abs(item.x - carPxNorm) * gs.roadWidth;
      const distY = Math.abs(item.y - carY);
      if (distX < (CAR_SIZE / 2 + ITEM_SIZE / 2 - 8) && distY < CAR_SIZE * 0.6) {
        if (item.type === "coin") {
          gs.score++;
          setScore(gs.score);
          audioManager.ding();
          // Spawn flying coin animation
          const coinScreenX = gs.roadLeft + item.x * gs.roadWidth;
          const coinScreenY = item.y;
          const coinId = nextCoinAnimId++;
          setFlyingCoins((prev) => [
            ...prev,
            { id: coinId, startX: coinScreenX, startY: coinScreenY, progress: 0 },
          ]);
        } else {
          audioManager.pop();
        }
        gs.items.splice(i, 1);
      }
    }

    // Remove off-screen
    gs.items = gs.items.filter((item) => item.y < gs.height + ITEM_SIZE);

    // Speed up gradually
    if (gs.frameCount % 300 === 0 && gs.speed < 7) {
      gs.speed += 0.3;
    }

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  // --- Steering wheel ---
  const getPointerAngle = (clientX: number, clientY: number) => {
    const s = steerRef.current;
    const dx = clientX - s.centerX;
    const dy = clientY - s.centerY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const onWheelPointerDown = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const s = steerRef.current;
    s.centerX = rect.left + rect.width / 2;
    s.centerY = rect.top + rect.height / 2;
    s.dragging = true;
    s.startPointerAngle = getPointerAngle(e.clientX, e.clientY);
    s.startWheelAngle = s.currentAngle;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onWheelPointerMove = useCallback((e: React.PointerEvent) => {
    const s = steerRef.current;
    if (!s.dragging) return;

    const pAngle = getPointerAngle(e.clientX, e.clientY);
    let delta = pAngle - s.startPointerAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const newAngle = Math.max(-90, Math.min(90, s.startWheelAngle + delta));
    s.currentAngle = newAngle;

    // Map angle to car target position: -90 → left edge, 0 → center, 90 → right edge
    const normalized = (newAngle + 90) / 180; // 0..1
    gameStateRef.current.targetCarX = 0.1 + normalized * 0.8; // keep within road

    setWheelAngle(newAngle);
  }, []);

  const onWheelPointerUp = useCallback(() => {
    steerRef.current.dragging = false;
  }, []);

  // Animate flying coins
  useEffect(() => {
    if (flyingCoins.length === 0) return;
    const id = requestAnimationFrame(() => {
      setFlyingCoins((prev) =>
        prev
          .map((c) => ({ ...c, progress: c.progress + 0.035 }))
          .filter((c) => c.progress < 1)
      );
    });
    return () => cancelAnimationFrame(id);
  }, [flyingCoins]);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const gs = gameStateRef.current;
      gs.width = canvas.width;
      gs.height = canvas.height;
      const { roadWidth, roadLeft } = computeRoad(canvas.width);
      gs.roadWidth = roadWidth;
      gs.roadLeft = roadLeft;
    };

    resize();
    window.addEventListener("resize", resize);

    initGame();
    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initGame, gameLoop, settings.volume, computeRoad]);

  return (
    <div className="fixed inset-0" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* HUD: Score + Timer + Target */}
      <div className="fixed top-4 left-4 right-4 z-20 flex justify-between items-start">
        {/* Timer */}
        <div className="bg-white/80 backdrop-blur rounded-2xl px-3 py-1.5 shadow-md">
          <span className={`text-lg font-black ${timeLeft <= 10 ? "text-[#EF5350]" : "text-[#4A4A4A]"}`}>
            ⏱ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
          </span>
        </div>
        {/* Score + Target */}
        <div className="bg-white/80 backdrop-blur rounded-2xl px-3 py-1.5 shadow-md text-right">
          <span className="text-lg font-black text-[#FFB74D]">🪙 {score}</span>
          <span className="text-xs font-bold text-gray-400 block -mt-0.5">目標 {TARGET_COINS}</span>
        </div>
      </div>

      {/* Flying coins animation */}
      {flyingCoins.map((coin) => {
        // Bezier curve from coin position to score badge (top-right)
        const t = coin.progress;
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
        const targetX = window.innerWidth - 50;
        const targetY = 24;
        const cpX = (coin.startX + targetX) / 2;
        const cpY = Math.min(coin.startY, targetY) - 80;
        const x = (1 - ease) * (1 - ease) * coin.startX + 2 * (1 - ease) * ease * cpX + ease * ease * targetX;
        const y = (1 - ease) * (1 - ease) * coin.startY + 2 * (1 - ease) * ease * cpY + ease * ease * targetY;
        const scale = 1 - ease * 0.5;
        return (
          <div
            key={coin.id}
            className="fixed z-30 pointer-events-none"
            style={{
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity: 1 - ease * 0.3,
            }}
          >
            <div className="w-8 h-8 rounded-full bg-[#FFD54F] border-2 border-[#F9A825] flex items-center justify-center text-sm font-bold text-[#F9A825] shadow-lg">
              $
            </div>
          </div>
        );
      })}

      {/* Steering wheel */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 select-none cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none" }}
        onPointerDown={onWheelPointerDown}
        onPointerMove={onWheelPointerMove}
        onPointerUp={onWheelPointerUp}
        onPointerCancel={onWheelPointerUp}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          style={{
            transform: `rotate(${wheelAngle}deg)`,
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))",
          }}
        >
          {/* Outer ring */}
          <circle cx="60" cy="60" r="56" fill="#555" stroke="#444" strokeWidth="6" />
          <circle cx="60" cy="60" r="50" fill="none" stroke="#666" strokeWidth="4" />
          {/* Inner hub */}
          <circle cx="60" cy="60" r="20" fill="#444" />
          <circle cx="60" cy="60" r="16" fill="#555" />
          {/* Car icon */}
          <text x="60" y="63" textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="white">
            🏎️
          </text>
          {/* Spokes */}
          <line x1="60" y1="40" x2="60" y2="10" stroke="#444" strokeWidth="6" strokeLinecap="round" />
          <line x1="42" y1="70" x2="16" y2="86" stroke="#444" strokeWidth="6" strokeLinecap="round" />
          <line x1="78" y1="70" x2="104" y2="86" stroke="#444" strokeWidth="6" strokeLinecap="round" />
          {/* Top marker */}
          <circle cx="60" cy="8" r="5" fill="#EF5350" />
        </svg>
      </div>

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="text-[120px] font-black text-white animate-bounce-in" key={countdown}>
            {countdown}
          </div>
        </div>
      )}

      {/* Finished overlay */}
      {phase === "finished" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-celebrate max-w-sm mx-4">
            <div className="text-6xl mb-3">
              {score >= TARGET_COINS ? "🏆" : "🏁"}
            </div>
            <h2 className="text-3xl font-black text-[#FF69B4] mb-1">
              {score >= TARGET_COINS ? "太厲害了！" : "完賽！"}
            </h2>
            <p className="text-lg text-gray-500 mb-1">
              收集了 <span className="font-black text-[#FFB74D]">{score}</span> 個金幣
            </p>
            <p className="text-sm text-gray-400 mb-5">
              {score >= TARGET_COINS
                ? `超過目標 ${TARGET_COINS} 個！好棒！`
                : `目標 ${TARGET_COINS} 個，再加油！`}
            </p>
            <button
              onClick={startCountdown}
              className="px-8 py-4 rounded-2xl bg-[#4FC3F7] text-white font-bold text-xl active:scale-95 transition-transform"
            >
              再玩一次
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
