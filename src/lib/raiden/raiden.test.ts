import { test } from "node:test";
import assert from "node:assert/strict";
import { H, W, WEAPON_MAX } from "./constants.ts";
import { DIFFICULTIES } from "./difficulty.ts";
import { ENEMIES, BOSS_PHASES, bossPhaseIndex } from "./enemies.ts";
import { BOSS_ENTER, pathPos } from "./paths.ts";
import { STAGES } from "./stages.ts";
import { missileShots, pickUp, weaponItemKind, weaponShots } from "./weapons.ts";
import type { Loadout } from "./weapons.ts";
import {
  BOMB_TICKS,
  BOSS_DOWN_TICKS,
  INVULN_TICKS,
  RESPAWN_TICKS,
  carryOver,
  createStage,
  damage,
  startCarry,
  step,
} from "./sim.ts";
import type { GameEvent, GameState, Input } from "./sim.ts";

const classic = DIFFICULTIES.classic;
const IDLE: Input = { tx: null, ty: null, dx: 0, dy: 0, bomb: false };

/** 空場地：不出敵人、不出大魔王 */
function blank(seed = 1): GameState {
  const s = createStage(classic, 0, startCarry(classic), seed);
  s.spawnIdx = s.def.spawns.length;
  s.bossSpawned = true;
  s.player.invuln = 0;
  return s;
}

function run(s: GameState, ticks: number, input: Input = IDLE): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < ticks; i++) step(s, input, events);
  return events;
}

function addEnemy(s: GameState, kind: keyof typeof ENEMIES, x: number, y: number) {
  s.enemies.push({
    id: s.nextId++, kind, path: { type: "line", x, y, vx: 0, vy: 0 }, age: 0, x, y,
    hp: ENEMIES[kind].hp, maxHp: ENEMIES[kind].hp, flash: 0, drop: ENEMIES[kind].drop,
    spin: 0, aim: 0, phase: 0, phaseAge: 0,
  });
  return s.enemies[s.enemies.length - 1];
}

// ---------- 武器與道具 ----------

test("紅色散彈：等級越高子彈越多，全部往上飛", () => {
  let last = 0;
  for (let lv = 1; lv <= WEAPON_MAX; lv++) {
    const shots = weaponShots("vulcan", lv, 120, 300);
    assert.ok(shots.length >= last);
    assert.ok(shots.every((b) => b.vy < 0));
    last = shots.length;
  }
  assert.equal(weaponShots("vulcan", 1, 120, 300).length, 2);
  assert.equal(last, 9);
});

test("藍色雷射：等級越高越粗、越痛", () => {
  const a = weaponShots("laser", 1, 0, 0)[0];
  const b = weaponShots("laser", 8, 0, 0)[0];
  assert.ok(b.w > a.w && b.dmg > a.dmg);
});

test("飛彈：等級越高發數越多", () => {
  assert.equal(missileShots("homing", 1, 0, 0).length, 2);
  assert.equal(missileShots("nuclear", 4, 0, 0).length, 5);
});

test("撿武器：同色升級、換色保留等級；滿級再撿加分", () => {
  const l: Loadout = { weapon: { kind: "vulcan", level: 1 }, missile: null, bombs: 3 };
  pickUp(l, "weapon", 0); // 紅
  assert.deepEqual(l.weapon, { kind: "vulcan", level: 2 });
  pickUp(l, "weapon", 130); // 藍
  assert.deepEqual(l.weapon, { kind: "laser", level: 3 });
  l.weapon = { kind: "plasma", level: WEAPON_MAX };
  assert.equal(weaponItemKind(250), "plasma");
  assert.ok(pickUp(l, "weapon", 250) > 0);
  assert.equal(l.weapon.level, WEAPON_MAX);
  pickUp(l, "missile", 0);
  assert.deepEqual(l.missile, { kind: "homing", level: 1 });
  pickUp(l, "bomb", 0);
  assert.equal(l.bombs, 4);
});

// ---------- 路線 ----------

