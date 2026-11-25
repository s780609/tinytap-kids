"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { consumeTicks } from "@/lib/tank/sim";
import { mergeAxis } from "@/lib/raiden/stick";
import { CAR_SPECS, MAX_WANTED, createGame, findCar, step, type CarKind, type GameEvent, type GameState } from "@/lib/city/sim";
import { buildMinimap, drawGame, drawMinimap, updateCamera, updateFx, type Camera, type Fx } from "./cityRender";
import RaidenStick from "./RaidenStick";

const KEY_X: Record<string, number> = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };
const KEY_Y: Record<string, number> = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 };
const ACTION_KEYS = new Set(["KeyE", "KeyF", "Enter"]);
const HORN_KEYS = new Set(["KeyH", "KeyQ"]);
const BRAKE_KEYS = new Set(["Space", "ShiftLeft", "ShiftRight"]);

const BEST_KEY = "tinytap-city-best";
const MINI = 112;

const CAR_NAMES: Record<CarKind, string> = {
  sedan: "轎車",
  taxi: "計程車",
  sports: "跑車",
  van: "貨車",
  police: "警車",
};

interface Hud {
  cash: number;
  wanted: number;
  inCar: CarKind | null;
  canEnter: boolean;
  hp: number;
  busted: boolean;
}

const HUD0: Hud = { cash: 0, wanted: 0, inCar: null, canEnter: false, hp: 1, busted: false };

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function honk() {
  const ctx = audioManager.context;
  const bus = audioManager.createMusicBus();
  if (!ctx || !bus) return;
  const t = ctx.currentTime;
  audioManager.scheduleNote(bus, 349, t, 0.32);
  audioManager.scheduleNote(bus, 440, t, 0.32);
  setTimeout(() => bus.disconnect(), 700);
}

