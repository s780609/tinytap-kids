import { test } from "node:test";
import assert from "node:assert/strict";
import { SONGS, getSong } from "./songs.ts";
import { parseMelody } from "./music.ts";
import { buildChart } from "./chart.ts";

test("至少 5 首歌、id 不重複，並包含 twinkle/tigers/bee/london/farm", () => {
  assert.ok(SONGS.length >= 5, `只有 ${SONGS.length} 首`);
  const ids = SONGS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "id 不可重複");
  for (const id of ["twinkle", "tigers", "bee", "london", "farm"]) {
    assert.ok(ids.includes(id), `缺少 ${id}`);
    assert.equal(getSong(id).id, id);
  }
  assert.throws(() => getSong("no-such-song"));
});

test("每首歌都能以自己的 beatsPerBar 解析（小節拍數正確）", () => {
  for (const song of SONGS) {
    assert.doesNotThrow(() => parseMelody(song.melody, song.beatsPerBar), `${song.id} 解析失敗`);
  }
});

test("每首歌至少 3 個不同音高，音域不超過 24 半音", () => {
  for (const song of SONGS) {
    const midis = parseMelody(song.melody)
      .map((n) => n.midi)
      .filter((m): m is number => m !== null);
    const distinct = new Set(midis);
    assert.ok(distinct.size >= 3, `${song.id} 只有 ${distinct.size} 個音高`);
    const range = Math.max(...midis) - Math.min(...midis);
    assert.ok(range <= 24, `${song.id} 音域 ${range} 半音`);
  }
});

test("normal 難度下每首歌長度在 20～70 秒", () => {
  for (const song of SONGS) {
    const chart = buildChart(song, "normal");
    assert.ok(
      chart.endTime >= 20 && chart.endTime <= 70,
      `${song.id} 長度 ${chart.endTime.toFixed(2)} 秒`
    );
  }
});

test("每首歌至少有一個 ≥ 2 拍的音（有長按音符）", () => {
  for (const song of SONGS) {
    const long = parseMelody(song.melody).some((n) => n.midi !== null && n.beats >= 2);
    assert.ok(long, `${song.id} 沒有 ≥ 2 拍的音`);
  }
});
