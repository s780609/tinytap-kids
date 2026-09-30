import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BALL_R,
  TABLE_H,
  TABLE_W,
  createTable,
  launchBall,
  resetBall,
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

test("resetBall 把彈珠放在發射軌道底部並靜止不動", () => {
  const table = createTable();
  resetBall(table);
  run(table, 1);
  const ball = table.ball!;
  assert.ok(ball.inLane);
  assert.ok(ball.x > 360 && ball.x < 390, `x=${ball.x}`);
  assert.ok(ball.y > TABLE_H - 40 && ball.y < TABLE_H, `y=${ball.y}`);
  assert.ok(Math.hypot(ball.vx, ball.vy) < 30, "應該靜止");
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
