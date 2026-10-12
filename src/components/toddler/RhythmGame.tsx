"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { SONGS, type Song } from "@/lib/rhythm/songs";
import {
  DIFFICULTIES,
  LANE_COUNT,
  buildChart,
  type Chart,
  type Difficulty,
} from "@/lib/rhythm/chart";
import {
  advance,
  createPlayState,
  isBetterResult,
  isSongOver,
  pressLane,
  rankFor,
  releaseLane,
  summarize,
  windowsFor,
  type Judgement,
  type PlayEvent,
  type PlayState,
  type SongResult,
  type Windows,
} from "@/lib/rhythm/judge";
import {
  beatPhase,
  countdownLabel,
  isNoteVisible,
  laneAt,
  noteY,
  songProgress,
  songTimeAt,
  takeDue,
} from "@/lib/rhythm/playfield";

// ---------- 常數 ----------

/** 預先排程的提前量（秒） */
const LOOKAHEAD = 0.3;
/** 開始時給 AudioContext 的緩衝（秒） */
const START_DELAY = 0.2;
/** 手動校正音訊延遲（秒），正值 = 判定往後挪 */
const AUDIO_OFFSET = 0;
/** 音符過線後還畫多久（秒） */
const PAST_SEC = 0.35;
const TEXT_LIFE = 0.5;
const GRAVITY = 1800;

const LANES = [
  { animal: "🐧", inst: "🥁", color: "#4FC3F7", name: "企鵝" },
  { animal: "🐱", inst: "🎹", color: "#F48FB1", name: "貓咪" },
  { animal: "🐶", inst: "🎺", color: "#FFB74D", name: "狗狗" },
];

const JUDGE_TEXT: Record<Judgement, { text: string; color: string }> = {
  perfect: { text: "超棒！", color: "#FFE082" },
  good: { text: "不錯！", color: "#C5E1A5" },
  miss: { text: "差一點", color: "#B0BEC5" },
};

const KEY_LANES: Record<string, number> = {
  KeyA: 0,
  KeyS: 1,
  KeyD: 2,
  ArrowLeft: 0,
  ArrowDown: 1,
  ArrowRight: 2,
};

const FONT = "system-ui, -apple-system, 'PingFang TC', 'Noto Sans TC', sans-serif";

// ---------- 最佳紀錄（localStorage） ----------

const BEST_KEY = "tinytap-rhythm-best";
type BestMap = Record<string, SongResult>;
const EMPTY_BEST: BestMap = {};
let bestCache: BestMap | null = null;
const bestListeners = new Set<() => void>();

function loadBest(): BestMap {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as BestMap) : {};
  } catch {
    return {};
  }
}

function getBestSnapshot(): BestMap {
  if (bestCache === null) bestCache = loadBest();
  return bestCache;
}

function subscribeBest(cb: () => void) {
  bestListeners.add(cb);
  return () => {
    bestListeners.delete(cb);
  };
}

function saveBest(next: BestMap) {
  bestCache = next;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(next));
  } catch {
    // localStorage 可能已滿或無法使用，至少這次遊玩期間還記得
  }
  bestListeners.forEach((l) => l());
}

const bestKey = (songId: string, d: Difficulty) => `${songId}:${d}`;

// ---------- 型別 ----------

type Screen = "select" | "play" | "result";

interface Geometry {
  w: number;
  h: number;
  dpr: number;
  stageH: number;
  lanesLeft: number;
  lanesW: number;
  laneW: number;
  lineY: number;
  btnY: number;
  btnR: number;
  animalY: number;
  animalSize: number;
  stars: { x: number; y: number; r: number; ph: number }[];
}

interface Run {
  song: Song;
  difficulty: Difficulty;
  chart: Chart;
  approach: number;
  windows: Windows;
  state: PlayState;
  startCtx: number;
  bus: GainNode | null;
  toneIdx: number;
  clickIdx: number;
  songTime: number;
  paused: boolean;
  finished: boolean;
}

interface AnimalFx {
  y: number;
  vy: number;
  shake: number;
}

interface Fx {
  time: number;
  animals: AnimalFx[];
  texts: ({ j: Judgement; age: number } | null)[];
  laneFlash: number[];
  rings: { lane: number; age: number; perfect: boolean }[];
  particles: { emoji: string; x: number; y: number; vx: number; vy: number; age: number; life: number; size: number }[];
  banner: { text: string; age: number } | null;
}

