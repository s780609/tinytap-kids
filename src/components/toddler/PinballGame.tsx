"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audioManager } from "@/lib/audio/AudioManager";
import { useSettings } from "@/lib/settings/SettingsContext";
import {
  BALL_R,
  LANE_X,
  PLUNGER_MAX_PULL,
  PLUNGER_REST_Y,
  TABLE_H,
  TABLE_W,
  createTable,
  flipperTip,
  isBallOnPlunger,
  releasePlunger,
  resetBall,
  setPlungerPull,
  stepTable,
  type Flipper,
  type Table,
} from "@/lib/pinball/pinballPhysics";

const TOTAL_BALLS = 5;
/** 進檯面後這段時間內掉球會免費還一顆，避免一發射就沒了 */
const BALL_SAVE_SECONDS = 8;
// 以手機為主：上下只留必要的空間，檯面盡量放大
const HUD_TOP = 48;
const CONTROLS_H = 64;
const KNOB_R = 20;
/** 放大版拉桿視窗：把手大小與可以往下拉的距離（px） */
const BIG_KNOB = 64;
const BIG_TRAVEL = 120;
/** 擋板按鈕的最大 / 最小尺寸（px）；實際大小跟著檯面縮放，才不會兩顆疊在一起 */
const FLIPPER_BTN_MAX = 72;
const FLIPPER_BTN_MIN = 48;

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

const PLANET_COLORS: Record<string, [string, string]> = {
  "planet-a": ["#FF80AB", "#C51162"],
  "planet-b": ["#80D8FF", "#0277BD"],
  "planet-c": ["#FFD180", "#E65100"],
};

/** 坡道支撐柱的位置（檯面座標），立在欄杆外側 */
const RAMP_POSTS: [number, number][] = [
  [104, 380],
  [104, 300],
  [95, 208],
  [43, 208],
  [34, 290],
  [34, 370],
  [34, 440],
];

