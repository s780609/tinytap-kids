import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_WINDOWS,
  COMBO_BONUS_CAP,
  COMBO_BONUS_PER,
  POINTS,
  accuracy,
  advance,
  applyJudgement,
  createPlayState,
  isBetterResult,
  isSongOver,
  judgeOffset,
  pressLane,
  rankFor,
  releaseLane,
  starsFor,
  summarize,
  totalJudgements,
  windowsFor,
  type PlayState,
  type SongResult,
} from "./judge.ts";
import { SONGS, getSong } from "./songs.ts";
import { DIFFICULTIES, buildChart, type Chart, type ChartNote, type Difficulty } from "./chart.ts";

/** 簡單的可重現亂數（LCG） */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const W = BASE_WINDOWS;

const tap = (id: number, lane: number, time: number): ChartNote => ({
  id,
  lane,
  time,
  endTime: time,
  type: "tap",
  midi: 60,
});
const hold = (id: number, lane: number, time: number, endTime: number): ChartNote => ({
  id,
  lane,
  time,
  endTime,
  type: "hold",
  midi: 60,
});

/** 手刻小譜面，不依賴歌曲資料 */
function makeChart(notes: ChartNote[]): Chart {
  const lastEnd = Math.max(0, ...notes.map((n) => n.endTime));
  return {
    songId: "test",
    difficulty: "normal",
    secPerBeat: 0.5,
    firstNoteTime: 2,
    endTime: lastEnd + 1.5,
    notes,
    tones: [],
    clicks: [],
  };
}

const stateOf = (s: PlayState, id: number) => s.notes.find((n) => n.note.id === id)!;

function result(score: number): SongResult {
  return {
    score,
    maxCombo: 0,
    counts: { perfect: 0, good: 0, miss: 0 },
    accuracy: 0,
    stars: 1,
    rank: "C",
    fullCombo: false,
  };
}

test("judgeOffset 邊界：0、±0.10 → perfect；±0.15、±0.20 → good；±0.21 → null", () => {
  assert.equal(judgeOffset(0, W), "perfect");
  assert.equal(judgeOffset(0.1, W), "perfect");
  assert.equal(judgeOffset(-0.1, W), "perfect");
  assert.equal(judgeOffset(0.15, W), "good");
  assert.equal(judgeOffset(-0.15, W), "good");
  assert.equal(judgeOffset(0.2, W), "good");
  assert.equal(judgeOffset(-0.2, W), "good");
  assert.equal(judgeOffset(0.21, W), null);
  assert.equal(judgeOffset(-0.21, W), null);
});

test("windowsFor(1.25) 等比放大三個視窗", () => {
  const w = windowsFor(1.25);
  assert.ok(near(w.perfect, BASE_WINDOWS.perfect * 1.25));
  assert.ok(near(w.good, BASE_WINDOWS.good * 1.25));
  assert.ok(near(w.holdRelease, BASE_WINDOWS.holdRelease * 1.25));
  const w1 = windowsFor(1);
  assert.ok(near(w1.perfect, 0.1) && near(w1.good, 0.2) && near(w1.holdRelease, 0.25));
  assert.equal(DIFFICULTIES.easy.windowScale, 1.25);
  assert.equal(DIFFICULTIES.normal.windowScale, 1);
});

test("pressLane 命中同軌最早未判定的音符（不是最近的），不影響其他軌", () => {
  const chart = makeChart([tap(0, 0, 2.0), tap(1, 1, 2.0), tap(2, 0, 2.15), tap(3, 0, 3.0)]);
  const s = createPlayState(chart);
  assert.equal(s.score, 0);
  assert.equal(s.combo, 0);
  assert.equal(s.holdingByLane.length, 3);
  assert.ok(s.holdingByLane.every((h) => h === null));

  // 2.12 離 2.15 比較近，但要判最早的 2.0（偏差 0.12 → good）
  const ev = pressLane(s, 0, 2.12, W);
  assert.ok(ev);
  assert.equal(ev.lane, 0);
  assert.equal(ev.noteId, 0);
  assert.equal(ev.part, "head");
  assert.equal(ev.judgement, "good");
  assert.equal(stateOf(s, 0).head, "good");
  assert.equal(stateOf(s, 1).head, null, "其他軌不受影響");
  assert.equal(stateOf(s, 2).head, null);
  assert.equal(stateOf(s, 3).head, null);
  assert.equal(s.combo, 1);
  assert.equal(s.counts.good, 1);

  // 接著同軌再按，判下一顆 2.15
  const ev2 = pressLane(s, 0, 2.15, W);
  assert.ok(ev2);
  assert.equal(ev2.noteId, 2);
  assert.equal(ev2.judgement, "perfect");
  assert.equal(stateOf(s, 1).head, null);
});

