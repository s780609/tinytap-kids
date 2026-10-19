/*
 * 假設的介面（實作請照這個寫）：
 *   constants.ts
 *     export const T（EMPTY 0、BRICK 1、STEEL 2、WATER 3、TREES 4、ICE 5）
 *     export type Dir, EnemyKind, Tank, Bullet, Sparkle, PowerUp, GameEvent, Input, GameState, Carry, DifficultyConfig（計畫 2.2）
 *     Carry = { score: number; lives: number; stars: 0 | 1 | 2 | 3; nextLifeIdx: number }
 *     grid：Uint8Array(26*26)，索引 = 子格列 * 26 + 子格欄
 *   difficulty.ts：DIFFICULTIES.classic / DIFFICULTIES.easy（欄位名稱照計畫 2.10：lives、enemiesPerStage、
 *     maxOnScreen、armorHp、bonusAt、spawnShieldTicks、extraLifeAt…）
 *   sim.ts
 *     createStage(cfg, stageIndex: number, carry: Carry, seed: number): GameState
 *       —— stageIndex 0 起算（STAGES[stageIndex]），s.stage = stageIndex + 1；s.phase 初始為 "playing"；
 *          s.queue 依 STAGES[stageIndex].enemies[classic|easy] 建立（長度 = cfg.enemiesPerStage）；
 *          s.score/lives/stars/nextLifeIdx 取自 carry；第一台出生冷卻 0。
 *     step(s, input, events: GameEvent[]): void —— 事件 push 進 events。
 *     tally(s) → { rows: { kind; count; points }[]（四種各一列）, total }
 *     carryOver(s) → Carry（剛好四個欄位）
 *   score.ts：POINTS = { basic: 100, fast: 200, power: 300, armor: 400 }
 *
 * 測試會直接改寫 state 欄位來隔離行為（實作必須每 tick 從 s 讀取，不可快取）：
 *   - s.grid 可整個換掉（並 terrainVersion++）
 *   - s.enemies / s.sparkles / s.bullets / s.queue 可直接替換或 push 自建物件
 *   - s.player 可換成自建 Tank（id 從 9000 起），s.playerSparkle = null、s.respawnTimer 可設 0 或很大
 *   - s.spawnCooldown 設 1e9 代表不出生（每 tick 只會遞減、不會被重設）
 *   - s.freeze 設很大代表敵人凍結（不移動、不開火、閃光照常）
 *   - player 為 null（重生中）時 step 必須能正常運作
 *   - 測試自建子彈的 ownerId 可能不存在任何坦克，sim 不可因此出錯
 *   - 死亡時 s.player 變成 null；重生出生點 (64,192)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { T } from "./constants.ts";
import type { Bullet, Carry, DifficultyConfig, EnemyKind, GameEvent, GameState, Input, Tank } from "./constants.ts";
import { DIFFICULTIES } from "./difficulty.ts";
import { createStage, step, tally, carryOver } from "./sim.ts";
import { POINTS } from "./score.ts";

const N = 26;
const RING: [number, number][] = [
  [11, 23], [12, 23], [13, 23], [14, 23],
  [11, 24], [14, 24],
  [11, 25], [14, 25],
];
const emptyGrid = () => new Uint8Array(N * N);
/** 空地圖＋鋼外圈（保護基地不被流彈打到） */
function safeGrid(): Uint8Array {
  const g = emptyGrid();
  for (const [c, r] of RING) g[r * N + c] = T.STEEL;
  return g;
}

let uid = 9000;
function makeTank(p: Partial<Tank>): Tank {
  return {
    id: uid++, side: "enemy", kind: "basic", x: 0, y: 0, dir: 2, acc: 0, hp: 1, bonus: false,
    shield: 0, reload: 0, aiTimer: 0, fireTimer: 0, slide: 0, blocked: false, moving: false, ...p,
  };
}
function makeBullet(p: Partial<Bullet>): Bullet {
  return { id: uid++, ownerId: -1, side: "player", x: 0, y: 0, dir: 0, speed: 2, breaksSteel: false, ...p };
}
const freshCarry = (cfg: DifficultyConfig): Carry => ({ score: 0, lives: cfg.lives, stars: 0, nextLifeIdx: 0 });

