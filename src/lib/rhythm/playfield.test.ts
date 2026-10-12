import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beatPhase,
  countdownLabel,
  isNoteVisible,
  laneAt,
  noteY,
  songTimeAt,
  takeDue,
} from "./playfield.ts";
import type { Chart, ChartNote } from "./chart.ts";

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

/** 手刻譜面：secPerBeat 0.5、firstNoteTime 3（第 6 拍） */
const chart: Chart = {
  songId: "test",
  difficulty: "normal",
  secPerBeat: 0.5,
  firstNoteTime: 3,
  endTime: 20,
  notes: [],
  tones: [],
  clicks: [],
};

const note = (time: number, endTime: number): ChartNote => ({
  id: 0,
  lane: 0,
  time,
  endTime,
  type: endTime > time ? "hold" : "tap",
  midi: 60,
});

test("songTimeAt：performance 多 1000ms 就多 1 秒，並扣掉 startCtxTime", () => {
  const anchor = { contextTime: 10, performanceTime: 5000 };
  assert.ok(near(songTimeAt(5000, anchor, 8), 2));
  assert.ok(near(songTimeAt(6000, anchor, 8), 3));
  assert.ok(near(songTimeAt(6500, anchor, 8), 3.5));
  assert.ok(near(songTimeAt(4000, anchor, 8), 1));
  assert.ok(near(songTimeAt(6000, anchor, 10), 1));
});

test("noteY：t = time 在判定線、t = time − approach 在頂端，中間線性", () => {
  const top = 100;
  const line = 500;
  assert.ok(near(noteY(5, 5, 2, top, line), line));
  assert.ok(near(noteY(5, 3, 2, top, line), top));
  assert.ok(near(noteY(5, 4, 2, top, line), 300));
  assert.ok(near(noteY(5, 3.5, 2, top, line), 200));
  // 可外插：過線後繼續往下、還沒出現時在頂端之上
  assert.ok(near(noteY(5, 6, 2, top, line), 700));
  assert.ok(near(noteY(5, 2, 2, top, line), -100));
});

test("isNoteVisible：太遠看不到；hold 頭過線但尾巴還在時看得到；過線超過 pastSec 看不到", () => {
  const approach = 2;
  const past = 0.3;
  const t = note(5, 5);
  assert.equal(isNoteVisible(t, 2.9, approach, past), false);
  assert.equal(isNoteVisible(t, 3.0, approach, past), true);
  assert.equal(isNoteVisible(t, 5.0, approach, past), true);
  assert.equal(isNoteVisible(t, 5.2, approach, past), true);
  assert.equal(isNoteVisible(t, 5.4, approach, past), false);

  const h = note(5, 7);
  assert.equal(isNoteVisible(h, 2.9, approach, past), false);
  assert.equal(isNoteVisible(h, 6.0, approach, past), true, "頭已過線、尾巴還在");
  assert.equal(isNoteVisible(h, 7.2, approach, past), true);
  assert.equal(isNoteVisible(h, 7.4, approach, past), false);
});

test("laneAt 三等分邊界，超出範圍回傳 null", () => {
  const left = 100;
  const width = 300;
  assert.equal(laneAt(100, left, width, 3), 0);
  assert.equal(laneAt(150, left, width, 3), 0);
  assert.equal(laneAt(199.9, left, width, 3), 0);
  assert.equal(laneAt(200, left, width, 3), 1);
  assert.equal(laneAt(299.9, left, width, 3), 1);
  assert.equal(laneAt(300, left, width, 3), 2);
  assert.equal(laneAt(399.9, left, width, 3), 2);
  assert.equal(laneAt(99, left, width, 3), null);
  assert.equal(laneAt(401, left, width, 3), null);
  assert.equal(laneAt(-50, left, width, 3), null);
  // 4 軌
  assert.equal(laneAt(174.9, left, width, 4), 0);
  assert.equal(laneAt(175, left, width, 4), 1);
  assert.equal(laneAt(325, left, width, 4), 3);
});

test("countdownLabel 依序顯示 3 / 2 / 1 / 開始！，前後為 null", () => {
  // firstNoteTime 3、spb 0.5 → 倒數從 1.0 開始
  assert.equal(countdownLabel(0, chart), null);
  assert.equal(countdownLabel(0.99, chart), null);
  assert.equal(countdownLabel(1.0, chart), "3");
  assert.equal(countdownLabel(1.49, chart), "3");
  assert.equal(countdownLabel(1.5, chart), "2");
  assert.equal(countdownLabel(1.99, chart), "2");
  assert.equal(countdownLabel(2.0, chart), "1");
  assert.equal(countdownLabel(2.49, chart), "1");
  assert.equal(countdownLabel(2.5, chart), "開始！");
  assert.equal(countdownLabel(2.99, chart), "開始！");
  assert.equal(countdownLabel(3.0, chart), null);
  assert.equal(countdownLabel(10, chart), null);
});

test("takeDue 只推進 time < horizon 的事件，重複呼叫不會重複", () => {
  const events = [0, 0.5, 1, 1.5, 2].map((time) => ({ time }));
  let i = takeDue(events, 0, 0.9);
  assert.equal(i, 2);
  assert.equal(takeDue(events, i, 0.9), 2, "同一個 horizon 不再推進");
  assert.equal(takeDue(events, i, 1.0), 2, "time 等於 horizon 不算");
  i = takeDue(events, i, 1.01);
  assert.equal(i, 3);
  i = takeDue(events, i, 100);
  assert.equal(i, 5);
  assert.equal(takeDue(events, i, 200), 5);
  assert.equal(takeDue([], 0, 10), 0);
  assert.equal(takeDue(events, 0, -1), 0);
});

test("beatPhase 永遠在 [0, 1) 之內", () => {
  for (let t = -0.3; t <= 12; t += 0.037) {
    const p = beatPhase(t, chart);
    assert.ok(p >= 0 && p < 1, `t=${t.toFixed(3)} phase=${p}`);
  }
  // firstNoteTime 落在整拍上，拍點 phase 為 0、半拍為 0.5
  assert.ok(near(beatPhase(3, chart), 0, 1e-6));
  assert.ok(near(beatPhase(3.25, chart), 0.5, 1e-6));
  assert.ok(near(beatPhase(4.125, chart), 0.25, 1e-6));
});