test("太早按回傳 null，不扣分也不斷 combo", () => {
  const chart = makeChart([tap(0, 0, 1.0), tap(1, 0, 2.0)]);
  const s = createPlayState(chart);
  assert.equal(pressLane(s, 0, 1.0, W)?.judgement, "perfect");
  const score = s.score;
  assert.equal(s.combo, 1);

  assert.equal(pressLane(s, 0, 1.5, W), null);
  assert.equal(s.score, score);
  assert.equal(s.combo, 1);
  assert.equal(s.counts.miss, 0);
  assert.equal(stateOf(s, 1).head, null);

  // 空軌按也沒事
  assert.equal(pressLane(s, 2, 1.5, W), null);
  assert.equal(s.combo, 1);
});

test("同軌兩顆相距 0.25 秒，連按兩下各判一顆", () => {
  const chart = makeChart([tap(0, 1, 2.0), tap(1, 1, 2.25)]);
  const s = createPlayState(chart);
  const a = pressLane(s, 1, 2.0, W);
  const b = pressLane(s, 1, 2.25, W);
  assert.equal(a?.noteId, 0);
  assert.equal(a?.judgement, "perfect");
  assert.equal(b?.noteId, 1);
  assert.equal(b?.judgement, "perfect");
  assert.equal(s.counts.perfect, 2);
  assert.equal(s.combo, 2);
});

test("advance：超過 time + good 沒按判 miss，combo 歸零但 maxCombo 保留", () => {
  const chart = makeChart([tap(0, 0, 1.0), tap(1, 0, 1.5), tap(2, 1, 2.0)]);
  const s = createPlayState(chart);
  pressLane(s, 0, 1.0, W);
  pressLane(s, 0, 1.5, W);
  assert.equal(s.combo, 2);

  assert.deepEqual(advance(s, 2.15, W), [], "還在 good 視窗內不判 miss");
  assert.equal(stateOf(s, 2).head, null);

  const evs = advance(s, 2.25, W);
  assert.equal(evs.length, 1);
  assert.equal(evs[0].noteId, 2);
  assert.equal(evs[0].part, "head");
  assert.equal(evs[0].judgement, "miss");
  assert.equal(stateOf(s, 2).head, "miss");
  assert.equal(s.combo, 0);
  assert.equal(s.maxCombo, 2);
  assert.equal(s.counts.miss, 1);

  assert.deepEqual(advance(s, 3, W), [], "不重複判 miss");
  assert.equal(s.counts.miss, 1);
});

test("hold 按住到 endTime 自動 tail perfect 並得 holdTail 分", () => {
  const chart = makeChart([hold(0, 0, 1.0, 2.0)]);
  const s = createPlayState(chart);
  const head = pressLane(s, 0, 1.0, W);
  assert.equal(head?.part, "head");
  assert.equal(head?.judgement, "perfect");
  assert.equal(stateOf(s, 0).holding, true);
  assert.equal(s.holdingByLane[0], 0);
  assert.equal(s.score, POINTS.perfect);

  assert.deepEqual(advance(s, 1.5, W), [], "還沒到尾巴");
  assert.equal(stateOf(s, 0).tail, null);

  const evs = advance(s, 2.0, W);
  assert.equal(evs.length, 1);
  assert.equal(evs[0].part, "tail");
  assert.equal(evs[0].judgement, "perfect");
  assert.equal(stateOf(s, 0).tail, "perfect");
  assert.equal(stateOf(s, 0).holding, false);
  assert.equal(s.holdingByLane[0], null);
  assert.equal(s.score, POINTS.perfect + POINTS.holdTail + 1 * COMBO_BONUS_PER);
  assert.equal(s.combo, 2);
  assert.equal(s.counts.perfect, 2);
});

