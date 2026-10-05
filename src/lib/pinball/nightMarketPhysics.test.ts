import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BALL_R,
  FIELD_LEFT,
  FLOOR_Y,
  LANE_X,
  PIN_R,
  PLUNGER_MAX_PULL,
  PLUNGER_MAX_SPEED,
  PLUNGER_MIN_SPEED,
  PLUNGER_REST_Y,
  SLOT_COUNT,
  SLOT_SCORES,
  SLOT_TOP_Y,
  SLOT_W,
  TABLE_H,
  TABLE_W,
  createTable,
  isBallOnPlunger,
  launchBall,
  plungerTipY,
  releasePlunger,
  resetBall,
  setPlungerPull,
  slotAt,
  stepTable,
  type NightMarketEvent,
  type NightMarketTable,
} from "./nightMarketPhysics.ts";

type SlotEvent = Extract<NightMarketEvent, { type: "slot" }>;
const isSlot = (e: NightMarketEvent): e is SlotEvent => e.type === "slot";
const types = (events: NightMarketEvent[]) => events.map((e) => e.type);

const DT = 1 / 60;

/** 模擬 seconds 秒，回傳所有事件 */
function run(table: NightMarketTable, seconds: number): NightMarketEvent[] {
  const events: NightMarketEvent[] = [];
  for (let t = 0; t < seconds; t += DT) {
    events.push(...stepTable(table, DT));
  }
  return events;
}

/** 模擬到彈珠落定（出現 slot 事件）或超過 maxSeconds 為止 */
function runUntilSlot(
  table: NightMarketTable,
  maxSeconds: number
): { events: NightMarketEvent[]; slot: SlotEvent | undefined } {
  const events: NightMarketEvent[] = [];
  for (let t = 0; t < maxSeconds; t += DT) {
    const step = stepTable(table, DT);
    events.push(...step);
    const slot = step.find(isSlot);
    if (slot) return { events, slot };
  }
  return { events, slot: undefined };
}

/** 直接把彈珠放進檯面（不經過發射軌道） */
function drop(table: NightMarketTable, x: number, y: number, vx = 0, vy = 0): void {
  table.ball = { x, y, vx, vy, inLane: false };
}

/** 把拉桿拉到 ratio（0～1），並等彈珠跟著沉到定位 */
function pull(table: NightMarketTable, ratio: number): void {
  setPlungerPull(table, PLUNGER_MAX_PULL * ratio);
  run(table, 0.6);
}

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** 第 i 格的中心 x */
const slotCenter = (i: number) => FIELD_LEFT + SLOT_W * (i + 0.5);

/** 點到線段的最短距離 */
function distToSegment(
  x: number,
  y: number,
  s: { ax: number; ay: number; bx: number; by: number }
): number {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((x - s.ax) * dx + (y - s.ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (s.ax + dx * t), y - (s.ay + dy * t));
}

/** 離 (x, y) 最近的釘子 */
function nearestPin(table: NightMarketTable, x: number, y: number) {
  return table.pins.reduce((best, p) =>
    Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y) ? p : best
  );
}

// ---------- 配置 ----------

test("檯面有 6 片格子隔板、52 根釘子，格子剛好排滿檯面寬度", () => {
  const table = createTable();
  const dividers = table.walls
    .filter(
      (w) =>
        w.ax === w.bx &&
        Math.min(w.ay, w.by) === SLOT_TOP_Y &&
        Math.max(w.ay, w.by) === FLOOR_Y
    )
    .map((w) => w.ax)
    .sort((a, b) => a - b);
  assert.deepEqual(
    dividers,
    Array.from({ length: SLOT_COUNT - 1 }, (_, i) => FIELD_LEFT + SLOT_W * (i + 1))
  );
  assert.equal(table.pins.length, 52);
  assert.equal(SLOT_SCORES.length, SLOT_COUNT);
  assert.equal(SLOT_COUNT * SLOT_W, LANE_X - FIELD_LEFT);
});

test("防卡死：釘子之間、釘子與牆／隔板／導板的間隙都比彈珠直徑大", () => {
  const table = createTable();
  const ball = BALL_R * 2;
  const pins = table.pins;
  for (let i = 0; i < pins.length; i++) {
    for (let j = i + 1; j < pins.length; j++) {
      const gap = Math.hypot(pins[i].x - pins[j].x, pins[i].y - pins[j].y) - PIN_R * 2;
      assert.ok(gap > ball, `釘子 ${i}、${j} 間隙 ${gap}`);
    }
    // walls 包含左牆、軌道內牆、頂弧、地板、格子隔板與左上導板
    for (const w of table.walls) {
      const gap = distToSegment(pins[i].x, pins[i].y, w) - PIN_R;
      assert.ok(
        gap > ball,
        `釘子 (${pins[i].x}, ${pins[i].y}) 與牆 (${w.ax}, ${w.ay})→(${w.bx}, ${w.by}) 間隙 ${gap}`
      );
    }
  }
  assert.ok(SLOT_W > ball, "格寬要放得下彈珠");
});

