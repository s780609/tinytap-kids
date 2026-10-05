"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import {
  BALL_R,
  FIELD_LEFT,
  FLOOR_Y,
  LANE_X,
  PIN_R,
  PLUNGER_MAX_PULL,
  PLUNGER_REST_Y,
  SLOT_COUNT,
  SLOT_SCORES,
  SLOT_TOP_Y,
  SLOT_W,
  TABLE_H,
  TABLE_W,
  createTable,
  isBallOnPlunger,
  releasePlunger,
  resetBall,
  setPlungerPull,
  stepTable,
  type NightMarketTable,
} from "@/lib/pinball/nightMarketPhysics";

const TOTAL_BALLS = 10;
// 以手機為主：上面留給分數，下面留給拉桿把手
const HUD_TOP = 48;
const CONTROLS_H = 64;
const KNOB_R = 20;
/** 手指往下拖這麼多 px 就算拉到底 */
const PULL_TRAVEL = 120;

/** 最高分的格子：分數牌用紅字、進球時播比較熱鬧的音效 */
const TOP_SCORE = Math.max(...SLOT_SCORES);

const RAINBOW = ["#F44336", "#FFEB3B", "#4CAF50", "#2196F3", "#9C27B0"];
/** 檯面上淡淡的卡通圖案：[圖案, x, y, 大小] */
const DECORATIONS: [string, number, number, number][] = [
  ["🎈", 110, 150, 46],
  ["⭐", 262, 140, 40],
  ["🐻", 185, 330, 84],
  ["🍡", 78, 430, 44],
  ["🍭", 292, 430, 44],
];

/** 跑馬燈燈泡的位置（檯面座標）：左邊由下往上、沿頂弧、右邊由上往下 */
const BULBS: [number, number][] = (() => {
  const side: number[] = [];
  for (let y = 245; y < TABLE_H; y += 45) side.push(y);
  const bulbs: [number, number][] = side.map((y) => [5, y]);
  bulbs.reverse();
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI + (Math.PI * i) / 20;
    bulbs.push([200 + 195 * Math.cos(a), 200 + 195 * Math.sin(a)]);
  }
  for (const y of side) bulbs.push([395, y]);
  return bulbs;
})();

interface View {
  w: number;
  h: number;
  dpr: number;
  scale: number;
  ox: number;
  oy: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  t: number;
}

