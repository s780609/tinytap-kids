import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BALL_R,
  PLUNGER_MAX_PULL,
  PLUNGER_REST_Y,
  TABLE_H,
  TABLE_W,
  createTable,
  isBallOnPlunger,
  launchBall,
  releasePlunger,
  resetBall,
  setPlungerPull,
  stepTable,
  type PinballEvent,
  type Table,
} from "./pinballPhysics.ts";

const NO_INPUT = { left: false, right: false };

/** 模擬 seconds 秒，回傳所有事件 */
function run(
  table: Table,
  seconds: number,
  input: (t: number) => { left: boolean; right: boolean } = () => NO_INPUT
): PinballEvent[] {
  const events: PinballEvent[] = [];
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    events.push(...stepTable(table, dt, input(t)));
  }
  return events;
}

test("resetBall 把彈珠放在拉桿上並靜止不動", () => {
  const table = createTable();
  resetBall(table);
  run(table, 1);
  const ball = table.ball!;
  assert.ok(ball.inLane);
  assert.ok(ball.x > 360 && ball.x < 390, `x=${ball.x}`);
  assert.ok(Math.abs(ball.y - (PLUNGER_REST_Y - BALL_R)) < 3, `y=${ball.y}`);
  assert.ok(Math.hypot(ball.vx, ball.vy) < 30, "應該靜止");
  assert.ok(isBallOnPlunger(table));
});

test("發射後彈珠會離開軌道進入檯面", () => {
  const table = createTable();
  resetBall(table);
  assert.equal(launchBall(table, 1250), true);
  const events = run(table, 3);
  assert.ok(events.some((e) => e.type === "exitLane"), "應觸發 exitLane");
});

test("彈珠不在軌道底部時不能再發射", () => {
  const table = createTable();
  resetBall(table);
  launchBall(table, 1250);
  run(table, 0.2);
  assert.equal(launchBall(table, 1250), false);
});

test("力道不夠時彈珠會掉回軌道，可以重新發射", () => {
  const table = createTable();
  resetBall(table);
  launchBall(table, 400);
  run(table, 3);
  assert.ok(table.ball!.inLane);
  assert.equal(launchBall(table, 1250), true);
});

test("彈珠撞到星球彈射器會被彈開並得分", () => {
  const table = createTable();
  const b = table.bumpers[0];
  table.ball = { x: b.x, y: b.y - b.r - BALL_R - 30, vx: 0, vy: 200, inLane: false };
  const events = run(table, 0.5);
  const hit = events.find((e) => e.type === "bumper");
  assert.ok(hit, "應觸發 bumper 事件");
  assert.ok(hit.type === "bumper" && hit.score > 0);
});

test("按下擋板會把停在上面的彈珠打上去", () => {
  const table = createTable();
  const f = table.flippers.left;
  const midX = f.px + Math.cos(f.restAngle) * f.length * 0.6;
  const midY = f.py + Math.sin(f.restAngle) * f.length * 0.6;
  table.ball = { x: midX, y: midY - f.radius - BALL_R - 1, vx: 0, vy: 0, inLane: false };
  let minY = Infinity;
  const dt = 1 / 60;
  for (let t = 0; t < 0.6; t += dt) {
    stepTable(table, dt, { left: true, right: false });
    if (table.ball) minY = Math.min(minY, table.ball.y);
  }
  assert.ok(minY < midY - 150, `彈珠應被打高，最高 y=${minY}`);
});

test("擋板放開會回到原位，按住會停在舉起角度", () => {
  const table = createTable();
  table.ball = null;
  const f = table.flippers.right;
  run(table, 0.3, () => ({ left: false, right: true }));
  assert.ok(Math.abs(f.angle - f.activeAngle) < 1e-6);
  run(table, 0.5);
  assert.ok(Math.abs(f.angle - f.restAngle) < 1e-6);
});

test("彈珠從兩支擋板中間掉下去會觸發 drain", () => {
  const table = createTable();
  const cx = (table.flippers.left.px + table.flippers.right.px) / 2;
  table.ball = { x: cx, y: 560, vx: 0, vy: 100, inLane: false };
  const events = run(table, 3);
  assert.ok(events.some((e) => e.type === "drain"));
  assert.equal(table.ball, null);
});