test("slotAt 依 x 算出格子編號，超出範圍會被夾住", () => {
  assert.equal(slotAt(11), 0);
  assert.equal(slotAt(185), 3);
  assert.equal(slotAt(359), 6);
  assert.equal(slotAt(-50), 0);
  assert.equal(slotAt(999), SLOT_COUNT - 1);
});

// ---------- 拉桿 ----------

test("resetBall 把彈珠放在拉桿上並靜止不動", () => {
  const table = createTable();
  resetBall(table);
  run(table, 1);
  const ball = table.ball!;
  assert.ok(ball.inLane);
  assert.ok(ball.x > LANE_X && ball.x < 390, `x=${ball.x}`);
  assert.ok(Math.abs(ball.y - (PLUNGER_REST_Y - BALL_R)) < 3, `y=${ball.y}`);
  assert.ok(Math.hypot(ball.vx, ball.vy) < 30, "應該靜止");
  assert.ok(isBallOnPlunger(table));
});

test("往下拉拉桿，彈珠會跟著下沉；拉桿有最大行程", () => {
  const table = createTable();
  resetBall(table);
  setPlungerPull(table, 40);
  assert.equal(plungerTipY(table), PLUNGER_REST_Y + 40);
  run(table, 0.6);
  assert.ok(Math.abs(table.ball!.y - (PLUNGER_REST_Y + 40 - BALL_R)) < 3, `y=${table.ball!.y}`);
  setPlungerPull(table, 999);
  assert.equal(table.plunger.pull, PLUNGER_MAX_PULL);
  setPlungerPull(table, -5);
  assert.equal(table.plunger.pull, 0);
});

test("拉桿拉到底又馬上推回原位，彈珠會跟著被頂上來，不會掉下去", () => {
  const table = createTable();
  resetBall(table);
  pull(table, 1);
  setPlungerPull(table, 0);
  const events = run(table, 1);
  assert.ok(!types(events).includes("slot"), "不應落格");
  assert.ok(isBallOnPlunger(table), "彈珠應該還在拉桿上");
});

test("很快地一滑到底就放開（彈珠還來不及掉下去）也能發射", () => {
  const table = createTable();
  resetBall(table);
  run(table, 0.5);
  setPlungerPull(table, PLUNGER_MAX_PULL);
  assert.ok(isBallOnPlunger(table), "彈珠應該黏著拉桿一起下去");
  const speed = releasePlunger(table, () => 0.5);
  assert.ok(Math.abs(speed - PLUNGER_MAX_SPEED) < 1e-6, `speed=${speed}`);
  run(table, 3);
  assert.ok(table.ball && !table.ball.inLane, "彈珠應該被打進檯面");
});

test("拉到底放開：彈珠被打出軌道、穿過釘子陣，最後落進某一格", () => {
  const table = createTable();
  resetBall(table);
  pull(table, 1);
  const speed = releasePlunger(table, () => 0.5);
  assert.ok(Math.abs(speed - PLUNGER_MAX_SPEED) < 1e-6, `speed=${speed}`);
  assert.equal(table.plunger.pull, 0);

  let leftLaneAt = Infinity;
  let slot: SlotEvent | undefined;
  for (let t = 0; t < 20 && !slot; t += DT) {
    slot = stepTable(table, DT).find(isSlot);
    if (table.ball && !table.ball.inLane) leftLaneAt = Math.min(leftLaneAt, t);
  }
  assert.ok(leftLaneAt < 3, "3 秒內應離開發射軌道");
  assert.ok(slot, "20 秒內應落進格子");
  assert.equal(table.ball, null);
  assert.equal(table.settled.length, 1);
});

test("發射力道帶一點亂數（±2%），每次拉到底的落點才不會都一樣", () => {
  const speeds = [0, 1].map((r) => {
    const table = createTable();
    resetBall(table);
    pull(table, 1);
    return releasePlunger(table, () => r);
  });
  assert.ok(Math.abs(speeds[0] - PLUNGER_MAX_SPEED * 0.98) < 1, `rand=0 speed=${speeds[0]}`);
  assert.ok(Math.abs(speeds[1] - PLUNGER_MAX_SPEED * 1.02) < 1, `rand=1 speed=${speeds[1]}`);
});

