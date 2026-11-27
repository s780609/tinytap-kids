import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOCK, MAP_N, ROADS, T, TILE, createMap, entryPoint, exitsAt, isSolid, tileAt } from "./map.ts";
import {
  BUSTED_SHOW,
  BUST_TICKS,
  CALM_TICKS,
  CAR_SPECS,
  createGame,
  findCar,
  forwardSpeed,
  laneFromPosition,
  step,
} from "./sim.ts";
import type { Car, GameEvent, GameState, Input, Ped } from "./sim.ts";

const idle: Input = { dx: 0, dy: 0, action: false, horn: false, handbrake: false };

function run(s: GameState, ticks: number, input: Partial<Input> = {}): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < ticks; i++) step(s, { ...idle, ...input }, events);
  return events;
}

/** 只留玩家：清掉車流、行人、錢，專心測某件事 */
function empty(): GameState {
  const s = createGame(1);
  s.cars = [];
  s.peds = [];
  s.coins = [];
  return s;
}

function car(s: GameState, x: number, y: number, angle: number, kind: Car["kind"] = "sedan", driver: Car["driver"] = "none"): Car {
  const c: Car = {
    id: s.nextId++,
    kind,
    color: "#fff",
    x,
    y,
    angle,
    vx: 0,
    vy: 0,
    hp: CAR_SPECS[kind].hp,
    wrecked: false,
    driver,
    ai: null,
    chase: false,
    stuck: 0,
    backing: 0,
    braking: false,
    skidFrom: null,
    door: 0,
    held: false,
  };
  s.cars.push(c);
  return c;
}

/** 第一條東西向馬路往東那一線的某一點（兩個路口中間） */
const EAST_LANE = { x: (BLOCK * 3 + 6) * TILE, y: (BLOCK * 2 + 1.5) * TILE };

test("地圖：道路格狀相連、警察局門口能走、有停車場的車", () => {
  const m = createMap();
  for (let i = 0; i < MAP_N; i++) {
    assert.equal(tileAt(m, i, 0), T.Road);
    assert.equal(tileAt(m, 0, i), T.Road);
    assert.equal(tileAt(m, i, MAP_N - 1), T.Road);
  }
  assert.ok(!isSolid(tileAt(m, Math.floor(m.station.x / TILE), Math.floor(m.station.y / TILE))));
  assert.ok(m.parked.length >= 4);
  assert.ok(m.buildings.some((b) => b.police));
  for (const b of m.buildings) assert.equal(tileAt(m, b.x, b.y), T.Building);
  assert.deepEqual(createMap().tiles, m.tiles, "同一個種子產生一樣的城市");
});

test("路口：角落只能往裡面開，中間的路口不准迴轉", () => {
  assert.deepEqual(exitsAt(0, 0, 2).sort(), [1]);
  assert.deepEqual(exitsAt(3, 3, 0).sort(), [0, 1, 3]);
  assert.ok(exitsAt(ROADS - 1, 3, 0).every((d) => d !== 0));
});

test("接上車道：目標點在車子前方", () => {
  const ai = laneFromPosition(EAST_LANE.x, EAST_LANE.y, 0);
  assert.equal(ai.dir, 0);
  assert.ok(ai.tx > EAST_LANE.x);
  assert.equal(ai.ty, EAST_LANE.y);
  const west = laneFromPosition(EAST_LANE.x, EAST_LANE.y - TILE, Math.PI);
  assert.equal(west.dir, 2);
  assert.ok(west.tx < EAST_LANE.x);
  const e = entryPoint(0, 4, 2);
  assert.equal(e.y, EAST_LANE.y);
});

test("開局：在警察局門口走路，附近有車流、行人和錢", () => {
  const s = createGame(1);
  assert.equal(s.player.car, null);
  assert.ok(s.cars.some((c) => c.driver === "ai"));
  assert.ok(s.cars.some((c) => c.driver === "none"));
  assert.ok(s.peds.length > 5);
  assert.ok(s.coins.length > 5);
});

