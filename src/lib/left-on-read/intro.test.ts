import { test } from "node:test";
import assert from "node:assert/strict";
import { INTRO_MELODY, INTRO_SHOTS, introShotAt, typewriterCount } from "./intro.ts";

const totalMs = () => INTRO_SHOTS.reduce((sum, s) => sum + s.durationMs, 0);

test("有 7～8 個分鏡，id 不重複，每個都有字幕和長度", () => {
  assert.ok(INTRO_SHOTS.length >= 7 && INTRO_SHOTS.length <= 8, `${INTRO_SHOTS.length} 個分鏡`);
  assert.equal(new Set(INTRO_SHOTS.map((s) => s.id)).size, INTRO_SHOTS.length);
  for (const s of INTRO_SHOTS) {
    assert.ok(s.durationMs > 0, `${s.id} 長度 ${s.durationMs}`);
    assert.ok(s.caption.trim().length > 0, `${s.id} 沒有字幕`);
  }
});

test("總長約 40 秒（±3 秒）", () => {
  const total = totalMs();
  assert.ok(total >= 37_000 && total <= 43_000, `總長 ${total}ms`);
});

test("字幕不含 Tinder", () => {
  assert.ok(!/tinder/i.test(JSON.stringify(INTRO_SHOTS)));
});

test("introShotAt：0 毫秒是第一個分鏡", () => {
  assert.deepEqual(introShotAt(0), { index: 0, localMs: 0, done: false });
});

test("introShotAt：分鏡交界落在正確的一側", () => {
  let start = 0;
  INTRO_SHOTS.forEach((shot, i) => {
    assert.deepEqual(introShotAt(start), { index: i, localMs: 0, done: false });
    assert.deepEqual(introShotAt(start + shot.durationMs - 1), {
      index: i,
      localMs: shot.durationMs - 1,
      done: false,
    });
    start += shot.durationMs;
  });
});

test("introShotAt：播完時 done，索引不超出範圍", () => {
  const total = totalMs();
  assert.equal(introShotAt(total - 1).done, false);
  for (const t of [total, total + 1, total * 10]) {
    const r = introShotAt(t);
    assert.equal(r.done, true, `t=${t}`);
    assert.ok(r.index >= 0 && r.index < INTRO_SHOTS.length, `t=${t} index=${r.index}`);
  }
});

test("typewriterCount：從 0 開始，依速度增加", () => {
  const text = "一二三四五六七八九十";
  assert.equal(typewriterCount(text, 0, 10), 0);
  assert.equal(typewriterCount(text, 500, 10), 5);
  assert.equal(typewriterCount(text, 200, 5), 1);
});

test("typewriterCount：是整數、不超過字幕長度、不會倒退", () => {
  for (const shot of INTRO_SHOTS) {
    let last = 0;
    for (let t = 0; t <= shot.durationMs * 3; t += 137) {
      const n = typewriterCount(shot.caption, t, 12);
      assert.ok(Number.isInteger(n), `${n} 不是整數`);
      assert.ok(n >= last && n <= shot.caption.length, `t=${t} 字數 ${n}`);
      last = n;
    }
    assert.equal(typewriterCount(shot.caption, 1e9, 12), shot.caption.length);
  }
});

test("旋律有音符，音高合法，長度為正", () => {
  assert.ok(INTRO_MELODY.length > 0);
  for (const n of INTRO_MELODY) {
    assert.ok(Number.isInteger(n.midi) && n.midi >= 0 && n.midi <= 127, `midi ${n.midi}`);
    assert.ok(n.time >= 0, `time ${n.time}`);
    assert.ok(n.duration > 0, `duration ${n.duration}`);
  }
});

test("音符不超過開場總長，時間遞增（單位是秒，對應 scheduleNote）", () => {
  const totalSec = totalMs() / 1000;
  let last = -Infinity;
  for (const n of INTRO_MELODY) {
    assert.ok(n.time >= last, `時間倒退：${n.time} < ${last}`);
    assert.ok(n.time + n.duration <= totalSec, `音符結束於 ${n.time + n.duration} 秒，超過 ${totalSec} 秒`);
    last = n.time;
  }
  assert.ok(last > 1, "旋律的時間看起來不是以秒為單位");
});