test("hold 在 endTime − holdRelease 之後放開算 perfect；太早放開 tail miss、combo 歸零、頭部分數保留", () => {
  // 接近尾巴放開
  const s1 = createPlayState(makeChart([hold(0, 0, 1.0, 2.0)]));
  pressLane(s1, 0, 1.0, W);
  const ok = releaseLane(s1, 0, 2.0 - 0.2, W);
  assert.ok(ok);
  assert.equal(ok.part, "tail");
  assert.equal(ok.judgement, "perfect");
  assert.equal(stateOf(s1, 0).tail, "perfect");
  assert.equal(s1.holdingByLane[0], null);
  assert.equal(s1.combo, 2);

  // 太早放開
  const s2 = createPlayState(makeChart([hold(0, 0, 1.0, 2.0)]));
  pressLane(s2, 0, 1.0, W);
  const headScore = s2.score;
  assert.equal(headScore, POINTS.perfect);
  const bad = releaseLane(s2, 0, 1.5, W);
  assert.ok(bad);
  assert.equal(bad.part, "tail");
  assert.equal(bad.judgement, "miss");
  assert.equal(stateOf(s2, 0).tail, "miss");
  assert.equal(stateOf(s2, 0).holding, false);
  assert.equal(s2.holdingByLane[0], null);
  assert.equal(s2.combo, 0);
  assert.equal(s2.maxCombo, 1);
  assert.equal(s2.score, headScore, "頭部分數保留");
  assert.equal(s2.counts.miss, 1);
  assert.deepEqual(advance(s2, 3, W), [], "尾巴已判定不會再判");
});

test("hold 頭沒按到時頭尾都判 miss", () => {
  const s = createPlayState(makeChart([hold(0, 2, 1.0, 2.0)]));
  advance(s, 1.25, W);
  assert.equal(stateOf(s, 0).head, "miss");
  assert.equal(stateOf(s, 0).tail, "miss");
  assert.equal(stateOf(s, 0).holding, false);
  assert.equal(s.counts.miss, 2);
  assert.equal(s.score, 0);
  assert.equal(pressLane(s, 2, 1.5, W), null, "已 miss 的 hold 不能再按");
});

test("releaseLane 對沒有長按的軌回傳 null", () => {
  const s = createPlayState(makeChart([tap(0, 0, 1.0), hold(1, 1, 3.0, 4.0)]));
  assert.equal(releaseLane(s, 0, 0.5, W), null);
  pressLane(s, 0, 1.0, W);
  assert.equal(releaseLane(s, 0, 1.05, W), null, "tap 放開沒事");
  assert.equal(releaseLane(s, 1, 1.05, W), null);
  assert.equal(releaseLane(s, 2, 1.05, W), null);
  assert.equal(s.combo, 1);
  assert.equal(s.counts.miss, 0);
});

test("分數 = 基本分 + min(命中前 combo, 50) × 2，combo 加成有上限", () => {
  assert.equal(COMBO_BONUS_PER, 2);
  assert.equal(COMBO_BONUS_CAP, 50);
  assert.deepEqual(POINTS, { perfect: 100, good: 60, holdTail: 100 });

  // good 先、perfect 後
  const s1 = createPlayState(makeChart([tap(0, 0, 1.0), tap(1, 0, 2.0)]));
  pressLane(s1, 0, 1.15, W); // good，combo 0 → 60
  assert.equal(s1.score, 60);
  pressLane(s1, 0, 2.0, W); // perfect，combo 1 → 102
  assert.equal(s1.score, 162);

  // 連續 60 顆 perfect，加成封頂在 50 × 2
  const notes = Array.from({ length: 60 }, (_, i) => tap(i, i % 3, 1 + i));
  const s2 = createPlayState(makeChart(notes));
  let expected = 0;
  for (let i = 0; i < 60; i++) {
    const before = s2.score;
    pressLane(s2, i % 3, 1 + i, W);
    const gain = POINTS.perfect + Math.min(i, COMBO_BONUS_CAP) * COMBO_BONUS_PER;
    assert.equal(s2.score - before, gain, `第 ${i} 顆加分錯誤`);
    expected += gain;
  }
  assert.equal(s2.score, expected);
  assert.equal(s2.combo, 60);
  assert.equal(s2.maxCombo, 60);

  // applyJudgement 直接套用
  const s3 = createPlayState(makeChart([]));
  applyJudgement(s3, "perfect", "head");
  assert.equal(s3.score, 100);
  assert.equal(s3.combo, 1);
  applyJudgement(s3, "good", "head");
  assert.equal(s3.score, 100 + 60 + 2);
  assert.equal(s3.combo, 2);
  applyJudgement(s3, "perfect", "tail");
  assert.equal(s3.score, 162 + POINTS.holdTail + 4);
  assert.equal(s3.combo, 3);
  applyJudgement(s3, "miss", "tail");
  assert.equal(s3.score, 266);
  assert.equal(s3.combo, 0);
  assert.equal(s3.maxCombo, 3);
});

