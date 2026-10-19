/*
 * 假設的介面（實作請照這個寫）：
 *   constants.ts
 *     export const T = { EMPTY: 0, BRICK: 1, STEEL: 2, WATER: 3, TREES: 4, ICE: 5 } as const;
 *     export type Bullet = { id; ownerId; side: "player" | "enemy"; x; y; dir: Dir; speed; breaksSteel }（計畫 2.2）
 *     地形格 grid：Uint8Array(26 * 26)，索引 = 子格列 * 26 + 子格欄；1 子格 = 8px；地圖 208×208px
 *   terrain.ts
 *     export function rectBlocksTank(grid: Uint8Array, x: number, y: number, w: number, h: number): boolean
 *       —— 矩形碰到 BRICK/STEEL/WATER 子格、超出 [0,208)、或與基地矩形 (96,192,16,16) 重疊 → true。
 *          邊緣相接不算重疊（半開區間）。TREES、ICE 不擋。
 *     export function bulletTerrainHit(grid: Uint8Array, b: Bullet): "brick" | "steel" | null
 *       —— 檢查子彈「目前位置」的 4×4 矩形：
 *          null = 沒撞到、子彈繼續飛；
 *          "brick" / "steel" = 子彈消失，並應發出同名事件；
 *          碰到磚：就地把「行進方向前方那排子格中與 [中心-8, 中心+8) 有交集者」設成 EMPTY，回傳 "brick"；
 *          碰到鋼：breaksSteel=false → 不改地形、回傳 "steel"；breaksSteel=true → 同樣規則打掉鋼（回傳非 null 即可）；
 *          子彈矩形超出地圖 → 回傳 "steel"。
 *   sim.ts（只用在三星子彈的檢查）
 *     createStage(cfg, stageIndex(0 起算), carry: Carry, seed) / step(s, input, events)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { T } from "./constants.ts";
import type { Bullet, Carry, Tank } from "./constants.ts";
import { DIFFICULTIES } from "./difficulty.ts";
import { rectBlocksTank, bulletTerrainHit } from "./terrain.ts";
import { createStage, step } from "./sim.ts";

const N = 26;
const emptyGrid = () => new Uint8Array(N * N);
const setCell = (g: Uint8Array, c: number, r: number, v: number) => {
  g[r * N + c] = v;
};
const cell = (g: Uint8Array, c: number, r: number) => g[r * N + c];
/** 把一整格（16px）的 4 個子格設成同一地形 */
const setTile = (g: Uint8Array, col: number, row: number, v: number) => {
  for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) setCell(g, col * 2 + dc, row * 2 + dr, v);
};

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

let uid = 9000;
function makeBullet(p: Partial<Bullet>): Bullet {
  return { id: uid++, ownerId: -1, side: "player", x: 0, y: 0, dir: 0, speed: 2, breaksSteel: false, ...p };
}

/** 子彈每次前進 1px 後呼叫 bulletTerrainHit，回傳第一個非 null 結果（最多 maxPx 步） */
function fly(g: Uint8Array, b: Bullet, maxPx = 300): "brick" | "steel" | null {
  for (let i = 0; i < maxPx; i++) {
    b.x += DX[b.dir];
    b.y += DY[b.dir];
    const r = bulletTerrainHit(g, b);
    if (r !== null) return r;
  }
  return null;
}

test("坦克不能穿過磚、鋼、水，能穿過樹與冰", () => {
  for (const [v, blocks] of [
    [T.BRICK, true],
    [T.STEEL, true],
    [T.WATER, true],
    [T.TREES, false],
    [T.ICE, false],
  ] as const) {
    const g = emptyGrid();
    setCell(g, 4, 4, v); // 子格 (4,4) = px 32..40
    assert.equal(rectBlocksTank(g, 24, 24, 16, 16), blocks, `地形 ${v} 重疊`);
    assert.equal(rectBlocksTank(g, 40, 24, 16, 16), false, `地形 ${v} 只是相接不算`);
    assert.equal(rectBlocksTank(g, 24, 40, 16, 16), false, `地形 ${v} 只是相接不算（下方）`);
  }
  assert.equal(rectBlocksTank(emptyGrid(), 50, 50, 16, 16), false);
});

test("坦克不能出界也不能開進基地", () => {
  const g = emptyGrid();
  assert.equal(rectBlocksTank(g, -1, 0, 16, 16), true);
  assert.equal(rectBlocksTank(g, 0, -1, 16, 16), true);
  assert.equal(rectBlocksTank(g, 193, 0, 16, 16), true);
  assert.equal(rectBlocksTank(g, 0, 193, 16, 16), true);
  assert.equal(rectBlocksTank(g, 0, 0, 16, 16), false);
  assert.equal(rectBlocksTank(g, 192, 0, 16, 16), false);
  assert.equal(rectBlocksTank(g, 192, 192, 16, 16), false);
  // 基地矩形 (96,192,16,16)
  assert.equal(rectBlocksTank(g, 96, 192, 16, 16), true);
  assert.equal(rectBlocksTank(g, 90, 180, 16, 16), true);
  assert.equal(rectBlocksTank(g, 88, 176, 16, 16), false, "只相接不算");
  assert.equal(rectBlocksTank(g, 80, 192, 16, 16), false, "基地左邊相接");
});