export default function NightMarketPinballGame() {
  const { settings } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(TOTAL_BALLS);
  const [gameOver, setGameOver] = useState(false);

  const tableRef = useRef<NightMarketTable | null>(null);
  const viewRef = useRef<View | null>(null);
  const staticRef = useRef<HTMLCanvasElement | null>(null);
  const scoreRef = useRef(0);
  const ballsRef = useRef(TOTAL_BALLS);
  /** 拉桿拖曳狀態：哪一根手指在拉、起點在哪 */
  const pullRef = useRef<{ pointerId: number | null; startY: number }>({
    pointerId: null,
    startY: 0,
  });
  const keyPullRef = useRef(false);
  const readyRef = useRef(false);
  const visPullRef = useRef(0);
  /** 剛進球的格子（格子編號 → 時間），用來閃一下 */
  const flashRef = useRef(new Map<number, number>());
  const popupsRef = useRef<Popup[]>([]);
  const timeRef = useRef(0);
  const serveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  /** 放開拉桿：依下拉深度把彈珠打出去 */
  const release = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;
    if (releasePlunger(table) > 0) audioManager.whoosh();
  }, []);

  /** 建立新檯面並重置所有 ref 狀態（不動 React state） */
  const initTable = useCallback(() => {
    const table = createTable();
    resetBall(table);
    tableRef.current = table;
    scoreRef.current = 0;
    ballsRef.current = TOTAL_BALLS;
    pullRef.current.pointerId = null;
    popupsRef.current = [];
    flashRef.current.clear();
  }, []);

  const startGame = useCallback(() => {
    if (serveTimerRef.current) clearTimeout(serveTimerRef.current);
    initTable();
    setScore(0);
    setBallsLeft(TOTAL_BALLS);
    setGameOver(false);
  }, [initTable]);

  // ---------- 靜態底圖（夜空、機身、檯面、釘子、格子）只在尺寸改變時重畫 ----------
  const buildStatic = useCallback((view: View, table: NightMarketTable) => {
    const off = document.createElement("canvas");
    off.width = Math.round(view.w * view.dpr);
    off.height = Math.round(view.h * view.dpr);
    const ctx = off.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    // 夜市的夜空與遠處的燈火
    const bg = ctx.createLinearGradient(0, 0, 0, view.h);
    bg.addColorStop(0, "#1A1035");
    bg.addColorStop(1, "#3B1F4A");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, view.w, view.h);
    let seed = 11;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 26; i++) {
      const x = rand() * view.w;
      const y = rand() * view.h;
      const r = 18 + rand() * 36;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, i % 2 === 0 ? "rgba(255,183,77,0.22)" : "rgba(255,112,67,0.18)");
      g.addColorStop(1, "rgba(255,183,77,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 以下用檯面座標
    ctx.setTransform(
      view.dpr * view.scale,
      0,
      0,
      view.dpr * view.scale,
      view.dpr * view.ox,
      view.dpr * view.oy
    );

    // 黃色機身
    const body = ctx.createLinearGradient(0, 0, 0, TABLE_H);
    body.addColorStop(0, "#FFD54F");
    body.addColorStop(1, "#F9A825");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(-4, -4, TABLE_W + 8, TABLE_H + 8, 16);
    ctx.fill();

    // 彩虹邊框：沿著檯面外緣的五條色帶
    ctx.lineWidth = 2.2;
    ctx.lineCap = "butt";
    RAINBOW.forEach((color, k) => {
      const r = 199 - k * 2;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(200 - r, TABLE_H);
      ctx.lineTo(200 - r, 200);
      ctx.arc(200, 200, r, Math.PI, Math.PI * 2);
      ctx.lineTo(200 + r, TABLE_H);
      ctx.stroke();
    });

    // 機身上方兩角的燈籠
    ctx.font = "34px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText("🏮", 36, 44);
    ctx.fillText("🏮", 364, 44);

    // 粉紫色檯面
    ctx.beginPath();
    ctx.moveTo(FIELD_LEFT, TABLE_H);
    ctx.lineTo(FIELD_LEFT, 200);
    ctx.arc(200, 200, 190, Math.PI, Math.PI * 2);
    ctx.lineTo(390, TABLE_H);
    ctx.closePath();
    const field = ctx.createLinearGradient(0, 0, 0, TABLE_H);
    field.addColorStop(0, "#F8BBD0");
    field.addColorStop(1, "#CE93D8");
    ctx.fillStyle = field;
    ctx.fill();

    ctx.save();
    ctx.clip();
    // 檯面上的卡通圖案
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#000";
    for (const [emoji, x, y, size] of DECORATIONS) {
      ctx.font = `${size}px serif`;
      ctx.fillText(emoji, x, y);
    }
    ctx.globalAlpha = 1;
    // 發射軌道
    ctx.fillStyle = "rgba(74,20,140,0.3)";
    ctx.fillRect(LANE_X, 170, 390 - LANE_X, TABLE_H - 170);
    // 格子：隔一格上一點白，比較看得出一格一格
    for (let i = 0; i < SLOT_COUNT; i += 2) {
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(FIELD_LEFT + SLOT_W * i, SLOT_TOP_Y, SLOT_W, FLOOR_Y - SLOT_TOP_Y);
    }
    // 分數牌
    ctx.fillStyle = "#FFF176";
    ctx.fillRect(FIELD_LEFT, FLOOR_Y, LANE_X - FIELD_LEFT, TABLE_H - FLOOR_Y);
    ctx.font = "bold 17px Arial";
    for (let i = 0; i < SLOT_COUNT; i++) {
      ctx.fillStyle = SLOT_SCORES[i] === TOP_SCORE ? "#D50000" : "#5D4037";
      ctx.fillText(
        `${SLOT_SCORES[i]}`,
        FIELD_LEFT + SLOT_W * (i + 0.5),
        (FLOOR_Y + TABLE_H) / 2 + 1
      );
    }
    ctx.restore();

    // 牆
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#FFF8E1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const w of table.walls) {
      ctx.moveTo(w.ax, w.ay);
      ctx.lineTo(w.bx, w.by);
    }
    ctx.stroke();

    // 橘色的格子隔板
    ctx.strokeStyle = "#FB8C00";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 1; i < SLOT_COUNT; i++) {
      const x = FIELD_LEFT + SLOT_W * i;
      ctx.moveTo(x, SLOT_TOP_Y);
      ctx.lineTo(x, FLOOR_Y);
    }
    ctx.stroke();

    // 金屬釘子
    for (const p of table.pins) {
      ctx.fillStyle = "rgba(74,20,140,0.3)";
      ctx.beginPath();
      ctx.arc(p.x + 1.5, p.y + 2.5, PIN_R, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(p.x - 1.2, p.y - 1.2, 0.4, p.x, p.y, PIN_R);
      g.addColorStop(0, "#FFFFFF");
      g.addColorStop(0.5, "#B0BEC5");
      g.addColorStop(1, "#546E7A");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PIN_R, 0, Math.PI * 2);
      ctx.fill();
    }

    return off;
  }, []);

  const handleResize = useCallback(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const table = tableRef.current;
    if (!wrapper || !canvas || !table) return;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    if (w < 40 || h < 40) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const availH = h - HUD_TOP - CONTROLS_H;
    const scale = Math.min(w / TABLE_W, availH / TABLE_H);
    const view: View = {
      w,
      h,
      dpr,
      scale,
      ox: (w - TABLE_W * scale) / 2,
      oy: HUD_TOP + (availH - TABLE_H * scale) / 2,
    };
    viewRef.current = view;
    staticRef.current = buildStatic(view, table);
  }, [buildStatic]);

  // ---------- 主迴圈 ----------
  useEffect(() => {
    // 初始 state 已是新局的值，這裡只需要建立檯面
    initTable();
    handleResize();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(wrapper);

    const update = (dt: number) => {
      const table = tableRef.current;
      if (!table) return;
      // 鍵盤按住時拉桿慢慢往下
      if (keyPullRef.current) setPlungerPull(table, table.plunger.pull + 140 * dt);
      const events = stepTable(table, dt);
      let hitPin = false;
      for (const e of events) {
        if (e.type === "pin") {
          hitPin = true;
        } else if (e.type === "nudge") {
          audioManager.bubble();
        } else if (e.type === "slot") {
          scoreRef.current += e.score;
          setScore(scoreRef.current);
          popupsRef.current.push({
            x: e.x,
            y: SLOT_TOP_Y - 14,
            text: `+${e.score}`,
            t: timeRef.current,
          });
          flashRef.current.set(e.slot, timeRef.current);
          if (e.score === TOP_SCORE) audioManager.success();
          else audioManager.ding();
          ballsRef.current -= 1;
          setBallsLeft(ballsRef.current);
          if (ballsRef.current > 0) {
            serveTimerRef.current = setTimeout(() => {
              const t = tableRef.current;
              if (t && !t.ball) resetBall(t);
            }, 500);
          } else {
            // 等最後一顆的分數跳完再結算
            serveTimerRef.current = setTimeout(() => {
              setGameOver(true);
              audioManager.chime();
            }, 900);
          }
        }
      }
      if (hitPin) audioManager.pop();

      // 彈珠停在拉桿上時顯示「往下拉」提示；拉桿畫面位置平滑跟上
      readyRef.current = isBallOnPlunger(table);
      visPullRef.current += (table.plunger.pull - visPullRef.current) * Math.min(1, dt * 45);
      popupsRef.current = popupsRef.current.filter((p) => timeRef.current - p.t < 0.9);
    };

    const drawBall = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, BALL_R);
      g.addColorStop(0, "#FFFFFF");
      g.addColorStop(0.6, "#CFD8DC");
      g.addColorStop(1, "#607D8B");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(55,71,79,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = (ctx: CanvasRenderingContext2D, view: View, table: NightMarketTable) => {
      const time = timeRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (staticRef.current) ctx.drawImage(staticRef.current, 0, 0);
      ctx.setTransform(
        view.dpr * view.scale,
        0,
        0,
        view.dpr * view.scale,
        view.dpr * view.ox,
        view.dpr * view.oy
      );

      // 跑馬燈：每三顆亮一顆，一直往前跑
      const phase = Math.floor(time * 6);
      for (let i = 0; i < BULBS.length; i++) {
        const [x, y] = BULBS[i];
        const lit = (((i - phase) % 3) + 3) % 3 === 0;
        if (lit) {
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath();
          ctx.arc(x, y, 6.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = lit ? "#FFFDE7" : "#8D6E63";
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 剛進球的格子閃一下
      for (const [slot, at] of flashRef.current) {
        const flash = 1 - (time - at) / 0.4;
        if (flash <= 0) continue;
        ctx.fillStyle = `rgba(255,255,255,${flash * 0.7})`;
        ctx.fillRect(FIELD_LEFT + SLOT_W * slot, SLOT_TOP_Y, SLOT_W, FLOOR_Y - SLOT_TOP_Y);
      }

      // 單向門（彈珠進檯面後關上）
      if (table.ball && !table.ball.inLane) {
        const g = table.gate;
        ctx.strokeStyle = "#FFF8E1";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(g.ax, g.ay);
        ctx.lineTo(g.bx, g.by);
        ctx.stroke();
      }

      // 拉桿：頂板、彈簧、拉桿與把手
      {
        const px = (LANE_X + 390) / 2;
        const tipY = PLUNGER_REST_Y + visPullRef.current;
        const baseY = TABLE_H - 4;
        const knobY = tipY + 86;
        // 彈簧（拉越深壓得越扁）
        ctx.strokeStyle = "#ECEFF1";
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.beginPath();
        const coils = 7;
        ctx.moveTo(px, tipY + 5);
        for (let i = 1; i <= coils * 2; i++) {
          const y = tipY + 5 + ((baseY - tipY - 5) * i) / (coils * 2);
          ctx.lineTo(px + (i % 2 === 0 ? -8 : 8), y);
        }
        ctx.stroke();
        // 底座
        ctx.fillStyle = "#6D4C41";
        ctx.fillRect(LANE_X + 2, baseY, 390 - LANE_X - 4, 5);
        // 拉桿
        ctx.strokeStyle = "#B0BEC5";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px, baseY + 4);
        ctx.lineTo(px, knobY);
        ctx.stroke();
        // 頂板
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(px - 12, tipY, 24, 6, 3);
        ctx.fill();
        // 把手
        const pulling = pullRef.current.pointerId !== null || keyPullRef.current;
        const kg = ctx.createRadialGradient(px - 5, knobY - 5, 2, px, knobY, KNOB_R);
        kg.addColorStop(0, "#FFCDD2");
        kg.addColorStop(0.5, "#FF5252");
        kg.addColorStop(1, "#B71C1C");
        ctx.shadowColor = "#FF5252";
        ctx.shadowBlur = pulling ? 22 : 12;
        ctx.fillStyle = kg;
        ctx.beginPath();
        ctx.arc(px, knobY, KNOB_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // 提示：彈珠就緒時，把手外有一圈跳動的光環，旁邊有一隻往下比的手
        if (readyRef.current && !pulling) {
          const pulse = (Math.sin(time * 6) + 1) / 2;
          ctx.strokeStyle = `rgba(255,234,0,${0.9 - pulse * 0.6})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(px, knobY, KNOB_R + 4 + pulse * 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = "34px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#000";
          ctx.fillText("👇", px - 46, knobY - 10 + pulse * 12);
        }
      }

      // 彈珠：格子裡的和正在跑的
      for (const s of table.settled) drawBall(ctx, s.x, s.y);
      if (table.ball) drawBall(ctx, table.ball.x, table.ball.y);

      // 分數跳字
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 22px Arial";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      for (const p of popupsRef.current) {
        const age = (time - p.t) / 0.9;
        const alpha = Math.max(0, 1 - age);
        ctx.strokeStyle = `rgba(106,27,154,${alpha})`;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.strokeText(p.text, p.x, p.y - age * 30);
        ctx.fillText(p.text, p.x, p.y - age * 30);
      }
    };

    let last = 0;
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const view = viewRef.current;
      const table = tableRef.current;
      if (ctx && view && table) {
        const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 0;
        last = now;
        timeRef.current += dt;
        update(dt);
        draw(ctx, view, table);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    // 鍵盤（桌機）：按住空白鍵或 ↓ 拉桿，放開發射
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "ArrowDown") return;
      if (down) keyPullRef.current = true;
      else if (keyPullRef.current) {
        keyPullRef.current = false;
        release();
      }
      e.preventDefault();
    };
    const kd = onKey(true);
    const ku = onKey(false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    return () => {
      ro.disconnect();
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (serveTimerRef.current) clearTimeout(serveTimerRef.current);
    };
  }, [handleResize, initTable, release]);

  // ---------- 觸控：彈珠等發射時，在畫面任何地方按住往下拖就是拉拉桿，放開發射 ----------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    audioManager.init();
    const table = tableRef.current;
    if (!table || pullRef.current.pointerId !== null || !isBallOnPlunger(table)) return;
    pullRef.current = { pointerId: e.pointerId, startY: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 指標已失效時略過，拖曳狀態已記錄
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pull = pullRef.current;
    const table = tableRef.current;
    if (pull.pointerId !== e.pointerId || !table) return;
    const ratio = Math.max(0, Math.min(1, (e.clientY - pull.startY) / PULL_TRAVEL));
    setPlungerPull(table, ratio * PLUNGER_MAX_PULL);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pullRef.current.pointerId !== e.pointerId) return;
    pullRef.current.pointerId = null;
    // 有拉到才會發射；幾乎沒拉就放開，拉桿彈回原位可以再拉一次
    release();
  };

  return (
    <div
      className="fixed inset-0 bg-[#1A1035] select-none"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={wrapperRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* 分數與剩餘球數 */}
      <div className="fixed top-3 left-20 right-4 z-20 flex justify-end items-center gap-3 pointer-events-none">
        <div className="rounded-2xl px-4 py-1.5 bg-black/50 border border-[#FFD54F]/70 shadow-[0_0_12px_rgba(255,213,79,0.5)]">
          <span className="text-xs font-bold text-[#FFE082] mr-2">分數</span>
          <span className="text-2xl font-black text-[#FFEA00] tabular-nums">{score}</span>
        </div>
        <div className="rounded-2xl px-3 py-2 bg-black/50 border border-[#FF80AB]/70 text-lg font-black text-white leading-none tabular-nums">
          ⚪ × {ballsLeft}
        </div>
      </div>

      {/* 結束畫面 */}
      {gameOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-celebrate max-w-sm mx-4">
            <div className="text-6xl mb-3">🏮</div>
            <h2 className="text-3xl font-black text-[#FF69B4] mb-1">彈珠打完了！</h2>
            <p className="text-lg text-gray-500 mb-5">
              得到 <span className="font-black text-[#FFB74D]">{score}</span> 分
            </p>
            <button
              type="button"
              onClick={startGame}
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
