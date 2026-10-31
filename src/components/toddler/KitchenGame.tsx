"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import { ParticleEngine } from "@/lib/particles/ParticleEngine";
import ParticleCanvas from "@/components/baby/ParticleCanvas";
import { midiToFreq, parseMelody } from "@/lib/rhythm/music";
import {
  DISHES,
  HAPPY_BIRTHDAY,
  TOPPINGS,
  acceptsDrop,
  addItem,
  candleCount,
  clampToRegion,
  drawOrder,
  type Dish,
  type Placed,
  type ToppingId,
} from "@/lib/kitchen/kitchen";
import { DISH_VIEWBOX, DishBase, PlacedArt, ToppingIcon } from "@/components/toddler/kitchen/KitchenArt";

type Phase = "cook" | "candles" | "done";

interface Drag {
  topping: ToppingId;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
  /** 拖曳中圖案的大小，跟放到料理上一樣大 */
  size: number;
}

/** 拖曳時圖案浮在手指上方一點，才看得到要放在哪 */
const LIFT = 36;
/** 移動超過幾 px 才算拖曳，不然當成點一下 */
const DRAG_PX = 10;

/** 選單上的範例料理 */
const PREVIEWS: Record<Dish["id"], Placed[]> = {
  pancake: [
    { key: 1, topping: "syrup", x: 96, y: 92, rot: 0, scale: 1.4 },
    { key: 2, topping: "butter", x: 100, y: 88, rot: 0, scale: 1.1 },
    { key: 3, topping: "strawberry", x: 70, y: 92, rot: -20, scale: 1 },
    { key: 4, topping: "strawberry", x: 128, y: 96, rot: 15, scale: 1 },
    { key: 5, topping: "blueberry", x: 110, y: 104, rot: 0, scale: 1 },
  ],
  cake: [
    { key: 1, topping: "candlePink", x: 80, y: 84, rot: 0, scale: 1 },
    { key: 2, topping: "candleBlue", x: 100, y: 80, rot: 0, scale: 1 },
    { key: 3, topping: "candleYellow", x: 120, y: 86, rot: 0, scale: 1 },
    { key: 4, topping: "strawberry", x: 64, y: 94, rot: -10, scale: 1 },
    { key: 5, topping: "strawberry", x: 138, y: 96, rot: 10, scale: 1 },
    { key: 6, topping: "rosette", x: 100, y: 98, rot: 0, scale: 1 },
  ],
  pizza: [
    { key: 1, topping: "cheese", x: 80, y: 80, rot: 0, scale: 1.6 },
    { key: 2, topping: "cheese", x: 120, y: 118, rot: 40, scale: 1.6 },
    { key: 3, topping: "pepperoni", x: 100, y: 70, rot: 0, scale: 1.2 },
    { key: 4, topping: "pepperoni", x: 70, y: 112, rot: 0, scale: 1.2 },
    { key: 5, topping: "pepperoni", x: 130, y: 90, rot: 0, scale: 1.2 },
    { key: 6, topping: "pepper", x: 100, y: 102, rot: 30, scale: 1.1 },
    { key: 7, topping: "mushroom", x: 104, y: 134, rot: -10, scale: 1.1 },
  ],
};

