import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COUNTDOWN_BEATS,
  DIFFICULTIES,
  LANE_COUNT,
  assignLanes,
  buildChart,
  type Difficulty,
} from "./chart.ts";
import { parseMelody } from "./music.ts";
import { SONGS, getSong, type Song } from "./songs.ts";

const EPS = 1e-9;
const near = (a: number, b: number, eps = EPS) => Math.abs(a - b) < eps;
const BOTH: Difficulty[] = ["easy", "normal"];

/** 依旋律算出每個非休止音的起點拍數與拍長 */
function melodyOnsets(song: Song) {
  let beat = 0;
  const out: { beat: number; beats: number; midi: number }[] = [];
  for (const n of parseMelody(song.melody)) {
    if (n.midi !== null) out.push({ beat, beats: n.beats, midi: n.midi });
    beat += n.beats;
  }
  return out;
}

const testSong: Song = {
  id: "test-rest",
  title: "測試休止",
  emoji: "🧪",
  bpm: 120,
  beatsPerBar: 4,
  melody: "C4 R:1 E4 G4 | C4:2 R:2",
};

test("assignLanes 同音同軌、音高越高軌道不往左（3 軌與 4 軌）", () => {
  const midis = [60, 62, 64, 65, 67, 69, 71, 60, 64, 67, 60];
  const distinct = [...new Set(midis)].sort((a, b) => a - b);
  for (const laneCount of [3, 4]) {
    const lanes = assignLanes(midis, laneCount);
    assert.equal(lanes.size, distinct.length);
    for (let i = 1; i < distinct.length; i++) {
      assert.ok(
        lanes.get(distinct[i])! >= lanes.get(distinct[i - 1])!,
        `${laneCount} 軌：${distinct[i]} 不該在 ${distinct[i - 1]} 左邊`
      );
    }
  }
  // 依公式 lane = floor(rank * laneCount / distinctCount)，7 個音分 3 軌
  const lanes3 = assignLanes(midis, 3);
  assert.deepEqual(
    distinct.map((m) => lanes3.get(m)),
    [0, 0, 0, 1, 1, 2, 2]
  );
});

test("assignLanes 不同音數 ≥ 軌數時每軌都有；只有 1～2 個音時不越界", () => {
  const cases: [number[], number][] = [
    [[60, 64, 67], 3],
    [[60, 62, 64, 65, 67], 3],
    [[55, 57, 60, 62, 64, 65, 67, 69, 72], 3],
    [[60, 62, 64, 65], 4],
    [[60, 62, 64, 65, 67, 69, 71], 4],
  ];
  for (const [midis, laneCount] of cases) {
    const used = new Set(assignLanes(midis, laneCount).values());
    for (let l = 0; l < laneCount; l++) {
      assert.ok(used.has(l), `${midis.length} 個音分 ${laneCount} 軌時第 ${l} 軌沒有音`);
    }
  }
  for (const midis of [[60], [60, 60], [60, 67], [67, 60, 67]]) {
    for (const laneCount of [3, 4]) {
      const lanes = assignLanes(midis, laneCount);
      for (const m of midis) {
        const l = lanes.get(m);
        assert.ok(l !== undefined && Number.isInteger(l) && l >= 0 && l < laneCount, `lane ${l} 越界`);
      }
    }
  }
});

test("buildChart 小星星前 7 顆音符 time = firstNoteTime + 累積拍數 × secPerBeat", () => {
  const song = getSong("twinkle");
  const chart = buildChart(song, "normal");
  assert.ok(near(chart.secPerBeat, 60 / (song.bpm * DIFFICULTIES.normal.tempoScale)));
  const onsets = melodyOnsets(song);
  assert.ok(chart.notes.length >= 7);
  for (let i = 0; i < 7; i++) {
    const expected = chart.firstNoteTime + onsets[i].beat * chart.secPerBeat;
    assert.ok(near(chart.notes[i].time, expected), `第 ${i} 顆 ${chart.notes[i].time} ≠ ${expected}`);
    assert.equal(chart.notes[i].midi, onsets[i].midi);
  }
  assert.ok(near(chart.notes[0].time, chart.firstNoteTime));
});

test("休止不產生音符但會推進時間", () => {
  const chart = buildChart(testSong, "normal");
  const spb = chart.secPerBeat;
  assert.ok(near(spb, 0.5));
  // C4@0、(休止)、E4@2、G4@3、C4:2@4、(休止)
  assert.equal(chart.notes.length, 4);
  assert.deepEqual(
    chart.notes.map((n) => n.midi),
    [60, 64, 67, 60]
  );
  const beats = [0, 2, 3, 4];
  chart.notes.forEach((n, i) => {
    assert.ok(near(n.time, chart.firstNoteTime + beats[i] * spb), `第 ${i} 顆時間錯誤`);
  });
  assert.equal(chart.tones.length, 4, "休止不產生 tone");
});

test("≥ holdMinBeats 的音是 hold，endTime = time + (beats − 0.5) × spb；短音為 tap 且 endTime === time", () => {
  for (const diff of BOTH) {
    const cfg = DIFFICULTIES[diff];
    assert.equal(cfg.holdMinBeats, 2);
    assert.equal(cfg.holdTailGapBeats, 0.5);
    const song = getSong("twinkle"); // 全部音都在整拍上，兩難度音符數相同
    const chart = buildChart(song, diff);
    const onsets = melodyOnsets(song);
    assert.equal(chart.notes.length, onsets.length);
    chart.notes.forEach((n, i) => {
      const { beats } = onsets[i];
      if (beats >= cfg.holdMinBeats) {
        assert.equal(n.type, "hold", `${diff} 第 ${i} 顆應為 hold`);
        assert.ok(near(n.endTime, n.time + (beats - cfg.holdTailGapBeats) * chart.secPerBeat));
      } else {
        assert.equal(n.type, "tap", `${diff} 第 ${i} 顆應為 tap`);
        assert.equal(n.endTime, n.time);
      }
    });
    assert.ok(chart.notes.some((n) => n.type === "hold"));
  }
  // 自訂歌：C4:2 是 hold
  const custom = buildChart(testSong, "normal");
  const last = custom.notes[custom.notes.length - 1];
  assert.equal(last.type, "hold");
  assert.ok(near(last.endTime, last.time + 1.5 * custom.secPerBeat));
});

