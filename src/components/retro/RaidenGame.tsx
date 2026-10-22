"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { H, W } from "@/lib/raiden/constants";
import type { Difficulty, MissileKind, WeaponKind } from "@/lib/raiden/constants";
import { DIFFICULTIES } from "@/lib/raiden/difficulty";
import { STAGES } from "@/lib/raiden/stages";
import { carryOver, consumeTicks, createStage, startCarry, step } from "@/lib/raiden/sim";
import type { Carry, GameEvent, GameState } from "@/lib/raiden/sim";
import { mergeHiScore, mergeProgress, parseHiScores, parseProgress, type DiffMap } from "@/lib/tank/score";
import { drawGame } from "./raidenRender";

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
const hiStore = makeStore("tinytap-raiden-hi", parseHiScores, HI_FALLBACK);
const progressStore = makeStore("tinytap-raiden-progress", parseProgress, PROGRESS_FALLBACK);

// ---------- 常數 ----------

type Screen = "select" | "intro" | "play" | "tally" | "over" | "ending";

const DIFF_INFO: Record<Difficulty, { label: string; emoji: string; desc: string }> = {
  classic: { label: "經典", emoji: "🎖️", desc: "3 條命・死掉武器退回 1 級、飛彈消失，跟以前一樣硬" },
  easy: { label: "輕鬆", emoji: "🌱", desc: "5 條命・敵人子彈比較少比較慢，死掉只掉 2 級、保留飛彈" },
};

const WEAPON_INFO: Record<WeaponKind, { label: string; color: string }> = {
  vulcan: { label: "散彈", color: "#E53935" },
  laser: { label: "雷射", color: "#1E88E5" },
  plasma: { label: "電漿", color: "#AB47BC" },
};

const MISSILE_INFO: Record<MissileKind, string> = { homing: "追蹤", nuclear: "核彈" };

const KEY_X: Record<string, number> = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };
const KEY_Y: Record<string, number> = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 };
const BOMB_KEYS = new Set(["KeyX", "KeyK", "KeyB", "Space"]);

const INTRO_MS = 1800;
const TALLY_AUTO_MS = 5000;
const HUD_H = 56;
/** 直拿時地圖下面留給手指滑動與炸彈鈕的空間 */
const BOTTOM_PORTRAIT = 96;
const SIDE_LANDSCAPE = 110;
const SOUND_GAP_MS = 60;
/** 手指移動 1px，飛機移動幾倍（手指不用滑太遠） */
const DRAG_GAIN = 1.3;

interface Hud {
  stage: number;
  score: number;
  lives: number;
  bombs: number;
  weapon: { kind: WeaponKind; level: number };
  missile: { kind: MissileKind; level: number } | null;
  warn: boolean;
}
const EMPTY_HUD: Hud = { stage: 1, score: 0, lives: 0, bombs: 0, weapon: { kind: "vulcan", level: 1 }, missile: null, warn: false };

interface TallyInfo {
  stage: number;
  name: string;
  score: number;
  medals: number;
  last: boolean;
}

interface EndInfo {
  diff: Difficulty;
  stage: number;
  score: number;
  newRecord: boolean;
}

