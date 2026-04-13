"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { randomInt, pickRandom } from "@/lib/utils/random";

interface RoadItem {
  id: number;
  type: "coin" | "obstacle";
  lane: number; // 0=left, 1=center, 2=right
  y: number;
}

const LANE_COUNT = 3;
const CAR_SIZE = 50;
const ITEM_SIZE = 40;
const ROAD_SPEED_INITIAL = 3;
const SPAWN_INTERVAL = 60;

let nextItemId = 0;

export default function RacingGame() {
  const { settings } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const gameStateRef = useRef({
    carLane: 1,
    items: [] as RoadItem[],
    roadOffset: 0,
    frameCount: 0,
    speed: ROAD_SPEED_INITIAL,
    score: 0,
    gameOver: false,
    width: 0,
    height: 0,
  });
  const animRef = useRef<number | null>(null);

  // Steering wheel state
  const wheelRef = useRef({
    angle: 0,           // current visual angle in degrees (-90 to 90)
    dragging: false,
    startAngle: 0,      // angle when drag started
    startPointerAngle: 0,
    centerX: 0,
    centerY: 0,
    lastLane: 1,
  });

  const getLaneX = useCallback((lane: number, width: number) => {
    const roadWidth = Math.min(width * 0.8, 300);
    const roadLeft = (width - roadWidth) / 2;
    const laneWidth = roadWidth / LANE_COUNT;
    return roadLeft + laneWidth * lane + laneWidth / 2;
  }, []);

  const initGame = useCallback(() => {
    const gs = gameStateRef.current;
    gs.carLane = 1;
    gs.items = [];
    gs.roadOffset = 0;
    gs.frameCount = 0;
    gs.speed = ROAD_SPEED_INITIAL;
    gs.score = 0;
    gs.gameOver = false;
    setScore(0);
    nextItemId = 0;
    wheelRef.current.angle = 0;
    wheelRef.current.lastLane = 1;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gs = gameStateRef.current;
    const { width, height } = gs;

    // Clear - grass
    ctx.fillStyle = "#81C784";
    ctx.fillRect(0, 0, width, height);

    // Road
    const roadWidth = Math.min(width * 0.8, 300);
    const roadLeft = (width - roadWidth) / 2;

    ctx.fillStyle = "#616161";
    ctx.fillRect(roadLeft, 0, roadWidth, height);

    // Road markings
    ctx.strokeStyle = "#FFD54F";
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    const laneWidth = roadWidth / LANE_COUNT;
    for (let i = 1; i < LANE_COUNT; i++) {
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
      const x = getLaneX(item.lane, width);
      const y = item.y;

      if (item.type === "coin") {
        ctx.fillStyle = "#FFD54F";
        ctx.beginPath();
        ctx.arc(x, y, ITEM_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#F9A825";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#F9A825";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", x, y);
      } else {
        ctx.fillStyle = "#8D6E63";
        const r = ITEM_SIZE / 2;
        ctx.beginPath();
        ctx.moveTo(x - r, y + r * 0.5);
        ctx.lineTo(x - r * 0.6, y - r);
        ctx.lineTo(x + r * 0.3, y - r * 0.8);
        ctx.lineTo(x + r, y - r * 0.2);
        ctx.lineTo(x + r * 0.7, y + r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#5D4037";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Car
    const carX = getLaneX(gs.carLane, width);
    const carY = height - 150;

    ctx.fillStyle = "#EF5350";
    ctx.beginPath();
    ctx.roundRect(carX - CAR_SIZE / 2, carY - CAR_SIZE * 0.6, CAR_SIZE, CAR_SIZE * 1.2, 8);
    ctx.fill();

    ctx.fillStyle = "#C62828";
    ctx.beginPath();
    ctx.roundRect(carX - CAR_SIZE * 0.35, carY - CAR_SIZE * 0.3, CAR_SIZE * 0.7, CAR_SIZE * 0.5, 5);
    ctx.fill();

    ctx.fillStyle = "#90CAF9";
    ctx.beginPath();
    ctx.roundRect(carX - CAR_SIZE * 0.28, carY - CAR_SIZE * 0.25, CAR_SIZE * 0.56, CAR_SIZE * 0.2, 3);
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.fillRect(carX - CAR_SIZE / 2 - 4, carY - CAR_SIZE * 0.4, 8, 16);
    ctx.fillRect(carX + CAR_SIZE / 2 - 4, carY - CAR_SIZE * 0.4, 8, 16);
    ctx.fillRect(carX - CAR_SIZE / 2 - 4, carY + CAR_SIZE * 0.25, 8, 16);
    ctx.fillRect(carX + CAR_SIZE / 2 - 4, carY + CAR_SIZE * 0.25, 8, 16);

    ctx.fillStyle = "#FFD54F";
    ctx.beginPath();
    ctx.arc(carX - CAR_SIZE * 0.3, carY - CAR_SIZE * 0.55, 4, 0, Math.PI * 2);
    ctx.arc(carX + CAR_SIZE * 0.3, carY - CAR_SIZE * 0.55, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [getLaneX]);

  const gameLoop = useCallback(() => {
    const gs = gameStateRef.current;
    if (gs.gameOver) return;

    gs.frameCount++;
    gs.roadOffset += gs.speed;

    // Spawn items
    if (gs.frameCount % SPAWN_INTERVAL === 0) {
      const lane = randomInt(0, LANE_COUNT - 1);
      const type = pickRandom(
        Math.random() < 0.6 ? (["coin"] as const) : (["obstacle"] as const)
      );
      gs.items.push({ id: nextItemId++, type, lane, y: -ITEM_SIZE });
    }

    // Move items
    for (const item of gs.items) {
      item.y += gs.speed;
    }

    // Check collisions
    const carY = gs.height - 150;
    for (let i = gs.items.length - 1; i >= 0; i--) {
      const item = gs.items[i];
      if (
        item.lane === gs.carLane &&
        Math.abs(item.y - carY) < CAR_SIZE * 0.7
      ) {
        if (item.type === "coin") {
          gs.score++;
          setScore(gs.score);
          audioManager.ding();
          gs.items.splice(i, 1);
        } else {
          audioManager.pop();
          gs.items.splice(i, 1);
        }
      }
    }

    // Remove off-screen items
    gs.items = gs.items.filter((item) => item.y < gs.height + ITEM_SIZE);

    // Gradually increase speed
    if (gs.frameCount % 300 === 0 && gs.speed < 7) {
      gs.speed += 0.3;
    }

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  // --- Steering wheel pointer handlers ---
  const getPointerAngle = (clientX: number, clientY: number) => {
    const w = wheelRef.current;
    const dx = clientX - w.centerX;
    const dy = clientY - w.centerY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const updateLaneFromAngle = useCallback((angle: number) => {
    const gs = gameStateRef.current;
    const w = wheelRef.current;
    let newLane: number;
    if (angle < -25) {
      newLane = 0;
    } else if (angle > 25) {
      newLane = 2;
    } else {
      newLane = 1;
    }
    if (newLane !== w.lastLane) {
      w.lastLane = newLane;
      gs.carLane = newLane;
      audioManager.bubble();
    }
  }, []);

  const onWheelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const w = wheelRef.current;
      w.centerX = rect.left + rect.width / 2;
      w.centerY = rect.top + rect.height / 2;
      w.dragging = true;
      w.startPointerAngle = getPointerAngle(e.clientX, e.clientY);
      w.startAngle = w.angle;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const onWheelPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const w = wheelRef.current;
      if (!w.dragging) return;
      const currentPointerAngle = getPointerAngle(e.clientX, e.clientY);
      let delta = currentPointerAngle - w.startPointerAngle;
      // Normalize delta to avoid jumps
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const newAngle = Math.max(-90, Math.min(90, w.startAngle + delta));
      w.angle = newAngle;
      updateLaneFromAngle(newAngle);
      // Force re-render for wheel visual
      setScore((s) => s); // trigger render without changing value
    },
    [updateLaneFromAngle]
  );

  const onWheelPointerUp = useCallback(() => {
    wheelRef.current.dragging = false;
  }, []);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gameStateRef.current.width = canvas.width;
      gameStateRef.current.height = canvas.height;
    };

    resize();
    window.addEventListener("resize", resize);

    initGame();
    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [initGame, gameLoop, settings.volume]);

  const wheelAngle = wheelRef.current.angle;

  return (
    <div className="fixed inset-0" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Score overlay */}
      <div className="fixed top-4 right-4 z-20 bg-white/80 backdrop-blur rounded-2xl px-4 py-2 shadow-md">
        <span className="text-xl font-black text-[#FFB74D]">🪙 {score}</span>
      </div>

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
            transition: wheelRef.current.dragging ? "none" : "transform 0.15s ease-out",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))",
          }}
        >
          {/* Outer ring */}
          <circle cx="60" cy="60" r="56" fill="none" stroke="#4A4A4A" strokeWidth="8" />
          <circle cx="60" cy="60" r="56" fill="none" stroke="#666" strokeWidth="4" />
          {/* Inner hub */}
          <circle cx="60" cy="60" r="20" fill="#4A4A4A" />
          <circle cx="60" cy="60" r="16" fill="#666" />
          {/* Horn icon */}
          <text
            x="60"
            y="63"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="14"
            fill="white"
            fontWeight="bold"
          >
            🏎️
          </text>
          {/* Spokes */}
          <line x1="60" y1="40" x2="60" y2="8" stroke="#4A4A4A" strokeWidth="6" strokeLinecap="round" />
          <line x1="40" y1="72" x2="14" y2="88" stroke="#4A4A4A" strokeWidth="6" strokeLinecap="round" />
          <line x1="80" y1="72" x2="106" y2="88" stroke="#4A4A4A" strokeWidth="6" strokeLinecap="round" />
          {/* Top marker (indicator dot) */}
          <circle cx="60" cy="8" r="5" fill="#EF5350" />
        </svg>
      </div>

      {/* Lane indicator */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-20 flex gap-2 pointer-events-none">
        {[0, 1, 2].map((lane) => (
          <div
            key={lane}
            className={`w-3 h-3 rounded-full transition-all duration-150 ${
              gameStateRef.current.carLane === lane
                ? "bg-[#EF5350] scale-125"
                : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