test("accuracy：全 perfect 為 1、全 miss 為 0、沒有判定不除以零", () => {
  assert.equal(accuracy({ perfect: 10, good: 0, miss: 0 }), 1);
  assert.equal(accuracy({ perfect: 0, good: 0, miss: 7 }), 0);
  assert.equal(accuracy({ perfect: 0, good: 0, miss: 0 }), 0);
  assert.ok(near(accuracy({ perfect: 1, good: 1, miss: 0 }), 0.8));
  assert.ok(near(accuracy({ perfect: 2, good: 1, miss: 1 }), 2.6 / 4));
});

test("starsFor 永遠 ≥ 1，門檻 0.6 / 0.9；rankFor S/A/B/C 邊界", () => {
  assert.equal(starsFor(0), 1);
  assert.equal(starsFor(0.59), 1);
  assert.equal(starsFor(0.6), 2);
  assert.equal(starsFor(0.89), 2);
  assert.equal(starsFor(0.9), 3);
  assert.equal(starsFor(1), 3);

  assert.deepEqual(rankFor(1), { rank: "S", title: "超級巨星" });
  assert.deepEqual(rankFor(0.95), { rank: "S", title: "超級巨星" });
  assert.equal(rankFor(0.949).rank, "A");
  assert.deepEqual(rankFor(0.85), { rank: "A", title: "閃亮明星" });
  assert.equal(rankFor(0.849).rank, "B");
  assert.deepEqual(rankFor(0.7), { rank: "B", title: "小小樂手" });
  assert.deepEqual(rankFor(0.699), { rank: "C", title: "繼續加油" });
  assert.equal(rankFor(0).rank, "C");
});

type Action = { t: number; order: number; run: (s: PlayState) => void };

/** 依時間執行動作，每個動作前先 advance 到該時間 */
function play(chart: Chart, actions: Action[], w = W, check?: (s: PlayState) => void): PlayState {
  const s = createPlayState(chart);
  const sorted = [...actions].sort((a, b) => a.t - b.t || a.order - b.order);
  for (const a of sorted) {
    advance(s, a.t, w);
    check?.(s);
    a.run(s);
    check?.(s);
  }
  advance(s, chart.endTime, w);
  check?.(s);
  return s;
}

test("全部準時按的模擬：3 星、S、fullCombo，判定總數 = tap + hold × 2", () => {
  for (const song of [getSong("twinkle"), getSong("tigers")]) {
    for (const diff of ["easy", "normal"] as Difficulty[]) {
      const chart = buildChart(song, diff);
      const w = windowsFor(DIFFICULTIES[diff].windowScale);
      const taps = chart.notes.filter((n) => n.type === "tap").length;
      const holds = chart.notes.filter((n) => n.type === "hold").length;
      assert.ok(holds > 0);
      assert.equal(totalJudgements(chart), taps + holds * 2);

      const actions: Action[] = [];
      for (const n of chart.notes) {
        actions.push({ t: n.time, order: 1, run: (s) => void pressLane(s, n.lane, n.time, w) });
        if (n.type === "hold") {
          // 按住到尾巴，交給 advance 自動完成
          actions.push({ t: n.endTime + 0.001, order: 0, run: () => {} });
        }
      }
      const s = play(chart, actions, w);
      assert.ok(isSongOver(s, chart.endTime, chart));
      const r = summarize(s);
      assert.equal(r.counts.perfect, totalJudgements(chart), `${song.id}/${diff}`);
      assert.equal(r.counts.good, 0);
      assert.equal(r.counts.miss, 0);
      assert.equal(r.maxCombo, totalJudgements(chart));
      assert.equal(r.accuracy, 1);
      assert.equal(r.stars, 3);
      assert.equal(r.rank, "S");
      assert.equal(r.fullCombo, true);
      assert.equal(r.score, s.score);
    }
  }
});