test("路線：直線、繞圈後往上飛走、停住再離開、地面跟著捲動", () => {
  assert.deepEqual(pathPos({ type: "line", x: 10, y: 0, vx: 1, vy: 2 }, 5, 0), { x: 15, y: 10 });
  const sw = { type: "swoop", x: 40, side: 1 } as const;
  const a = pathPos(sw, 200, 0);
  const b = pathPos(sw, 260, 0);
  assert.ok(b.y < a.y, "繞完圈後往上");
  assert.ok(Math.abs(b.x - 120) < 1e-6);
  const hv = { type: "hover", x: 100, y: 80, stay: 100, leave: -1 } as const;
  assert.equal(pathPos(hv, 70, 0).y, 80);
  assert.equal(pathPos(hv, 170, 0).y, 80);
  assert.ok(pathPos(hv, 250, 0).y < 0);
  assert.deepEqual(pathPos({ type: "ground", x: 50, y: -14, vx: 0, vy: 0 }, 100, 0.6), { x: 50, y: 46 });
  assert.ok(pathPos({ type: "boss" }, BOSS_ENTER, 0).y > 40);
});

// ---------- 關卡資料 ----------

test("三關：出場表依時間排序、都在大魔王之前、x 在畫面內", () => {
  assert.equal(STAGES.length, 3);
  for (const st of STAGES) {
    for (let i = 1; i < st.spawns.length; i++) assert.ok(st.spawns[i].t >= st.spawns[i - 1].t);
    assert.ok(st.spawns.every((sp) => sp.t < st.bossAt));
    assert.ok(st.spawns.every((sp) => !("x" in sp.path) || (sp.path.x >= 0 && sp.path.x <= W)));
    assert.ok(BOSS_PHASES[st.boss]);
  }
});

test("大魔王依血量換階段", () => {
  assert.equal(bossPhaseIndex("boss3", 1), 0);
  assert.equal(bossPhaseIndex("boss3", 0.5), 1);
  assert.equal(bossPhaseIndex("boss3", 0.2), 2);
});

// ---------- 模擬 ----------

test("拖曳：飛機往手指位置移動，不會超出畫面", () => {
  const s = blank();
  run(s, 120, { ...IDLE, tx: 400, ty: -100 });
  assert.equal(s.player.x, W - 8);
  assert.equal(s.player.y, 16);
});

test("自動連射，打倒敵人加分並掉道具", () => {
  const s = blank();
  const e = addEnemy(s, "carrier", s.player.x, 200);
  const events = run(s, 120);
  assert.ok(e.hp <= 0);
  assert.equal(s.score, ENEMIES.carrier.points);
  assert.ok(events.some((ev) => ev.type === "boom"));
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].kind, "weapon");
});

test("撿到道具", () => {
  const s = blank();
  s.items.push({ id: 999, kind: "medal", x: s.player.x, y: s.player.y, vx: 0, vy: 0, age: 0 });
  const events = run(s, 1);
  assert.ok(events.some((ev) => ev.type === "item"));
  assert.equal(s.medals, 1);
  assert.equal(s.items.length, 0);
});

test("中彈：少一條命、武器退回 1 級、重生後有無敵時間；命用完就結束", () => {
  const s = blank();
  s.weapon = { kind: "laser", level: 5 };
  s.missile = { kind: "homing", level: 2 };
  s.ebullets.push({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, r: 2.5 });
  assert.ok(run(s, 1).some((ev) => ev.type === "playerDie"));
  assert.equal(s.lives, 2);
  assert.equal(s.weapon.level, 1);
  assert.equal(s.missile, null);
  run(s, RESPAWN_TICKS);
  assert.equal(s.player.alive, true);
  assert.ok(s.player.invuln > INVULN_TICKS - 5);

  s.lives = 1;
  s.player.invuln = 0;
  s.ebullets.push({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, r: 2.5 });
  run(s, 1);
  const events = run(s, RESPAWN_TICKS);
  assert.equal(s.phase, "lost");
  assert.ok(events.some((ev) => ev.type === "gameOver"));
});

test("輕鬆模式死掉只掉 2 級、保留飛彈", () => {
  const s = createStage(DIFFICULTIES.easy, 0, startCarry(DIFFICULTIES.easy), 1);
  s.player.invuln = 0;
  s.weapon = { kind: "laser", level: 5 };
  s.missile = { kind: "homing", level: 2 };
  s.ebullets.push({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, r: 2.5 });
  run(s, 1);
  assert.equal(s.weapon.level, 3);
  assert.deepEqual(s.missile, { kind: "homing", level: 2 });
});