test("同軌下一顆音符的 time 大於上一個 hold 的 endTime（所有歌、兩種難度）", () => {
  for (const song of SONGS) {
    for (const diff of BOTH) {
      const chart = buildChart(song, diff);
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        const inLane = chart.notes.filter((n) => n.lane === lane).sort((a, b) => a.time - b.time);
        for (let i = 1; i < inLane.length; i++) {
          assert.ok(
            inLane[i].time > inLane[i - 1].endTime,
            `${song.id}/${diff} 第 ${lane} 軌音符重疊`
          );
        }
      }
      for (const n of chart.notes) {
        assert.ok(n.lane >= 0 && n.lane < LANE_COUNT && Number.isInteger(n.lane));
      }
    }
  }
});

test("easy 的 secPerBeat 比 normal 長；半拍音不進譜但 tones 數 = 非休止音數（兩隻老虎、倫敦鐵橋）", () => {
  for (const song of SONGS) {
    assert.ok(buildChart(song, "easy").secPerBeat > buildChart(song, "normal").secPerBeat, song.id);
  }
  assert.equal(DIFFICULTIES.easy.onlyOnBeatNotes, true);
  assert.equal(DIFFICULTIES.normal.onlyOnBeatNotes, false);
  for (const id of ["tigers", "london"]) {
    const song = getSong(id);
    const onsets = melodyOnsets(song);
    const onBeat = onsets.filter((o) => near(o.beat, Math.round(o.beat)));
    assert.ok(onBeat.length < onsets.length, `${id} 應有不在整拍上的音`);

    const easy = buildChart(song, "easy");
    const normal = buildChart(song, "normal");
    assert.equal(normal.notes.length, onsets.length);
    assert.equal(easy.notes.length, onBeat.length);
    for (const n of easy.notes) {
      const beat = (n.time - easy.firstNoteTime) / easy.secPerBeat;
      assert.ok(near(beat, Math.round(beat), 1e-6), `${id} easy 有非整拍音符 @${beat}`);
    }
    assert.equal(easy.tones.length, onsets.length);
    assert.equal(normal.tones.length, onsets.length);
  }
});

test("firstNoteTime ≥ approachTime + 0.5 且為整數拍（至少倒數拍數）", () => {
  for (const song of SONGS) {
    for (const diff of BOTH) {
      const chart = buildChart(song, diff);
      const cfg = DIFFICULTIES[diff];
      assert.ok(chart.firstNoteTime >= cfg.approachTime + 0.5 - EPS, `${song.id}/${diff}`);
      const beats = chart.firstNoteTime / chart.secPerBeat;
      assert.ok(near(beats, Math.round(beats), 1e-6), `${song.id}/${diff} 不是整數拍`);
      assert.ok(Math.round(beats) >= COUNTDOWN_BEATS);
    }
  }
});

test("notes 依 time 排序且 id 從 0 遞增唯一", () => {
  for (const song of SONGS) {
    for (const diff of BOTH) {
      const chart = buildChart(song, diff);
      for (let i = 1; i < chart.notes.length; i++) {
        assert.ok(chart.notes[i].time >= chart.notes[i - 1].time, `${song.id}/${diff} 沒排序`);
      }
      assert.deepEqual(
        chart.notes.map((n) => n.id),
        chart.notes.map((_, i) => i)
      );
      assert.equal(chart.songId, song.id);
      assert.equal(chart.difficulty, diff);
    }
  }
});

test("clicks：倒數 4 下都在 firstNoteTime 前（最後一下 countGo），鼓點每拍一下直到 endTime", () => {
  const chart = buildChart(getSong("twinkle"), "normal");
  const spb = chart.secPerBeat;
  const byTime = [...chart.clicks].sort((a, b) => a.time - b.time);

  const counts = byTime.filter((c) => c.kind === "count" || c.kind === "countGo");
  assert.deepEqual(
    counts.map((c) => c.kind),
    ["count", "count", "count", "countGo"]
  );
  counts.forEach((c, i) => {
    assert.ok(c.time < chart.firstNoteTime);
    assert.ok(near(c.time, chart.firstNoteTime - (4 - i) * spb), `倒數第 ${i} 下時間錯誤`);
  });

  const beats = byTime.filter((c) => c.kind === "kick" || c.kind === "hat");
  assert.ok(beats.length > 0);
  beats.forEach((c, i) => {
    assert.ok(near(c.time, chart.firstNoteTime + i * spb), `第 ${i} 拍時間錯誤`);
    assert.ok(c.time < chart.endTime);
    assert.equal(c.kind, i % 2 === 0 ? "kick" : "hat", `第 ${i} 拍種類錯誤`);
  });
  assert.ok(beats[beats.length - 1].time + spb >= chart.endTime - EPS, "鼓點應一直打到 endTime");

  // Chart.endTime = 最後一個音結束 + 1.5，至少晚於最後一顆音符
  const lastEnd = Math.max(...chart.notes.map((n) => n.endTime));
  assert.ok(chart.endTime >= lastEnd + 1.5 - EPS);
});
