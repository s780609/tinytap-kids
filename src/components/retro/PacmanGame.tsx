"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { COLS, ROWS } from "@/lib/pacman/maze";
import type { Dir } from "@/lib/pacman/maze";
import { DIFFICULTIES, fruitOf } from "@/lib/pacman/levels";
import type { Difficulty } from "@/lib/pacman/levels";
import { createGame, step } from "@/lib/pacman/sim";
import type { GameEvent, GameState } from "@/lib/pacman/sim";
import { consumeTicks } from "@/lib/tank/sim";
import { DirStack, dirFromPad } from "@/lib/tank/input";
import { mergeHiScore, parseHiScores, type DiffMap } from "@/lib/tank/score";
import NesPad from "./NesPad";
import { FRUIT_EMOJI, createRenderCache, drawGame } from "./pacmanRender";

// ---------- 最高分（localStorage + useSyncExternalStore） ----------

const HI_KEY = "tinytap-pacman-hi";
const HI_FALLBACK: DiffMap = { classic: 0, easy: 0 };

let hiCache: DiffMap | null = null;
const hiListeners = new Set<() => void>();
const hiStore = {
  get(): DiffMap {
    if (hiCache === null) {
      try {
        hiCache = parseHiScores(localStorage.getItem(HI_KEY));
      } catch {
        hiCache = HI_FALLBACK;
      }
    }
    return hiCache;
  },
  server: (): DiffMap => HI_FALLBACK,
  subscribe(cb: () => void) {
    hiListeners.add(cb);
    return () => {
      hiListeners.delete(cb);
    };
  },
  save(next: DiffMap) {
    hiCache = next;
    try {
      localStorage.setItem(HI_KEY, JSON.stringify(next));
    } catch {
      // localStorage 可能無法使用，至少這次遊玩期間還記得
    }
    hiListeners.forEach((l) => l());
  },
};

// ---------- 常數 ----------

type Screen = "select" | "play" | "over";

const DIFF_INFO: Record<Difficulty, { label: string; emoji: string; desc: string }> = {
  classic: { label: "經典", emoji: "🎖️", desc: "3 條命・越後面的關卡鬼越快、變藍的時間越短" },
  easy: { label: "輕鬆", emoji: "🌱", desc: "5 條命・鬼比較慢，吃大力丸後鬼變藍比較久" },
};

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 0,
  KeyW: 0,
  ArrowRight: 1,
  KeyD: 1,
  ArrowDown: 2,
  KeyS: 2,
  ArrowLeft: 3,
  KeyA: 3,
};

const HUD_PORTRAIT = 76;
const HUD_LANDSCAPE = 52;
const SOUND_GAP_MS = 50;
/** 在地圖上滑多遠算一次滑動（px） */
const SWIPE_PX = 24;

interface Hud {
  level: number;
  score: number;
  lives: number;
}
const EMPTY_HUD: Hud = { level: 1, score: 0, lives: 0 };

interface EndInfo {
  diff: Difficulty;
  level: number;
  score: number;
  newRecord: boolean;
}