export default function CityGame() {
  const { settings } = useSettings();
  const [screen, setScreen] = useState<"title" | "play">("title");
  const [hud, setHud] = useState<Hud>(HUD0);
  const [message, setMessage] = useState<string | null>(null);
  const [best, setBest] = useState(0);
  const [braking, setBraking] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 1.4 });
  const fxRef = useRef<Fx[]>([]);
  const miniImgRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const keysRef = useRef(new Set<string>());
  const stickRef = useRef({ dx: 0, dy: 0 });
  const actionRef = useRef(false);
  const hornRef = useRef(false);
  const brakeRef = useRef(false);
  const accRef = useRef(0);
  const hudRef = useRef<Hud>(HUD0);
  const bestRef = useRef(0);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    const id = setTimeout(() => {
      bestRef.current = readBest();
      setBest(bestRef.current);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const say = useCallback((text: string, ms = 1800) => {
    setMessage(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMessage(null), ms);
  }, []);

  const start = async () => {
    await audioManager.resume();
    audioManager.chipJingle("stageStart");
    const g = createGame((Date.now() >>> 0) || 1);
    gameRef.current = g;
    camRef.current = { x: g.player.x, y: g.player.y, zoom: 1.45 };
    fxRef.current = [];
    miniImgRef.current = buildMinimap(g);
    accRef.current = 0;
    setScreen("play");
    say("自由活動！走到車子旁邊按「上車」", 2600);
  };

  // 畫布大小跟著畫面
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const resize = () => {
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { w, h, dpr };
      const c = canvasRef.current;
      if (c) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const m = miniRef.current;
      if (m) {
        m.width = Math.round(MINI * dpr);
        m.height = Math.round(MINI * dpr);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [screen]);

  // 主迴圈
  useEffect(() => {
    if (screen !== "play") return;

    const onEvent = (e: GameEvent, g: GameState) => {
      const fx = fxRef.current;
      switch (e.type) {
        case "crash":
          audioManager.chip(e.power > 160 ? "boomS" : "brick");
          for (let i = 0; i < Math.min(14, e.power / 12); i++) {
            const a = Math.random() * Math.PI * 2;
            const v = 60 + Math.random() * 120;
            fx.push({ kind: "spark", x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35, max: 0.35 });
          }
          break;
        case "coin":
          audioManager.chip(e.value >= 50 ? "medal" : "powerGet");
          fx.push({ kind: "text", x: e.x, y: e.y - 10, vx: 0, vy: -40, life: 0.9, max: 0.9, text: `+$${e.value}`, color: e.value >= 50 ? "#80F5FF" : "#FFEB3B" });
          if (g.cash > bestRef.current) {
            bestRef.current = g.cash;
            try {
              localStorage.setItem(BEST_KEY, String(g.cash));
            } catch {
              // 存不了就算了
            }
          }
          break;
        case "enter":
          audioManager.chip("pause");
          say(e.kind === "police" ? "開警車！小心被追 🚓" : `坐上${CAR_NAMES[e.kind]}了！`, 1400);
          break;
        case "exit":
          audioManager.chip("pause");
          break;
        case "horn":
          honk();
          break;
        case "pedHit":
          audioManager.chip("armorHit");
          fx.push({ kind: "text", x: e.x, y: e.y - 14, vx: 0, vy: -30, life: 1, max: 1, text: "哎唷！", color: "#FFFFFF" });
          break;
        case "playerHit":
          audioManager.chip("armorHit");
          say("哎唷！走路要看車", 1400);
          break;
        case "wanted":
          audioManager.chipJingle("warning");
          say(`通緝 ${"★".repeat(e.level)}　警察來了！`, 2000);
          break;
        case "calm":
          audioManager.chip("life");
          say(e.level === 0 ? "甩掉警察了！😎" : `通緝降到 ${"★".repeat(e.level)}`, 1800);
          break;
        case "busted":
          audioManager.chipJingle("gameOver");
          say(e.fine > 0 ? `被警察抓到了！罰 $${e.fine}` : "被警察抓到了！", 2600);
          break;
        case "free":
          say("從警察局重新出發", 1600);
          break;
        case "wreck":
          audioManager.chip("boomL");
          if (e.withPlayer) say("車子撞壞了！換一台吧", 1800);
          break;
      }
    };

    const pushHud = (g: GameState) => {
      const car = findCar(g, g.player.car);
      let canEnter = false;
      if (!car) {
        canEnter = g.cars.some(
          (c) => !c.wrecked && Math.hypot(c.x - g.player.x, c.y - g.player.y) - CAR_SPECS[c.kind].width / 2 < 42
        );
      }
      const next: Hud = {
        cash: g.cash,
        wanted: g.wanted,
        inCar: car ? car.kind : null,
        canEnter,
        hp: car ? Math.round((car.hp / CAR_SPECS[car.kind].hp) * 10) / 10 : 1,
        busted: g.bustedTicks > 0,
      };
      const prev = hudRef.current;
      if (
        prev.cash !== next.cash ||
        prev.wanted !== next.wanted ||
        prev.inCar !== next.inCar ||
        prev.canEnter !== next.canEnter ||
        prev.hp !== next.hp ||
        prev.busted !== next.busted
      ) {
        hudRef.current = next;
        setHud(next);
        if (next.cash > bestRef.current) bestRef.current = next.cash;
      }
    };

    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const g = gameRef.current;
      if (!g) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const { steps, acc } = consumeTicks(accRef.current, dt);
      accRef.current = acc;
      let kx = 0;
      let ky = 0;
      keysRef.current.forEach((k) => {
        kx += KEY_X[k] ?? 0;
        ky += KEY_Y[k] ?? 0;
      });
      const dx = mergeAxis(Math.sign(kx), stickRef.current.dx);
      const dy = mergeAxis(Math.sign(ky), stickRef.current.dy);
      const events: GameEvent[] = [];
      for (let i = 0; i < steps; i++) {
        step(g, { dx, dy, action: actionRef.current, horn: hornRef.current, handbrake: brakeRef.current }, events);
        actionRef.current = false;
        hornRef.current = false;
      }
      for (const e of events) onEvent(e, g);
      pushHud(g);
      updateCamera(camRef.current, g, dt);
      fxRef.current = updateFx(fxRef.current, g, dt);

      const { w, h, dpr } = sizeRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && w > 0) drawGame(ctx, g, camRef.current, fxRef.current, w, h, dpr, now / 1000);
      const mctx = miniRef.current?.getContext("2d");
      if (mctx && miniImgRef.current) drawMinimap(mctx, g, miniImgRef.current, MINI, dpr, now / 1000);
    };
    raf = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code in KEY_X || e.code in KEY_Y || ACTION_KEYS.has(e.code) || HORN_KEYS.has(e.code) || BRAKE_KEYS.has(e.code)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      keysRef.current.add(e.code);
      if (ACTION_KEYS.has(e.code)) actionRef.current = true;
      if (HORN_KEYS.has(e.code)) hornRef.current = true;
      if (BRAKE_KEYS.has(e.code)) brakeRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
      if (BRAKE_KEYS.has(e.code)) brakeRef.current = false;
    };
    const keys = keysRef.current;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      keys.clear();
    };
  }, [screen, say]);

  useEffect(
    () => () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    },
    []
  );

  const holdBrake = (on: boolean) => {
    brakeRef.current = on;
    setBraking(on);
  };

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 bg-[#2d3036] select-none overflow-hidden"
      style={{ touchAction: "none" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {screen === "title" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[radial-gradient(circle_at_50%_30%,#3949AB_0%,#1A1F3A_60%,#0B0D1A_100%)] p-6 overflow-y-auto">
          <div className="w-full max-w-md landscape:max-w-xl my-auto text-center text-white">
            <div className="text-6xl landscape:text-4xl mb-2">🚗🏙️</div>
            <h1 className="text-4xl font-black tracking-wide text-[#FFD54F] drop-shadow-[0_3px_0_#E65100]">城市狂飆</h1>
            <p className="mt-2 text-base font-bold text-white/85">俯視角的大城市，愛去哪就去哪！</p>
            {best > 0 && <p className="mt-1 text-sm font-bold text-[#FFD54F]">最多存到 ${best}</p>}
            <button
              type="button"
              onClick={start}
              className="mt-4 w-full rounded-2xl bg-[#FFC107] py-4 landscape:py-3 text-2xl font-black text-[#3E2723] shadow-[0_6px_0_#E65100] active:translate-y-1 active:shadow-[0_2px_0_#E65100]"
            >
              ▶ 開始
            </button>
            <ul className="mt-4 space-y-1.5 text-left text-sm font-bold text-white/80 bg-black/30 rounded-2xl p-4">
              <li>🕹️ 左下搖桿：走路，坐車時往哪裡推車就往哪裡開</li>
              <li>🚗 走到車子旁邊按「上車」，任何車都能開</li>
              <li>💰 撿路上的錢，鑽石最值錢</li>
              <li>🌀 按住「甩尾」可以漂移，📯 按喇叭讓路人讓開</li>
              <li>🚓 撞到人或警車會被通緝，躲開警察一陣子就沒事</li>
              <li>⌨️ 鍵盤：方向鍵移動、E 上下車、空白鍵甩尾、H 喇叭</li>
            </ul>
          </div>
        </div>
      )}

      {screen === "play" && (
        <>
          {/* 上方：錢、通緝星 */}
          <div className="absolute top-3 left-20 z-20 flex flex-col gap-1 pointer-events-none">
            <div className="rounded-xl bg-black/55 px-3 py-1 text-2xl font-black text-[#76FF03] tabular-nums drop-shadow">${hud.cash}</div>
            <div className="flex gap-0.5 text-xl leading-none drop-shadow">
              {Array.from({ length: MAX_WANTED }, (_, i) => (
                <span
                  key={i}
                  className={i < hud.wanted ? "text-[#FFD600] animate-pulse" : "text-white/25"}
                >
                  ★
                </span>
              ))}
            </div>
            {hud.inCar && (
              <div className="mt-1 w-24 rounded-full bg-black/50 p-0.5">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.max(4, hud.hp * 100)}%`,
                    backgroundColor: hud.hp > 0.5 ? "#76FF03" : hud.hp > 0.25 ? "#FFC400" : "#FF1744",
                  }}
                />
              </div>
            )}
          </div>

          {/* 右上：小地圖 */}
          <canvas
            ref={miniRef}
            className="absolute top-3 right-3 z-20 rounded-full shadow-lg pointer-events-none"
            style={{ width: MINI, height: MINI }}
          />

          {message && (
            <div className="absolute top-28 inset-x-0 z-20 flex justify-center pointer-events-none">
              <span className="rounded-2xl bg-black/70 px-4 py-2 text-lg font-black text-white shadow-lg animate-bounce-in">{message}</span>
            </div>
          )}

          {hud.busted && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="rounded-3xl bg-[#0D47A1]/90 border-4 border-[#FF1744] px-8 py-5 text-center text-white animate-bounce-in">
                <div className="text-5xl">🚓</div>
                <div className="mt-1 text-3xl font-black">被抓到了！</div>
              </div>
            </div>
          )}

          {/* 左下：搖桿 */}
          <RaidenStick
            className="absolute z-20 left-4 bottom-4 w-36 h-36 landscape:w-32 landscape:h-32"
            onMove={(dx, dy) => {
              stickRef.current = { dx, dy };
            }}
          />

          {/* 右下：按鈕 */}
          <div className="absolute z-20 right-4 bottom-4 flex items-end gap-3">
            <div className="flex flex-col gap-3">
              <button
                type="button"
                aria-label="喇叭"
                onPointerDown={(e) => {
                  e.preventDefault();
                  hornRef.current = true;
                }}
                className="w-14 h-14 rounded-full bg-[#FFB300] border-4 border-[#E65100] text-2xl shadow-[0_4px_0_#8d3b00] active:translate-y-0.5"
              >
                📯
              </button>
              {hud.inCar && (
                <button
                  type="button"
                  aria-label="甩尾（按住）"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    holdBrake(true);
                  }}
                  onPointerUp={() => holdBrake(false)}
                  onPointerCancel={() => holdBrake(false)}
                  className={`w-14 h-14 rounded-full border-4 text-2xl shadow-[0_4px_0_#311b92] ${
                    braking ? "bg-[#B388FF] border-white translate-y-0.5" : "bg-[#7C4DFF] border-[#4527A0]"
                  }`}
                >
                  🌀
                </button>
              )}
            </div>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                actionRef.current = true;
              }}
              className={`w-24 h-24 rounded-full border-4 font-black text-white text-lg leading-tight shadow-[0_5px_0_rgba(0,0,0,0.5)] active:translate-y-1 transition-colors ${
                hud.inCar
                  ? "bg-[#E53935] border-[#B71C1C]"
                  : hud.canEnter
                    ? "bg-[#43A047] border-[#1B5E20] animate-pulse"
                    : "bg-[#546E7A] border-[#37474F] opacity-70"
              }`}
            >
              <span className="block text-3xl">{hud.inCar ? "🚶" : "🚗"}</span>
              {hud.inCar ? "下車" : "上車"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