test("走路：推搖桿會走、撞到大樓會停住", () => {
  const s = empty();
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y;
  run(s, 60, { dx: 1 });
  assert.ok(s.player.x > EAST_LANE.x + 100, `只走到 ${s.player.x}`);
  // 往北走一直撞牆：不會穿進大樓
  run(s, 300, { dy: -1 });
  const t = tileAt(s.map, Math.floor(s.player.x / TILE), Math.floor(s.player.y / TILE));
  assert.ok(!isSolid(t));
});

/** 按上車，等上車動作跑完（走到門邊、開門、坐進去） */
function enter(s: GameState): number {
  run(s, 1, { action: true });
  for (let i = 0; i < 200 && s.player.car === null; i++) run(s, 1);
  run(s, 10);
  return s.player.car ?? -1;
}

test("上車動作：先走到駕駛座門邊、開門、坐進去，不是瞬間移動", () => {
  const s = empty();
  s.player.x = EAST_LANE.x + 5;
  s.player.y = EAST_LANE.y + 30;
  const c = car(s, EAST_LANE.x, EAST_LANE.y, 0);
  run(s, 1, { action: true });
  assert.equal(s.player.car, null, "按下去還沒上車");
  assert.ok(s.player.entering);
  let maxDoor = 0;
  let sawIn = false;
  for (let i = 0; i < 200 && s.player.car === null; i++) {
    run(s, 1);
    maxDoor = Math.max(maxDoor, c.door);
    if (s.player.entering?.phase === "in") sawIn = true;
  }
  assert.equal(s.player.car, c.id);
  assert.equal(maxDoor, 1, "車門有打開");
  assert.ok(sawIn);
  run(s, 12);
  assert.equal(c.door, 0, "坐進去之後關門");
  assert.equal(s.player.entering, null);
});

test("上車、開車往搖桿方向跑、往後推會煞車再倒車、下車", () => {
  const s = empty();
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y + 14;
  const c = car(s, EAST_LANE.x, EAST_LANE.y, 0);
  assert.equal(enter(s), c.id);
  run(s, 60, { dx: 1 });
  assert.ok(forwardSpeed(c) > 150, `速度 ${forwardSpeed(c)}`);
  assert.ok(c.x > EAST_LANE.x + 100);
  run(s, 90, { dx: -1 });
  assert.ok(forwardSpeed(c) < 0, "往後推到最後會倒車");
  run(s, 30);
  run(s, 1, { action: true });
  run(s, 20);
  assert.equal(s.player.car, null);
  assert.equal(c.driver, "none");
  assert.equal(c.door, 0);
  assert.ok(Math.hypot(s.player.x - c.x, s.player.y - c.y) > 10, "從車門走出來");
});

test("開車轉彎：往下推，車頭會轉向南邊", () => {
  const s = empty();
  const c = car(s, EAST_LANE.x, EAST_LANE.y, 0, "sedan", "player");
  s.player.car = c.id;
  run(s, 30, { dx: 1 });
  run(s, 25, { dx: 0.3, dy: 1 });
  assert.ok(c.angle > 0.6, `角度 ${c.angle}`);
});

test("撞牆：彈回來、受損，太慢的碰撞不扣血", () => {
  const s = empty();
  // 往北衝向馬路北邊的人行道後面那棟（或邊界）
  const c = car(s, EAST_LANE.x, EAST_LANE.y, -Math.PI / 2, "sedan", "player");
  s.player.car = c.id;
  const events = run(s, 120, { dy: -1 });
  assert.ok(c.hp < CAR_SPECS.sedan.hp || events.some((e) => e.type === "crash"));
  const t = tileAt(s.map, Math.floor(c.x / TILE), Math.floor(c.y / TILE));
  assert.ok(!isSolid(t), "車子不會卡進大樓");
});