export default function PacmanGame() {
  const { settings } = useSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [screen, setScreen] = useState<Screen>("select");
  const [paused, setPaused] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("classic");
  const [runDiff, setRunDiff] = useState<Difficulty>("classic");
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [endInfo, setEndInfo] = useState<EndInfo | null>(null);
  const hi = useSyncExternalStore(hiStore.subscribe, hiStore.get, hiStore.server);

  const screenRef = useRef<Screen>("select");
  const pausedRef = useRef(false);
  const gameRef = useRef<GameState | null>(null);
  const cacheRef = useRef(createRenderCache());
  const accRef = useRef(0);
  const hudKeyRef = useRef("");
  const padDirRef = useRef<Dir | null>(null);
  const swipeDirRef = useRef<Dir | null>(null);
  const swipeRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const keysRef = useRef(new DirStack());
  const soundAtRef = useRef<Map<string, number>>(new Map());
  const wakaRef = useRef(false);
  const startingRef = useRef(false);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  // ---------- 小工具 ----------
  const goScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreen(s);
  }, []);

  const clearInput = useCallback(() => {
    keysRef.current.clear();
    padDirRef.current = null;
    swipeDirRef.current = null;
    swipeRef.current = null;
  }, []);

  const setPause = useCallback(
    (p: boolean) => {
      pausedRef.current = p;
      setPaused(p);
      clearInput();
    },
    [clearInput]
  );

  const pushHud = useCallback((g: GameState) => {
    const next: Hud = { level: g.level, score: g.score, lives: g.lives };
    const key = `${next.level}|${next.score}|${next.lives}`;
    if (key === hudKeyRef.current) return;
    hudKeyRef.current = key;
    setHud(next);
  }, []);

  const recordScore = useCallback((diff: Difficulty, score: number): boolean => {
    const prev = hiStore.get();
    if (score <= prev[diff]) return false;
    hiStore.save(mergeHiScore(prev, diff, score));
    return true;
  }, []);

  // ---------- 流程 ----------

  /** 從選單或結束畫面開始（必須在點擊事件裡呼叫，iOS 才會解鎖音訊） */
  const startGame = async (diff: Difficulty) => {
    if (startingRef.current) return;
    startingRef.current = true;
    await audioManager.resume();
    startingRef.current = false;
    const g = createGame(DIFFICULTIES[diff], Date.now());
    gameRef.current = g;
    accRef.current = 0;
    hudKeyRef.current = "";
    pushHud(g);
    setRunDiff(diff);
    setPause(false);
    goScreen("play");
    audioManager.chipJingle("pacStart");
  };

  const toMenu = () => {
    const g = gameRef.current;
    if (g) recordScore(g.cfg.id, g.score);
    gameRef.current = null;
    setPause(false);
    audioManager.pop();
    goScreen("select");
  };

  const onOver = useCallback(
    (g: GameState) => {
      const diff = g.cfg.id;
      const newRecord = recordScore(diff, g.score);
      setEndInfo({ diff, level: g.level, score: g.score, newRecord });
      goScreen("over");
    },
    [recordScore, goScreen]
  );

  const togglePause = useCallback(() => {
    if (screenRef.current !== "play") return;
    const next = !pausedRef.current;
    setPause(next);
    if (next) audioManager.chip("pause");
    else void audioManager.resume();
  }, [setPause]);

  // ---------- 主迴圈、尺寸、鍵盤、背景暫停 ----------
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = root.clientWidth;
      const h = root.clientHeight;
      const landscape = w > h;
      const availW = landscape ? w - 2 * 160 : w - 16;
      const availH = landscape ? h - HUD_LANDSCAPE - 8 : h - HUD_PORTRAIT - 170;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const u = Math.max(6, Math.floor(Math.min(availW / COLS, availH / ROWS) * dpr));
      canvas.style.width = `${(u * COLS) / dpr}px`;
      canvas.style.height = `${(u * ROWS) / dpr}px`;
      if (canvas.width !== u * COLS) {
        canvas.width = u * COLS;
        canvas.height = u * ROWS;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const playSound = (kind: string, play: () => void) => {
      const now = performance.now();
      const lastAt = soundAtRef.current.get(kind) ?? -Infinity;
      if (now - lastAt < SOUND_GAP_MS) return;
      soundAtRef.current.set(kind, now);
      play();
    };

    const soundOf = (ev: GameEvent) => {
      switch (ev.type) {
        case "dot":
          wakaRef.current = !wakaRef.current;
          playSound("waka", () => audioManager.chip(wakaRef.current ? "waka1" : "waka2"));
          break;
        case "power":
          playSound("power", () => audioManager.chip("powerAppear"));
          break;
        case "ghost":
          playSound("ghost", () => audioManager.chip("eatGhost"));
          break;
        case "fruit":
          playSound("fruit", () => audioManager.chip("powerGet"));
          break;
        case "extraLife":
          playSound("life", () => audioManager.chip("life"));
          break;
        case "death":
          playSound("death", () => audioManager.chipJingle("pacDeath"));
          break;
        case "levelClear":
          playSound("clear", () => audioManager.chipJingle("stageClear"));
          break;
        case "gameOver":
          playSound("over", () => audioManager.chipJingle("gameOver"));
          break;
      }
    };

    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const g = gameRef.current;
      if (g && screenRef.current === "play" && !pausedRef.current) {
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
        last = now;
        const { steps, acc } = consumeTicks(accRef.current, dt);
        accRef.current = acc;
        const events: GameEvent[] = [];
        for (let i = 0; i < steps; i++) {
          const dir = padDirRef.current ?? keysRef.current.current() ?? swipeDirRef.current;
          swipeDirRef.current = null;
          step(g, { dir }, events);
          if (g.phase === "over") break;
        }
        events.forEach(soundOf);
        pushHud(g);
        if (g.phase === "over") onOver(g);
      } else {
        last = 0;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (g && canvas && ctx) drawGame(ctx, canvas.width / COLS, g, cacheRef.current);
    };
    raf = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      if (screenRef.current !== "play") return;
      if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        if (!e.repeat) togglePause();
        return;
      }
      if (pausedRef.current) return;
      const d = KEY_DIRS[e.code];
      if (d !== undefined) {
        e.preventDefault();
        keysRef.current.press(d);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const d = KEY_DIRS[e.code];
      if (d !== undefined) keysRef.current.release(d);
    };
    const onBlur = () => clearInput();
    const onVisibility = () => {
      if (document.hidden && screenRef.current === "play" && !pausedRef.current) setPause(true);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pushHud, onOver, togglePause, clearInput, setPause]);

  // ---------- 在地圖上滑動也能轉彎 ----------
  const onSwipeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onSwipeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const sw = swipeRef.current;
    if (!sw || sw.id !== e.pointerId) return;
    const dx = e.clientX - sw.x;
    const dy = e.clientY - sw.y;
    if (Math.hypot(dx, dy) < SWIPE_PX) return;
    swipeDirRef.current = dirFromPad(dx, dy, SWIPE_PX);
    swipeRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onSwipeUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current?.id === e.pointerId) swipeRef.current = null;
  };

  // ---------- 畫面 ----------
  const inGame = screen !== "select";
  const hudHi = Math.max(hi[runDiff], hud.score);
  const fruits = Array.from({ length: Math.min(hud.level, 7) }, (_, i) => fruitOf(hud.level - i)).reverse();

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 select-none overflow-hidden text-white"
      style={{ background: "#0B0B2A", touchAction: "none", WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="pacman-layout h-full w-full">
        {/* HUD */}
        <div className="pacman-hud flex flex-col items-center justify-center gap-1 px-20 font-black" style={{ gridArea: "hud" }}>
          {inGame && (
            <>
              <div className="flex w-full max-w-md items-baseline justify-between gap-2 text-sm leading-none">
                <span className="whitespace-nowrap">第 {hud.level} 關</span>
                <span className="whitespace-nowrap tabular-nums">分數 {hud.score}</span>
                <span className="whitespace-nowrap tabular-nums text-[#FFE082]">最高 {hudHi}</span>
              </div>
              <div className="flex w-full max-w-md items-center justify-between gap-2 text-sm leading-none">
                <span className="flex gap-1" aria-label={`還有 ${Math.max(0, hud.lives - 1)} 條命`}>
                  {Array.from({ length: Math.max(0, Math.min(hud.lives - 1, 6)) }, (_, i) => (
                    <span key={i} className="block h-3 w-3 rounded-full bg-[#FFE600]" />
                  ))}
                </span>
                <span className="whitespace-nowrap" aria-hidden>
                  {fruits.map((f) => FRUIT_EMOJI[f]).join("")}
                </span>
              </div>
            </>
          )}
        </div>

        {/* 地圖：也可以直接在上面滑動 */}
        <div
          className="flex items-center justify-center"
          style={{ gridArea: "map" }}
          onPointerDown={onSwipeDown}
          onPointerMove={onSwipeMove}
          onPointerUp={onSwipeUp}
          onPointerCancel={onSwipeUp}
        >
          <canvas ref={canvasRef} className="block bg-black" aria-label="小精靈迷宮" />
        </div>

        {/* 手把（只有十字鍵） */}
        <NesPad
          onDir={(d) => {
            padDirRef.current = d;
          }}
        />
      </div>

      {/* 暫停鈕 */}
      {screen === "play" && !paused && (
        <button
          type="button"
          onClick={togglePause}
          className="fixed top-4 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-md backdrop-blur active:scale-90 transition-transform"
          aria-label="暫停"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#4A4A4A">
            <rect x="5" y="4" width="5" height="16" rx="1" />
            <rect x="14" y="4" width="5" height="16" rx="1" />
          </svg>
        </button>
      )}

      {/* 選單 */}
      {screen === "select" && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-[#0B0B2A]" style={{ touchAction: "pan-y" }}>
          <div className="mx-auto max-w-xl px-4 pb-10 pt-6">
            <h1 className="pl-16 text-3xl font-black tracking-wider text-[#FFE600] drop-shadow-[0_3px_0_#7a4b00]">
              🟡 小精靈
            </h1>
            <p className="mt-1 pl-16 text-sm font-bold text-white/60">吃光迷宮裡的豆子，小心別被鬼抓到！</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(Object.keys(DIFF_INFO) as Difficulty[]).map((d) => {
                const info = DIFF_INFO[d];
                const on = d === difficulty;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setDifficulty(d);
                      audioManager.pop();
                    }}
                    className={`rounded-2xl p-4 text-left transition-transform active:scale-95 ${
                      on ? "bg-[#3B4BFF] ring-4 ring-[#FFE600]" : "bg-white/10"
                    }`}
                  >
                    <div className="text-2xl font-black">
                      {info.emoji} {info.label}
                    </div>
                    <div className="mt-1 text-sm font-bold text-white/80">{info.desc}</div>
                    <div className="mt-2 text-sm font-black text-[#FFE082] tabular-nums">最高分 {hi[d]}</div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void startGame(difficulty)}
              className="mt-6 w-full rounded-2xl bg-[#FFC400] py-4 text-2xl font-black text-[#3a2a00] shadow-[0_6px_0_#8a6400] active:translate-y-1 active:shadow-[0_2px_0_#8a6400] transition-transform"
            >
              ▶ 開始
            </button>

            <div className="mt-6 rounded-2xl bg-white/5 p-4 text-sm font-bold leading-relaxed text-white/75">
              <div className="mb-1 font-black text-white">玩法</div>
              <div>📱 用十字鍵，或直接在迷宮上滑動來轉彎；可以先按好方向，走到路口會自己轉</div>
              <div>⌨️ 方向鍵或 W A S D 移動，P / Esc 暫停</div>
              <div className="mt-2">
                ⚪ 小豆子 10 分・大力丸 50 分，吃了鬼會變藍，這時候可以吃鬼（200 → 400 → 800 → 1600）
              </div>
              <div>🍒 吃掉一些豆子後鬼屋下面會出現水果，關卡越後面越值錢・一萬分多一條命</div>
              <div>🌀 左右兩邊的隧道相通，鬼走進隧道會變慢</div>
            </div>
          </div>
        </div>
      )}

      {/* 暫停 */}
      {screen === "play" && paused && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/60 backdrop-blur-sm">
          <div className="text-4xl font-black tracking-widest text-[#FFE600]">暫停</div>
          <button
            type="button"
            onClick={togglePause}
            className="rounded-full bg-[#3B4BFF] px-10 py-4 text-2xl font-black shadow-xl active:scale-95 transition-transform"
          >
            ▶ 繼續
          </button>
          <button
            type="button"
            onClick={toMenu}
            className="rounded-full bg-white/15 px-8 py-3 text-lg font-black active:scale-95 transition-transform"
          >
            回選單
          </button>
        </div>
      )}

      {/* 遊戲結束 */}
      {screen === "over" && endInfo && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/75 p-4"
          style={{ touchAction: "pan-y" }}
        >
          <div className="w-full max-w-sm text-center font-black">
            <div className="tank-rise text-5xl tracking-widest text-[#E53935] drop-shadow-[0_3px_0_#4a0000]">遊戲結束</div>
            <div className="mt-4 text-lg text-white/70">
              {DIFF_INFO[endInfo.diff].label}模式・到第 {endInfo.level} 關
            </div>
            <div className="text-4xl tabular-nums">{endInfo.score} 分</div>
            {endInfo.newRecord && <div className="mt-1 text-xl text-[#FFD54F]">新紀錄！🏆</div>}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void startGame(endInfo.diff)}
                className="rounded-2xl bg-[#FFC400] py-3 text-xl text-[#3a2a00] active:scale-95 transition-transform"
              >
                🔁 再玩一次
              </button>
              <button type="button" onClick={toMenu} className="rounded-2xl bg-white/15 py-3 text-lg active:scale-95 transition-transform">
                回選單
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