/** 安靜的測試關卡：鋼外圈空地圖、沒有敵人、不出生、玩家在 (64,96) 朝上 */
function setup(cfg: DifficultyConfig = DIFFICULTIES.classic, seed = 1): GameState {
  const s = createStage(cfg, 0, freshCarry(cfg), seed);
  s.grid = safeGrid();
  s.terrainVersion++;
  s.enemies = [];
  s.sparkles = [];
  s.bullets = [];
  s.powerUp = null;
  s.spawnCooldown = 1e9;
  s.freeze = 0;
  s.shovel = 0;
  s.player = makeTank({ side: "player", kind: "player", x: 64, y: 96, dir: 0 });
  s.playerSparkle = null;
  s.respawnTimer = 0;
  return s;
}

const IDLE: Input = { dir: null, fire: false };
const FIRE: Input = { dir: null, fire: true };
function run(s: GameState, n: number, input: Input = IDLE, events: GameEvent[] = []): GameEvent[] {
  for (let i = 0; i < n; i++) step(s, input, events);
  return events;
}
/** 一 tick 一 tick 跑到條件成立，回傳跑了幾 tick；沒成立回傳 -1 */
function runUntil(s: GameState, pred: () => boolean, max: number, input: Input = IDLE, events: GameEvent[] = []): number {
  for (let i = 1; i <= max; i++) {
    step(s, input, events);
    if (pred()) return i;
  }
  return -1;
}
const has = (ev: GameEvent[], type: GameEvent["type"]) => ev.some((e) => e.type === type);
const alive = (s: GameState, b: Bullet) => s.bullets.some((x) => x.id === b.id);

/** 用玩家子彈從正下方打一台敵車一下，回傳過程中的事件 */
function hitFromBelow(s: GameState, e: Tank): GameEvent[] {
  const ev: GameEvent[] = [];
  const b = makeBullet({ ownerId: s.player ? s.player.id : -1, side: "player", x: e.x + 6, y: e.y + 22, dir: 0, speed: 2 });
  s.bullets.push(b);
  for (let i = 0; i < 30 && alive(s, b); i++) step(s, IDLE, ev);
  assert.equal(alive(s, b), false, "子彈應該打中而消失");
  return ev;
}

test("0 星同時一顆子彈，按住發射在子彈消失後自動再發", () => {
  const s = setup();
  const ev: GameEvent[] = [];
  let maxOnField = 0;
  for (let i = 0; i < 300; i++) {
    step(s, FIRE, ev);
    maxOnField = Math.max(maxOnField, s.bullets.filter((b) => b.side === "player").length);
  }
  assert.equal(maxOnField, 1);
  const shots = ev.filter((e) => e.type === "shoot" && e.side === "player").length;
  assert.ok(shots >= 4, `按住 300 tick 應自動連發多次，實際 ${shots}`);
  for (const b of s.bullets) assert.equal(b.speed, 2);
});

test("2 星同時兩顆；1 星起子彈速度 4", () => {
  const s2 = setup();
  s2.stars = 2;
  let max2 = 0;
  for (let i = 0; i < 200; i++) {
    step(s2, FIRE, []);
    max2 = Math.max(max2, s2.bullets.filter((b) => b.side === "player").length);
  }
  assert.equal(max2, 2);

  const s1 = setup();
  s1.stars = 1;
  let max1 = 0;
  for (let i = 0; i < 200; i++) {
    step(s1, FIRE, []);
    max1 = Math.max(max1, s1.bullets.filter((b) => b.side === "player").length);
    for (const b of s1.bullets) assert.equal(b.speed, 4, "1 星子彈速度 4");
  }
  assert.equal(max1, 1, "1 星仍只有一顆");

  const s0 = setup();
  step(s0, FIRE, []);
  assert.equal(s0.bullets.length, 1);
  assert.equal(s0.bullets[0].speed, 2, "0 星子彈速度 2");
});

