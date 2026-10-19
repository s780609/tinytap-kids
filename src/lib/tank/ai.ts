import { BASE_RECT, DX, DY } from "./constants.ts";
import type { Dir, GameState, Tank } from "./constants.ts";
import { canOccupy, snapForTurn } from "./movement.ts";
import { rand, randInt } from "./rng.ts";

/** 加權隨機方向：上 1、下 2、左 1.5、右 1.5 */
const WEIGHTS: readonly [Dir, number][] = [
  [0, 1],
  [1, 1.5],
  [2, 2],
  [3, 1.5],
];
const WEIGHT_SUM = 6;

function weightedDir(s: GameState): Dir {
  let r = rand(s) * WEIGHT_SUM;
  for (const [d, w] of WEIGHTS) {
    if (r < w) return d;
    r -= w;
  }
  return 2;
}

function towards(s: GameState, t: Tank, tx: number, ty: number): Dir | null {
  const dx = tx - t.x;
  const dy = ty - t.y;
  const sum = Math.abs(dx) + Math.abs(dy);
  if (sum === 0) return null;
  if (rand(s) < Math.abs(dy) / sum) return dy > 0 ? 2 : 0;
  return dx > 0 ? 1 : 3;
}

/** 選新方向（亂數全部取自 s.seed） */
export function chooseEnemyDir(s: GameState, t: Tank, others: readonly Tank[]): Dir {
  const r = rand(s);
  const cfg = s.cfg;
  // 往基地衝的傾向隨關卡變強：第 1 關只有設定值的 30%，第 10 關才是 100%
  const baseBias = cfg.aiBaseBias * (0.3 + 0.7 * Math.min(1, (s.stage - 1) / 9));
  if (r < baseBias) {
    const d = towards(s, t, BASE_RECT.x, BASE_RECT.y);
    if (d !== null) return d;
  } else if (r < baseBias + cfg.aiPlayerBias && s.player) {
    const d = towards(s, t, s.player.x, s.player.y);
    if (d !== null) return d;
  }
  const free = (d: Dir) => canOccupy(s.grid, t.x + DX[d], t.y + DY[d], t.x, t.y, others);
  const d = weightedDir(s);
  if (free(d)) return d;
  return weightedDir(s);
}

/** 每 tick 移動前呼叫：計時到期、上一步被擋、或在 8px 格點上小機率 → 重選方向 */
export function enemyThink(s: GameState, t: Tank, others: readonly Tank[]): void {
  t.aiTimer--;
  const onGrid = t.x % 8 === 0 && t.y % 8 === 0;
  const rethink = t.aiTimer <= 0 || t.blocked || (onGrid && rand(s) < 1 / 16);
  if (!rethink) return;
  const d = chooseEnemyDir(s, t, others);
  snapForTurn(s.grid, t, d, others);
  t.blocked = false;
  t.aiTimer = randInt(s, 32, 160);
}