test("力道不夠時彈珠會滑回拉桿、不算落格，可以重新發射", () => {
  const table = createTable();
  resetBall(table);
  pull(table, 0.1);
  const speed = releasePlunger(table, () => 0.5);
  const expected = PLUNGER_MIN_SPEED + 0.1 * (PLUNGER_MAX_SPEED - PLUNGER_MIN_SPEED);
  assert.ok(Math.abs(speed - expected) < 1e-6, `speed=${speed}`);
  const events = run(table, 4);
  assert.ok(!types(events).includes("slot"));
  assert.equal(table.settled.length, 0);
  assert.ok(isBallOnPlunger(table), "彈珠應回到拉桿上");

  pull(table, 1);
  assert.ok(releasePlunger(table, () => 0.5) > 0, "應可重新發射");
});

test("幾乎沒拉就放開不會發射；彈珠不在拉桿上也不會發射", () => {
  const table = createTable();
  resetBall(table);
  setPlungerPull(table, 1);
  assert.equal(releasePlunger(table), 0);
  assert.ok(isBallOnPlunger(table));

  launchBall(table, 1250);
  run(table, 0.3);
  setPlungerPull(table, PLUNGER_MAX_PULL);
  assert.equal(releasePlunger(table), 0, "彈珠已經飛走，不應再發射");
  assert.equal(table.plunger.pull, 0);
});

// ---------- 檯面 ----------

test("進檯面的彈珠會被單向門擋住，不會掉回發射軌道", () => {
  const table = createTable();
  drop(table, 340, 140, 300, 0);
  for (let t = 0; t < 2 && table.ball; t += DT) {
    stepTable(table, DT);
    const b = table.ball;
    if (b) assert.ok(!(b.x > LANE_X && b.y > 180), `掉回軌道：(${b.x}, ${b.y})`);
  }
});

test("左上角的導板會把貼著左牆落下的彈珠導向檯面中間", () => {
  // 起點在弧線內側、導板正上方；實作後請確認彈珠確實碰到導板
  const START = { x: 27, y: 160 };
  const START_VY = 600;
  const MIN_X = 60;
  const table = createTable();
  drop(table, START.x, START.y, 0, START_VY);
  let maxX = START.x;
  for (let t = 0; t < 0.6 && table.ball; t += DT) {
    stepTable(table, DT);
    if (table.ball) maxX = Math.max(maxX, table.ball.x);
  }
  assert.ok(maxX > MIN_X, `應被導向右邊，最右 x=${maxX}`);
});

test("彈珠偏一點撞到釘子會往偏的那一側彈開", () => {
  for (const offset of [-3, 3]) {
    const table = createTable();
    const pin = nearestPin(table, 185, 240);
    drop(table, pin.x + offset, pin.y - 40, 0, 200);
    let hit = false;
    for (let t = 0; t < 0.5 && !hit; t += DT) {
      hit = types(stepTable(table, DT)).includes("pin");
    }
    assert.ok(hit, `offset ${offset} 應觸發 pin 事件`);
    run(table, 0.05);
    const dx = table.ball!.x - (pin.x + offset);
    assert.ok(dx * offset > 0, `offset ${offset} 應往同一側移動，dx=${dx}`);
  }
});

test("一顆彈珠從釘子陣上方落到格子裡，撞釘事件不會噴一大堆", () => {
  const table = createTable();
  drop(table, 188, 215);
  const { events, slot } = runUntilSlot(table, 30);
  assert.ok(slot, "應落進格子");
  const hits = events.filter((e) => e.type === "pin").length;
  assert.ok(hits > 0, "應該撞到釘子");
  assert.ok(hits < 60, `pin 事件 ${hits} 次`);
});

test("高速直撞牆壁不會穿牆", () => {
  const table = createTable();
  drop(table, 200, 420, -1500, 0);
  for (let t = 0; t < 0.5 && table.ball; t += DT) {
    stepTable(table, DT);
    if (table.ball) assert.ok(table.ball.x > FIELD_LEFT, `穿過左牆：x=${table.ball.x}`);
  }
});

// ---------- 落格與疊球 ----------

test("彈珠掉進哪一格就得那一格的分數，並留在格子底部", () => {
  for (let i = 0; i < SLOT_COUNT; i++) {
    const table = createTable();
    drop(table, slotCenter(i), 545);
    const { slot } = runUntilSlot(table, 5);
    assert.ok(slot, `第 ${i} 格應在 5 秒內落定`);
    assert.equal(slot.slot, i);
    assert.equal(slot.score, SLOT_SCORES[i]);
    assert.equal(table.ball, null);
    assert.equal(table.settled.length, 1);
    const s = table.settled[0];
    assert.equal(s.slot, i);
    assert.ok(Math.abs(s.y - (FLOOR_Y - BALL_R)) < 2, `第 ${i} 格 y=${s.y}`);
  }
});