interface ResultInfo {
  song: Song;
  difficulty: Difficulty;
  res: SongResult;
  newBest: boolean;
}

const newFx = (): Fx => ({
  time: 0,
  animals: LANES.map(() => ({ y: 0, vy: 0, shake: 0 })),
  texts: LANES.map(() => null),
  laneFlash: LANES.map(() => 0),
  rings: [],
  particles: [],
  banner: null,
});

const jump = (a: AnimalFx, height: number) => {
  a.vy = Math.min(a.vy, -Math.sqrt(2 * GRAVITY * height));
};

/** 事件時間戳（performance 時基）→ 歌曲時間 */
function songTimeOf(run: Run, stamp: number): number {
  const now = performance.now();
  const perf = stamp > 0 && Math.abs(stamp - now) < 1000 ? stamp : now;
  const anchor = audioManager.clockAnchor();
  if (!anchor) return run.songTime;
  return songTimeAt(perf, anchor, run.startCtx) - AUDIO_OFFSET;
}

/** 這一軌還有沒有手指或按鍵按著 */
function laneHeld(lane: number, pointers: Map<number, number>, keys: Map<string, number>): boolean {
  for (const l of pointers.values()) if (l === lane) return true;
  for (const l of keys.values()) if (l === lane) return true;
  return false;
}

