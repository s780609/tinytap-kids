"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import type { ChipSfx } from "@/lib/audio/chiptune";
import { useSettings } from "@/lib/settings/SettingsContext";
import type { Difficulty, Dir, EnemyKind, GameEvent, GameState } from "@/lib/tank/constants";
import { DIFFICULTIES } from "@/lib/tank/difficulty";
import { STAGES } from "@/lib/tank/stages";
import { carryOver, consumeTicks, createStage, step, tally } from "@/lib/tank/sim";
import { DirStack } from "@/lib/tank/input";
import {
  HI_KEY,
  PROGRESS_KEY,
  POINTS,
  mergeHiScore,
  mergeProgress,
  parseHiScores,
  parseProgress,
  type DiffMap,
} from "@/lib/tank/score";
import NesPad from "./NesPad";
import { createRenderCache, drawGame, drawTankIcon } from "./tankRender";

// ---------- 最高分 / 最遠關卡（localStorage + useSyncExternalStore） ----------

function makeStore(key: string, parse: (raw: string | null) => DiffMap, fallback: DiffMap) {
  let cache: DiffMap | null = null;
  const listeners = new Set<() => void>();
  return {
    get(): DiffMap {
      if (cache === null) {
        try {
          cache = parse(localStorage.getItem(key));
        } catch {
          cache = fallback;
        }
      }
      return cache;
    },
    server: (): DiffMap => fallback,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    save(next: DiffMap) {
      cache = next;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // localStorage 可能無法使用，至少這次遊玩期間還記得
      }
      listeners.forEach((l) => l());
    },
  };
}

const HI_FALLBACK: DiffMap = { classic: 0, easy: 0 };
const PROGRESS_FALLBACK: DiffMap = { classic: 1, easy: 1 };
const hiStore = makeStore(HI_KEY, parseHiScores, HI_FALLBACK);
const progressStore = makeStore(PROGRESS_KEY, parseProgress, PROGRESS_FALLBACK);

// ---------- 常數 ----------

type Screen = "select" | "intro" | "play" | "tally" | "over" | "ending";