test("車流：開一陣子都還在馬路上", () => {
  const s = createGame(3);
  run(s, 900);
  const traffic = s.cars.filter((c) => c.driver === "ai");
  assert.ok(traffic.length > 5);
  const onRoad = traffic.filter((c) => tileAt(s.map, Math.floor(c.x / TILE), Math.floor(c.y / TILE)) === T.Road);
  assert.ok(onRoad.length >= traffic.length * 0.85, `${onRoad.length}/${traffic.length} 在路上`);
  const moved = traffic.filter((c) => Math.hypot(c.vx, c.vy) > 20);
  assert.ok(moved.length >= traffic.length * 0.4, "大部分的車在動");
});

test("撿錢：走過去就加錢", () => {
  const s = empty();
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y;
  s.coins = [{ id: 999, x: EAST_LANE.x + 40, y: EAST_LANE.y, value: 50 }];
  const events = run(s, 30, { dx: 1 });
  assert.equal(s.cash, 50);
  assert.ok(events.some((e) => e.type === "coin"));
});

test("撞到行人：跌倒（會再爬起來），通緝一顆星", () => {
  const s = empty();
  const c = car(s, EAST_LANE.x, EAST_LANE.y, 0, "sedan", "player");
  s.player.car = c.id;
  c.vx = 200;
  s.peds = [
    { id: 500, x: EAST_LANE.x + 30, y: EAST_LANE.y, angle: 0, state: "down", timer: 0, tx: 0, ty: 0, dir: 0, shirt: "#f00", hair: "#000", speed: 30, phase: 0, wet: 0, robbed: false },
  ];
  // 讓他站著（down 計時 0 → 下一步起身成 walk），不會先閃開
  s.peds[0].state = "walk";
  s.peds[0].tx = s.peds[0].x;
  s.peds[0].ty = s.peds[0].y;
  const events = run(s, 10, { dx: 1 });
  const pd = s.peds.find((p) => p.id === 500)!;
  assert.ok(pd.state === "down" || events.some((e) => e.type === "pedHit") || pd.state === "flee");
  if (pd.state === "down") {
    assert.equal(s.wanted, 1);
    run(s, 160);
    assert.notEqual(pd.state, "down", "躺一下就爬起來");
  }
});

test("通緝：附近沒有警車一陣子就降一級", () => {
  const s = empty();
  s.wanted = 1;
  // 不讓警車生出來：把生成的警車都丟掉
  for (let i = 0; i < CALM_TICKS + 5; i++) {
    step(s, idle, []);
    s.cars = s.cars.filter((c) => !c.chase);
  }
  assert.equal(s.wanted, 0);
});

test("被警車貼住：被抓到、罰兩成的錢，過一會兒從警察局重新出發", () => {
  const s = empty();
  s.cash = 100;
  s.wanted = 2;
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y;
  const cop = car(s, EAST_LANE.x + 22, EAST_LANE.y, Math.PI, "police", "police");
  cop.chase = true;
  const events: GameEvent[] = [];
  for (let i = 0; i < BUST_TICKS + 5; i++) {
    cop.x = s.player.x + 22;
    cop.y = s.player.y;
    cop.vx = 0;
    cop.vy = 0;
    step(s, idle, events);
  }
  const busted = events.find((e) => e.type === "busted");
  assert.ok(busted && busted.type === "busted");
  assert.equal(busted.fine, 20);
  assert.equal(s.cash, 80);
  assert.equal(s.wanted, 0);
  run(s, BUSTED_SHOW + 1);
  assert.ok(Math.hypot(s.player.x - s.map.station.x, s.player.y - s.map.station.y) < 1);
});

test("偷有司機的車：司機跑掉；偷警車通緝", () => {
  const s = empty();
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y + 16;
  const cop = car(s, EAST_LANE.x, EAST_LANE.y, 0, "police", "police");
  assert.equal(enter(s), cop.id);
  assert.ok(s.wanted >= 1);
  assert.ok(s.peds.some((p) => p.state === "flee"));
  assert.equal(findCar(s, s.player.car)?.driver, "player");
});

