/*
 * 假設的介面（實作請照這個寫）：
 *   score.ts
 *     export const POINTS: Record<EnemyKind, number>  // basic 100、fast 200、power 300、armor 400
 *     type DiffMap = { classic: number; easy: number }
 *     export function parseHiScores(raw: string | null): DiffMap
 *       —— 解析 localStorage "tinytap-tank-hi"；null、壞 JSON、非物件、非有限數字或負數的欄位 → 0。
 *     export function mergeHiScore(map: DiffMap, diff: "classic" | "easy", score: number): DiffMap
 *       —— 回傳新物件；只有 score 較高才更新該難度。
 *     export function parseProgress(raw: string | null): DiffMap
 *       —— 解析 "tinytap-tank-progress"（1 起算的最遠到達關卡）；壞資料、非整數或 < 1 的欄位 → 1。
 *     export function mergeProgress(map: DiffMap, diff: "classic" | "easy", stage: number): DiffMap
 *       —— 回傳新物件；只增不減。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { POINTS, parseHiScores, mergeHiScore, parseProgress, mergeProgress } from "./score.ts";

test("POINTS 各型分數", () => {
  assert.deepEqual({ ...POINTS }, { basic: 100, fast: 200, power: 300, armor: 400 });
});

test("mergeHiScore 只在較高時更新，parseHiScores 壞資料回 0", () => {
  const base = { classic: 1000, easy: 300 };
  assert.deepEqual(mergeHiScore(base, "classic", 500), { classic: 1000, easy: 300 });
  assert.deepEqual(mergeHiScore(base, "classic", 1500), { classic: 1500, easy: 300 });
  assert.deepEqual(mergeHiScore(base, "easy", 400), { classic: 1000, easy: 400 });
  assert.deepEqual(base, { classic: 1000, easy: 300 }, "不改原物件");

  assert.deepEqual(parseHiScores(null), { classic: 0, easy: 0 });
  assert.deepEqual(parseHiScores(""), { classic: 0, easy: 0 });
  assert.deepEqual(parseHiScores("{壞掉"), { classic: 0, easy: 0 });
  assert.deepEqual(parseHiScores("[1,2]"), { classic: 0, easy: 0 });
  assert.deepEqual(parseHiScores("42"), { classic: 0, easy: 0 });
  assert.deepEqual(parseHiScores('{"classic":1500,"easy":"abc"}'), { classic: 1500, easy: 0 });
  assert.deepEqual(parseHiScores('{"classic":-5,"easy":null}'), { classic: 0, easy: 0 });
  assert.deepEqual(parseHiScores(JSON.stringify({ classic: 2300, easy: 800 })), { classic: 2300, easy: 800 });
});

test("mergeProgress 只增不減、parseProgress 壞資料回 1", () => {
  const base = { classic: 3, easy: 1 };
  assert.deepEqual(mergeProgress(base, "classic", 2), { classic: 3, easy: 1 });
  assert.deepEqual(mergeProgress(base, "classic", 5), { classic: 5, easy: 1 });
  assert.deepEqual(mergeProgress(base, "easy", 4), { classic: 3, easy: 4 });
  assert.deepEqual(base, { classic: 3, easy: 1 }, "不改原物件");

  assert.deepEqual(parseProgress(null), { classic: 1, easy: 1 });
  assert.deepEqual(parseProgress("not json"), { classic: 1, easy: 1 });
  assert.deepEqual(parseProgress("[]"), { classic: 1, easy: 1 });
  assert.deepEqual(parseProgress('{"classic":0,"easy":"x"}'), { classic: 1, easy: 1 });
  assert.deepEqual(parseProgress('{"classic":3,"easy":7}'), { classic: 3, easy: 7 });
});