const DIFF_INFO: Record<Difficulty, { label: string; emoji: string; desc: string }> = {
  classic: { label: "經典", emoji: "🎖️", desc: "3 條命・每關 20 台敵車，跟以前一樣難" },
  easy: { label: "輕鬆", emoji: "🌱", desc: "5 條命・每關 10 台、敵車比較慢，開場基地有鋼牆保護" },
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
const FIRE_KEYS = new Set(["Space", "KeyJ"]);

const INTRO_MS = 1600;
const TALLY_ROW_MS = 450;
const TALLY_AUTO_MS = 5000;
const HUD_PORTRAIT = 76;
const HUD_LANDSCAPE = 52;
const SOUND_GAP_MS = 50;

interface Hud {
  stage: number;
  score: number;
  left: number;
  lives: number;
  stars: number;
}
const EMPTY_HUD: Hud = { stage: 1, score: 0, left: 0, lives: 0, stars: 0 };

interface TallyInfo {
  stage: number;
  rows: { kind: EnemyKind; count: number; points: number }[];
  total: number;
  score: number;
  last: boolean;
}

interface EndInfo {
  diff: Difficulty;
  stage: number;
  score: number;
  newRecord: boolean;
}

/** 事件 → 音效種類（敵人開火不播） */
function soundOf(ev: GameEvent): ChipSfx | null {
  switch (ev.type) {
    case "shoot":
      return ev.side === "player" ? "shoot" : null;
    case "brick":
      return "brick";
    case "steel":
      return "steel";
    case "armorHit":
      return "armorHit";
    case "explode":
      return ev.big ? "boomL" : "boomS";
    case "powerAppear":
      return "powerAppear";
    case "powerGet":
      return "powerGet";
    case "extraLife":
      return "life";
    default:
      return null;
  }
}

/** 小坦克圖示（結算表用） */
function TankIcon({ kind, size }: { kind: EnemyKind; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(size * dpr);
    c.width = px;
    c.height = px;
    ctx.imageSmoothingEnabled = false;
    drawTankIcon(ctx, px, kind);
  }, [kind, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />;
}

export default function TankGame() {
  const { settings } = useSettings();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [screen, setScreen] = useState<Screen>("select");
  const [paused, setPaused] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("classic");
  const [runDiff, setRunDiff] = useState<Difficulty>("classic");
  const [pickStage, setPickStage] = useState(1);
  const [introStage, setIntroStage] = useState(1);
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [tallyInfo, setTallyInfo] = useState<TallyInfo | null>(null);
  const [tallyStep, setTallyStep] = useState(0);
  const [endInfo, setEndInfo] = useState<EndInfo | null>(null);
  const hi = useSyncExternalStore(hiStore.subscribe, hiStore.get, hiStore.server);
  const progress = useSyncExternalStore(progressStore.subscribe, progressStore.get, progressStore.server);

  const screenRef = useRef<Screen>("select");
  const pausedRef = useRef(false);
  const gameRef = useRef<GameState | null>(null);
  const cacheRef = useRef(createRenderCache());
  const accRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hudKeyRef = useRef("");
  const padDirRef = useRef<Dir | null>(null);
  const padFireRef = useRef(false);
  const keysRef = useRef(new DirStack());
  const keyFireRef = useRef<Set<string>>(new Set());
  const soundAtRef = useRef<Map<string, number>>(new Map());
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

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  const clearInput = useCallback(() => {
    keysRef.current.clear();
    keyFireRef.current.clear();
    padDirRef.current = null;
    padFireRef.current = false;
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
    const next: Hud = { stage: g.stage, score: g.score, left: g.queue.length, lives: g.lives, stars: g.stars };
    const key = `${next.stage}|${next.score}|${next.left}|${next.lives}|${next.stars}`;
    if (key === hudKeyRef.current) return;
    hudKeyRef.current = key;
    setHud(next);
  }, []);

  const recordScore = useCallback((diff: Difficulty, score: number): boolean => {
    const prev = hiStore.get();
    if (score <= prev[diff]) return false;
    hiStore.save(mergeHiScore(prev, diff, score));
    return score > 0;
  }, []);

  // ---------- 流程 ----------
  const beginStage = useCallback(
    (diff: Difficulty, index: number, carry: ReturnType<typeof carryOver>, seed: number) => {
      clearTimers();
      const g = createStage(DIFFICULTIES[diff], index, carry, seed);
      gameRef.current = g;
      accRef.current = 0;
      hudKeyRef.current = "";
      pushHud(g);
      progressStore.save(mergeProgress(progressStore.get(), diff, index + 1));
      setIntroStage(index + 1);
      setRunDiff(diff);
      setPause(false);
      goScreen("intro");
      audioManager.chipJingle("stageStart");
      later(() => {
        if (screenRef.current !== "intro") return;
        if (document.hidden) setPause(true);
        goScreen("play");
      }, INTRO_MS);
    },
    [clearTimers, pushHud, setPause, goScreen, later]
  );

  /** 從選單或結束畫面開始（必須在點擊事件裡呼叫，iOS 才會解鎖音訊） */
  const startGame = async (diff: Difficulty, stageNo: number) => {
    if (startingRef.current) return;
    startingRef.current = true;
    await audioManager.resume();
    startingRef.current = false;
    const cfg = DIFFICULTIES[diff];
    beginStage(diff, stageNo - 1, { score: 0, lives: cfg.lives, stars: 0, nextLifeIdx: 0 }, Date.now());
  };

  const toMenu = () => {
    clearTimers();
    gameRef.current = null;
    setPause(false);
    audioManager.pop();
    goScreen("select");
  };

  const nextFromTally = useCallback(() => {
    clearTimers();
    const g = gameRef.current;
    if (!g) return;
    const diff = g.cfg.id;
    if (g.stage >= STAGES.length) {
      const newRecord = recordScore(diff, g.score);
      setEndInfo({ diff, stage: g.stage, score: g.score, newRecord });
      goScreen("ending");
      audioManager.chipJingle("stageClear");
      return;
    }
    beginStage(diff, g.stage, carryOver(g), g.seed);
  }, [clearTimers, recordScore, goScreen, beginStage]);

  const onCleared = useCallback(
    (g: GameState) => {
      const t = tally(g);
      setTallyInfo({ stage: g.stage, rows: t.rows, total: t.total, score: g.score, last: g.stage >= STAGES.length });
      setTallyStep(0);
      goScreen("tally");
      for (let i = 1; i <= t.rows.length + 1; i++) {
        later(() => {
          setTallyStep(i);
          audioManager.chip(i <= t.rows.length ? "steel" : "powerGet");
        }, i * TALLY_ROW_MS);
      }
      later(nextFromTally, (t.rows.length + 1) * TALLY_ROW_MS + TALLY_AUTO_MS);
    },
    [goScreen, later, nextFromTally]
  );

  const onLost = useCallback(
    (g: GameState) => {
      const diff = g.cfg.id;
      const newRecord = recordScore(diff, g.score);
      setEndInfo({ diff, stage: g.stage, score: g.score, newRecord });
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
      const s = Math.max(
        120,
        Math.floor(landscape ? Math.min(h - HUD_LANDSCAPE - 8, w - 2 * 150) : Math.min(w - 16, h - HUD_PORTRAIT - 170))
      );
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${s}px`;
      canvas.style.height = `${s}px`;
      const px = Math.round(s * dpr);
      if (canvas.width !== px) {
        canvas.width = px;
        canvas.height = px;
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
        const input = {
          dir: padDirRef.current ?? keysRef.current.current(),
          fire: padFireRef.current || keyFireRef.current.size > 0,
        };
        for (let i = 0; i < steps; i++) {
          step(g, input, events);
          if (g.phase === "cleared" || g.phase === "lost") break;
        }
        for (const ev of events) {
          const sfx = soundOf(ev);
          if (sfx) playSound(sfx, () => audioManager.chip(sfx));
          else if (ev.type === "gameOver") playSound("gameOver", () => audioManager.chipJingle("gameOver"));
          else if (ev.type === "stageClear") playSound("stageClear", () => audioManager.chipJingle("stageClear"));
        }
        pushHud(g);
        if (g.phase === "cleared") onCleared(g);
        else if (g.phase === "lost") onLost(g);
      } else {
        last = 0;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (g && canvas && ctx) drawGame(ctx, canvas.width, g, cacheRef.current);
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
      } else if (FIRE_KEYS.has(e.code)) {
        e.preventDefault();
        keyFireRef.current.add(e.code);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const d = KEY_DIRS[e.code];
      if (d !== undefined) keysRef.current.release(d);
      else if (FIRE_KEYS.has(e.code)) keyFireRef.current.delete(e.code);
    };
    const onBlur = () => clearInput();
    const onVisibility = () => {
      if (document.hidden && screenRef.current === "play" && !pausedRef.current) setPause(true);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    const timers = timersRef;
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [pushHud, onCleared, onLost, togglePause, clearInput, setPause]);

  // ---------- 畫面 ----------
  const maxStage = Math.min(STAGES.length, progress[difficulty]);
  const chosenStage = Math.min(pickStage, maxStage);
  const inGame = screen !== "select";
  const hudHi = Math.max(hi[runDiff], hud.score);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 select-none overflow-hidden text-white"
      style={{ background: "#5F5F5F", touchAction: "none", WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="tank-layout h-full w-full">
        {/* HUD */}
        <div className="tank-hud flex flex-col items-center justify-center gap-1 px-20 font-black" style={{ gridArea: "hud" }}>
          {inGame && (
            <>
              <div className="flex w-full max-w-md items-baseline justify-between gap-2 text-sm leading-none">
                <span className="whitespace-nowrap">🚩 第 {hud.stage} 關</span>
                <span className="whitespace-nowrap tabular-nums">分數 {hud.score}</span>
                <span className="whitespace-nowrap tabular-nums text-[#FFE082]">最高 {hudHi}</span>
              </div>
              <div className="flex w-full max-w-md items-center justify-between gap-2 text-sm leading-none">
                <div className="grid grid-cols-10 gap-[2px]" aria-label={`剩下 ${hud.left} 台敵車`}>
                  {Array.from({ length: 20 }, (_, i) => (
                    <span
                      key={i}
                      className={`block h-[7px] w-[7px] rounded-[1px] ${i < hud.left ? "bg-[#1b1b1b]" : "bg-transparent"}`}
                    />
                  ))}
                </div>
                <span className="whitespace-nowrap" aria-label={`${hud.lives} 條命`}>
                  🛡️ × {hud.lives}
                </span>
                <span className="whitespace-nowrap text-[#FFD54F]" aria-label={`${hud.stars} 顆星`}>
                  {"★".repeat(hud.stars)}
                  <span className="text-white/30">{"★".repeat(3 - hud.stars)}</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* 地圖 */}
        <div className="flex items-center justify-center" style={{ gridArea: "map" }}>
          <canvas
            ref={canvasRef}
            className="block bg-black"
            style={{ imageRendering: "pixelated", outline: "4px solid #3d3d3d" }}
            aria-label="坦克大戰地圖"
          />
        </div>

        {/* 手把 */}
        <NesPad
          onDir={(d) => {
            padDirRef.current = d;
          }}
          onFire={(down) => {
            padFireRef.current = down;
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
        <div className="absolute inset-0 z-20 overflow-y-auto bg-[#2b2b2b]" style={{ touchAction: "pan-y" }}>
          <div className="mx-auto max-w-xl px-4 pb-10 pt-6">
            <h1 className="pl-16 text-3xl font-black tracking-wider text-[#FFD54F] drop-shadow-[0_3px_0_#7a4b00]">
              🧱 坦克大戰
            </h1>
            <p className="mt-1 pl-16 text-sm font-bold text-white/60">守住老鷹基地，打倒所有敵方坦克！</p>

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
                      on ? "bg-[#5C6BC0] ring-4 ring-[#FFD54F]" : "bg-white/10"
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

            {maxStage > 1 && (
              <div className="mt-5">
                <div className="text-sm font-black text-white/70">從第幾關開始（分數從 0 算起）</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from({ length: maxStage }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={n === chosenStage}
                      onClick={() => setPickStage(n)}
                      className={`h-11 w-11 rounded-xl text-lg font-black active:scale-90 transition-transform ${
                        n === chosenStage ? "bg-[#FFD54F] text-[#3a2a00]" : "bg-white/10 text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => void startGame(difficulty, chosenStage)}
              className="mt-6 w-full rounded-2xl bg-[#D32F2F] py-4 text-2xl font-black shadow-[0_6px_0_#7f1414] active:translate-y-1 active:shadow-[0_2px_0_#7f1414] transition-transform"
            >
              ▶ 開始第 {chosenStage} 關
            </button>

            <div className="mt-6 rounded-2xl bg-white/5 p-4 text-sm font-bold leading-relaxed text-white/75">
              <div className="mb-1 font-black text-white">操作方式</div>
              <div>📱 左邊十字鍵移動、右邊紅色按鈕發射（按住會連發）</div>
              <div>⌨️ 方向鍵或 W A S D 移動，空白鍵或 J 發射，P / Esc 暫停</div>
              <div className="mt-2">⭐ 星星升級子彈・⛑️ 護盾・⏰ 敵人定住・⛏️ 基地變鋼牆・💣 全部爆炸・🛡️ 多一條命</div>
            </div>
          </div>
        </div>
      )}

      {/* 第 N 關 */}
      {screen === "intro" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#5F5F5F]">
          <div className="text-5xl font-black tracking-widest text-[#1b1b1b] animate-bounce-in">第 {introStage} 關</div>
          <div className="mt-3 text-xl font-black text-white/80">{STAGES[introStage - 1]?.name}</div>
        </div>
      )}

      {/* 暫停 */}
      {screen === "play" && paused && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/60 backdrop-blur-sm">
          <div className="text-4xl font-black tracking-widest text-[#FFD54F]">暫停</div>
          <button
            type="button"
            onClick={togglePause}
            className="rounded-full bg-[#5C6BC0] px-10 py-4 text-2xl font-black shadow-xl active:scale-95 transition-transform"
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

      {/* 結算 */}
      {screen === "tally" && tallyInfo && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-sm text-center font-black">
            <div className="text-2xl text-[#FFD54F]">第 {tallyInfo.stage} 關 過關！</div>
            <div className="mt-4 flex flex-col gap-2">
              {tallyInfo.rows.map((r, i) => (
                <div
                  key={r.kind}
                  className={`flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 text-lg tabular-nums transition-opacity ${
                    tallyStep > i ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <TankIcon kind={r.kind} size={28} />
                  <span className="text-white/70">× {r.count}</span>
                  <span className="w-20 text-right">{r.points}</span>
                  <span className="w-12 text-right text-xs text-white/40">{POINTS[r.kind]}/台</span>
                </div>
              ))}
            </div>
            <div className={`mt-4 transition-opacity ${tallyStep > tallyInfo.rows.length ? "opacity-100" : "opacity-0"}`}>
              <div className="text-lg">本關 {tallyInfo.total} 分</div>
              <div className="mt-1 text-3xl text-[#FFE082] tabular-nums">總分 {tallyInfo.score}</div>
            </div>
            <button
              type="button"
              onClick={nextFromTally}
              className="mt-6 rounded-full bg-[#5C6BC0] px-8 py-3 text-xl active:scale-95 transition-transform"
            >
              {tallyInfo.last ? "看結局 ▶" : "下一關 ▶"}
            </button>
          </div>
        </div>
      )}

      {/* 遊戲結束 */}
      {screen === "over" && endInfo && (
        <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-black/75 p-4" style={{ touchAction: "pan-y" }}>
          <div className="w-full max-w-sm text-center font-black">
            <div className="tank-rise text-5xl tracking-widest text-[#E53935] drop-shadow-[0_3px_0_#4a0000]">遊戲結束</div>
            <div className="mt-4 text-lg text-white/70">第 {endInfo.stage} 關</div>
            <div className="text-4xl tabular-nums">{endInfo.score} 分</div>
            {endInfo.newRecord && <div className="mt-1 text-xl text-[#FFD54F]">新紀錄！🏆</div>}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void startGame(endInfo.diff, endInfo.stage)}
                className="rounded-2xl bg-[#D32F2F] py-3 text-xl active:scale-95 transition-transform"
              >
                🔁 從這關重來（分數歸零）
              </button>
              <button
                type="button"
                onClick={() => void startGame(endInfo.diff, 1)}
                className="rounded-2xl bg-[#5C6BC0] py-3 text-xl active:scale-95 transition-transform"
              >
                從第 1 關
              </button>
              <button type="button" onClick={toMenu} className="rounded-2xl bg-white/15 py-3 text-lg active:scale-95 transition-transform">
                回選單
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全部過關 */}
      {screen === "ending" && endInfo && (
        <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[#1a237e]/90 p-4" style={{ touchAction: "pan-y" }}>
          <div className="w-full max-w-sm text-center font-black">
            <div className="text-6xl">🦅🏆</div>
            <div className="mt-3 text-4xl tracking-widest text-[#FFD54F] animate-bounce-in">全部過關！</div>
            <div className="mt-2 text-white/70">{DIFF_INFO[endInfo.diff].label}模式 10 關都守住了</div>
            <div className="mt-4 text-4xl tabular-nums">{endInfo.score} 分</div>
            <div className="text-base text-[#FFE082] tabular-nums">最高分 {hi[endInfo.diff]}</div>
            {endInfo.newRecord && <div className="mt-1 text-xl text-[#FFD54F]">新紀錄！</div>}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void startGame(endInfo.diff, 1)}
                className="rounded-2xl bg-[#D32F2F] py-3 text-xl active:scale-95 transition-transform"
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