test("同一格連進兩顆會疊起來，不會重疊", () => {
  const table = createTable();
  for (const offset of [0, 2]) {
    drop(table, slotCenter(3) + offset, 545);
    const { slot } = runUntilSlot(table, 10);
    assert.ok(slot && slot.slot === 3, "應落進第 3 格");
  }
  const [a, b] = table.settled;
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  assert.ok(dist >= BALL_R * 2 - 0.5, `球心距離 ${dist}`);
});

test("同一格連放 16 顆：全部都會落定，滿出來的進隔壁格，彈珠不重疊", () => {
  const COUNT = 16;
  const table = createTable();
  for (let n = 0; n < COUNT; n++) {
    drop(table, slotCenter(3) + ((n % 3) - 1) * 4, 545);
    const { slot } = runUntilSlot(table, 30);
    assert.ok(slot, `第 ${n + 1} 顆應在 30 秒內落定`);
  }
  assert.equal(table.settled.length, COUNT);
  for (let i = 0; i < COUNT; i++) {
    const a = table.settled[i];
    assert.equal(slotAt(a.x), a.slot);
    assert.ok(Math.abs(a.slot - 3) <= 1, `第 ${i + 1} 顆跑到第 ${a.slot} 格`);
    for (let j = i + 1; j < COUNT; j++) {
      const b = table.settled[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      assert.ok(dist >= BALL_R * 2 - 0.5, `第 ${i + 1}、${j + 1} 顆球心距離 ${dist}`);
    }
  }
});

// ---------- 防呆 ----------

test("彈珠正好停在釘子頂端會被輕推一下，之後照常落格", () => {
  const table = createTable();
  const pin = nearestPin(table, 185, 240);
  drop(table, pin.x, pin.y - 40);
  const { events, slot } = runUntilSlot(table, 25);
  assert.ok(types(events).includes("nudge"), "應觸發 nudge 事件");
  assert.ok(slot, "輕推後應落進格子");
});

test("彈珠卡在兩根釘子的凹槽裡會被輕推脫困", () => {
  const table = createTable();
  // 人工做一個凹槽：兩根釘子相距 18，彈珠過不去也掉不下來
  table.pins.push({ x: 176, y: 205 }, { x: 194, y: 205 });
  drop(table, 185, 170);
  const { events, slot } = runUntilSlot(table, 30);
  assert.ok(types(events).includes("nudge"), "應觸發 nudge 事件");
  assert.ok(slot, "脫困後應落進格子");
});

// ---------- 整局 ----------

test("亂數力道打完整局：每顆都會落格或回到拉桿，不卡死、數值不會壞掉", () => {
  const ROUNDS = 10;
  const BALLS = 10;
  const rand = seeded(12345);
  for (let round = 0; round < ROUNDS; round++) {
    const table = createTable();
    let shots = 0;
    while (table.settled.length < BALLS) {
      assert.ok(++shots <= BALLS * 6, `第 ${round} 局發射太多次還沒打完`);
      if (!table.ball) resetBall(table);
      pull(table, 0.2 + rand() * 0.8);
      assert.ok(releasePlunger(table, rand) > 0, "應該發射成功");
      let done = false;
      for (let t = 0; t < 30 && !done; t += DT) {
        const events = stepTable(table, DT);
        const b = table.ball;
        if (b) {
          assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), "座標應為有限數值");
          assert.ok(b.x > 0 && b.x < TABLE_W, `x 超出範圍：${b.x}`);
          assert.ok(b.y > 0 && b.y < TABLE_H, `y 超出範圍：${b.y}`);
        }
        // 落格，或力道不夠滑回拉桿（可重打）
        done = events.some(isSlot) || (t > 0.5 && isBallOnPlunger(table));
      }
      assert.ok(done, `第 ${round} 局第 ${shots} 發 30 秒內沒有結果`);
    }
    for (const s of table.settled) {
      assert.ok(s.y > SLOT_TOP_Y - BALL_R * 2, `落定位置太高：y=${s.y}`);
      assert.equal(slotAt(s.x), s.slot);
    }
  }
});

test("每次都拉到底，落點也會分散在不同格子", () => {
  const rand = seeded(777);
  const table = createTable();
  const slots = new Set<number>();
  for (let n = 0; n < 20; n++) {
    resetBall(table);
    pull(table, 1);
    assert.ok(releasePlunger(table, rand) > 0);
    const { slot } = runUntilSlot(table, 30);
    assert.ok(slot, `第 ${n + 1} 顆應在 30 秒內落定`);
    slots.add(slot.slot);
  }
  assert.ok(slots.size >= 3, `只落在 ${slots.size} 個格子`);
});