/** 黃色提示箭頭：尖端在 (x, y)，朝 angle 方向（0 = 往右） */
function hintArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#FFEA00";
  ctx.shadowColor = "#FFEA00";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-16, -11);
  ctx.lineTo(-16, 11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export default function PinballGame() {
  const { settings } = useSettings();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [score, setScore] = useState(0);
  const [ballsLeft, setBallsLeft] = useState(TOTAL_BALLS);
  const [gameOver, setGameOver] = useState(false);
  const [pressed, setPressed] = useState({ left: false, right: false });
  const [banner, setBanner] = useState<string | null>(null);
  /** 放大版拉桿視窗是否開著，以及目前拉了多少（0～1） */
  const [plungerOpen, setPlungerOpen] = useState(false);
  const [pullRatio, setPullRatio] = useState(0);
  const leftBtnRef = useRef<HTMLDivElement>(null);
  const rightBtnRef = useRef<HTMLDivElement>(null);

  const tableRef = useRef<Table | null>(null);
  const viewRef = useRef<View | null>(null);
  const staticRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef({ left: false, right: false });
  const pointersRef = useRef(new Map<number, "left" | "right">());
  const keysRef = useRef({ left: false, right: false });
  const scoreRef = useRef(0);
  const ballsRef = useRef(TOTAL_BALLS);
  const overRef = useRef(false);
  /** 拉桿拖曳狀態：哪一根手指在拉、起點在哪 */
  const pullRef = useRef<{ pointerId: number | null; startY: number }>({
    pointerId: null,
    startY: 0,
  });
  const keyPullRef = useRef(false);
  const readyRef = useRef(false);
  const visPullRef = useRef(0);
  const flashRef = useRef(new Map<string, number>());
  const popupsRef = useRef<Popup[]>([]);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const shakeRef = useRef(0);
  const saveUntilRef = useRef(0);
  const timeRef = useRef(0);
  const serveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    audioManager.init();
    audioManager.setVolume(settings.volume);
  }, [settings.volume]);

  const showBanner = useCallback((text: string, ms = 1600) => {
    setBanner(text);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setBanner(null), ms);
  }, []);

  const syncInput = useCallback(() => {
    let left = keysRef.current.left;
    let right = keysRef.current.right;
    for (const side of pointersRef.current.values()) {
      if (side === "left") left = true;
      else right = true;
    }
    const prev = inputRef.current;
    if (prev.left !== left || prev.right !== right) {
      inputRef.current = { left, right };
      setPressed({ left, right });
    }
  }, []);

  /** 放開拉桿：依下拉深度把彈珠打出去 */
  const release = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;
    if (releasePlunger(table) > 0) {
      audioManager.whoosh();
      setPlungerOpen(false);
    }
  }, []);

  /** 建立新檯面並重置所有 ref 狀態（不動 React state） */
  const initTable = useCallback(() => {
    const table = createTable();
    resetBall(table);
    tableRef.current = table;
    scoreRef.current = 0;
    ballsRef.current = TOTAL_BALLS;
    overRef.current = false;
    popupsRef.current = [];
    trailRef.current = [];
    flashRef.current.clear();
  }, []);

  const startGame = useCallback(() => {
    initTable();
    setScore(0);
    setBallsLeft(TOTAL_BALLS);
    setGameOver(false);
    setPlungerOpen(false);
  }, [initTable]);

  // ---------- 靜態底圖（星空、檯面、霓虹牆）只在尺寸改變時重畫 ----------
  const buildStatic = useCallback((view: View, table: Table) => {
    const off = document.createElement("canvas");
    off.width = Math.round(view.w * view.dpr);
    off.height = Math.round(view.h * view.dpr);
    const ctx = off.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

    // 太空背景
    const bg = ctx.createLinearGradient(0, 0, 0, view.h);
    bg.addColorStop(0, "#05071A");
    bg.addColorStop(1, "#1A0B3D");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, view.w, view.h);
    let seed = 7;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.6})`;
      ctx.beginPath();
      ctx.arc(rand() * view.w, rand() * view.h, rand() * 1.4 + 0.3, 0, Math.PI * 2);
      ctx.fill();
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

    // 檯面底色
    ctx.beginPath();
    ctx.moveTo(10, TABLE_H);
    ctx.lineTo(10, 200);
    ctx.arc(200, 200, 190, Math.PI, Math.PI * 2);
    ctx.lineTo(390, TABLE_H);
    ctx.closePath();
    const field = ctx.createLinearGradient(0, 0, 0, TABLE_H);
    field.addColorStop(0, "#1B1F5E");
    field.addColorStop(0.6, "#120E3F");
    field.addColorStop(1, "#0A0826");
    ctx.fillStyle = field;
    ctx.fill();

    // 星雲
    ctx.save();
    ctx.clip();
    const nebula = (x: number, y: number, r: number, color: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    nebula(90, 170, 170, "rgba(213,0,249,0.28)");
    nebula(290, 330, 190, "rgba(0,229,255,0.2)");
    nebula(150, 540, 170, "rgba(255,64,129,0.18)");
    // 軌道環裝飾
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    for (const r of [70, 120, 170]) {
      ctx.beginPath();
      ctx.ellipse(185, 300, r * 1.3, r * 0.55, -0.35, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 發射軌道
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(LANE_X, 170, 390 - LANE_X, TABLE_H - 170);
    ctx.fillStyle = "rgba(0,229,255,0.35)";
    for (let y = 250; y < TABLE_H - 60; y += 60) {
      ctx.beginPath();
      ctx.moveTo(375, y);
      ctx.lineTo(368, y + 12);
      ctx.lineTo(382, y + 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 霓虹牆
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const strokeWalls = (width: number, color: string, blur: number) => {
      ctx.shadowColor = "#00E5FF";
      ctx.shadowBlur = blur;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (const w of table.walls) {
        ctx.moveTo(w.ax, w.ay);
        ctx.lineTo(w.bx, w.by);
      }
      ctx.stroke();
    };
    strokeWalls(6, "rgba(0,229,255,0.55)", 14);
    strokeWalls(2.5, "#E0FFFF", 0);
    ctx.shadowBlur = 0;

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

    // 擋板按鈕對齊各自擋板的正下方
    const size = Math.max(
      FLIPPER_BTN_MIN,
      Math.min(FLIPPER_BTN_MAX, (table.flippers.right.px - table.flippers.left.px) * 0.64 * scale - 6)
    );
    const place = (el: HTMLDivElement | null, f: Flipper) => {
      if (!el) return;
      const midX = f.px + (Math.cos(f.restAngle) * f.length) / 2;
      el.style.left = `${view.ox + midX * scale}px`;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
    };
    place(leftBtnRef.current, table.flippers.left);
    place(rightBtnRef.current, table.flippers.right);
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

    const addScore = (n: number) => {
      scoreRef.current += n;
      setScore(scoreRef.current);
    };

    const update = (dt: number) => {
      const table = tableRef.current;
      if (!table || overRef.current) return;
      // 鍵盤按住時拉桿慢慢往下
      if (keyPullRef.current) setPlungerPull(table, table.plunger.pull + 140 * dt);
      const events = stepTable(table, dt, inputRef.current);
      for (const e of events) {
        if (e.type === "bumper") {
          addScore(e.score);
          flashRef.current.set(e.id, timeRef.current);
          popupsRef.current.push({ x: e.x, y: e.y - 30, text: `+${e.score}`, t: timeRef.current });
          shakeRef.current = 0.12;
          if (e.id.startsWith("planet")) audioManager.pop();
          else audioManager.bubble();
        } else if (e.type === "rollover") {
          addScore(e.score);
          popupsRef.current.push({ x: e.x, y: e.y - 20, text: `+${e.score}`, t: timeRef.current });
          audioManager.ding();
        } else if (e.type === "bonus") {
          addScore(e.score);
          showBanner(`⭐ 星星全亮！+${e.score} ⭐`, 2200);
          audioManager.success();
        } else if (e.type === "slingshot") {
          addScore(e.score);
          flashRef.current.set(e.id, timeRef.current);
          audioManager.bubble();
        } else if (e.type === "target") {
          addScore(e.score);
          popupsRef.current.push({ x: e.x - 30, y: e.y, text: `+${e.score}`, t: timeRef.current });
          audioManager.pop();
        } else if (e.type === "targetBank") {
          addScore(e.score);
          showBanner(`🎯 靶子全倒！+${e.score}`, 2000);
          audioManager.success();
        } else if (e.type === "wormhole") {
          addScore(e.score);
          popupsRef.current.push({ x: e.x, y: e.y - 26, text: `+${e.score}`, t: timeRef.current });
          trailRef.current = [];
          audioManager.whoosh();
        } else if (e.type === "warpOut") {
          trailRef.current = [];
          audioManager.bubble();
        } else if (e.type === "ramp") {
          addScore(e.score);
          popupsRef.current.push({ x: e.x + 30, y: e.y - 10, text: `+${e.score}`, t: timeRef.current });
          audioManager.ding();
        } else if (e.type === "kickback") {
          flashRef.current.set(`kickback-${e.side}`, timeRef.current);
          showBanner("🛟 彈回去！");
          audioManager.whoosh();
        } else if (e.type === "mission") {
          showBanner(e.stage === 1 ? "🎯 全倒！快進黑洞 🌀" : "🌀 穿越成功！衝上坡道 🚀", 2200);
        } else if (e.type === "missionComplete") {
          addScore(e.score);
          showBanner(`🎖️ 任務完成！+${e.score}　階級 ${e.rank}`, 2600);
          audioManager.success();
        } else if (e.type === "exitLane") {
          saveUntilRef.current = timeRef.current + BALL_SAVE_SECONDS;
        } else if (e.type === "drain") {
          trailRef.current = [];
          const saved = timeRef.current < saveUntilRef.current;
          if (!saved) {
            ballsRef.current -= 1;
            setBallsLeft(ballsRef.current);
          }
          if (saved) {
            audioManager.bubble();
            showBanner("球還給你，再來一次！🛟");
            serveTimerRef.current = setTimeout(() => {
              const t = tableRef.current;
              if (t && !overRef.current && !t.ball) resetBall(t);
            }, 700);
          } else if (ballsRef.current <= 0) {
            overRef.current = true;
            setGameOver(true);
            audioManager.chime();
          } else {
            audioManager.wrong();
            showBanner("哎呀！再來一顆 🚀");
            serveTimerRef.current = setTimeout(() => {
              const t = tableRef.current;
              if (t && !overRef.current && !t.ball) resetBall(t);
            }, 700);
          }
        }
      }

      // 彈珠停在拉桿上時顯示「往下拉」提示；拉桿畫面位置平滑跟上
      const b = table.ball;
      readyRef.current = isBallOnPlunger(table);
      visPullRef.current += (table.plunger.pull - visPullRef.current) * Math.min(1, dt * 45);

      if (b && !table.warp) {
        trailRef.current.push({ x: b.x, y: b.y });
        if (trailRef.current.length > 10) trailRef.current.shift();
      }
      popupsRef.current = popupsRef.current.filter((p) => timeRef.current - p.t < 0.9);
      if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current - dt);
    };

    const drawFlipper = (ctx: CanvasRenderingContext2D, f: Flipper) => {
      const tip = flipperTip(f);
      ctx.lineCap = "round";
      ctx.shadowColor = "#FF4081";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#FF4081";
      ctx.lineWidth = f.radius * 2;
      ctx.beginPath();
      ctx.moveTo(f.px, f.py);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#FFD1E0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(f.px, f.py);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(f.px, f.py, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = (ctx: CanvasRenderingContext2D, view: View, table: Table) => {
      const time = timeRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (staticRef.current) ctx.drawImage(staticRef.current, 0, 0);

      const shake = shakeRef.current > 0 ? Math.sin(time * 90) * 2.5 * (shakeRef.current / 0.12) : 0;
      ctx.setTransform(
        view.dpr * view.scale,
        0,
        0,
        view.dpr * view.scale,
        view.dpr * (view.ox + shake),
        view.dpr * view.oy
      );

      // 單向門（彈珠進檯面後關上）
      if (table.ball && !table.ball.inLane) {
        const g = table.gate;
        ctx.strokeStyle = "rgba(0,229,255,0.7)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(g.ax, g.ay);
        ctx.lineTo(g.bx, g.by);
        ctx.stroke();
      }

      // 星星通道燈
      for (const r of table.rollovers) {
        starPath(ctx, r.x, r.y, r.r + 2);
        if (r.lit) {
          ctx.shadowColor = "#FFEA00";
          ctx.shadowBlur = 16;
          ctx.fillStyle = "#FFEA00";
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = `rgba(255,234,0,${0.12 + Math.sin(time * 3 + r.x) * 0.05})`;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,234,0,0.55)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 黑洞（入口）與白洞（出口）
      {
        const wh = table.wormhole;
        const target = table.mission.stage === 1;
        const hole = ctx.createRadialGradient(wh.x, wh.y, 2, wh.x, wh.y, wh.r + 6);
        hole.addColorStop(0, "#000000");
        hole.addColorStop(0.65, "#1A0033");
        hole.addColorStop(1, "rgba(213,0,249,0)");
        ctx.fillStyle = hole;
        ctx.beginPath();
        ctx.arc(wh.x, wh.y, wh.r + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = target ? "#FFEA00" : "#EA80FC";
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = target ? 14 + Math.sin(time * 8) * 6 : 8;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        for (let k = 0; k < 3; k++) {
          const a = time * 3 + (k * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(wh.x, wh.y, wh.r - 3 + k * 2.5, a, a + 1.5);
          ctx.stroke();
        }
        const warping = table.warp ? 1 : 0;
        const outR = 13 + Math.sin(time * 4) * 2 + warping * 8;
        const out = ctx.createRadialGradient(wh.outX, wh.outY, 1, wh.outX, wh.outY, outR);
        out.addColorStop(0, `rgba(255,255,255,${0.55 + warping * 0.45})`);
        out.addColorStop(0.5, "rgba(128,216,255,0.35)");
        out.addColorStop(1, "rgba(128,216,255,0)");
        ctx.shadowBlur = 0;
        ctx.fillStyle = out;
        ctx.beginPath();
        ctx.arc(wh.outX, wh.outY, outR, 0, Math.PI * 2);
        ctx.fill();
      }

      // 出球道上方的單向導板
      ctx.strokeStyle = "rgba(0,229,255,0.7)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const d of table.deflectors) {
        ctx.moveTo(d.ax, d.ay);
        ctx.lineTo(d.bx, d.by);
      }
      ctx.stroke();

      // 出球道的救球燈
      for (const side of ["left", "right"] as const) {
        const x = side === "left" ? 24 : 346;
        const hitAt = flashRef.current.get(`kickback-${side}`);
        const flash = hitAt !== undefined ? Math.max(0, 1 - (time - hitAt) / 0.4) : 0;
        const lit = table.kickbacks[side] || flash > 0;
        ctx.fillStyle = lit ? "#69F0AE" : "rgba(105,240,174,0.15)";
        ctx.shadowColor = "#69F0AE";
        ctx.shadowBlur = lit ? 10 + flash * 14 : 0;
        ctx.beginPath();
        ctx.moveTo(x, 606);
        ctx.lineTo(x - 9, 622);
        ctx.lineTo(x + 9, 622);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 落靶
      for (const t of table.targets) {
        ctx.beginPath();
        ctx.roundRect(t.ax - 4, t.ay, 8, t.by - t.ay, 3);
        if (t.down) {
          ctx.strokeStyle = "rgba(255,171,64,0.3)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.shadowColor = "#FFAB40";
          ctx.shadowBlur = table.mission.stage === 0 ? 10 + Math.sin(time * 8) * 5 : 8;
          ctx.fillStyle = "#FFAB40";
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // 三角彈射板
      for (const sl of table.slingshots) {
        const hitAt = flashRef.current.get(sl.id);
        const flash = hitAt !== undefined ? Math.max(0, 1 - (time - hitAt) / 0.2) : 0;
        ctx.beginPath();
        ctx.moveTo(sl.ax, sl.ay);
        ctx.lineTo(sl.bx, sl.by);
        ctx.lineTo(sl.cx, sl.cy);
        ctx.closePath();
        ctx.fillStyle = `rgba(213,0,249,${0.22 + flash * 0.5})`;
        ctx.fill();
        ctx.strokeStyle = flash > 0 ? "#FFFFFF" : "#EA80FC";
        ctx.shadowColor = "#D500F9";
        ctx.shadowBlur = 10 + flash * 16;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(sl.ax, sl.ay);
        ctx.lineTo(sl.bx, sl.by);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 星球彈射器
      for (const bump of table.bumpers) {
        const [c1, c2] = PLANET_COLORS[bump.id] ?? ["#FFFFFF", "#888888"];
        const hitAt = flashRef.current.get(bump.id);
        const flash = hitAt !== undefined ? Math.max(0, 1 - (time - hitAt) / 0.25) : 0;
        const r = bump.r * (1 + flash * 0.18);
        // 光環
        ctx.strokeStyle = c1;
        ctx.globalAlpha = 0.35 + flash * 0.65;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bump.x, bump.y, r + 5 + flash * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // 本體
        const g = ctx.createRadialGradient(bump.x - r * 0.35, bump.y - r * 0.35, r * 0.1, bump.x, bump.y, r);
        g.addColorStop(0, flash > 0 ? "#FFFFFF" : c1);
        g.addColorStop(1, c2);
        ctx.shadowColor = c1;
        ctx.shadowBlur = 10 + flash * 20;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bump.x, bump.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // 星球條紋
        if (bump.r > 20) {
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(bump.x, bump.y, r * 1.35, r * 0.35, -0.4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 拉桿：頂板、彈簧、拉桿與把手
      {
        const px = (LANE_X + 390) / 2;
        const tipY = PLUNGER_REST_Y + visPullRef.current;
        const baseY = TABLE_H - 4;
        const knobY = tipY + 86;
        // 彈簧（拉越深壓得越扁）
        ctx.strokeStyle = "#CFD8DC";
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
        ctx.fillStyle = "#546E7A";
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
        ctx.fillStyle = "#ECEFF1";
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
        // 提示：彈珠就緒時，把手外有一圈跳動的光環，旁邊有一隻手指示「點這裡」
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
          ctx.fillText("👉", px - 46 + pulse * 6, knobY - 4);
        }
      }

      // 擋板
      drawFlipper(ctx, table.flippers.left);
      drawFlipper(ctx, table.flippers.right);

      // 彈珠與拖尾
      const trail = trailRef.current;
      for (let i = 0; i < trail.length; i++) {
        const a = (i + 1) / trail.length;
        ctx.fillStyle = `rgba(128,216,255,${a * 0.28})`;
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, BALL_R * (0.4 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      const b = table.ball;
      // 在坡道上的彈珠畫大一點，看起來在上層
      const drawBall = (r: number) => {
        if (!b || table.warp) return;
        if (b.onRamp) {
          // 彈珠落在坡道面上的影子
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.beginPath();
          ctx.ellipse(b.x + 3, b.y + 6, r, r * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        const g =ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, r);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(0.6, "#CFD8DC");
        g.addColorStop(1, "#78909C");
        ctx.shadowColor = "#80D8FF";
        ctx.shadowBlur = 12;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      };
      if (!b?.onRamp) drawBall(BALL_R);

      // 坡道（上層，蓋在下層的彈珠上面）
      {
        const ramp = table.ramp;
        const target = table.mission.stage === 2;
        const tracePath = () => {
          ctx.beginPath();
          ramp.path.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        };
        const traceRails = () => {
          ctx.beginPath();
          for (const r of ramp.rails) {
            ctx.moveTo(r.ax, r.ay);
            ctx.lineTo(r.bx, r.by);
          }
        };
        // 入口和出口貼著檯面、越往上越高：用上下漸層讓兩端淡、高處實
        const lift = (color: string, low: number, high: number) => {
          const g = ctx.createLinearGradient(0, 455, 0, 385);
          g.addColorStop(0, `rgba(${color},${low})`);
          g.addColorStop(1, `rgba(${color},${high})`);
          return g;
        };
        ctx.lineCap = "butt";
        ctx.lineJoin = "round";

        // 落在檯面上的影子（往右下偏移，越高的地方越明顯）
        ctx.save();
        ctx.translate(9, 12);
        ctx.strokeStyle = lift("0,0,0", 0, 0.5);
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 28;
        tracePath();
        ctx.stroke();
        // 支撐柱的影子
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (const [px, py] of RAMP_POSTS) {
          ctx.moveTo(px - 9, py - 12);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
        ctx.lineCap = "butt";

        // 坡道面：不透明的深色板子，蓋住下面的東西才像在上層
        ctx.strokeStyle = lift("24,38,84", 0.35, 0.94);
        ctx.lineWidth = 27;
        tracePath();
        ctx.stroke();
        ctx.strokeStyle = lift("130,200,255", 0.05, 0.16);
        ctx.lineWidth = 14;
        tracePath();
        ctx.stroke();

        // 橫向的軌枕
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        let next = 12;
        let walked = 0;
        for (let i = 0; i < ramp.path.length - 1; i++) {
          const p = ramp.path[i];
          const q = ramp.path[i + 1];
          const len = Math.hypot(q.x - p.x, q.y - p.y);
          const ux = (q.x - p.x) / len;
          const uy = (q.y - p.y) / len;
          while (next <= walked + len) {
            const d = next - walked;
            const x = p.x + ux * d;
            const y = p.y + uy * d;
            ctx.moveTo(x - uy * 11, y + ux * 11);
            ctx.lineTo(x + uy * 11, y - ux * 11);
            next += 20;
          }
          walked += len;
        }
        ctx.stroke();

        // 入口斜坡：下緣貼著檯面（亮），往上爬到坡道面（暗），橫紋越往上越密
        {
          const e = ramp.entry;
          const left = e.x0 - 3;
          const bottom = e.y + 8;
          const top = e.y - 36;
          const rightAt = (y: number) => left + 26 + (15 * (y - top)) / (bottom - top);
          ctx.beginPath();
          ctx.moveTo(left, bottom);
          ctx.lineTo(rightAt(bottom), bottom);
          ctx.lineTo(rightAt(top), top);
          ctx.lineTo(left, top);
          ctx.closePath();
          const slope = ctx.createLinearGradient(0, bottom, 0, top);
          slope.addColorStop(0, target ? "rgba(255,234,0,0.75)" : "rgba(105,240,174,0.75)");
          slope.addColorStop(0.45, "rgba(52,110,130,0.95)");
          slope.addColorStop(1, "rgba(24,38,84,0.94)");
          ctx.fillStyle = slope;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let y = bottom - 9, gap = 9; y > top + 2; gap *= 0.8, y -= gap) {
            ctx.moveTo(left + 2, y);
            ctx.lineTo(rightAt(y) - 2, y);
          }
          ctx.stroke();
          // 往上跑的箭頭
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          for (let k = 0; k < 3; k++) {
            const y = bottom - 8 - k * 11;
            const cx = (left + rightAt(y)) / 2;
            const pulse = (Math.sin(time * 7 - k * 1.2) + 1) / 2;
            ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse * 0.7})`;
            ctx.beginPath();
            ctx.moveTo(cx - 8, y + 4);
            ctx.lineTo(cx, y - 3);
            ctx.lineTo(cx + 8, y + 4);
            ctx.stroke();
          }
          // 斜坡下緣
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(left, bottom);
          ctx.lineTo(rightAt(bottom), bottom);
          ctx.stroke();
        }

        // 欄杆：先畫深色的側壁，再疊上發光的扶手
        ctx.lineCap = "round";
        ctx.strokeStyle = "#0B1030";
        ctx.lineWidth = 6;
        traceRails();
        ctx.stroke();
        ctx.strokeStyle = target ? "#FFEA00" : "#69F0AE";
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = target ? 12 + Math.sin(time * 8) * 5 : 8;
        ctx.lineWidth = 2.5;
        traceRails();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 支撐柱：欄杆外側的金屬柱頭
        for (const [px, py] of RAMP_POSTS) {
          const g = ctx.createRadialGradient(px - 1.5, py - 1.5, 0.5, px, py, 4.5);
          g.addColorStop(0, "#FFFFFF");
          g.addColorStop(0.5, "#B0BEC5");
          g.addColorStop(1, "#37474F");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#0B1030";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      if (b?.onRamp) drawBall(BALL_R * 1.3);

      // 任務提示箭頭：指向現在該打的目標
      {
        const bob = Math.sin(time * 6) * 4;
        const stage = table.mission.stage;
        if (stage === 0) hintArrow(ctx, 340 + bob, 329, 0);
        else if (stage === 1) hintArrow(ctx, table.wormhole.x, table.wormhole.y - 24 + bob, Math.PI / 2);
        else hintArrow(ctx, 92, 452 + bob, -Math.PI / 2);
      }

      // 階級（檯面左上角，弧線外側）
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "#FFEA00";
      ctx.fillText(`🎖️${table.mission.rank}`, 36, 40);

      // 分數跳字
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 18px Arial";
      for (const p of popupsRef.current) {
        const age = (time - p.t) / 0.9;
        ctx.fillStyle = `rgba(255,234,0,${1 - age})`;
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

    // 鍵盤（桌機）：← → 擋板；按住空白鍵或 ↓ 拉桿，放開發射
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keysRef.current.left = down;
      else if (e.key === "ArrowRight") keysRef.current.right = down;
      else if (e.key === " " || e.key === "ArrowDown") {
        if (down) keyPullRef.current = true;
        else if (keyPullRef.current) {
          keyPullRef.current = false;
          release();
        }
      } else return;
      e.preventDefault();
      syncInput();
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
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [handleResize, initTable, release, showBanner, syncInput]);

  // ---------- 觸控：擋板只有按在 ◀ ▶ 按鈕上才會動；彈珠等發射時點右半邊畫面會跳出放大版拉桿 ----------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-plunger]")) return;
    audioManager.init();
    const flipper = target.closest<HTMLElement>("[data-flipper]")?.dataset.flipper;
    if (flipper === "left" || flipper === "right") {
      pointersRef.current.set(e.pointerId, flipper);
      syncInput();
      return;
    }
    // 拉桿視窗開著時點外面就關掉
    if (plungerOpen) {
      setPlungerOpen(false);
      return;
    }
    const table = tableRef.current;
    if (table && e.clientX >= window.innerWidth / 2 && isBallOnPlunger(table)) {
      setPullRatio(0);
      setPlungerOpen(true);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.delete(e.pointerId)) syncInput();
  };

  // ---------- 放大版拉桿：在視窗裡任何地方按住往下拖，放開就發射 ----------
  const onPlungerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pullRef.current.pointerId !== null) return;
    pullRef.current = { pointerId: e.pointerId, startY: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 指標已失效時略過，拖曳狀態已記錄
    }
  };

  const onPlungerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pull = pullRef.current;
    const table = tableRef.current;
    if (pull.pointerId !== e.pointerId || !table) return;
    const ratio = Math.max(0, Math.min(1, (e.clientY - pull.startY) / BIG_TRAVEL));
    setPlungerPull(table, ratio * PLUNGER_MAX_PULL);
    setPullRatio(ratio);
  };

  const onPlungerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pullRef.current.pointerId !== e.pointerId) return;
    pullRef.current.pointerId = null;
    setPullRatio(0);
    // 有拉到才會發射並關掉視窗；幾乎沒拉就放開，視窗留著可以再拉一次
    release();
  };

  const flipperBtnClass = (on: boolean) =>
    `fixed bottom-1 z-20 -translate-x-1/2 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 border-[#FF80AB] transition-transform ${
      on ? "bg-[#FF4081] scale-90 shadow-[0_0_24px_#FF4081]" : "bg-[#FF4081]/50"
    }`;

  return (
    <div
      className="fixed inset-0 bg-[#05071A] select-none"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div ref={wrapperRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* 分數與剩餘球數 */}
      <div className="fixed top-3 left-20 right-4 z-20 flex justify-end items-center gap-3 pointer-events-none">
        <div className="rounded-2xl px-4 py-1.5 bg-black/50 border border-[#00E5FF]/60 shadow-[0_0_12px_rgba(0,229,255,0.5)]">
          <span className="text-xs font-bold text-[#80D8FF] mr-2">分數</span>
          <span className="text-2xl font-black text-[#FFEA00] tabular-nums">{score}</span>
        </div>
        <div className="rounded-2xl px-3 py-2 bg-black/50 border border-[#FF4081]/60 text-lg leading-none">
          {Array.from({ length: TOTAL_BALLS }).map((_, i) => (
            <span key={i} className={i < ballsLeft ? "" : "opacity-20"}>
              ⚪
            </span>
          ))}
        </div>
      </div>

      {/* 訊息橫幅 */}
      {banner && (
        <div className="fixed top-24 left-0 right-0 z-30 flex justify-center pointer-events-none">
          <div
            key={banner}
            className="rounded-2xl px-5 py-2 bg-black/70 border border-[#FFEA00] text-xl font-black text-[#FFEA00] animate-bounce-in shadow-[0_0_18px_rgba(255,234,0,0.6)]"
          >
            {banner}
          </div>
        </div>
      )}

      {/* 擋板按鈕：只有按在按鈕上才會動；位置和大小在 handleResize 裡對齊上方的擋板 */}
      <div ref={leftBtnRef} data-flipper="left" className={flipperBtnClass(pressed.left)}>
        ◀
      </div>
      <div ref={rightBtnRef} data-flipper="right" className={flipperBtnClass(pressed.right)}>
        ▶
      </div>

      {/* 放大版拉桿視窗 */}
      {plungerOpen && !gameOver && (
        <div
          data-plunger
          className="fixed right-2 bottom-24 z-30 w-[104px] rounded-3xl bg-black/85 border-2 border-[#00E5FF] shadow-[0_0_24px_rgba(0,229,255,0.6)] p-2 animate-bounce-in"
          style={{ touchAction: "none" }}
          onPointerDown={onPlungerDown}
          onPointerMove={onPlungerMove}
          onPointerUp={onPlungerUp}
          onPointerCancel={onPlungerUp}
        >
          <div className="text-center text-sm font-black text-[#FFEA00]">👇 往下拉</div>
          <div
            className="relative mx-auto mt-1 w-[72px] rounded-full bg-white/10 border border-white/20"
            style={{ height: BIG_KNOB + BIG_TRAVEL + 8 }}
          >
            {/* 彈簧：拉越深拉得越長 */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-1 w-4"
              style={{
                height: pullRatio * BIG_TRAVEL + BIG_KNOB / 2,
                background:
                  "repeating-linear-gradient(to bottom, #CFD8DC 0 3px, transparent 3px 8px)",
              }}
            />
            <div
              className="absolute left-[3px] rounded-full border-2 border-white/70"
              style={{
                top: 3 + pullRatio * BIG_TRAVEL,
                width: BIG_KNOB,
                height: BIG_KNOB,
                background: "radial-gradient(circle at 35% 35%, #FFCDD2, #FF5252 55%, #B71C1C)",
                boxShadow: `0 0 ${12 + pullRatio * 24}px #FF5252`,
              }}
            />
          </div>
        </div>
      )}

      {/* 結束畫面 */}
      {gameOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-celebrate max-w-sm mx-4">
            <div className="text-6xl mb-3">🪐</div>
            <h2 className="text-3xl font-black text-[#FF69B4] mb-1">太空任務完成！</h2>
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