test("滾過星星通道會點亮，四顆全亮有大獎並重置", () => {
  const table = createTable();
  const events: PinballEvent[] = [];
  for (const r of table.rollovers) {
    table.ball = { x: r.x, y: r.y - 30, vx: 0, vy: 300, inLane: false };
    events.push(...run(table, 0.15));
  }
  assert.equal(events.filter((e) => e.type === "rollover").length, table.rollovers.length);
  assert.ok(events.some((e) => e.type === "bonus"), "全亮應有大獎");
  assert.ok(table.rollovers.every((r) => !r.lit), "大獎後燈應重置");
});

test("高速直撞牆壁不會穿牆", () => {
  const table = createTable();
  table.ball = { x: 200, y: 400, vx: -1500, vy: 0, inLane: false };
  run(table, 0.5);
  assert.ok(table.ball === null || table.ball.x > 10, "不應穿過左牆");
});

test("長時間亂按擋板：彈珠永遠在檯面範圍內、數值不會壞掉", () => {
  const table = createTable();
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  let input = { left: false, right: false };
  const dt = 1 / 60;
  let drains = 0;
  let score = 0;
  for (let i = 0; i < 60 * 180; i++) {
    if (!table.ball) resetBall(table);
    if (table.ball!.inLane) launchBall(table, 1200 + rand() * 150);
    if (i % 12 === 0) input = { left: rand() < 0.4, right: rand() < 0.4 };
    for (const e of stepTable(table, dt, input)) {
      if (e.type === "drain") drains++;
      if (e.type === "bumper" || e.type === "rollover" || e.type === "bonus") score += e.score;
    }
    const b = table.ball;
    if (b) {
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), "座標應為有限數值");
      assert.ok(b.x > 0 && b.x < TABLE_W, `x 超出範圍：${b.x} (frame ${i})`);
      assert.ok(b.y > -5 && b.y < TABLE_H + 60, `y 超出範圍：${b.y} (frame ${i})`);
    }
  }
  assert.ok(score > 0, "三分鐘內應該有得分");
  assert.ok(drains > 0, "應該會掉球（不是卡住）");
});

test("往下拉拉桿，彈珠會跟著下沉；拉桿有最大行程", () => {
  const table = createTable();
  resetBall(table);
  setPlungerPull(table, 40);
  run(table, 0.6);
  assert.ok(Math.abs(table.ball!.y - (PLUNGER_REST_Y + 40 - BALL_R)) < 3, `y=${table.ball!.y}`);
  setPlungerPull(table, 999);
  assert.equal(table.plunger.pull, PLUNGER_MAX_PULL);
  setPlungerPull(table, -5);
  assert.equal(table.plunger.pull, 0);
});

test("拉到底放開：彈珠被打出軌道，拉桿回到原位", () => {
  const table = createTable();
  resetBall(table);
  setPlungerPull(table, PLUNGER_MAX_PULL);
  run(table, 0.6);
  const speed = releasePlunger(table);
  assert.ok(speed > 0);
  assert.equal(table.plunger.pull, 0);
  const events = run(table, 3);
  assert.ok(events.some((e) => e.type === "exitLane"));
});