export default function KitchenGame() {
  const { settings } = useSettings();
  const [dishIdx, setDishIdx] = useState<number | null>(null);
  const [items, setItems] = useState<Placed[]>([]);
  const [phase, setPhase] = useState<Phase>("cook");
  const [lit, setLit] = useState<number[]>([]);
  const [blown, setBlown] = useState<number[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  /** 選好的配料：點料理就放在點的地方（沒選就用左邊第一個） */
  const [selected, setSelected] = useState<ToppingId | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const keyRef = useRef(1);
  const songBusRef = useRef<GainNode | null>(null);
  const celebrateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dish = dishIdx === null ? null : DISHES[dishIdx];

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  const stopSong = useCallback(() => {
    songBusRef.current?.disconnect();
    songBusRef.current = null;
  }, []);

  useEffect(
    () => () => {
      stopSong();
      if (celebrateRef.current) clearTimeout(celebrateRef.current);
    },
    [stopSong]
  );

  const reset = useCallback(() => {
    stopSong();
    if (celebrateRef.current) clearTimeout(celebrateRef.current);
    setItems([]);
    setPhase("cook");
    setLit([]);
    setBlown([]);
    setDrag(null);
    setSelected(null);
  }, [stopSong]);

  const openDish = (i: number) => {
    audioManager.pop();
    reset();
    setDishIdx(i);
  };

  const toMenu = () => {
    audioManager.pop();
    reset();
    setDishIdx(null);
  };

  /** 螢幕座標 → 料理的 200×200 座標（viewBox 有裁切、置中，用 CTM 換算最準） */
  const toFood = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const pt = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };

  const place = (topping: ToppingId, spot: { x: number; y: number }) => {
    if (!dish || phase !== "cook") return;
    const info = TOPPINGS[topping];
    const next = addItem(items, {
      key: keyRef.current++,
      topping,
      x: spot.x,
      y: spot.y,
      rot: info.spin ? Math.random() * 360 : (Math.random() - 0.5) * 16,
      scale: info.candle ? 1 : 0.9 + Math.random() * 0.25,
    });
    if (!next) {
      // 蠟燭插滿了
      audioManager.wrong();
      return;
    }
    setItems(next);
    if (info.sound === "bubble") audioManager.bubble();
    else if (info.sound === "sand") audioManager.sand();
    else audioManager.pop();
  };

  /** 點料理：把選好的配料放在點的地方 */
  const onFoodDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dish || phase !== "cook") return;
    const p = toFood(e.clientX, e.clientY);
    if (!p || !acceptsDrop(dish.region, p.x, p.y)) return;
    place(selected ?? dish.left[0], clampToRegion(dish.region, p.x, p.y));
  };

  // ---------- 配料按鈕：點一下選起來，或直接拖到料理上 ----------

  const onTrayDown = (topping: ToppingId) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (phase !== "cook") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    audioManager.pop();
    audioManager.speak(TOPPINGS[topping].name);
    setSelected(topping);
    // 每單位幾 px：放到料理上多大，拖的時候就多大
    const unit = svgRef.current?.getScreenCTM()?.a ?? 1.5;
    setDrag({
      size: unit * 26,
      topping,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    });
  };

  const onTrayMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_PX;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };

  const onTrayUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== e.pointerId || !dish) return;
    setDrag(null);
    if (!drag.moved) return;
    const p = toFood(e.clientX, e.clientY - LIFT);
    if (p && acceptsDrop(dish.region, p.x, p.y)) place(drag.topping, clampToRegion(dish.region, p.x, p.y));
  };

  // ---------- 完成 / 蠟燭 ----------

  const celebrate = () => {
    setPhase("done");
    audioManager.chime();
    audioManager.playFile("/sounds/voices/great-job.mp3");
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    engineRef.current?.confetti(cx, cy, 40);
    celebrateRef.current = setTimeout(() => {
      engineRef.current?.confetti(cx - rect.width / 3, cy, 25);
      engineRef.current?.confetti(cx + rect.width / 3, cy, 25);
    }, 350);
  };

  const playBirthday = () => {
    stopSong();
    const ctx = audioManager.context;
    const bus = audioManager.createMusicBus();
    if (!ctx || !bus) return;
    songBusRef.current = bus;
    const spb = 60 / HAPPY_BIRTHDAY.bpm;
    let t = ctx.currentTime + 0.3;
    for (const n of parseMelody(HAPPY_BIRTHDAY.melody)) {
      if (n.midi !== null) audioManager.scheduleNote(bus, midiToFreq(n.midi), t, n.beats * spb * 0.9);
      t += n.beats * spb;
    }
  };

  const finish = () => {
    if (!dish || items.length === 0) return;
    if (dish.id === "cake" && candleCount(items) > 0) {
      audioManager.ding();
      setLit(items.filter((p) => TOPPINGS[p.topping].candle).map((p) => p.key));
      setPhase("candles");
      playBirthday();
      return;
    }
    celebrate();
  };

  const blowOut = (keys: number[]) => {
    const left = lit.filter((k) => !keys.includes(k));
    if (left.length === lit.length) return;
    audioManager.whoosh();
    setLit(left);
    setBlown((prev) => [...prev, ...keys]);
    if (left.length === 0) {
      stopSong();
      celebrate();
    }
  };

  // ---------- 選料理 ----------
  if (!dish || dishIdx === null) {
    return (
      <div className="flex flex-col items-center h-dvh overflow-y-auto p-6 pt-20 landscape:pt-5 pb-10 gap-4 landscape:gap-2 select-none">
        <h1 className="text-3xl md:text-4xl font-black text-[#FF8A65] animate-bounce-in">🍳 小小廚房</h1>
        <p className="text-lg font-bold text-[#4A4A4A]">選一道料理來做！</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          {DISHES.map((d, i) => (
            <button
              key={d.id}
              type="button"
              onClick={() => openDish(i)}
              className="flex flex-col items-center rounded-3xl p-3 shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: d.color }}
            >
              <span className="w-full max-w-[240px] landscape:max-w-[170px] aspect-[4/3] rounded-2xl bg-white/85 p-1">
                <svg viewBox={DISH_VIEWBOX[d.id]} className="w-full h-full" aria-hidden>
                  <DishBase id={d.id} />
                  {drawOrder(PREVIEWS[d.id]).map((p) => (
                    <PlacedArt key={p.key} p={p} animate={false} />
                  ))}
                </svg>
              </span>
              <span className="mt-2 text-2xl font-black text-white">{d.title}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- 做料理 ----------
  const cooking = phase === "cook";
  const trayStyle = { visibility: cooking ? "visible" : "hidden" } as const;

  const trayButton = (id: ToppingId) => (
    <button
      key={id}
      type="button"
      aria-label={TOPPINGS[id].name}
      onPointerDown={onTrayDown(id)}
      onPointerMove={onTrayMove}
      onPointerUp={onTrayUp}
      onPointerCancel={() => setDrag(null)}
      onContextMenu={(e) => e.preventDefault()}
      className={`kitchen-btn flex items-center justify-center rounded-2xl bg-white shadow-md active:scale-90 transition-transform ${
        (selected ?? dish.left[0]) === id ? "ring-4 ring-[#FF7043] scale-105" : ""
      }`}
      style={{ touchAction: "none" }}
    >
      <ToppingIcon id={id} size="78%" />
    </button>
  );

  return (
    <div className="kitchen-layout select-none" style={{ background: "linear-gradient(#FFF3E0, #FFE0B2)" }}>
      <ParticleCanvas engineRef={engineRef} />

      {/* 左邊一排 */}
      <div className="kitchen-left flex flex-col items-center justify-evenly" style={trayStyle}>
        {dish.left.map(trayButton)}
      </div>

      {/* 上方：料理名、重來 */}
      <div className="kitchen-top flex flex-wrap items-center justify-center content-center gap-x-3 gap-y-0.5">
        <span className="text-xl md:text-2xl font-black" style={{ color: dish.color }}>
          {phase === "done" ? (dish.id === "cake" && blown.length > 0 ? "🎉 生日快樂！" : "😋 好好吃！") : dish.title}
        </span>
        {cooking && items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              audioManager.whoosh();
              reset();
            }}
            className="px-3 py-1.5 rounded-full bg-white text-sm font-bold text-[#8D6E63] shadow active:scale-95"
          >
            🔄 重來
          </button>
        )}
        <span className="basis-full text-center text-xs font-bold text-[#8D6E63]/60 landscape:hidden">手機轉橫的更好玩 ↻</span>
      </div>

      {/* 中間：料理 */}
      <div className="kitchen-food relative min-h-0 min-w-0">
        <svg
          ref={svgRef}
          viewBox={DISH_VIEWBOX[dish.id]}
          className={`absolute inset-0 w-full h-full ${phase === "done" ? "kitchen-yum" : ""}`}
          style={{ touchAction: "none" }}
          onPointerDown={onFoodDown}
        >
          <DishBase id={dish.id} />
          {drawOrder(items).map((p) => (
            <PlacedArt
              key={p.key}
              p={p}
              lit={lit.includes(p.key)}
              blown={blown.includes(p.key)}
              onBlow={() => blowOut([p.key])}
            />
          ))}
        </svg>
        {cooking && items.length === 0 && (
          <div className="absolute inset-x-0 bottom-1 flex justify-center pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-white/90 text-sm font-bold text-[#8D6E63] shadow animate-bounce-in">
              先點一個配料，再點{dish.title}放上去 👆
            </span>
          </div>
        )}
        {phase === "candles" && (
          <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-white/90 text-sm font-bold text-[#EC407A] shadow animate-bounce-in">
              🎵 祝你生日快樂～ 點火焰把蠟燭吹熄！
            </span>
          </div>
        )}
      </div>

      {/* 右邊：完成 + 一排配料 */}
      <div className="kitchen-right flex flex-col items-center justify-evenly" style={trayStyle}>
        {dish.right.map(trayButton)}
      </div>
      <div className="kitchen-done flex items-center justify-center">
        {cooking && (
          <button
            type="button"
            onClick={finish}
            disabled={items.length === 0}
            className="w-full h-12 rounded-2xl bg-[#66BB6A] text-white text-lg font-black shadow-md active:scale-95 disabled:opacity-40"
          >
            完成
          </button>
        )}
      </div>

      {/* 下面一排 */}
      <div className="kitchen-bottom flex items-center justify-center gap-2 px-2">
        {cooking && dish.bottom.map(trayButton)}
        {phase === "candles" && (
          <button
            type="button"
            onClick={() => blowOut(lit)}
            className="h-14 px-6 rounded-full bg-[#4FC3F7] text-white text-xl font-black shadow-lg active:scale-95"
          >
            💨 呼～一起吹熄
          </button>
        )}
        {phase === "done" && (
          <>
            <button
              type="button"
              onClick={() => {
                audioManager.pop();
                reset();
              }}
              className="h-14 px-5 rounded-full bg-[#FF8A65] text-white text-lg font-black shadow-lg active:scale-95"
            >
              🔁 再做一個
            </button>
            <button
              type="button"
              onClick={toMenu}
              className="h-14 px-5 rounded-full bg-white text-[#8D6E63] text-lg font-black shadow-lg active:scale-95"
            >
              🍽️ 換料理
            </button>
          </>
        )}
      </div>

      {/* 拖曳中的配料 */}
      {drag?.moved && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{ left: drag.x - drag.size / 2, top: drag.y - LIFT - drag.size / 2, width: drag.size, height: drag.size }}
        >
          <ToppingIcon id={drag.topping} size="100%" />
        </div>
      )}
    </div>
  );
}
