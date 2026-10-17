"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import {
  REEL_TURNS_NEEDED,
  angleDelta,
  createSwimmer,
  createSwimmers,
  getCatchType,
  isReelDone,
  nearestSwimmer,
  pickRandomKind,
  pokeSwimmer,
  removeGone,
  spawnFromEdge,
  swimmerAt,
  tapReel,
  tickPopulation,
  turnsFromAngle,
  updateSwimmers,
  type CatchKind,
  type CatchType,
  type Swimmer,
} from "@/lib/fishing/fishingLogic";
import {
  DEX_TYPES,
  dexCount,
  emptyDex,
  loadDex,
  recordCatch,
  saveDex,
  type FishDex,
} from "@/lib/fishing/fishDex";
import {
  applyCatch,
  createTask,
  isTaskDone,
  taskEmoji,
  taskFavor,
  taskText,
  type FishingTask,
} from "@/lib/fishing/fishingTasks";
import { getScene, nextScene, pickScene, type Scene, type SceneId } from "@/lib/fishing/scenes";
import {
  bubbles,
  confetti,
  createWeather,
  exclaim,
  inkCloud,
  sparkles,
  splash,
  updateEffects,
  updateWeather,
  type Effect,
  type WeatherParticle,
} from "@/lib/fishing/effects";
import {
  beginPond,
  drawEffects,
  drawEmoji,
  drawRod,
  drawTint,
  drawWeather,
  endPond,
  type Rect,
} from "./fishing/drawPond";
import FishDexDialog from "./fishing/FishDexDialog";
import BucketDialog from "./fishing/BucketDialog";
import Aquarium from "./fishing/Aquarium";

type Phase = "idle" | "casting" | "waiting" | "hooked" | "landing";
type Dialog = "none" | "bucket" | "dex" | "aquarium";

interface Geometry {
  w: number;
  h: number;
  dpr: number;
  pond: Rect;
  rodBase: { x: number; y: number };
  rodTip: { x: number; y: number };
  bucket: { x: number; y: number };
}

interface JunkItem {
  id: number;
  kind: CatchKind;
}

/** 開場隨機 6～9 隻，之後每隔幾秒輪替 */
const initialCount = () => 6 + Math.floor(Math.random() * 4);
/** 下一次族群輪替的間隔（秒） */
const nextSpawnDelay = () => 3 + Math.random() * 4;
const CAST_DURATION = 0.7;
const LAND_DURATION = 0.6;
const FLY_DURATION = 0.6;
const HUD_HEIGHT = 170;
/** 點魚時的判定半徑（px） */
const POKE_RADIUS = 40;
/** 草地上的垃圾最多排幾個位置，再多就疊在一起 */
const JUNK_SLOTS = 6;
/** 任務完成後隔多久出下一個（毫秒） */
const NEXT_TASK_DELAY = 2600;

/** 撿到的垃圾放在回收桶左邊的草地上 */
const junkSlot = (w: number, h: number, i: number) => {
  const k = i % JUNK_SLOTS;
  return { x: w - 132 - (k % 2) * 42, y: h - 42 - Math.floor(k / 2) * 40 };
};

/** 特效在水裡（畫在池塘 clip 裡面）還是水面上 */
const inWater = (e: Effect) => e.kind === "ripple" || e.kind === "bubble" || e.kind === "ink";

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
};

// ---------- 圖鑑進度（localStorage） ----------

const EMPTY_DEX = emptyDex();
let dexCache: FishDex | null = null;
const dexListeners = new Set<() => void>();

function getDexSnapshot(): FishDex {
  if (dexCache === null) dexCache = loadDex();
  return dexCache;
}

function subscribeDex(cb: () => void) {
  dexListeners.add(cb);
  return () => {
    dexListeners.delete(cb);
  };
}

function updateDex(next: FishDex) {
  dexCache = next;
  saveDex(next);
  dexListeners.forEach((l) => l());
}