test("玩家與敵方子彈迎面相撞抵消，高速也不穿過", () => {
  const s = setup();
  s.player = makeTank({ side: "player", kind: "player", x: 16, y: 160, dir: 0 });
  // 距離 8px、各自每 tick 4px：若沒有子步檢查，第二 tick 結束時會剛好穿過彼此
  const pb = makeBullet({ ownerId: s.player.id, side: "player", x: 100, y: 50, dir: 2, speed: 4 });
  const eb = makeBullet({ ownerId: -1, side: "enemy", x: 100, y: 62, dir: 0, speed: 4 });
  s.bullets.push(pb, eb);
  run(s, 3);
  assert.equal(alive(s, pb), false);
  assert.equal(alive(s, eb), false);
  assert.equal(s.bullets.length, 0);
});

test("敵子彈不傷敵車", () => {
  const s = setup();
  s.freeze = 1e6;
  const e = makeTank({ x: 96, y: 48, hp: 1 });
  s.enemies = [e];
  const b = makeBullet({ ownerId: -1, side: "enemy", x: 102, y: 100, dir: 0, speed: 2 });
  s.bullets.push(b);
  const ev: GameEvent[] = [];
  let minY = Infinity;
  for (let i = 0; i < 80; i++) {
    step(s, IDLE, ev);
    const cur = s.bullets.find((x) => x.id === b.id);
    if (cur) minY = Math.min(minY, cur.y);
  }
  assert.equal(s.enemies.length, 1);
  assert.equal(s.enemies[0].hp, 1);
  assert.ok(minY < 44, `子彈應穿過敵車繼續往上，最高到 y=${minY}`);
  assert.equal(has(ev, "explode"), false);
});

test("玩家子彈打自己基地 → losing，之後 lost", () => {
  const s = setup();
  s.grid = emptyGrid(); // 拿掉外圈
  s.terrainVersion++;
  s.player = makeTank({ side: "player", kind: "player", x: 96, y: 160, dir: 2 });
  const ev: GameEvent[] = [];
  step(s, FIRE, ev);
  const t = runUntil(s, () => s.phase === "losing", 40, IDLE, ev);
  assert.ok(t > 0, "應進入 losing");
  assert.equal(s.baseAlive, false);
  assert.ok(has(ev, "baseDown"));
  run(s, 200);
  assert.equal(s.phase, "lost");
});

test("有護盾被打中不會死", () => {
  const s = setup();
  const p = s.player!;
  p.shield = 100;
  const lives = s.lives;
  const b = makeBullet({ ownerId: -1, side: "enemy", x: p.x + 6, y: p.y - 20, dir: 2, speed: 2 });
  s.bullets.push(b);
  const ev = run(s, 30);
  assert.equal(alive(s, b), false, "子彈打到護盾消失");
  assert.ok(s.player !== null);
  assert.equal(s.lives, lives);
  assert.equal(has(ev, "playerDown"), false);
  assert.equal(s.phase, "playing");
});

test("玩家被擊中：命 -1、星級依難度、延遲後出生點重生並有護盾", () => {
  for (const [cfg, expectStars] of [
    [DIFFICULTIES.classic, 0],
    [DIFFICULTIES.easy, 1],
  ] as const) {
    const s = setup(cfg);
    s.stars = 2;
    const p = s.player!;
    const lives = s.lives;
    s.bullets.push(makeBullet({ ownerId: -1, side: "enemy", x: p.x + 6, y: p.y - 20, dir: 2, speed: 2 }));
    const ev: GameEvent[] = [];
    const t = runUntil(s, () => s.player === null, 30, IDLE, ev);
    assert.ok(t > 0, "應被擊中");
    assert.equal(s.lives, lives - 1);
    assert.equal(s.stars, expectStars, `${cfg.starsOnDeath} 星級`);
    assert.ok(has(ev, "playerDown"));
    assert.ok(ev.some((e) => e.type === "explode" && e.big), "大爆炸");
    assert.equal(s.phase, "playing");

    run(s, 50);
    // 比較布林值：直接 assert s.player 為 null 會讓 TS 把它收窄成 null，後面的檢查在型別上變成 never
    assert.equal(s.player === null, true, "延遲期間還沒重生");
    run(s, 90);
    assert.ok(s.player !== null, "應已重生");
    assert.equal(s.player!.x, 64);
    assert.equal(s.player!.y, 192);
    assert.ok(s.player!.shield > 0 && s.player!.shield <= cfg.spawnShieldTicks, "重生有護盾");
  }
});