test("seeded LCG 隨機偏移與漏按模擬整首：counts 總和 = 判定總數、score ≥ 0、combo ≤ maxCombo", () => {
  let seed = 1;
  for (const song of SONGS) {
    for (const diff of ["easy", "normal"] as Difficulty[]) {
      const rnd = seeded(seed++);
      const chart = buildChart(song, diff);
      const w = windowsFor(DIFFICULTIES[diff].windowScale);
      const actions: Action[] = [];
      for (const n of chart.notes) {
        if (rnd() < 0.15) continue; // 漏按
        const pressAt = n.time + (rnd() - 0.5) * 0.5; // ±0.25 秒，有些會超出視窗
        actions.push({ t: pressAt, order: 1, run: (s) => void pressLane(s, n.lane, pressAt, w) });
        if (n.type === "hold" && rnd() < 0.5) {
          const releaseAt = n.time + rnd() * (n.endTime - n.time);
          actions.push({ t: releaseAt, order: 2, run: (s) => void releaseLane(s, n.lane, releaseAt, w) });
        }
      }
      const s = play(chart, actions, w, (st) => {
        assert.ok(st.combo <= st.maxCombo, `${song.id}/${diff} combo 超過 maxCombo`);
        assert.ok(st.score >= 0);
      });
      const total = totalJudgements(chart);
      assert.equal(s.counts.perfect + s.counts.good + s.counts.miss, total, `${song.id}/${diff}`);
      assert.ok(s.notes.every((ns) => ns.head !== null), "所有頭部都要判定");
      assert.ok(
        s.notes.every((ns) => (ns.note.type === "hold" ? ns.tail !== null : true)),
        "所有 hold 尾巴都要判定"
      );
      assert.ok(isSongOver(s, chart.endTime, chart));
      const r = summarize(s);
      assert.ok(r.accuracy >= 0 && r.accuracy <= 1);
      assert.ok([1, 2, 3].includes(r.stars));
      assert.ok(r.score >= 0);
    }
  }
});

test("isSongOver 全部判定完且 t ≥ endTime 才為 true", () => {
  const chart = makeChart([tap(0, 0, 1.0)]); // endTime 2.5
  const s = createPlayState(chart);
  assert.equal(isSongOver(s, 0, chart), false);
  assert.equal(isSongOver(s, 3, chart), false, "還沒判定完");
  pressLane(s, 0, 1.0, W);
  assert.equal(isSongOver(s, 2.0, chart), false, "還沒到 endTime");
  assert.equal(isSongOver(s, 2.5, chart), true);
  assert.equal(isSongOver(s, 4, chart), true);

  // hold 頭判了尾巴還沒判
  const chart2 = makeChart([hold(0, 0, 1.0, 2.0)]); // endTime 3.5
  const s2 = createPlayState(chart2);
  pressLane(s2, 0, 1.0, W);
  assert.equal(isSongOver(s2, 3.5, chart2), false);
  advance(s2, 3.5, W);
  assert.equal(isSongOver(s2, 3.5, chart2), true);
});

test("isBetterResult：沒有舊紀錄為 true，分數較高才取代", () => {
  assert.equal(isBetterResult(undefined, result(0)), true);
  assert.equal(isBetterResult(result(500), result(600)), true);
  assert.equal(isBetterResult(result(500), result(500)), false);
  assert.equal(isBetterResult(result(500), result(400)), false);
});