export default function RhythmGame() {
  const { settings } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [screen, setScreen] = useState<Screen>("select");
  const [paused, setPaused] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [result, setResult] = useState<ResultInfo | null>(null);
  const best = useSyncExternalStore(subscribeBest, getBestSnapshot, () => EMPTY_BEST);

  const screenRef = useRef<Screen>("select");
  const geomRef = useRef<Geometry | null>(null);
  const runRef = useRef<Run | null>(null);
  const fxRef = useRef<Fx>(newFx());
  const lanePointersRef = useRef<Map<number, number>>(new Map());
  const keyLanesRef = useRef<Map<string, number>>(new Map());
  const selfSuspendedRef = useRef(false);
  const startingRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animRef = useRef<number | null>(null);

  const goScreen = useCallback((s: Screen) => {
    screenRef.current = s;
    setScreen(s);
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
    const stageH = Math.max(200, h * 0.34);
    const lanesW = Math.min(w, 600);
    const laneW = lanesW / LANE_COUNT;
    const stars: Geometry["stars"] = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: (((i * 97) % 100) / 100) * w,
        y: (((i * 61) % 100) / 100) * (stageH - 70),
        r: 0.8 + ((i * 13) % 5) * 0.35,
        ph: i * 1.7,
      });
    }
    geomRef.current = {
      w,
      h,
      dpr,
      stageH,
      lanesLeft: (w - lanesW) / 2,
      lanesW,
      laneW,
      lineY: h - 110,
      btnY: h - 52,
      btnR: Math.min(40, laneW * 0.36),
      animalY: stageH - 46,
      animalSize: Math.min(64, laneW * 0.5, stageH * 0.3),
      stars,
    };
  }, []);

  // ---------- 判定事件 → 動畫與音效 ----------
  const applyEvent = useCallback((ev: PlayEvent) => {
    const fx = fxRef.current;
    const g = geomRef.current;
    const a = fx.animals[ev.lane];
    fx.texts[ev.lane] = { j: ev.judgement, age: 0 };
    const ax = g ? g.lanesLeft + g.laneW * (ev.lane + 0.5) : 0;
    const ay = g ? g.animalY : 0;
    if (ev.judgement === "miss") {
      a.shake = 0.45;
      if (g) {
        fx.particles.push({ emoji: "💦", x: ax + 26, y: ay - 30, vx: 40, vy: -120, age: 0, life: 0.7, size: 22 });
      }
      return;
    }
    audioManager.tick();
    const perfect = ev.judgement === "perfect";
    jump(a, perfect ? 34 : 14);
    fx.laneFlash[ev.lane] = 1;
    fx.rings.push({ lane: ev.lane, age: 0, perfect });
    if (perfect && g) {
      for (let i = 0; i < 3; i++) {
        fx.particles.push({
          emoji: "✨",
          x: ax + (Math.random() - 0.5) * 40,
          y: ay - 30,
          vx: (Math.random() - 0.5) * 160,
          vy: -160 - Math.random() * 120,
          age: 0,
          life: 0.7,
          size: 18 + Math.random() * 8,
        });
      }
    }
    if (ev.combo >= 10 && ev.combo % 10 === 0) {
      fx.banner = { text: `${ev.combo} COMBO!`, age: 0 };
      fx.animals.forEach((an) => jump(an, 44));
      audioManager.chime();
    }
  }, []);

  const pressInput = useCallback(
    (lane: number, stamp: number) => {
      const run = runRef.current;
      if (!run || run.paused || run.finished) return;
      fxRef.current.laneFlash[lane] = Math.max(fxRef.current.laneFlash[lane], 0.5);
      const ev = pressLane(run.state, lane, songTimeOf(run, stamp), run.windows);
      if (ev) applyEvent(ev);
    },
    [applyEvent]
  );

  const releaseInput = useCallback(
    (lane: number, stamp: number) => {
      const run = runRef.current;
      if (!run || run.paused || run.finished) return;
      if (laneHeld(lane, lanePointersRef.current, keyLanesRef.current)) return; // 同軌還有其他手指按著
      const ev = releaseLane(run.state, lane, songTimeOf(run, stamp), run.windows);
      if (ev) applyEvent(ev);
    },
    [applyEvent]
  );

  // ---------- 暫停 / 結束 ----------
  const pauseRun = useCallback(() => {
    const run = runRef.current;
    if (!run || run.paused || run.finished) return;
    // 正在長按的直接判完成
    run.state.holdingByLane.forEach((id, lane) => {
      if (id == null) return;
      const ns = run.state.notes.find((n) => n.note.id === id);
      const ev = releaseLane(run.state, lane, ns ? ns.note.endTime : run.songTime, run.windows);
      if (ev) applyEvent(ev);
    });
    lanePointersRef.current.clear();
    keyLanesRef.current.clear();
    run.paused = true;
    selfSuspendedRef.current = true;
    audioManager.suspend();
    setPaused(true);
  }, [applyEvent]);

  const finishRun = useCallback(
    (run: Run) => {
      run.finished = true;
      run.bus?.disconnect();
      run.bus = null;
      lanePointersRef.current.clear();
      keyLanesRef.current.clear();
      const res = summarize(run.state);
      const key = bestKey(run.song.id, run.difficulty);
      const prev = getBestSnapshot();
      const newBest = isBetterResult(prev[key], res);
      if (newBest) saveBest({ ...prev, [key]: res });
      audioManager.success();
      timersRef.current.forEach(clearTimeout);
      timersRef.current = Array.from({ length: res.stars }, (_, i) =>
        setTimeout(() => audioManager.ding(), 550 + i * 350)
      );
      setResult({ song: run.song, difficulty: run.difficulty, res, newBest });
      goScreen("result");
    },
    [goScreen]
  );

  // ---------- 開始一首歌（必須在使用者手勢裡呼叫，iOS 才會解鎖音訊） ----------
  const startSong = async (song: Song, diff: Difficulty) => {
    if (startingRef.current) return;
    startingRef.current = true;
    const actx = await audioManager.resume();
    startingRef.current = false;
    if (!actx) return;

    const old = runRef.current;
    if (old) old.bus?.disconnect();
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const chart = buildChart(song, diff);
    const cfg = DIFFICULTIES[diff];
    selfSuspendedRef.current = false;
    lanePointersRef.current.clear();
    keyLanesRef.current.clear();
    fxRef.current = newFx();
    runRef.current = {
      song,
      difficulty: diff,
      chart,
      approach: cfg.approachTime,
      windows: windowsFor(cfg.windowScale),
      state: createPlayState(chart),
      startCtx: actx.currentTime + START_DELAY,
      bus: audioManager.createMusicBus(),
      toneIdx: 0,
      clickIdx: 0,
      songTime: -START_DELAY,
      paused: false,
      finished: false,
    };
    setPaused(false);
    goScreen("play");
  };

  const resumeRun = async () => {
    const run = runRef.current;
    if (!run) return;
    await audioManager.resume();
    selfSuspendedRef.current = false;
    run.paused = false;
    setPaused(false);
  };

  // ---------- 主迴圈 ----------
  useEffect(() => {
    handleResize();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(wrapper);

    const laneX = (g: Geometry, lane: number) => g.lanesLeft + g.laneW * (lane + 0.5);

    const update = (dt: number) => {
      const fx = fxRef.current;
      fx.time += dt;
      for (const a of fx.animals) {
        a.vy += GRAVITY * dt;
        a.y += a.vy * dt;
        if (a.y > 0) {
          a.y = 0;
          a.vy = 0;
        }
        a.shake = Math.max(0, a.shake - dt);
      }
      fx.texts = fx.texts.map((t) => (t && t.age + dt < TEXT_LIFE ? { j: t.j, age: t.age + dt } : null));
      fx.laneFlash = fx.laneFlash.map((f) => Math.max(0, f - dt * 4));
      fx.rings = fx.rings.filter((r) => (r.age += dt) < 0.35);
      fx.particles = fx.particles.filter((p) => {
        p.age += dt;
        p.vy += 400 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.age < p.life;
      });
      if (fx.banner) {
        fx.banner.age += dt;
        if (fx.banner.age > 1.1) fx.banner = null;
      }

      const run = runRef.current;
      if (!run || run.paused || run.finished) return;
      const actx = audioManager.context;
      if (!actx) return;
      // 系統把音訊停掉（例如 iOS 來電）也當作暫停
      if (actx.state !== "running") {
        pauseRun();
        return;
      }
      const anchor = audioManager.clockAnchor();
      if (!anchor) return;
      const t = songTimeAt(performance.now(), anchor, run.startCtx) - AUDIO_OFFSET;
      run.songTime = Math.max(run.songTime, t);

      // 預先排程：AudioContext 時間 300ms 內要響的音
      if (run.bus) {
        const horizon = actx.currentTime - run.startCtx + LOOKAHEAD;
        const { tones, clicks } = run.chart;
        const ti = takeDue(tones, run.toneIdx, horizon);
        for (let i = run.toneIdx; i < ti; i++) {
          audioManager.scheduleNote(run.bus, tones[i].freq, run.startCtx + tones[i].time, tones[i].duration);
        }
        run.toneIdx = ti;
        const ci = takeDue(clicks, run.clickIdx, horizon);
        for (let i = run.clickIdx; i < ci; i++) {
          const c = clicks[i];
          const when = run.startCtx + c.time;
          if (c.kind === "kick" || c.kind === "hat") audioManager.scheduleBeat(run.bus, when, c.kind);
          else audioManager.scheduleCount(run.bus, when, c.kind === "countGo");
        }
        run.clickIdx = ci;
      }

      for (const ev of advance(run.state, run.songTime, run.windows)) applyEvent(ev);
      if (isSongOver(run.state, run.songTime, run.chart)) finishRun(run);
    };

    const drawEmoji = (
      ctx: CanvasRenderingContext2D,
      emoji: string,
      x: number,
      y: number,
      size: number,
      rot = 0
    ) => {
      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      ctx.fillStyle = "#000";
      ctx.font = `${size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
    };

    const starPath = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.48;
        const px = x + Math.cos(ang) * rr;
        const py = y + Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const drawStage = (ctx: CanvasRenderingContext2D, g: Geometry, time: number) => {
      const { w, stageH } = g;
      const sky = ctx.createLinearGradient(0, 0, 0, stageH);
      sky.addColorStop(0, "#0D0B2E");
      sky.addColorStop(1, "#3B2A7A");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, stageH);

      for (const s of g.stars) {
        ctx.globalAlpha = 0.45 + 0.4 * Math.sin(time * 2 + s.ph);
        ctx.fillStyle = "#FFFDE7";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 月亮
      ctx.fillStyle = "#FFF59D";
      ctx.beginPath();
      ctx.arc(w - 60, 92, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1C1650";
      ctx.beginPath();
      ctx.arc(w - 52, 86, 18, 0, Math.PI * 2);
      ctx.fill();

      // 聚光燈
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        const x = laneX(g, lane);
        const grad = ctx.createLinearGradient(0, 40, 0, stageH);
        grad.addColorStop(0, "rgba(255,255,220,0)");
        grad.addColorStop(1, "rgba(255,255,220,0.18)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - 8, 40);
        ctx.lineTo(x + 8, 40);
        ctx.lineTo(x + g.laneW * 0.42, stageH - 14);
        ctx.lineTo(x - g.laneW * 0.42, stageH - 14);
        ctx.closePath();
        ctx.fill();
      }

      // 舞台地板
      const floor = ctx.createLinearGradient(0, stageH - 22, 0, stageH);
      floor.addColorStop(0, "#A1887F");
      floor.addColorStop(1, "#5D4037");
      ctx.fillStyle = floor;
      ctx.fillRect(0, stageH - 22, w, 22);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(0, stageH - 22, w, 2);

      // 兩側布幕
      ctx.fillStyle = "#C62828";
      for (const side of [0, 1]) {
        ctx.beginPath();
        const x0 = side === 0 ? 0 : w;
        const dir = side === 0 ? 1 : -1;
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 + dir * 46, 0);
        ctx.quadraticCurveTo(x0 + dir * 18, stageH * 0.5, x0 + dir * 30, stageH - 22);
        ctx.lineTo(x0, stageH - 22);
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawAnimals = (ctx: CanvasRenderingContext2D, g: Geometry, run: Run | null) => {
      const fx = fxRef.current;
      const scr = screenRef.current;
      const playing = run && !run.finished && scr === "play";
      const phase = playing ? beatPhase(run.songTime, run.chart) : 0;
      const bopOn = playing && run.songTime >= run.chart.firstNoteTime - 4 * run.chart.secPerBeat;
      LANES.forEach((l, lane) => {
        const a = fx.animals[lane];
        const x = laneX(g, lane);
        let y = g.animalY + a.y;
        let rot = 0;
        if (bopOn) y -= Math.pow(1 - phase, 3) * 7;
        else if (scr === "select") y -= Math.abs(Math.sin(fx.time * 2.2 + lane)) * 5;
        if (scr === "result") rot = Math.max(0, Math.sin(fx.time * 2.4 - lane * 0.5)) * 0.5; // 鞠躬
        if (a.shake > 0) rot += Math.sin(a.shake * 40) * 0.25;
        // 影子
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.ellipse(x, g.stageH - 12, g.animalSize * 0.42, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        drawEmoji(ctx, l.animal, x, y, g.animalSize, rot);
        drawEmoji(ctx, l.inst, x + g.animalSize * 0.48, y + g.animalSize * 0.22, g.animalSize * 0.5, rot);
      });
    };

    const drawPlay = (ctx: CanvasRenderingContext2D, g: Geometry, run: Run) => {
      const fx = fxRef.current;
      const { lanesLeft, lanesW, laneW, lineY, stageH, h } = g;
      const t = run.songTime;

      // 軌道
      LANES.forEach((l, lane) => {
        const x0 = lanesLeft + lane * laneW;
        const grad = ctx.createLinearGradient(0, stageH, 0, h);
        grad.addColorStop(0, "rgba(255,255,255,0.03)");
        grad.addColorStop(1, `${l.color}55`);
        ctx.fillStyle = grad;
        ctx.fillRect(x0, stageH, laneW, h - stageH);
        const flash = fx.laneFlash[lane];
        if (flash > 0) {
          ctx.globalAlpha = flash * 0.35;
          ctx.fillStyle = l.color;
          ctx.fillRect(x0, stageH, laneW, lineY - stageH);
          ctx.globalAlpha = 1;
        }
      });
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      for (let i = 0; i <= LANE_COUNT; i++) {
        const x = lanesLeft + i * laneW;
        ctx.beginPath();
        ctx.moveTo(x, stageH);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // 判定線
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(lanesLeft, lineY - 9, lanesW, 18);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(lanesLeft, lineY - 2, lanesW, 4);

      // 大型半透明 combo
      if (run.state.combo >= 3) {
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const cy = (stageH + lineY) / 2;
        ctx.font = `900 72px ${FONT}`;
        ctx.fillText(String(run.state.combo), lanesLeft + lanesW / 2, cy - 10);
        ctx.font = `900 20px ${FONT}`;
        ctx.fillText("COMBO", lanesLeft + lanesW / 2, cy + 38);
      }

      // 音符
      const noteR = Math.min(30, laneW * 0.28);
      ctx.save();
      ctx.beginPath();
      ctx.rect(lanesLeft, stageH, lanesW, h - stageH);
      ctx.clip();
      for (const ns of run.state.notes) {
        const n = ns.note;
        if (!isNoteVisible(n, t, run.approach, PAST_SEC)) continue;
        const hitDone = ns.head !== null && ns.head !== "miss" && !ns.holding;
        if (hitDone) continue;
        const missed = ns.head === "miss" || ns.tail === "miss";
        const color = LANES[n.lane].color;
        const x = laneX(g, n.lane);
        let headY = noteY(n.time, t, run.approach, stageH, lineY);
        if (ns.holding) headY = lineY;
        ctx.globalAlpha = missed ? 0.3 : 1;
        if (n.type === "hold") {
          const tailY = Math.min(headY, noteY(n.endTime, t, run.approach, stageH, lineY));
          const bw = noteR * 0.9;
          ctx.fillStyle = ns.holding ? `${color}EE` : `${color}99`;
          ctx.beginPath();
          ctx.roundRect(x - bw / 2, tailY - bw / 2, bw, headY - tailY + bw / 2, bw / 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fillRect(x - 3, tailY, 6, headY - tailY);
        }
        // 光暈
        ctx.fillStyle = `${color}44`;
        ctx.beginPath();
        ctx.arc(x, headY, noteR * 1.35, 0, Math.PI * 2);
        ctx.fill();
        starPath(ctx, x, headY, noteR);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#FFFFFF";
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // 命中光圈
      for (const r of fx.rings) {
        const k = r.age / 0.35;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = r.perfect ? "#FFE082" : "#FFFFFF";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(laneX(g, r.lane), lineY, noteR * (1 + k * 1.2), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 線下大圓按鈕
      LANES.forEach((l, lane) => {
        const x = laneX(g, lane);
        const held = laneHeld(lane, lanePointersRef.current, keyLanesRef.current);
        if (held) {
          ctx.fillStyle = `${l.color}66`;
          ctx.beginPath();
          ctx.arc(x, g.btnY, g.btnR * 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = held ? l.color : `${l.color}AA`;
        ctx.beginPath();
        ctx.arc(x, g.btnY, g.btnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = held ? "#FFFFFF" : "rgba(255,255,255,0.6)";
        ctx.stroke();
        drawEmoji(ctx, l.inst, x, g.btnY + 1, g.btnR * 0.95);
      });

      // 判定飄字
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fx.texts.forEach((tx, lane) => {
        if (!tx) return;
        const k = tx.age / TEXT_LIFE;
        const info = JUDGE_TEXT[tx.j];
        ctx.globalAlpha = 1 - k * k;
        ctx.font = `900 ${Math.min(30, laneW * 0.24)}px ${FONT}`;
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        const y = lineY - 64 - k * 30;
        ctx.strokeText(info.text, laneX(g, lane), y);
        ctx.fillStyle = info.color;
        ctx.fillText(info.text, laneX(g, lane), y);
      });
      ctx.globalAlpha = 1;

      // 倒數
      const label = countdownLabel(t, run.chart);
      if (label) {
        const k = (t - (run.chart.firstNoteTime - 4 * run.chart.secPerBeat)) / run.chart.secPerBeat;
        const frac = k - Math.floor(k);
        const size = (label === "開始！" ? 64 : 96) * (1.25 - 0.25 * Math.min(1, frac * 3));
        ctx.font = `900 ${size}px ${FONT}`;
        ctx.lineWidth = 8;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        const cy = (stageH + lineY) / 2;
        ctx.strokeText(label, g.w / 2, cy);
        ctx.fillStyle = label === "開始！" ? "#FFE082" : "#FFFFFF";
        ctx.fillText(label, g.w / 2, cy);
      }

      // HUD：歌名 + 進度條（左右留 80px 避開返回鍵）、右上分數
      ctx.font = `900 18px ${FONT}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(`${run.song.emoji} ${run.song.title}`, g.w / 2, 30);
      const barX = 80;
      const barW = Math.max(40, g.w - 160);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.roundRect(barX, 50, barW, 10, 5);
      ctx.fill();
      ctx.fillStyle = "#FFE082";
      ctx.beginPath();
      ctx.roundRect(barX, 50, Math.max(10, barW * songProgress(t, run.chart)), 10, 5);
      ctx.fill();
      ctx.textAlign = "right";
      ctx.font = `900 20px ${FONT}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(run.state.score.toLocaleString(), g.w - 14, 30);
      ctx.font = `700 12px ${FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("分數", g.w - 14, 52);
      ctx.textAlign = "center";
    };

    const draw = (ctx: CanvasRenderingContext2D, g: Geometry) => {
      const fx = fxRef.current;
      const run = runRef.current;
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);

      ctx.fillStyle = "#1A1440";
      ctx.fillRect(0, 0, g.w, g.h);
      drawStage(ctx, g, fx.time);
      if (run && screenRef.current === "play") drawPlay(ctx, g, run);
      drawAnimals(ctx, g, run);

      for (const p of fx.particles) {
        ctx.globalAlpha = 1 - p.age / p.life;
        drawEmoji(ctx, p.emoji, p.x, p.y, p.size);
      }
      ctx.globalAlpha = 1;

      if (fx.banner) {
        const k = fx.banner.age;
        const scale = k < 0.2 ? 0.6 + (k / 0.2) * 0.6 : 1.2 - Math.min(0.2, (k - 0.2) * 0.8);
        ctx.globalAlpha = k > 0.8 ? Math.max(0, 1 - (k - 0.8) / 0.3) : 1;
        ctx.font = `900 ${Math.round(34 * scale)}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#6A1B9A";
        ctx.strokeText(fx.banner.text, g.w / 2, g.stageH * 0.42);
        ctx.fillStyle = "#FFE082";
        ctx.fillText(fx.banner.text, g.w / 2, g.stageH * 0.42);
        ctx.globalAlpha = 1;
      }
    };

    let last = 0;
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const g = geomRef.current;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      update(dt);
      if (ctx && g) draw(ctx, g);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    // 鍵盤：A/S/D 與 ← ↓ →
    const onKeyDown = (e: KeyboardEvent) => {
      const lane = KEY_LANES[e.code];
      if (lane === undefined) return;
      const run = runRef.current;
      if (!run || run.paused || run.finished) return;
      e.preventDefault();
      if (e.repeat || keyLanesRef.current.has(e.code)) return;
      keyLanesRef.current.set(e.code, lane);
      pressInput(lane, e.timeStamp);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const lane = keyLanesRef.current.get(e.code);
      if (lane === undefined) return;
      keyLanesRef.current.delete(e.code);
      releaseInput(lane, e.timeStamp);
    };
    const onVisibility = () => {
      if (document.hidden) pauseRun();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibility);

    const timers = timersRef;
    return () => {
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      timers.current.forEach(clearTimeout);
      const run = runRef.current;
      if (run) {
        run.bus?.disconnect();
        run.bus = null;
        run.finished = true;
        runRef.current = null;
      }
      if (selfSuspendedRef.current) {
        selfSuspendedRef.current = false;
        void audioManager.resume();
      }
    };
  }, [handleResize, applyEvent, pressInput, releaseInput, pauseRun, finishRun]);

  // ---------- 多指觸控 ----------
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const run = runRef.current;
    const g = geomRef.current;
    if (!run || !g || run.paused || run.finished) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // 軌道外（寬螢幕兩側）就算最近的那一軌
    const lane = laneAt(x, g.lanesLeft, g.lanesW, LANE_COUNT) ?? (x < g.lanesLeft ? 0 : LANE_COUNT - 1);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 指標已失效時略過
    }
    lanePointersRef.current.set(e.pointerId, lane);
    pressInput(lane, e.timeStamp);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const lane = lanePointersRef.current.get(e.pointerId);
    if (lane === undefined) return;
    lanePointersRef.current.delete(e.pointerId);
    releaseInput(lane, e.timeStamp);
  };

  // ---------- UI ----------
  const rank = result ? rankFor(result.res.accuracy) : null;

  return (
    <div
      className="fixed inset-0 bg-[#1A1440] select-none"
      style={{ touchAction: "none", WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={wrapperRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onLostPointerCapture={onPointerUp}
        />
      </div>

      {/* 選歌 */}
      {screen === "select" && (
        <div className="absolute inset-0 z-20 overflow-y-auto" style={{ touchAction: "pan-y" }}>
          <h1 className="pl-20 pr-4 pt-6 text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            🎶 動物樂團
          </h1>
          <div style={{ height: "max(140px, calc(34dvh - 60px))" }} />
          <div className="min-h-[60dvh] rounded-t-3xl bg-[#1A1440]/90 backdrop-blur px-4 pt-5 pb-10">
            <div className="mx-auto max-w-xl">
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
                  const cfg = DIFFICULTIES[d];
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
                      className={`rounded-2xl py-3 text-2xl font-black transition-transform active:scale-95 ${
                        on
                          ? "bg-[#26A69A] text-white ring-4 ring-white/80 shadow-lg"
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {cfg.emoji} {cfg.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SONGS.map((song) => {
                  const rec = best[bestKey(song.id, difficulty)];
                  return (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => void startSong(song, difficulty)}
                      className="rounded-3xl bg-white/95 p-4 shadow-lg flex flex-col items-center gap-1 active:scale-95 transition-transform"
                    >
                      <span className="text-5xl leading-none">{song.emoji}</span>
                      <span className="mt-1 text-lg font-black text-[#4A3B8F] text-center leading-tight">
                        {song.title}
                      </span>
                      <span className="text-xl tracking-wider" aria-label={`最佳 ${rec?.stars ?? 0} 顆星`}>
                        {[0, 1, 2].map((i) => (
                          <span key={i} className={rec && i < rec.stars ? "text-[#FFC107]" : "text-gray-300"}>
                            ★
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-5 text-center text-sm font-bold text-white/60">
                星星掉到線上時，點下面的樂器！長長的星星要按住喔
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 暫停 */}
      {screen === "play" && paused && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black/55 backdrop-blur-sm">
          <div className="text-3xl font-black text-white">休息一下 😴</div>
          <button
            type="button"
            onClick={() => void resumeRun()}
            className="rounded-full bg-[#26A69A] px-10 py-5 text-3xl font-black text-white shadow-xl active:scale-95 transition-transform animate-bounce-in"
          >
            ▶ 繼續
          </button>
        </div>
      )}

      {/* 結算 */}
      {screen === "result" && result && rank && (
        <div className="absolute inset-0 z-20 overflow-y-auto" style={{ touchAction: "pan-y" }}>
          <div style={{ height: "max(150px, calc(34dvh - 20px))" }} />
          <div className="mx-auto w-[min(92vw,420px)] rounded-3xl bg-white p-6 shadow-2xl animate-bounce-in text-center mb-10">
            <div className="text-lg font-black text-[#4A3B8F]">
              {result.song.emoji} {result.song.title} · {DIFFICULTIES[result.difficulty].emoji}{" "}
              {DIFFICULTIES[result.difficulty].label}
            </div>
            <div className="mt-2 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`text-6xl leading-none ${i < result.res.stars ? "animate-bounce-in text-[#FFC107]" : "text-gray-200"}`}
                  style={
                    i < result.res.stars
                      ? { animationDelay: `${0.5 + i * 0.35}s`, animationFillMode: "both" }
                      : undefined
                  }
                >
                  ★
                </span>
              ))}
            </div>
            <div className="mt-3 text-3xl font-black text-[#26A69A]">
              {rank.rank} · {rank.title}
            </div>
            {result.res.fullCombo && (
              <div className="mt-1 text-xl font-black text-[#FF69B4]">全部連擊 🎉</div>
            )}
            <div className="mt-3 text-4xl font-black text-gray-700">
              {result.res.score.toLocaleString()}
              <span className="ml-1 text-base text-gray-400">分</span>
            </div>
            {result.newBest && <div className="text-sm font-black text-[#FFB300]">新紀錄！🏆</div>}
            <div className="mt-2 text-base font-bold text-gray-500">最大連擊 {result.res.maxCombo}</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-black">
              <div className="rounded-2xl bg-[#FFF8E1] py-2 text-[#F9A825]">
                超棒！<div className="text-xl">{result.res.counts.perfect}</div>
              </div>
              <div className="rounded-2xl bg-[#F1F8E9] py-2 text-[#7CB342]">
                不錯！<div className="text-xl">{result.res.counts.good}</div>
              </div>
              <div className="rounded-2xl bg-[#ECEFF1] py-2 text-[#78909C]">
                差一點<div className="text-xl">{result.res.counts.miss}</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void startSong(result.song, result.difficulty)}
                className="rounded-2xl bg-[#26A69A] py-3 text-xl font-black text-white shadow active:scale-95 transition-transform"
              >
                🔁 再一次
              </button>
              <button
                type="button"
                onClick={() => {
                  audioManager.pop();
                  goScreen("select");
                }}
                className="rounded-2xl bg-[#7E57C2] py-3 text-xl font-black text-white shadow active:scale-95 transition-transform"
              >
                🎵 換一首
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