test("命用完 phase 變 lost", () => {
  const s = setup();
  s.lives = 1;
  const p = s.player!;
  s.bullets.push(makeBullet({ ownerId: -1, side: "enemy", x: p.x + 6, y: p.y - 20, dir: 2, speed: 2 }));
  const t = runUntil(s, () => s.player === null, 30);
  assert.ok(t > 0);
  assert.equal(s.lives, 0);
  assert.equal(s.phase, "losing");
  run(s, 200);
  assert.equal(s.phase, "lost");
  assert.equal(s.player, null, "沒命了不再重生");
});

test("裝甲車要打 4 下（輕鬆 3 下），最後一下才得 400 分並計擊破", () => {
  assert.equal(DIFFICULTIES.classic.armorHp, 4);
  assert.equal(DIFFICULTIES.easy.armorHp, 3);
  for (const cfg of [DIFFICULTIES.classic, DIFFICULTIES.easy]) {
    // 出生的裝甲車 hp = cfg.armorHp
    const sp = setup(cfg);
    sp.freeze = 1e6;
    sp.queue = [{ kind: "armor", bonus: false }, { kind: "basic", bonus: false }];
    sp.spawnCooldown = 0;
    run(sp, 70);
    assert.equal(sp.enemies.length, 1);
    assert.equal(sp.enemies[0].kind, "armor");
    assert.equal(sp.enemies[0].hp, cfg.armorHp);

    const s = setup(cfg);
    s.freeze = 1e6;
    const e = makeTank({ kind: "armor", x: 96, y: 48, hp: cfg.armorHp });
    s.enemies = [e];
    for (let hit = 1; hit <= cfg.armorHp; hit++) {
      const ev = hitFromBelow(s, e);
      if (hit < cfg.armorHp) {
        assert.equal(s.enemies.length, 1, `第 ${hit} 下不應擊破`);
        assert.equal(s.enemies[0].hp, cfg.armorHp - hit);
        assert.equal(s.score, 0);
        assert.equal(s.kills.armor, 0);
        assert.equal(s.destroyed, 0);
        assert.ok(has(ev, "armorHit"));
      } else {
        assert.equal(s.enemies.length, 0, "最後一下擊破");
        assert.equal(s.score, 400);
        assert.equal(s.kills.armor, 1);
        assert.equal(s.destroyed, 1);
        assert.ok(has(ev, "explode"));
      }
    }
  }
});

test("各型得分 100/200/300/400，tally 數量與小計正確", () => {
  assert.deepEqual({ ...POINTS }, { basic: 100, fast: 200, power: 300, armor: 400 });
  const s = setup();
  s.freeze = 1e6;
  const kinds: EnemyKind[] = ["basic", "basic", "fast", "power", "armor"];
  const xs = [0, 32, 64, 128, 160];
  s.enemies = kinds.map((kind, i) => makeTank({ kind, x: xs[i], y: 16, hp: 1 }));
  for (const e of [...s.enemies]) hitFromBelow(s, e);
  assert.equal(s.enemies.length, 0);
  assert.equal(s.score, 1100);
  assert.deepEqual({ ...s.kills }, { basic: 2, fast: 1, power: 1, armor: 1 });
  assert.equal(s.destroyed, 5);

  const t = tally(s);
  assert.equal(t.rows.length, 4);
  const row = (k: EnemyKind) => t.rows.find((r) => r.kind === k)!;
  assert.deepEqual({ ...row("basic") }, { kind: "basic", count: 2, points: 200 });
  assert.deepEqual({ ...row("fast") }, { kind: "fast", count: 1, points: 200 });
  assert.deepEqual({ ...row("power") }, { kind: "power", count: 1, points: 300 });
  assert.deepEqual({ ...row("armor") }, { kind: "armor", count: 1, points: 400 });
  assert.equal(t.total, 1100);
});