export default function FishingGame() {
  const { settings } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reelRef = useRef<HTMLButtonElement>(null);
  const binRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState(0);
  const [reelNeeded, setReelNeeded] = useState(REEL_TURNS_NEEDED);
  const [reelAngle, setReelAngle] = useState(0);
  const [bucket, setBucket] = useState<CatchKind[]>([]);
  const [junkPile, setJunkPile] = useState<JunkItem[]>([]);
  const [recycled, setRecycled] = useState(0);
  const [binBounce, setBinBounce] = useState(0);
  const [drag, setDrag] = useState<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const [dialog, setDialog] = useState<Dialog>("none");
  const dex = useSyncExternalStore(subscribeDex, getDexSnapshot, () => EMPTY_DEX);
  const [dexBounce, setDexBounce] = useState(0);
  const [task, setTask] = useState<FishingTask | null>(null);
  const [taskBounce, setTaskBounce] = useState(0);
  const [sceneId, setSceneId] = useState<SceneId>("day");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [message, setMessage] = useState<string | null>("點一下池塘就能丟竿 🎣");

  const phaseRef = useRef<Phase>("idle");
  const geomRef = useRef<Geometry | null>(null);
  const swimmersRef = useRef<Swimmer[]>([]);
  const hookRef = useRef({ x: 0.5, y: 0.5, fromX: 0.5, fromY: 0, t: 0 });
  const attractedRef = useRef<Swimmer | null>(null);
  const hookedRef = useRef<Swimmer | null>(null);
  const landingRef = useRef({ stage: "toTip" as "toTip" | "toTarget", t: 0, tx: 0, ty: 0 });
  const reelDragRef = useRef({ active: false, lastAngle: 0, accum: 0 });
  const turnsRef = useRef(0);
  const reelNeededRef = useRef(REEL_TURNS_NEEDED);
  const biteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeRef = useRef(0);
  const spawnTimerRef = useRef(3);
  const animRef = useRef<number | null>(null);
  const effectsRef = useRef<Effect[]>([]);
  const weatherRef = useRef<WeatherParticle[]>([]);
  const sceneRef = useRef<Scene>(getScene("day"));
  const taskRef = useRef<FishingTask | null>(null);
  const junkPileRef = useRef<JunkItem[]>([]);
  const junkIdRef = useRef(1);
  /** 畫面晃動幅度（px），大魚拉扯時用 */
  const shakeRef = useRef(0);
  /** 浮標被拉下去的程度（0～1） */
  const dipRef = useRef(0);
  /** 釣竿彎曲程度（0～1） */
  const bendRef = useRef(0);
  /** 河豚鼓起來的程度（0～1） */
  const puffRef = useRef(0);
  const sparkleTimerRef = useRef(0);
  const tapReelRef = useRef(settings.fishingTapReel);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const showMessage = useCallback((text: string, ms = 1800) => {
    setMessage(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMessage(null), ms);
  }, []);

  const updateTask = useCallback((t: FishingTask | null) => {
    taskRef.current = t;
    setTask(t);
  }, []);

  const updateJunkPile = useCallback((pile: JunkItem[]) => {
    junkPileRef.current = pile;
    setJunkPile(pile);
  }, []);

  // 開場提示，幾秒後自動消失
  useEffect(() => {
    msgTimerRef.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    tapReelRef.current = settings.fishingTapReel;
  }, [settings.fishingTapReel]);

  // 換場景或畫面大小改變：重新產生天氣粒子
  useEffect(() => {
    const scene = getScene(sceneId);
    sceneRef.current = scene;
    weatherRef.current = size.w > 0 ? createWeather(scene.weather, size.w, size.h) : [];
  }, [sceneId, size.w, size.h]);

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
    const pond: Rect = { x: 14, y: 84, w: w - 28, h: h - 84 - HUD_HEIGHT };
    geomRef.current = {
      w,
      h,
      dpr,
      pond,
      rodBase: { x: w / 2 - 10, y: h - 8 },
      rodTip: { x: w / 2 + 80, y: h - HUD_HEIGHT + 6 },
      bucket: { x: 62, y: h - 96 },
    };
    setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    if (swimmersRef.current.length === 0) {
      // 第一次量到畫面大小：放魚、隨機挑場景
      swimmersRef.current = createSwimmers(initialCount());
      setSceneId(pickScene());
    }
    if (!taskRef.current) {
      updateTask(createTask(swimmersRef.current.map((s) => s.kind)));
    }
  }, [updateTask]);

  const hookPixel = () => {
    const g = geomRef.current;
    if (!g) return { x: 0, y: 0 };
    return {
      x: g.pond.x + hookRef.current.x * g.pond.w,
      y: g.pond.y + hookRef.current.y * g.pond.h,
    };
  };

  // ---------- 操作：丟竿（直接點池塘） ----------
  const castTo = useCallback(
    (nx: number, ny: number) => {
      const g = geomRef.current;
      if (!g || phaseRef.current !== "idle") return;
      const hook = hookRef.current;
      hook.fromX = (g.rodTip.x - g.pond.x) / g.pond.w;
      hook.fromY = (g.rodTip.y - g.pond.y) / g.pond.h;
      hook.x = Math.max(0.04, Math.min(0.96, nx));
      hook.y = Math.max(0.06, Math.min(0.96, ny));
      hook.t = 0;
      turnsRef.current = 0;
      setTurns(0);
      setReelAngle(0);
      reelDragRef.current = { active: false, lastAngle: 0, accum: 0 };
      setMessage(null);
      setPhaseBoth("casting");
      audioManager.whoosh();
    },
    [setPhaseBoth]
  );

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = geomRef.current;
    if (!g) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // 只有點在池塘裡才有反應
    const { pond } = g;
    if (px < pond.x || px > pond.x + pond.w || py < pond.y || py > pond.y + pond.h) return;
    const nx = (px - pond.x) / pond.w;
    const ny = (py - pond.y) / pond.h;

    // 點到魚：牠會跳一下、吐泡泡（正在咬餌 / 上鉤的那隻不算）
    const busy = [attractedRef.current, hookedRef.current];
    const poked = swimmerAt(
      swimmersRef.current.filter((s) => !busy.includes(s)),
      nx,
      ny,
      POKE_RADIUS / pond.h,
      pond.w / pond.h
    );
    if (poked && pokeSwimmer(poked)) {
      effectsRef.current.push(...bubbles(px, py, 6));
      audioManager.bubble();
      // 丟竿時已經有音效，只有沒在丟竿時才唸名字
      if (phaseRef.current !== "idle") audioManager.speak(getCatchType(poked.kind).label);
    }

    if (phaseRef.current === "idle") castTo(nx, ny);
  };

  // ---------- 操作：手指在捲線輪上畫圈（或連點） ----------
  const reelAngleAt = (e: React.PointerEvent) => {
    const el = reelRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  };

  /** 每捲完一圈：魚掙扎一下 */
  const onTurnDone = () => {
    audioManager.pop();
    const hooked = hookedRef.current;
    if (!hooked) return;
    const type = getCatchType(hooked.kind);
    const hp = hookPixel();
    effectsRef.current.push(...splash(hp.x, hp.y, 0.5));
    if (type.reaction === "strong") {
      shakeRef.current = 5;
      vibrate(60);
    } else if (type.reaction === "ink") {
      effectsRef.current.push(...inkCloud(hp.x, hp.y).slice(0, 3));
    }
  };

  const advanceReel = (accum: number) => {
    const d = reelDragRef.current;
    d.accum = accum;
    setReelAngle(accum);
    const needed = reelNeededRef.current;
    const t = turnsFromAngle(accum, needed);
    if (t > turnsRef.current) {
      turnsRef.current = t;
      setTurns(t);
      onTurnDone();
    }
    if (isReelDone(accum, needed)) {
      d.active = false;
      landingRef.current = { stage: "toTip", t: 0, tx: 0, ty: 0 };
      setPhaseBoth("landing");
      audioManager.ding();
    }
  };

  const onReelDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (phaseRef.current !== "hooked") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const d = reelDragRef.current;
    d.active = true;
    d.lastAngle = reelAngleAt(e);
    // 連點模式：點一下就轉半圈
    if (settings.fishingTapReel) advanceReel(tapReel(d.accum));
  };

  const onReelMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = reelDragRef.current;
    if (!d.active || phaseRef.current !== "hooked") return;
    const a = reelAngleAt(e);
    const delta = angleDelta(d.lastAngle, a);
    d.lastAngle = a;
    advanceReel(d.accum + delta);
  };

  const onReelUp = () => {
    reelDragRef.current.active = false;
  };

  // ---------- 水桶：放生 ----------
  const releaseFish = (kind: CatchKind) => {
    setBucket((prev) => {
      const i = prev.lastIndexOf(kind);
      if (i < 0) return prev;
      const next = prev.slice();
      next.splice(i, 1);
      return next;
    });
    const type = getCatchType(kind);
    const s = createSwimmer(kind);
    s.x = 0.06;
    s.dir = 1;
    swimmersRef.current.push(s);
    const g = geomRef.current;
    if (g) {
      const x = g.pond.x + s.x * g.pond.w;
      const y = g.pond.y + s.y * g.pond.h;
      effectsRef.current.push(...splash(x, y, 1.1), ...bubbles(x, y, 6));
    }
    setDialog("none");
    audioManager.bubble();
    showMessage(`掰掰${type.label}！游回池塘囉 👋`, 2200);
    audioManager.speak(`掰掰，${type.label}`);
  };

  // ---------- 垃圾：拖到回收桶 ----------
  const onJunkDown = (e: React.PointerEvent<HTMLButtonElement>, item: JunkItem) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id: item.id, x: e.clientX, y: e.clientY, moved: false });
    audioManager.pop();
  };

  const onJunkMove = (e: React.PointerEvent<HTMLButtonElement>, item: JunkItem) => {
    if (!drag || drag.id !== item.id) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8;
    setDrag({ id: item.id, x: e.clientX, y: e.clientY, moved });
  };

  const onJunkUp = (e: React.PointerEvent<HTMLButtonElement>, item: JunkItem) => {
    if (!drag || drag.id !== item.id) return;
    const wasMoved = drag.moved;
    setDrag(null);
    const bin = binRef.current?.getBoundingClientRect();
    const pad = 30;
    const inBin =
      bin &&
      e.clientX >= bin.left - pad &&
      e.clientX <= bin.right + pad &&
      e.clientY >= bin.top - pad &&
      e.clientY <= bin.bottom + pad;
    if (inBin) {
      updateJunkPile(junkPileRef.current.filter((j) => j.id !== item.id));
      setRecycled((n) => n + 1);
      setBinBounce((n) => n + 1);
      audioManager.ding();
      showMessage("回收好了！池塘更乾淨了 ♻️", 2000);
      audioManager.speak("回收好了");
    } else if (!wasMoved) {
      showMessage("把垃圾拖到回收桶 ♻️", 1800);
    }
  };

  // ---------- 主迴圈 ----------
  useEffect(() => {
    handleResize();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(wrapper);

    const hookPx = (g: Geometry) => ({
      x: g.pond.x + hookRef.current.x * g.pond.w,
      y: g.pond.y + hookRef.current.y * g.pond.h,
    });

    const startBiteTimer = () => {
      if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
      biteTimerRef.current = setTimeout(() => {
        if (phaseRef.current !== "waiting") return;
        const hook = hookRef.current;
        const target = nearestSwimmer(swimmersRef.current, hook.x, hook.y);
        if (target) target.leaving = false;
        attractedRef.current = target;
      }, 800 + Math.random() * 1700);
    };

    /** 釣到東西：放進水桶 / 草地，更新圖鑑和任務，挑一句最重要的話說 */
    const handleCatch = (type: CatchType, g: Geometry) => {
      let msg: string;
      let say: string;
      if (type.isJunk) {
        updateJunkPile([...junkPileRef.current, { id: junkIdRef.current++, kind: type.kind }]);
        msg = `撿到${type.label}！拖到回收桶 ♻️`;
        say = `撿到${type.label}`;
        audioManager.bubble();
      } else {
        setBucket((prev) => [...prev, type.kind]);
        msg = `釣到${type.label}了！${type.emoji}`;
        say = `是${type.label}！`;
        audioManager.success();

        const upd = recordCatch(getDexSnapshot(), type.kind);
        updateDex(upd.dex);
        if (upd.isNew) {
          msg = `新發現！${type.label} ${type.emoji} 放進圖鑑了`;
          setDexBounce((n) => n + 1);
          audioManager.chime();
        }
        if (type.isRare) {
          msg = `哇！稀有的${type.label}！🌟`;
          say = `哇！是${type.label}！`;
          effectsRef.current.push(...confetti(g.w, 70));
          audioManager.chime();
        }
        if (upd.justCompleted) {
          msg = "圖鑑全部收集完成！你是釣魚高手 🏆";
          say += "圖鑑全部收集完成了！";
          effectsRef.current.push(...confetti(g.w, 140));
          audioManager.playFile("/sounds/feedback/clap.mp3");
        }
      }

      const t = taskRef.current;
      if (t) {
        const nt = applyCatch(t, type.kind);
        if (nt !== t) {
          updateTask(nt);
          setTaskBounce((n) => n + 1);
          if (isTaskDone(nt)) {
            msg = `任務完成！${taskText(nt)} 👏`;
            say += "任務完成！";
            effectsRef.current.push(...confetti(g.w, 50));
            audioManager.playFile("/sounds/feedback/clap.mp3");
            if (taskTimerRef.current) clearTimeout(taskTimerRef.current);
            taskTimerRef.current = setTimeout(() => {
              const next = createTask(
                swimmersRef.current.map((s) => s.kind),
                Math.random,
                nt.target
              );
              updateTask(next);
              setTaskBounce((n) => n + 1);
              showMessage(`新任務：${taskText(next)} 🎯`, 2500);
              audioManager.speak(taskText(next));
            }, NEXT_TASK_DELAY);
          }
        }
      }

      showMessage(msg, 2400);
      audioManager.speak(say);
    };

    const finishCatch = (g: Geometry) => {
      const caught = hookedRef.current;
      hookedRef.current = null;
      attractedRef.current = null;
      if (caught) {
        swimmersRef.current = swimmersRef.current.filter((s) => s.id !== caught.id);
        // 補一隻隨機種類，從池邊游進來（任務要的魚比較容易出現）
        swimmersRef.current.push(spawnFromEdge(pickRandomKind(Math.random, taskFavor(taskRef.current))));
        handleCatch(getCatchType(caught.kind), g);
      }
      turnsRef.current = 0;
      setTurns(0);
      setPhaseBoth("idle");
    };

    const onHooked = (s: Swimmer, g: Geometry) => {
      const type = getCatchType(s.kind);
      const hp = hookPx(g);
      hookedRef.current = s;
      attractedRef.current = null;
      reelNeededRef.current = type.reelTurns;
      setReelNeeded(type.reelTurns);
      setPhaseBoth("hooked");

      // 浮標被拉下去、濺起水花、跳出「！」、手機震一下
      dipRef.current = 1;
      effectsRef.current.push(...splash(hp.x, hp.y, 1.2), exclaim(hp.x, hp.y - 56));
      if (type.reaction === "strong") {
        shakeRef.current = 9;
        vibrate([120, 60, 180]);
      } else {
        vibrate(150);
      }
      if (type.reaction === "ink") effectsRef.current.push(...inkCloud(hp.x, hp.y));

      if (type.reaction === "strong") {
        showMessage(`好大的力氣！要轉 ${type.reelTurns} 圈 💪`, 3200);
      } else {
        const how = tapReelRef.current ? "轉轉或點點輪子" : "手指在輪子上畫圈圈";
        showMessage(`上鉤了！${how} 🔄`, 3000);
      }
      audioManager.pop();
      audioManager.ding();
    };

    const update = (dt: number, g: Geometry, time: number) => {
      const p = phaseRef.current;
      const hook = hookRef.current;
      const attracted = attractedRef.current;
      const scene = sceneRef.current;

      // 一般游動（被吸引 / 上鉤的那隻另外處理）
      const free = swimmersRef.current.filter(
        (s) => s !== attracted && s !== hookedRef.current
      );
      updateSwimmers(free, dt);

      // 族群輪替：隨機生成新的魚，滿了就讓舊的游走
      spawnTimerRef.current -= dt;
      if (spawnTimerRef.current <= 0) {
        spawnTimerRef.current = nextSpawnDelay();
        tickPopulation(free, Math.random, taskFavor(taskRef.current));
        for (const s of free) {
          if (!swimmersRef.current.includes(s)) swimmersRef.current.push(s);
        }
      }
      swimmersRef.current = removeGone(swimmersRef.current);

      // 稀有獵物會一閃一閃，吸引小朋友去釣
      sparkleTimerRef.current -= dt;
      if (sparkleTimerRef.current <= 0) {
        sparkleTimerRef.current = 0.35;
        for (const s of swimmersRef.current) {
          if (!getCatchType(s.kind).isRare || s === hookedRef.current) continue;
          effectsRef.current.push(
            ...sparkles(g.pond.x + s.x * g.pond.w, g.pond.y + s.y * g.pond.h, 1)
          );
        }
      }

      // 下雨：水面上到處冒小漣漪
      if (scene.weather === "rain" && Math.random() < dt * 8) {
        effectsRef.current.push(
          ...splash(
            g.pond.x + Math.random() * g.pond.w,
            g.pond.y + Math.random() * g.pond.h,
            0.3
          )
        );
      }

      effectsRef.current = updateEffects(effectsRef.current, dt);
      updateWeather(weatherRef.current, scene.weather, dt, g.w, g.h);

      shakeRef.current = Math.max(0, shakeRef.current - dt * 14);
      dipRef.current = Math.max(0, dipRef.current - dt * 0.8);

      const hookedType = hookedRef.current ? getCatchType(hookedRef.current.kind) : null;
      const strong = hookedType?.reaction === "strong";
      let bendTarget = 0;
      if (p === "hooked") {
        bendTarget = strong ? 0.85 + Math.sin(time * 9) * 0.15 : 0.4 + Math.sin(time * 7) * 0.1;
      } else if (p === "landing" && landingRef.current.stage === "toTip") {
        bendTarget = strong ? 0.7 : 0.45;
      }
      bendRef.current += (bendTarget - bendRef.current) * Math.min(1, dt * 8);
      const puffTarget = hookedType?.reaction === "puff" ? 1 : 0;
      puffRef.current += (puffTarget - puffRef.current) * Math.min(1, dt * 4);

      if (p === "casting") {
        hook.t = Math.min(1, hook.t + dt / CAST_DURATION);
        if (hook.t >= 1) {
          const hp = hookPx(g);
          effectsRef.current.push(...splash(hp.x, hp.y, 0.7));
          audioManager.bubble();
          setPhaseBoth("waiting");
          startBiteTimer();
        }
      } else if (p === "waiting" && attracted) {
        const dx = hook.x - attracted.x;
        const dy = hook.y - attracted.y;
        const d = Math.hypot(dx, dy);
        const step = 0.35 * dt;
        if (d <= step || d < 0.02) {
          attracted.x = hook.x;
          attracted.y = hook.y;
          attracted.jumpT = undefined;
          onHooked(attracted, g);
        } else {
          attracted.dir = dx > 0 ? 1 : -1;
          attracted.x += (dx / d) * step;
          attracted.y += (dy / d) * step;
        }
      } else if (p === "hooked" && hookedRef.current) {
        const s = hookedRef.current;
        const wiggle = strong ? 2.2 : 1;
        s.phase += dt * 10;
        s.x = hook.x + Math.sin(s.phase) * 0.012 * wiggle;
        s.y = hook.y + 0.01 + Math.cos(s.phase * 0.7) * 0.008 * wiggle;
      } else if (p === "landing") {
        const l = landingRef.current;
        if (l.stage === "toTip") {
          l.t = Math.min(1, l.t + dt / LAND_DURATION);
          const tipX = (g.rodTip.x - g.pond.x) / g.pond.w;
          const tipY = (g.rodTip.y - g.pond.y) / g.pond.h;
          if (l.t >= 1) {
            hook.x = tipX;
            hook.y = tipY;
            // 魚飛進水桶，垃圾飛到回收桶旁邊的草地
            const isJunk = hookedType?.isJunk ?? false;
            const target = isJunk
              ? junkSlot(g.w, g.h, junkPileRef.current.length)
              : { x: g.bucket.x, y: g.bucket.y - 30 };
            landingRef.current = { stage: "toTarget", t: 0, tx: target.x, ty: target.y };
          } else {
            const ease = 1 - Math.pow(1 - l.t, 2);
            hook.x = hook.x + (tipX - hook.x) * ease * 0.25;
            hook.y = hook.y + (tipY - hook.y) * ease * 0.25;
          }
          if (hookedRef.current) {
            hookedRef.current.x = hook.x;
            hookedRef.current.y = hook.y + 0.01;
          }
        } else {
          l.t = Math.min(1, l.t + dt / FLY_DURATION);
          if (l.t >= 1) finishCatch(g);
        }
      }
    };

    const draw = (ctx: CanvasRenderingContext2D, g: Geometry, time: number) => {
      const { w, h, pond } = g;
      const scene = sceneRef.current;
      const shake = shakeRef.current;
      const sx = shake ? (Math.random() - 0.5) * 2 * shake : 0;
      const sy = shake ? (Math.random() - 0.5) * 2 * shake : 0;
      ctx.setTransform(g.dpr, 0, 0, g.dpr, sx * g.dpr, sy * g.dpr);
      if (shake) {
        // 晃動時邊緣會露出上一幀，先整片蓋掉
        ctx.fillStyle = scene.grass;
        ctx.fillRect(-20, -20, w + 40, h + 40);
      }

      const p = phaseRef.current;
      const hooked = hookedRef.current;

      beginPond(ctx, w, h, pond, HUD_HEIGHT, scene, time);
      // 魚與雜物（上鉤的那隻另外畫在鉤子上）
      for (const s of swimmersRef.current) {
        if (s === hooked) continue;
        const type = getCatchType(s.kind);
        const x = pond.x + s.x * pond.w;
        const y = pond.y + s.y * pond.h;
        const flip = s.dir === 1 && !type.isJunk;
        if (s.jumpT !== undefined) {
          // 跳的時候轉一圈
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.sin(s.jumpT * Math.PI) * (flip ? 0.6 : -0.6));
          drawEmoji(ctx, type.emoji, 0, 0, type.size, flip, type.glow);
          ctx.restore();
        } else {
          drawEmoji(ctx, type.emoji, x, y, type.size, flip, type.glow);
        }
      }
      drawEffects(ctx, effectsRef.current.filter(inWater));
      endPond(ctx, pond, scene);

      // 釣竿（上鉤時往鉤子的方向彎）
      const hp = hookPx(g);
      const pull = p === "hooked" || p === "landing" ? hp : { x: g.rodTip.x, y: g.rodTip.y + 50 };
      const tip = drawRod(ctx, g.rodBase, g.rodTip, pull, bendRef.current);

      // 釣線與鉤子
      let hx: number;
      let hy: number;
      if (p === "idle") {
        hx = tip.x;
        hy = tip.y + 26;
      } else if (p === "casting") {
        const hook = hookRef.current;
        const t = hook.t;
        const ease = 1 - Math.pow(1 - t, 2);
        const fx = g.pond.x + hook.fromX * g.pond.w;
        const fy = g.pond.y + hook.fromY * g.pond.h;
        hx = fx + (hp.x - fx) * ease;
        hy = fy + (hp.y - fy) * ease - Math.sin(t * Math.PI) * 120;
      } else {
        hx = hp.x;
        hy = hp.y;
        if (p === "waiting") hy += Math.sin(time * 4) * 3;
      }
      // 咬餌時浮標被拉下去、抖動
      const dip = dipRef.current;
      const bobY = hy - 12 + dip * 10 + Math.sin(time * 22) * dip * 4;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(hx, bobY);
      ctx.stroke();
      // 浮標
      ctx.fillStyle = "#EF5350";
      ctx.beginPath();
      ctx.arc(hx, bobY, 6, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(hx, bobY, 6, 0, Math.PI);
      ctx.fill();
      // 鉤子
      ctx.strokeStyle = "#9E9E9E";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, hy - 6);
      ctx.lineTo(hx, hy + 4);
      ctx.arc(hx - 4, hy + 4, 4, 0, Math.PI);
      ctx.stroke();

      // 上鉤 / 收線中的魚跟著鉤子
      if (hooked && p !== "idle") {
        const type = getCatchType(hooked.kind);
        const size = type.size * (1 + puffRef.current * 0.7);
        const l = landingRef.current;
        if (p === "landing" && l.stage === "toTarget") {
          // 沿弧線飛向水桶（垃圾飛到回收桶旁）
          const t = l.t;
          const ease = 1 - Math.pow(1 - t, 3);
          const fx = g.rodTip.x;
          const fy = g.rodTip.y;
          const cx = (fx + l.tx) / 2;
          const cy = Math.min(fy, l.ty) - 120;
          const x = (1 - ease) * (1 - ease) * fx + 2 * (1 - ease) * ease * cx + ease * ease * l.tx;
          const y = (1 - ease) * (1 - ease) * fy + 2 * (1 - ease) * ease * cy + ease * ease * l.ty;
          drawEmoji(ctx, type.emoji, x, y, size * (1 - ease * 0.4), false, type.glow);
        } else if (p === "landing") {
          drawEmoji(ctx, type.emoji, hx, hy + 14, size, false, type.glow);
        } else {
          const x = pond.x + hooked.x * pond.w;
          const y = pond.y + hooked.y * pond.h;
          drawEmoji(ctx, type.emoji, x, y + 10, size, false, type.glow);
        }
      }

      drawTint(ctx, w, h, scene);
      drawWeather(ctx, scene, weatherRef.current);
      drawEffects(ctx, effectsRef.current.filter((e) => !inWater(e)));
    };

    let last = 0;
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const g = geomRef.current;
      if (ctx && g) {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        timeRef.current += dt;
        update(dt, g, timeRef.current);
        draw(ctx, g, timeRef.current);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
      if (taskTimerRef.current) clearTimeout(taskTimerRef.current);
    };
  }, [handleResize, setPhaseBoth, showMessage, updateTask, updateJunkPile]);

  // ---------- UI ----------
  const scene = getScene(sceneId);
  const found = dexCount(dex);

  const changeScene = () => {
    const next = getScene(nextScene(sceneId));
    setSceneId(next.id);
    audioManager.chime();
    showMessage(`${next.emoji} 變成${next.label}了`, 1600);
    audioManager.speak(next.label);
  };

  return (
    <div className="fixed inset-0" style={{ touchAction: "none", background: scene.grass }}>
      <div ref={wrapperRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${phase === "idle" ? "cursor-crosshair" : ""}`}
          onPointerDown={onCanvasPointerDown}
        />
      </div>

      {/* 訊息 */}
      {message && (
        <div className="fixed top-[92px] left-0 right-0 z-30 flex justify-center pointer-events-none px-6">
          <div
            key={message}
            className="bg-white/90 backdrop-blur rounded-2xl px-4 py-2 shadow-md text-lg font-black text-[#FF69B4] animate-bounce-in text-center"
          >
            {message}
          </div>
        </div>
      )}

      {/* 圖鑑 */}
      <button
        key={`dex-${dexBounce}`}
        type="button"
        aria-label="打開魚類圖鑑"
        onClick={() => {
          setDialog("dex");
          audioManager.pop();
        }}
        className="fixed top-4 left-20 z-30 h-14 px-3 rounded-2xl bg-white/85 backdrop-blur shadow-md flex items-center gap-1.5 active:scale-95 transition-transform select-none animate-bounce-in"
      >
        <span className="text-3xl leading-none">📖</span>
        <span className="font-black text-[#4FC3F7] text-lg">
          {found}/{DEX_TYPES.length}
        </span>
      </button>

      {/* 任務卡：點一下再唸一次 */}
      {task && (
        <button
          key={`task-${taskBounce}`}
          type="button"
          aria-label={`任務：${taskText(task)}`}
          onClick={() => audioManager.speak(taskText(task))}
          className={`fixed top-3 right-20 z-30 max-w-[42vw] rounded-2xl px-3 py-1.5 shadow-md backdrop-blur select-none animate-bounce-in ${
            isTaskDone(task) ? "bg-[#FFF8E1]" : "bg-white/85"
          }`}
        >
          <div className="text-sm font-black text-[#FF8A65] whitespace-nowrap">
            {isTaskDone(task) ? "✅ 完成！" : `🎯 ${taskText(task)}`}
          </div>
          <div className="flex justify-center gap-0.5 mt-0.5">
            {Array.from({ length: task.need }).map((_, i) => (
              <span
                key={i}
                className="text-2xl leading-none"
                style={i < task.got ? undefined : { filter: "grayscale(1)", opacity: 0.3 }}
              >
                {taskEmoji(task.target)}
              </span>
            ))}
          </div>
        </button>
      )}

      {/* 換場景 */}
      <button
        type="button"
        aria-label={`換場景，現在是${scene.label}`}
        onClick={changeScene}
        className="fixed top-4 right-4 z-30 w-14 h-14 rounded-full bg-white/85 backdrop-blur shadow-md text-3xl flex items-center justify-center active:scale-90 transition-transform select-none"
      >
        {scene.emoji}
      </button>

      {/* 水桶（點一下看裡面有什麼） */}
      <button
        type="button"
        aria-label="看看水桶裡有什麼"
        onClick={() => {
          setDialog("bucket");
          audioManager.pop();
        }}
        className="fixed left-4 bottom-6 z-20 flex flex-col items-center w-28 active:scale-95 transition-transform select-none"
      >
        <div className="relative">
          <span className="text-7xl leading-none">🪣</span>
          <span className="absolute -top-1 -right-2 min-w-8 h-8 px-2 rounded-full bg-[#FFB74D] text-white text-lg font-black flex items-center justify-center shadow">
            {bucket.length}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-0.5 max-w-28 min-h-6">
          {bucket.slice(-8).map((k, i) => (
            <span key={`${k}-${i}`} className="text-base leading-none">
              {getCatchType(k).emoji}
            </span>
          ))}
        </div>
      </button>

      {/* 回收桶 */}
      <div
        ref={binRef}
        key={`bin-${binBounce}`}
        className={`fixed right-4 bottom-6 z-10 w-20 flex flex-col items-center select-none pointer-events-none transition-opacity ${
          binBounce > 0 ? "animate-bounce-in" : ""
        } ${phase === "hooked" ? "opacity-0" : ""}`}
      >
        <div className="relative">
          <span className="text-6xl leading-none">♻️</span>
          {recycled > 0 && (
            <span className="absolute -top-1 -right-3 min-w-7 h-7 px-1.5 rounded-full bg-[#81C784] text-white font-black flex items-center justify-center shadow">
              {recycled}
            </span>
          )}
        </div>
        <span className="text-xs font-black text-[#2E7D32] bg-white/70 rounded-full px-2 mt-0.5">
          回收桶
        </span>
      </div>

      {/* 撿到的垃圾：拖到回收桶 */}
      {size.w > 0 &&
        junkPile.map((item, i) => {
          const dragging = drag !== null && drag.id === item.id;
          const pos = drag !== null && dragging ? { x: drag.x, y: drag.y } : junkSlot(size.w, size.h, i);
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`把${getCatchType(item.kind).label}拖到回收桶`}
              onPointerDown={(e) => onJunkDown(e, item)}
              onPointerMove={(e) => onJunkMove(e, item)}
              onPointerUp={(e) => onJunkUp(e, item)}
              onPointerCancel={() => setDrag(null)}
              className={`fixed text-5xl leading-none select-none ${
                dragging ? "z-40 scale-125" : "z-[15] transition-[left,top] duration-200"
              }`}
              style={{
                left: pos.x,
                top: pos.y,
                transform: "translate(-50%, -50%)",
                touchAction: "none",
              }}
            >
              {getCatchType(item.kind).emoji}
            </button>
          );
        })}

      {/* 捲線輪：上鉤時出現，手指畫圈（連點模式也可以點） */}
      {phase === "hooked" && (
        <div className="fixed right-4 bottom-6 z-20 flex flex-col items-center animate-bounce-in">
          <button
            ref={reelRef}
            type="button"
            aria-label="手指在捲線輪上畫圈"
            onPointerDown={onReelDown}
            onPointerMove={onReelMove}
            onPointerUp={onReelUp}
            onPointerCancel={onReelUp}
            className="w-40 h-40 rounded-full shadow-xl border-[6px] border-[#5D4037] relative select-none"
            style={{
              touchAction: "none",
              background:
                "conic-gradient(#FFD54F 0 30deg, #F9A825 30deg 60deg, #FFD54F 60deg 90deg, #F9A825 90deg 120deg, #FFD54F 120deg 150deg, #F9A825 150deg 180deg, #FFD54F 180deg 210deg, #F9A825 210deg 240deg, #FFD54F 240deg 270deg, #F9A825 270deg 300deg, #FFD54F 300deg 330deg, #F9A825 330deg 360deg)",
              transform: `rotate(${reelAngle}deg)`,
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-10 h-10 rounded-full bg-[#5D4037] block" />
            </span>
            <span className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#EF5350] border-2 border-white block" />
          </button>
          <div className="flex gap-1.5 mt-2">
            {Array.from({ length: reelNeeded }).map((_, i) => (
              <span
                key={i}
                className={`w-4 h-4 rounded-full block border-2 border-white shadow ${
                  i < turns ? "bg-[#81C784]" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
          {settings.fishingTapReel && (
            <span className="mt-1 text-xs font-black text-white bg-black/25 rounded-full px-2">
              點點也可以 👆
            </span>
          )}
        </div>
      )}

      {dialog === "bucket" && (
        <BucketDialog
          bucket={bucket}
          onRelease={releaseFish}
          onAquarium={() => {
            setDialog("aquarium");
            audioManager.bubble();
          }}
          onClose={() => setDialog("none")}
        />
      )}

      {dialog === "dex" && (
        <FishDexDialog
          dex={dex}
          onPick={(type) => {
            audioManager.pop();
            audioManager.speak(type.label);
          }}
          onClose={() => setDialog("none")}
        />
      )}

      {dialog === "aquarium" && <Aquarium fish={bucket} onClose={() => setDialog("none")} />}
    </div>
  );
}