test("子彈打磚一次打掉正面兩子格，兩發打穿一格", () => {
  const g = emptyGrid();
  setTile(g, 6, 5, T.BRICK); // 子格欄 12–13、列 10–11（px x 96..112, y 80..96）
  // 子彈中心 x = 104，往上飛
  const b1 = makeBullet({ x: 102, y: 110, dir: 0 });
  assert.equal(fly(g, b1), "brick");
  assert.equal(cell(g, 12, 11), T.EMPTY);
  assert.equal(cell(g, 13, 11), T.EMPTY);
  assert.equal(cell(g, 12, 10), T.BRICK, "後排還在");
  assert.equal(cell(g, 13, 10), T.BRICK, "後排還在");

  const b2 = makeBullet({ x: 102, y: 110, dir: 0 });
  assert.equal(fly(g, b2), "brick");
  assert.equal(cell(g, 12, 10), T.EMPTY);
  assert.equal(cell(g, 13, 10), T.EMPTY);

  // 第三發直接穿過去，飛出上邊界
  const b3 = makeBullet({ x: 102, y: 110, dir: 0 });
  assert.equal(fly(g, b3), "steel");
  assert.ok(b3.y < 4);
  assert.equal(g.filter((x) => x !== T.EMPTY).length, 0);

  // 橫向：往右打，打掉前方一欄中與 [中心-8, 中心+8) 交集的兩子格
  const h = emptyGrid();
  setTile(h, 8, 3, T.BRICK); // 子格欄 16–17、列 6–7（px x 128..144, y 48..64）
  const b4 = makeBullet({ x: 100, y: 54, dir: 1 }); // 中心 y = 56
  assert.equal(fly(h, b4), "brick");
  assert.equal(cell(h, 16, 6), T.EMPTY);
  assert.equal(cell(h, 16, 7), T.EMPTY);
  assert.equal(cell(h, 17, 6), T.BRICK);
  assert.equal(cell(h, 17, 7), T.BRICK);
});

test("普通子彈打鋼消失、鋼不變；三星子彈打掉鋼", () => {
  const g = emptyGrid();
  setTile(g, 6, 5, T.STEEL);
  const before = g.slice();
  const b1 = makeBullet({ x: 102, y: 110, dir: 0, breaksSteel: false });
  assert.equal(fly(g, b1), "steel");
  assert.deepEqual(g, before, "鋼不變");
  assert.ok(b1.y > 90, "停在鋼前面");

  const b2 = makeBullet({ x: 102, y: 110, dir: 0, breaksSteel: true });
  assert.notEqual(fly(g, b2), null);
  assert.equal(cell(g, 12, 11), T.EMPTY);
  assert.equal(cell(g, 13, 11), T.EMPTY);
  assert.equal(cell(g, 12, 10), T.STEEL);

  // 三星玩家射出的子彈 breaksSteel = true，一到二星不行
  const cfg = DIFFICULTIES.classic;
  for (const [stars, expected] of [
    [3, true],
    [2, false],
  ] as const) {
    const carry: Carry = { score: 0, lives: cfg.lives, stars: 0, nextLifeIdx: 0 };
    const s = createStage(cfg, 0, carry, 1);
    s.grid = emptyGrid();
    s.terrainVersion++;
    s.enemies = [];
    s.sparkles = [];
    s.bullets = [];
    s.powerUp = null;
    s.spawnCooldown = 1e9;
    s.shovel = 0;
    s.stars = stars;
    const player: Tank = {
      id: uid++, side: "player", kind: "player", x: 64, y: 96, dir: 0, acc: 0, hp: 1, bonus: false,
      shield: 0, reload: 0, aiTimer: 0, fireTimer: 0, slide: 0, blocked: false, moving: false,
    };
    s.player = player;
    s.playerSparkle = null;
    s.respawnTimer = 0;
    step(s, { dir: null, fire: true }, []);
    const mine = s.bullets.filter((b) => b.side === "player");
    assert.equal(mine.length, 1, `${stars} 星應射出一發`);
    assert.equal(mine[0].breaksSteel, expected, `${stars} 星 breaksSteel`);
  }
});

test("子彈飛過水和樹不受影響", () => {
  const g = emptyGrid();
  setTile(g, 6, 2, T.WATER);
  setTile(g, 6, 3, T.TREES);
  setTile(g, 6, 4, T.ICE);
  const before = g.slice();
  const b = makeBullet({ x: 102, y: 110, dir: 0 });
  // 一路飛到上邊界才消失
  assert.equal(fly(g, b), "steel");
  assert.ok(b.y < 4, `應該飛到邊界，實際 y=${b.y}`);
  assert.deepEqual(g, before);
});

test("子彈擦過磚旁、自己沒碰到不觸發", () => {
  const g = emptyGrid();
  setCell(g, 12, 10, T.BRICK); // px x 96..104, y 80..88
  setCell(g, 12, 11, T.BRICK);
  const before = g.slice();
  // 子彈 x 92..96，緊貼磚的左邊往上飛：[中心-8, 中心+8) 雖然涵蓋磚，但子彈本身沒碰到
  const b = makeBullet({ x: 92, y: 110, dir: 0 });
  for (let i = 0; i < 40; i++) {
    b.y -= 1;
    assert.equal(bulletTerrainHit(g, b), null, `y=${b.y} 不應觸發`);
  }
  assert.deepEqual(g, before);
});

test("子彈出界消失並發 steel 事件", () => {
  const g = emptyGrid();
  for (const [x, y, dir] of [
    [100, 6, 0],
    [200, 100, 1],
    [100, 200, 2],
    [6, 100, 3],
  ] as const) {
    const b = makeBullet({ x, y, dir });
    assert.equal(fly(g, b, 20), "steel", `方向 ${dir}`);
  }
});