export default function RaidenGame() {
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
  const [endInfo, setEndInfo] = useState<EndInfo | null>(null);
  const [bombDown, setBombDown] = useState(false);
  const hi = useSyncExternalStore(hiStore.subscribe, hiStore.get, hiStore.server);
  const progress = useSyncExternalStore(progressStore.subscribe, progressStore.get, progressStore.server);

  const screenRef = useRef<Screen>("select");
  const pausedRef = useRef(false);
  const gameRef = useRef<GameState | null>(null);
  const accRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hudKeyRef = useRef("");
  const scaleRef = useRef(1);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const bombReqRef = useRef(false);
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
    dragRef.current = null;
    targetRef.current = null;
    bombReqRef.current = false;
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
    const next: Hud = {
      stage: g.stage,
      score: g.score,
      lives: g.lives,
      bombs: g.bombs,
      weapon: g.weapon,
      missile: g.missile,
      warn: g.warnTicks > 0,
    };
    const key = [next.stage, next.score, next.lives, next.bombs, next.weapon.kind, next.weapon.level, next.missile?.kind, next.missile?.level, next.warn].join("|");
    if (key === hudKeyRef.current) return;
    hudKeyRef.current = key;
    setHud({ ...next, weapon: { ...next.weapon }, missile: next.missile ? { ...next.missile } : null });
  }, []);

  const recordScore = useCallback((diff: Difficulty, score: number): boolean => {
    const prev = hiStore.get();
    if (score <= prev[diff]) return false;
    hiStore.save(mergeHiScore(prev, diff, score));
    return true;
  }, []);

  // ---------- 流程 ----------
  const beginStage = useCallback(
    (diff: Difficulty, index: number, carry: Carry, seed: number) => {
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
    beginStage(diff, stageNo - 1, startCarry(DIFFICULTIES[diff]), Date.now());
  };

  const toMenu = () => {
    clearTimers();
    const g = gameRef.current;
    if (g) recordScore(g.cfg.id, g.score);
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
      setTallyInfo({ stage: g.stage, name: g.def.name, score: g.score, medals: g.medals, last: g.stage >= STAGES.length });
      goScreen("tally");
      audioManager.chipJingle("stageClear");
      later(nextFromTally, TALLY_AUTO_MS);
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
      const availW = landscape ? w - 2 * SIDE_LANDSCAPE : w;
      const availH = h - HUD_H - (landscape ? 4 : BOTTOM_PORTRAIT);
      const scale = Math.max(0.5, Math.min(availW / W, availH / H));
      scaleRef.current = scale;
      canvas.style.width = `${Math.floor(W * scale)}px`;
      canvas.style.height = `${Math.floor(H * scale)}px`;
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
        case "boom":
          if (ev.big) playSound("boomL", () => audioManager.chip("boomL"));
          else playSound("boomS", () => audioManager.chip("boomS"));
          break;
        case "item":
          if (ev.kind === "medal") playSound("medal", () => audioManager.chip("medal"));
          else playSound("item", () => audioManager.chip("powerGet"));
          break;
        case "bomb":
          audioManager.chip("bombBlast");
          break;
        case "playerDie":
          targetRef.current = null;
          playSound("die", () => audioManager.chip("boomL"));
          break;
        case "extraLife":
          playSound("life", () => audioManager.chip("life"));
          break;
        case "warning":
          audioManager.chipJingle("warning");
          break;
        case "gameOver":
          audioManager.chipJingle("gameOver");
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
        const keys = keysRef.current;
        let dx = 0;
        let dy = 0;
        keys.forEach((k) => {
          dx += KEY_X[k] ?? 0;
          dy += KEY_Y[k] ?? 0;
        });
        for (let i = 0; i < steps; i++) {
          const t = targetRef.current;
          step(
            g,
            { tx: t ? t.x : null, ty: t ? t.y : null, dx: Math.sign(dx), dy: Math.sign(dy), bomb: bombReqRef.current },
            events
          );
          bombReqRef.current = false;
          if (g.phase === "cleared" || g.phase === "lost") break;
        }
        events.forEach(soundOf);
        pushHud(g);
        if (g.phase === "cleared") onCleared(g);
        else if (g.phase === "lost") onLost(g);
      } else {
        last = 0;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (g && ctx) drawGame(ctx, g);
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
      if (KEY_X[e.code] !== undefined || KEY_Y[e.code] !== undefined) {
        e.preventDefault();
        keysRef.current.add(e.code);
      } else if (BOMB_KEYS.has(e.code)) {
        e.preventDefault();
        if (!e.repeat) bombReqRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
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

  // ---------- 拖曳移動：畫面任何地方按住拖，飛機跟著手指的位移走 ----------
  const onDragDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (screenRef.current !== "play" || pausedRef.current || dragRef.current) return;
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const g = gameRef.current;
    if (!d || d.id !== e.pointerId || !g) return;
    const k = DRAG_GAIN / scaleRef.current;
    const from = targetRef.current ?? { x: g.player.x, y: g.player.y };
    targetRef.current = {
      x: Math.max(8, Math.min(W - 8, from.x + (e.clientX - d.x) * k)),
      y: Math.max(16, Math.min(H - 10, from.y + (e.clientY - d.y) * k)),
    };
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onDragUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id !== e.pointerId) return;
    dragRef.current = null;
    targetRef.current = null;
  };

  // ---------- 畫面 ----------
  const maxStage = Math.min(STAGES.length, progress[difficulty]);
  const chosenStage = Math.min(pickStage, maxStage);
  const inGame = screen !== "select";
  const hudHi = Math.max(hi[runDiff], hud.score);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 select-none overflow-hidden text-white"
      style={{ background: "#101418", touchAction: "none", WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={onDragDown}
      onPointerMove={onDragMove}
      onPointerUp={onDragUp}
      onPointerCancel={onDragUp}
    >
      <div className="flex h-full w-full flex-col items-center">
        {/* HUD */}
        <div className="flex w-full flex-col items-center justify-center gap-1 px-20 font-black" style={{ height: HUD_H }}>
          {inGame && (
            <>
              <div className="flex w-full max-w-md items-baseline justify-between gap-2 text-sm leading-none">
                <span className="whitespace-nowrap">第 {hud.stage} 關</span>
                <span className="whitespace-nowrap tabular-nums">分數 {hud.score}</span>
                <span className="whitespace-nowrap tabular-nums text-[#FFE082]">最高 {hudHi}</span>
              </div>
              <div className="flex w-full max-w-md items-center justify-between gap-2 text-xs leading-none">
                <span className="whitespace-nowrap" aria-label={`${hud.lives} 條命`}>
                  ✈️ × {hud.lives}
                </span>
                <span className="whitespace-nowrap" aria-label={`${hud.bombs} 顆炸彈`}>
                  💣 × {hud.bombs}
                </span>
                <span className="whitespace-nowrap" style={{ color: WEAPON_INFO[hud.weapon.kind].color }}>
                  ● {WEAPON_INFO[hud.weapon.kind].label} {hud.weapon.level}
                </span>
                <span className="whitespace-nowrap text-white/70">
                  {hud.missile ? `🚀 ${MISSILE_INFO[hud.missile.kind]} ${hud.missile.level}` : "🚀 —"}
                </span>
              </div>
            </>
          )}
        </div>

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block bg-black"
          style={{ imageRendering: "pixelated", outline: "3px solid #2a3038" }}
          aria-label="復古雷電戰場"
        />
        {screen === "play" && (
          <div className="mt-3 text-center text-xs font-bold text-white/40 portrait:block landscape:hidden">
            在畫面任何地方按住拖曳來移動，會自動射擊
          </div>
        )}
      </div>

      {/* 炸彈鈕 */}
      {screen === "play" && !paused && (
        <button
          type="button"
          aria-label="炸彈"
          className={`fixed bottom-5 right-5 z-30 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#4a2600] text-lg font-black shadow-[0_6px_0_#4a2600] transition-transform ${
            bombDown ? "translate-y-1 bg-[#FFB74D] shadow-[0_2px_0_#4a2600]" : "bg-[#FB8C00]"
          } ${hud.bombs === 0 ? "opacity-40" : ""}`}
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            bombReqRef.current = true;
            setBombDown(true);
          }}
          onPointerUp={() => setBombDown(false)}
          onPointerCancel={() => setBombDown(false)}
          onPointerLeave={() => setBombDown(false)}
        >
          💣
        </button>
      )}

      {/* 警告 */}
      {screen === "play" && hud.warn && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center">
          <div className="animate-pulse rounded-xl bg-[#B71C1C]/80 px-6 py-3 text-2xl font-black tracking-widest text-[#FFEB3B]">
            ⚠️ 注意！大魔王接近中
          </div>
        </div>
      )}

      {/* 暫停鈕 */}
      {screen === "play" && !paused && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
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
        <div className="absolute inset-0 z-20 overflow-y-auto bg-[#101418]" style={{ touchAction: "pan-y" }}>
          <div className="mx-auto max-w-xl px-4 pb-10 pt-6">
            <h1 className="pl-16 text-3xl font-black tracking-wider text-[#FF5252] drop-shadow-[0_3px_0_#5a0000]">
              ✈️ 復古雷電
            </h1>
            <p className="mt-1 pl-16 text-sm font-bold text-white/60">駕駛戰機突破三道防線，打倒大魔王！</p>

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
                      on ? "bg-[#C62828] ring-4 ring-[#FFD54F]" : "bg-white/10"
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
                <div className="text-sm font-black text-white/70">從第幾關開始（分數從 0 算起、武器從 1 級開始）</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from({ length: maxStage }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={n === chosenStage}
                      onClick={() => setPickStage(n)}
                      className={`h-11 min-w-11 rounded-xl px-3 text-lg font-black active:scale-90 transition-transform ${
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
              <div>📱 畫面任何地方按住拖曳就能移動（手指不會擋住飛機），一直自動射擊；右下角 💣 放炸彈</div>
              <div>⌨️ 方向鍵或 W A S D 移動，X / K / 空白鍵放炸彈，P / Esc 暫停</div>
              <div className="mt-2 font-black text-white">道具</div>
              <div>
                <span className="text-[#E53935]">●</span> <span className="text-[#1E88E5]">●</span>{" "}
                <span className="text-[#AB47BC]">●</span> 會變色的武器球：紅＝散彈、藍＝雷射、紫＝電漿（自動追著敵人打），同色升級、最多 8 級
              </div>
              <div>🟩 🟨 飛彈：綠＝追蹤飛彈、黃＝核子飛彈，最多 4 級</div>
              <div>🟠 炸彈：全畫面爆炸、消掉敵人子彈・🪙 勳章 500 分</div>
            </div>
          </div>
        </div>
      )}

      {/* 第 N 關 */}
      {screen === "intro" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#101418]">
          <div className="text-5xl font-black tracking-widest text-[#FF5252] animate-bounce-in">第 {introStage} 關</div>
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
            className="rounded-full bg-[#C62828] px-10 py-4 text-2xl font-black shadow-xl active:scale-95 transition-transform"
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

      {/* 過關 */}
      {screen === "tally" && tallyInfo && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm text-center font-black">
            <div className="text-3xl text-[#FFD54F] animate-bounce-in">第 {tallyInfo.stage} 關 完成！</div>
            <div className="mt-1 text-white/70">{tallyInfo.name}</div>
            <div className="mt-5 text-lg">🪙 勳章 × {tallyInfo.medals}</div>
            <div className="mt-1 text-3xl text-[#FFE082] tabular-nums">總分 {tallyInfo.score}</div>
            <button
              type="button"
              onClick={nextFromTally}
              className="mt-6 rounded-full bg-[#C62828] px-8 py-3 text-xl active:scale-95 transition-transform"
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
            <div className="mt-4 text-lg text-white/70">
              {DIFF_INFO[endInfo.diff].label}模式・第 {endInfo.stage} 關
            </div>
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
                className="rounded-2xl bg-[#455A64] py-3 text-xl active:scale-95 transition-transform"
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
        <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[#0D1B2A]/95 p-4" style={{ touchAction: "pan-y" }}>
          <div className="w-full max-w-sm text-center font-black">
            <div className="text-6xl">✈️🏆</div>
            <div className="mt-3 text-4xl tracking-widest text-[#FFD54F] animate-bounce-in">全部過關！</div>
            <div className="mt-2 text-white/70">{DIFF_INFO[endInfo.diff].label}模式 三道防線全部突破</div>
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