test("炸彈：消掉敵彈、炸傷全場、扣一顆、期間無敵", () => {
  const s = blank();
  const e = addEnemy(s, "gunship", 60, 60);
  for (let i = 0; i < 20; i++) s.ebullets.push({ x: 10 + i * 10, y: 100, vx: 0, vy: 1, r: 2.5 });
  const events = run(s, 1, { ...IDLE, bomb: true });
  assert.ok(events.some((ev) => ev.type === "bomb"));
  assert.equal(s.bombs, 2);
  assert.equal(s.ebullets.length, 0);
  run(s, 40);
  assert.ok(e.hp < ENEMIES.gunship.hp - 40);
  assert.ok(s.player.invuln > 0);
  run(s, BOMB_TICKS);
  assert.equal(s.bomb, null);
});

test("電漿光束自動鎖定前方敵人", () => {
  const s = blank();
  s.weapon = { kind: "plasma", level: 8 };
  const e = addEnemy(s, "tank", 30, 100);
  run(s, 1);
  assert.equal(s.plasmaTarget, e.id);
  run(s, 10);
  assert.ok(e.hp <= 0);
});

test("敵人會朝玩家開火；輕鬆模式子彈比較慢", () => {
  const fire = (cfg: typeof classic) => {
    const s = createStage(cfg, 0, startCarry(cfg), 1);
    s.spawnIdx = s.def.spawns.length;
    s.bossSpawned = true;
    s.player.invuln = 9999;
    addEnemy(s, "turret", 30, 100); // 避開自己的自動連射
    let shots: GameState["ebullets"] = [];
    for (let i = 0; i < 400 && shots.length === 0; i++) {
      step(s, IDLE, []);
      shots = s.ebullets;
    }
    return shots;
  };
  const c = fire(classic);
  const e = fire(DIFFICULTIES.easy);
  assert.equal(c.length, 3);
  assert.ok(c[1].vy > 0, "往下朝玩家");
  assert.ok(Math.hypot(e[0].vx, e[0].vy) < Math.hypot(c[0].vx, c[0].vy));
});

test("時間到出警告與大魔王，打倒後全場爆炸、過關", () => {
  const s = createStage(classic, 0, startCarry(classic), 1);
  s.spawnIdx = s.def.spawns.length;
  s.player.invuln = 1e9;
  s.tick = s.def.bossAt - 200;
  const events = run(s, 200);
  assert.ok(events.some((ev) => ev.type === "warning"));
  const boss = s.enemies.find((e) => e.kind === "boss1");
  assert.ok(boss);
  damage(s, boss, 9999, []);
  assert.ok(boss.hp > 0, "還沒降落完不會受傷");
  run(s, BOSS_ENTER);
  const ev2: GameEvent[] = [];
  damage(s, boss, 9999, ev2);
  assert.ok(ev2.some((ev) => ev.type === "bossDown"));
  assert.equal(s.phase, "bossDown");
  assert.equal(s.score, ENEMIES.boss1.points);
  const ev3 = run(s, BOSS_DOWN_TICKS);
  assert.equal(s.phase, "cleared");
  assert.ok(ev3.some((ev) => ev.type === "stageClear"));
  const carry = carryOver(s);
  assert.equal(carry.score, s.score);
  assert.equal(createStage(classic, 1, carry, 2).stage, 2);
});

test("分數到門檻加一條命", () => {
  const s = blank();
  s.score = 49900;
  addEnemy(s, "carrier", s.player.x, 200);
  const events = run(s, 120);
  assert.ok(events.some((ev) => ev.type === "extraLife"));
  assert.equal(s.lives, 4);
});

test("同樣的種子與輸入，整關結果完全相同；不碰的話整關會正常跑完", () => {
  const play = () => {
    const s = createStage(classic, 0, startCarry(classic), 7);
    for (let i = 0; i < 6000 && s.phase === "playing"; i++) {
      step(s, { tx: 120 + Math.sin(i / 50) * 80, ty: H - 40, dx: 0, dy: 0, bomb: i % 900 === 0 }, []);
    }
    return JSON.stringify(s);
  };
  assert.equal(play(), play());
});