test("出生排程：場上＋閃光最多 4、依 6→12→0 輪流、被佔跳下一個", () => {
  const key = (x: number, y: number) => `${x},${y}`;
  /** 跑 n tick（每 tick 冷卻歸 0），記錄新出現閃光的 x */
  const spawnXs = (s: GameState, n: number, after?: () => void) => {
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const before = new Set(s.sparkles.map((sp) => key(sp.x, sp.y)));
      s.spawnCooldown = 0;
      step(s, IDLE, []);
      for (const sp of s.sparkles) {
        if (!before.has(key(sp.x, sp.y))) {
          assert.equal(sp.y, 0, "出生點在第 0 列");
          xs.push(sp.x);
        }
      }
      after?.();
    }
    return xs;
  };

  // 輪流 6 → 12 → 0 欄；三個都佔就等
  const a = setup();
  a.freeze = 1e6;
  assert.deepEqual(spawnXs(a, 10), [96, 192, 0]);
  assert.equal(a.sparkles.length + a.enemies.length, 3);

  // 第 6 欄被坦克佔住 → 跳下一個
  const b = setup();
  b.freeze = 1e6;
  b.enemies = [makeTank({ x: 96, y: 0 })];
  assert.deepEqual(spawnXs(b, 10), [192, 0]);

  // 場上 3 台＋閃光 1 個 = 4，就不再出生
  const c = setup();
  c.freeze = 1e6;
  assert.equal(c.cfg.maxOnScreen, 4);
  c.enemies = [makeTank({ x: 16, y: 96 }), makeTank({ x: 48, y: 128 }), makeTank({ x: 144, y: 96 })];
  const q0 = c.queue.length;
  let parkX = 160;
  spawnXs(c, 200, () => {
    // 新出生的坦克移離出生點，讓出生點保持空著
    for (const e of c.enemies) {
      if (e.y < 16) {
        e.y = 160;
        e.x = parkX;
        parkX -= 16;
      }
    }
    assert.ok(c.enemies.length + c.sparkles.length <= 4, "場上＋閃光最多 4");
  });
  assert.equal(c.enemies.length + c.sparkles.length, 4);
  assert.equal(c.queue.length, q0 - 1);
});

test("出生閃光 60 tick 後才變坦克", () => {
  const s = setup();
  s.freeze = 1e6;
  s.spawnCooldown = 0;
  step(s, IDLE, []);
  assert.equal(s.sparkles.length, 1);
  assert.equal(s.enemies.length, 0);
  run(s, 54);
  assert.equal(s.sparkles.length, 1, "55 tick 時還是閃光");
  assert.equal(s.enemies.length, 0);
  run(s, 10);
  assert.equal(s.sparkles.length, 0, "65 tick 時已變坦克");
  assert.equal(s.enemies.length, 1);
  assert.equal(s.enemies[0].x, 96);
  assert.equal(s.enemies[0].y, 0);
  assert.equal(s.enemies[0].side, "enemy");
});

test("第 4/11/18 台是獎勵車，打中第一下掉道具；新獎勵車出現時舊道具消失", () => {
  const bonusIdx = (q: { bonus: boolean }[]) => q.flatMap((e, i) => (e.bonus ? [i] : []));
  const cs = createStage(DIFFICULTIES.classic, 0, freshCarry(DIFFICULTIES.classic), 1);
  assert.equal(cs.queue.length, 20);
  assert.deepEqual(bonusIdx(cs.queue), [3, 10, 17]);
  const es = createStage(DIFFICULTIES.easy, 0, freshCarry(DIFFICULTIES.easy), 1);
  assert.equal(es.queue.length, 10);
  assert.deepEqual(bonusIdx(es.queue), [1, 4, 7]);

  // 打中獎勵車第一下（裝甲車，不會死）就掉道具並取消 bonus
  const s = setup();
  s.freeze = 1e6;
  s.player = null; // 避免剛好撿到
  s.respawnTimer = 1e9;
  const e = makeTank({ kind: "armor", x: 96, y: 48, hp: 4, bonus: true });
  s.enemies = [e];
  const ev = hitFromBelow(s, e);
  assert.ok(s.powerUp !== null, "應掉出道具");
  assert.ok(has(ev, "powerAppear"));
  assert.equal(s.enemies[0].bonus, false);
  assert.equal(s.enemies[0].hp, 3);
  // 再打一下不會再掉
  s.powerUp = null;
  hitFromBelow(s, e);
  assert.equal(s.powerUp, null);

  // 新獎勵車開始閃光時，場上舊道具消失
  const t = setup();
  t.powerUp = { kind: "star", x: 160, y: 96, ticks: 500 };
  t.queue = [{ kind: "basic", bonus: true }];
  t.spawnCooldown = 0;
  step(t, IDLE, []);
  assert.equal(t.sparkles.length, 1);
  assert.equal(t.powerUp, null);
  // 非獎勵車出生不影響道具
  const u = setup();
  u.powerUp = { kind: "star", x: 160, y: 96, ticks: 500 };
  u.queue = [{ kind: "basic", bonus: false }];
  u.spawnCooldown = 0;
  step(u, IDLE, []);
  assert.equal(u.sparkles.length, 1);
  assert.ok(u.powerUp !== null);
});

