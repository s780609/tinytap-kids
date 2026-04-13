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
const SPAWN_INTERVAL = 60; // frames

let nextItemId = 0;

export default function RacingGame() {
  const { settings } = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
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
    setGameOver(false);
    nextItemId = 0;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gs = gameStateRef.current;
    const { width, height } = gs;

    // Clear
    ctx.fillStyle = "#81C784";
    ctx.fillRect(0, 0, width, height);

    // Road
    const roadWidth = Math.min(width * 0.8, 300);
    const roadLeft = (width - roadWidth) / 2;

    ctx.fillStyle = "#616161";
    ctx.fillRect(roadLeft, 0, roadWidth, height);

    // Road markings (dashed center lines)
    ctx.strokeStyle = "#FFD54F";
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    const laneWidth = roadWidth / LANE_COUNT;
    for (let i = 1; i < LANE_COUNT; i++) {
      const x = roadLeft + laneWidth * i;
      ctx.beginPath();
      ctx.moveTo(x, -gs.roadOffset % 35);
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

    // Items (coins and obstacles)
    for (const item of gs.items) {
      const x = getLaneX(item.lane, width);
      const y = item.y;

      if (item.type === "coin") {
        // Gold coin
        ctx.fillStyle = "#FFD54F";
        ctx.beginPath();
        ctx.arc(x, y, ITEM_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#F9A825";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Dollar sign
        ctx.fillStyle = "#F9A825";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", x, y);
      } else {
        // Obstacle (rock)
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
    const carY = height - 120;

    // Car body
    ctx.fillStyle = "#EF5350";
    ctx.beginPath();
    ctx.roundRect(carX - CAR_SIZE / 2, carY - CAR_SIZE * 0.6, CAR_SIZE, CAR_SIZE * 1.2, 8);
    ctx.fill();

    // Car roof
    ctx.fillStyle = "#C62828";
    ctx.beginPath();
    ctx.roundRect(carX - CAR_SIZE * 0.35, carY - CAR_SIZE * 0.3, CAR_SIZE * 0.7, CAR_SIZE * 0.5, 5);
    ctx.fill();

    // Windshield
    ctx.fillStyle = "#90CAF9";
    ctx.beginPath();
    ctx.roundRect(carX - CAR_SIZE * 0.28, carY - CAR_SIZE * 0.25, CAR_SIZE * 0.56, CAR_SIZE * 0.2, 3);
    ctx.fill();

    // Wheels
    ctx.fillStyle = "#333";
    ctx.fillRect(carX - CAR_SIZE / 2 - 4, carY - CAR_SIZE * 0.4, 8, 16);
    ctx.fillRect(carX + CAR_SIZE / 2 - 4, carY - CAR_SIZE * 0.4, 8, 16);
    ctx.fillRect(carX - CAR_SIZE / 2 - 4, carY + CAR_SIZE * 0.25, 8, 16);
    ctx.fillRect(carX + CAR_SIZE / 2 - 4, carY + CAR_SIZE * 0.25, 8, 16);

    // Headlights
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
        Math.random() < 0.6
          ? (["coin"] as const)
          : (["obstacle"] as const)
      );
      gs.items.push({ id: nextItemId++, type, lane, y: -ITEM_SIZE });
    }

    // Move items
    for (const item of gs.items) {
      item.y += gs.speed;
    }

    // Check collisions
    const carY = gs.height - 120;
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
          // Hit obstacle - just bounce and lose nothing (kid-friendly)
          audioManager.pop();
          gs.items.splice(i, 1);
          // Small visual feedback: car wobbles (handled by brief lane shift)
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

  const handleMove = useCallback((direction: "left" | "right") => {
    const gs = gameStateRef.current;
    if (direction === "left" && gs.carLane > 0) {
      gs.carLane--;
      audioManager.bubble();
    } else if (direction === "right" && gs.carLane < LANE_COUNT - 1) {
      gs.carLane++;
      audioManager.bubble();
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const gs = gameStateRef.current;
      if (gs.gameOver) return;

      const x = e.clientX;
      const mid = gs.width / 2;
      handleMove(x < mid ? "left" : "right");
    },
    [handleMove]
  );

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

  return (
    <div className="fixed inset-0" style={{ touchAction: "none" }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
      />

      {/* Score overlay */}
      <div className="fixed top-4 right-4 z-20 bg-white/80 backdrop-blur rounded-2xl px-4 py-2 shadow-md">
        <span className="text-xl font-black text-[#FFB74D]">🪙 {score}</span>
      </div>

      {/* Direction hints */}
      <div className="fixed bottom-8 left-0 right-0 z-20 flex justify-between px-8 pointer-events-none">
        <div className="bg-white/40 backdrop-blur rounded-full w-16 h-16 flex items-center justify-center text-3xl">
          ⬅️
        </div>
        <div className="bg-white/40 backdrop-blur rounded-full w-16 h-16 flex items-center justify-center text-3xl">
          ➡️
        </div>
      </div>
    </div>
  );
}