test("同樣的種子與輸入，結果完全相同", () => {
  const play = () => {
    const s = createGame(42);
    for (let i = 0; i < 600; i++) step(s, { ...idle, dx: Math.sin(i / 50), dy: Math.cos(i / 70), action: i === 100 }, []);
    return JSON.stringify({ p: s.player, c: s.cars.map((c) => [c.x.toFixed(3), c.y.toFixed(3)]), cash: s.cash });
  };
  assert.equal(play(), play());
});

/** 某個人身邊的錢（城市自己也會在遠處生錢，只算附近的） */
function coinsNear(s: GameState, p: { x: number; y: number }) {
  return s.coins.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) < 40).length;
}

function ped(s: GameState, x: number, y: number) {
  const p = {
    id: s.nextId++,
    x,
    y,
    angle: 0,
    state: "walk" as Ped["state"],
    timer: 0,
    tx: x,
    ty: y,
    dir: 0 as const,
    shirt: "#f00",
    hair: "#000",
    speed: 0,
    phase: 0,
    wet: 0,
    robbed: false,
  };
  s.peds.push(p);
  return p;
}

test("出拳：打到前面的路人會跌倒、掉錢、通緝；過一下會爬起來", () => {
  const s = empty();
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y;
  s.player.angle = 0;
  const p = ped(s, EAST_LANE.x + 15, EAST_LANE.y);
  const events = run(s, 1, { punch: true });
  assert.ok(events.some((e) => e.type === "punch"));
  run(s, 12);
  assert.equal(p.state, "down");
  assert.equal(coinsNear(s, p), 1, "掉了錢");
  assert.equal(s.wanted, 1);
  // 同一個人再打不會再掉錢
  run(s, 160);
  assert.notEqual(p.state, "down");
  p.x = s.player.x + 15;
  p.y = s.player.y;
  p.state = "walk";
  s.player.angle = 0;
  s.coins = [];
  run(s, 1, { punch: true });
  run(s, 12);
  assert.equal(coinsNear(s, p), 0, "錢已經被搶過了");
});

test("出拳：沒打到人就只是揮空", () => {
  const s = empty();
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y;
  const p = ped(s, EAST_LANE.x - 15, EAST_LANE.y);
  s.player.angle = 0;
  run(s, 1, { punch: true });
  run(s, 20);
  assert.equal(coinsNear(s, p), 0);
  assert.equal(s.wanted, 0);
});

test("水槍：自動瞄準路人，噴到會丟錢跑走", () => {
  const s = empty();
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y;
  s.player.angle = 0;
  // 稍微偏一點也會自動瞄準
  const p = ped(s, EAST_LANE.x + 120, EAST_LANE.y + 20);
  const events = run(s, 30, { shoot: true });
  assert.ok(events.some((e) => e.type === "shoot"));
  assert.ok(events.some((e) => e.type === "scare"));
  assert.ok(p.wet > 0);
  assert.equal(p.robbed, true, "丟下錢了");
});

test("水槍：噴有司機的車，司機嚇得下車，車子可以直接開走", () => {
  const s = empty();
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y - 60;
  s.player.angle = Math.PI / 2;
  const c = car(s, EAST_LANE.x, EAST_LANE.y, 0, "taxi", "ai");
  const events = run(s, 20, { shoot: true });
  assert.ok(events.some((e) => e.type === "carjack"));
  assert.equal(c.driver, "none");
  assert.ok(s.peds.some((p) => p.state === "flee"));
  s.player.x = EAST_LANE.x;
  s.player.y = EAST_LANE.y - 24;
  assert.equal(enter(s), c.id);
});

test("坐在車上不能出拳、開水槍", () => {
  const s = empty();
  const c = car(s, EAST_LANE.x, EAST_LANE.y, 0, "sedan", "player");
  s.player.car = c.id;
  const events = run(s, 20, { punch: true, shoot: true });
  assert.ok(!events.some((e) => e.type === "punch" || e.type === "shoot"));
});