test("拉越深力道越大；拉四分之一就足以進檯面", () => {
  const speeds: number[] = [];
  for (const ratio of [0.25, 0.5, 1]) {
    const table = createTable();
    resetBall(table);
    setPlungerPull(table, PLUNGER_MAX_PULL * ratio);
    run(table, 0.6);
    speeds.push(releasePlunger(table));
    const events = run(table, 3);
    assert.ok(events.some((e) => e.type === "exitLane"), `ratio ${ratio} 應進檯面`);
  }
  assert.ok(speeds[0] < speeds[1] && speeds[1] < speeds[2]);
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

// ---------- 三角彈射板、出球道、落靶、蟲洞、坡道、任務 ----------

const types = (events: PinballEvent[]) => events.map((e) => e.type);

test("彈珠落在三角彈射板的斜面上會被彈開並得分", () => {
  const table = createTable();
  const s = table.slingshots[0];
  const mx = (s.ax + s.bx) / 2;
  const my = (s.ay + s.by) / 2;
  table.ball = { x: mx + 12, y: my - 40, vx: 0, vy: 150, inLane: false };
  const events = run(table, 0.4);
  const hit = events.find((e) => e.type === "slingshot");
  assert.ok(hit, "應觸發 slingshot 事件");
  assert.ok(table.ball!.x > mx + 12, "應被彈向檯面中央");
});

test("掉進出球道時救球燈亮著會被彈回去，用掉之後就會掉球", () => {
  for (const side of ["left", "right"] as const) {
    const table = createTable();
    const x = side === "left" ? 24 : 346;
    table.ball = { x, y: 500, vx: 0, vy: 100, inLane: false };
    const first = run(table, 1);
    assert.ok(types(first).includes("kickback"), `${side} 應觸發 kickback`);
    assert.ok(!types(first).includes("drain"), `${side} 第一次不該掉球`);
    assert.equal(table.kickbacks[side], false);

    table.ball = { x, y: 500, vx: 0, vy: 100, inLane: false };
    const second = run(table, 2);
    assert.ok(types(second).includes("drain"), `${side} 救球用掉後應掉球`);
  }
});

test("貼著牆掉下來的彈珠會被導板送進回球道，不會掉進出球道", () => {
  for (const x of [19, 351]) {
    const table = createTable();
    table.ball = { x, y: 300, vx: 0, vy: 300, inLane: false };
    table.targets.forEach((t) => (t.down = true));
    const events: PinballEvent[] = [];
    let reached = false;
    const dt = 1 / 60;
    for (let t = 0; t < 2 && table.ball; t += dt) {
      events.push(...stepTable(table, dt, NO_INPUT));
      const b = table.ball;
      if (b && b.y > 600 && b.x > table.flippers.left.px && b.x < table.flippers.right.px) {
        reached = true;
      }
    }
    assert.ok(!types(events).includes("kickback"), `x=${x} 不應掉進出球道`);
    assert.ok(reached, `x=${x} 應滾到擋板上`);
  }
});

test("被救球彈回的彈珠可以從下面穿過導板回到檯面", () => {
  const table = createTable();
  table.ball = { x: 24, y: 500, vx: 0, vy: 100, inLane: false };
  let minY = Infinity;
  const dt = 1 / 60;
  for (let t = 0; t < 1; t += dt) {
    stepTable(table, dt, NO_INPUT);
    if (table.ball) minY = Math.min(minY, table.ball.y);
  }
  assert.ok(minY < 300, `應該飛回檯面上方，最高 y=${minY}`);
});

test("resetBall 會重新點亮救球燈", () => {
  const table = createTable();
  table.kickbacks.left = false;
  table.kickbacks.right = false;
  resetBall(table);
  assert.deepEqual(table.kickbacks, { left: true, right: true });
});

test("回球道會把彈珠送到擋板，不會直接掉球", () => {
  const table = createTable();
  table.ball = { x: 52, y: 490, vx: 0, vy: 50, inLane: false };
  let reached = false;
  const dt = 1 / 60;
  for (let t = 0; t < 2 && table.ball; t += dt) {
    stepTable(table, dt, NO_INPUT);
    const b = table.ball;
    if (b && b.x > table.flippers.left.px && b.y > 600) reached = true;
  }
  assert.ok(reached, "彈珠應滾到左擋板上");
});

/** 把彈珠從左邊丟向指定的落靶 */
function hitTarget(table: Table, index: number): PinballEvent[] {
  const t = table.targets[index];
  table.ball = {
    x: t.ax - 60,
    y: (t.ay + t.by) / 2,
    vx: 700,
    vy: -30,
    inLane: false,
  };
  return run(table, 0.2);
}

test("落靶被打到會倒下並得分，倒下後彈珠可以穿過", () => {
  const table = createTable();
  const events = hitTarget(table, 0);
  assert.ok(types(events).includes("target"));
  assert.equal(table.targets[0].down, true);
  assert.equal(table.targets[1].down, false);
  const again = hitTarget(table, 0);
  assert.ok(!types(again).includes("target"), "已倒下的靶不再得分");
});

test("三個落靶全倒有獎勵、點亮救球燈，過一會兒靶會重新立起", () => {
  const table = createTable();
  table.kickbacks.left = false;
  const events: PinballEvent[] = [];
  for (let i = 0; i < table.targets.length; i++) events.push(...hitTarget(table, i));
  assert.ok(types(events).includes("targetBank"));
  assert.equal(table.kickbacks.left, true);
  table.ball = null;
  run(table, 2);
  assert.ok(table.targets.every((t) => !t.down), "靶應重新立起");
});

test("慢速滾進黑洞會被傳送到白洞再吐出來；高速通過不會被吸進去", () => {
  const table = createTable();
  const w = table.wormhole;
  table.ball = { x: w.x, y: w.y - 40, vx: 0, vy: 200, inLane: false };
  const events = run(table, 0.3);
  assert.ok(types(events).includes("wormhole"));
  assert.ok(table.warp, "應該正在傳送中");
  assert.ok(Math.hypot(table.ball!.x - w.outX, table.ball!.y - w.outY) < 1, "彈珠應在白洞");
  const after = run(table, 1);
  assert.ok(types(after).includes("warpOut"));
  assert.equal(table.warp, null);
  assert.ok(table.ball!.y > w.outY, "吐出後應往下掉");

  const fast = createTable();
  fast.ball = { x: w.x - 80, y: w.y, vx: 1000, vy: 0, inLane: false };
  assert.ok(!types(run(fast, 0.2)).includes("wormhole"));
});

test("夠快衝進坡道入口會繞一圈從左回球道出來並得分", () => {
  const table = createTable();
  const e = table.ramp.entry;
  table.ball = { x: (e.x0 + e.x1) / 2, y: e.y + 20, vx: 0, vy: -1000, inLane: false };
  const events: PinballEvent[] = [];
  let wasOnRamp = false;
  const dt = 1 / 60;
  for (let t = 0; t < 3; t += dt) {
    events.push(...stepTable(table, dt, NO_INPUT));
    if (table.ball?.onRamp) wasOnRamp = true;
    if (types(events).includes("ramp")) break;
  }
  assert.ok(wasOnRamp, "應該上到坡道");
  assert.ok(types(events).includes("ramp"), "應觸發 ramp 事件");
  const b = table.ball!;
  assert.ok(!b.onRamp);
  assert.ok(b.x > 38 && b.x < 68, `應從左回球道出來，x=${b.x}`);
});

test("在坡道上不會碰到下層的元件", () => {
  const table = createTable();
  const e = table.ramp.entry;
  table.ball = { x: (e.x0 + e.x1) / 2, y: e.y + 20, vx: 0, vy: -1000, inLane: false };
  // 在坡道正下方放一顆彈射器
  table.bumpers.push({ id: "under", x: 86, y: 330, r: 20, kick: 500, score: 1 });
  const events = run(table, 1.5);
  assert.ok(!events.some((ev) => ev.type === "bumper" && ev.id === "under"));
  assert.ok(types(events).includes("ramp"));
});

test("衝力不夠會從坡道入口滑回來，不算得分", () => {
  const table = createTable();
  const e = table.ramp.entry;
  table.ball = { x: (e.x0 + e.x1) / 2, y: e.y + 20, vx: 0, vy: -350, inLane: false };
  const events = run(table, 1.5);
  assert.ok(!types(events).includes("ramp"));
  assert.ok(!table.ball || !table.ball.onRamp, "應該已經離開坡道");
});

test("右擋板打得到坡道入口", () => {
  let made = false;
  for (let k = 0.2; k <= 0.95 && !made; k += 0.05) {
    for (const delay of [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35]) {
      const table = createTable();
      const f = table.flippers.right;
      const x = f.px + Math.cos(f.restAngle) * f.length * k;
      const y = f.py + Math.sin(f.restAngle) * f.length * k;
      table.ball = { x, y: y - f.radius - BALL_R - 40, vx: 0, vy: 0, inLane: false };
      const events = run(table, 2.5, (t) => ({ left: false, right: t >= delay }));
      if (types(events).includes("ramp")) {
        made = true;
        break;
      }
    }
  }
  assert.ok(made, "至少要有一種擊球時機能把彈珠打上坡道");
});

test("任務：打倒三個靶 → 進黑洞 → 衝上坡道，完成後升一級並重新開始", () => {
  const table = createTable();
  assert.deepEqual(table.mission, { stage: 0, rank: 1 });

  // 順序不對不會推進
  const w = table.wormhole;
  table.ball = { x: w.x, y: w.y - 40, vx: 0, vy: 200, inLane: false };
  run(table, 1.5);
  assert.equal(table.mission.stage, 0);

  const events: PinballEvent[] = [];
  for (let i = 0; i < table.targets.length; i++) events.push(...hitTarget(table, i));
  assert.equal(table.mission.stage, 1);
  assert.ok(events.some((e) => e.type === "mission" && e.stage === 1));

  table.ball = { x: w.x, y: w.y - 40, vx: 0, vy: 200, inLane: false };
  events.push(...run(table, 1.5));
  assert.equal(table.mission.stage, 2);

  const e = table.ramp.entry;
  table.ball = { x: (e.x0 + e.x1) / 2, y: e.y + 20, vx: 0, vy: -1000, inLane: false };
  events.push(...run(table, 1.5));
  const done = events.find((ev) => ev.type === "missionComplete");
  assert.ok(done && done.type === "missionComplete" && done.rank === 2 && done.score > 0);
  assert.deepEqual(table.mission, { stage: 0, rank: 2 });
});