test("全部擊破後 180 tick 進 cleared；carryOver 保留分數、命、星", () => {
  const cfg = DIFFICULTIES.classic;
  const s = setup(cfg);
  s.freeze = 1e6;
  s.lives = 2;
  s.stars = 2;
  const e = makeTank({ x: 96, y: 48 });
  s.enemies = [e];
  s.queue = [];
  s.bullets.push(makeBullet({ ownerId: -1, side: "enemy", x: 150, y: 150, dir: 3, speed: 1 }));
  hitFromBelow(s, e);
  assert.equal(s.phase, "clearing");
  assert.equal(s.bullets.filter((b) => b.side === "enemy").length, 0, "清掉敵方子彈");
  run(s, 170);
  assert.equal(s.phase, "clearing");
  run(s, 15);
  assert.equal(s.phase, "cleared");

  const carry = carryOver(s);
  assert.deepEqual({ ...carry }, { score: 100, lives: 2, stars: 2, nextLifeIdx: 0 });
  const next = createStage(cfg, 1, carry, 7);
  assert.equal(next.stage, 2);
  assert.equal(next.score, 100);
  assert.equal(next.lives, 2);
  assert.equal(next.stars, 2);
  assert.equal(next.nextLifeIdx, 0);
  assert.equal(next.phase, "playing");
});

test("分數跨加命門檻 +1 命，同門檻只給一次", () => {
  const s = setup(DIFFICULTIES.classic);
  s.freeze = 1e6;
  s.score = 19950;
  const a = makeTank({ x: 32, y: 48 });
  const b = makeTank({ x: 160, y: 48 });
  s.enemies = [a, b];
  const lives = s.lives;
  const ev1 = hitFromBelow(s, a);
  assert.equal(s.score, 20050);
  assert.equal(s.lives, lives + 1);
  assert.equal(s.nextLifeIdx, 1);
  assert.ok(has(ev1, "extraLife"));
  const ev2 = hitFromBelow(s, b);
  assert.equal(s.score, 20150);
  assert.equal(s.lives, lives + 1, "同門檻只給一次");
  assert.equal(has(ev2, "extraLife"), false);

  // 輕鬆有兩個門檻 10000、30000
  const e = setup(DIFFICULTIES.easy);
  e.freeze = 1e6;
  e.score = 9950;
  const c = makeTank({ x: 32, y: 48 });
  const d = makeTank({ x: 160, y: 48 });
  e.enemies = [c, d];
  const l0 = e.lives;
  hitFromBelow(e, c);
  assert.equal(e.lives, l0 + 1);
  e.score = 29950;
  hitFromBelow(e, d);
  assert.equal(e.lives, l0 + 2);
  assert.equal(e.nextLifeIdx, 2);
});

test("同種子跑 3000 tick 兩次結果完全相同（JSON 比對）；不同種子結果不同", () => {
  const DIRS = [0, 1, 2, 3, null] as const;
  const simulate = (seed: number) => {
    const cfg = DIFFICULTIES.classic;
    const s = createStage(cfg, 0, freshCarry(cfg), seed);
    const ev: GameEvent[] = [];
    for (let t = 0; t < 3000; t++) {
      step(s, { dir: DIRS[Math.floor(t / 40) % 5], fire: t % 9 < 4 }, ev);
    }
    return { s, ev };
  };
  const a = simulate(12345);
  const b = simulate(12345);
  assert.equal(JSON.stringify(a.s), JSON.stringify(b.s));
  assert.equal(JSON.stringify(a.ev), JSON.stringify(b.ev));

  const c = simulate(99);
  // 排除種子欄位本身，比較遊戲內容
  const strip = (s: GameState) => JSON.stringify({ ...s, seed: 0 });
  assert.notEqual(strip(a.s), strip(c.s));
});
