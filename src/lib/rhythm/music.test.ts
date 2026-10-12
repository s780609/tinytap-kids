import { test } from "node:test";
import assert from "node:assert/strict";
import { midiToFreq, noteToMidi, parseMelody, totalBeats } from "./music.ts";

test("noteToMidi 基本音名：C4=60、A4=69、G3=55、F#4=66、Bb3=58", () => {
  assert.equal(noteToMidi("C4"), 60);
  assert.equal(noteToMidi("A4"), 69);
  assert.equal(noteToMidi("G3"), 55);
  assert.equal(noteToMidi("F#4"), 66);
  assert.equal(noteToMidi("Bb3"), 58);
});

test("noteToMidi 不合法音名丟錯：H4、C、空字串", () => {
  assert.throws(() => noteToMidi("H4"));
  assert.throws(() => noteToMidi("C"));
  assert.throws(() => noteToMidi(""));
});

test("midiToFreq：69→440、60≈261.63、高八度頻率加倍", () => {
  assert.ok(Math.abs(midiToFreq(69) - 440) < 1e-9);
  assert.ok(Math.abs(midiToFreq(60) - 261.63) < 0.01, `C4 頻率 ${midiToFreq(60)}`);
  for (const m of [48, 60, 67, 72]) {
    assert.ok(Math.abs(midiToFreq(m + 12) - midiToFreq(m) * 2) < 1e-9, `${m} 高八度應加倍`);
  }
});

test("parseMelody 拍長與休止：預設 1 拍、:2、:0.5、R:1 為 null，小節線不產生音", () => {
  const m = parseMelody("C4 G4:2 | A4:0.5 R:1 E4");
  assert.deepEqual(m, [
    { midi: 60, beats: 1 },
    { midi: 67, beats: 2 },
    { midi: 69, beats: 0.5 },
    { midi: null, beats: 1 },
    { midi: 64, beats: 1 },
  ]);
});

test("parseMelody 小節拍數不符丟錯，且訊息含小節編號", () => {
  // 拍數正確時不丟錯
  assert.doesNotThrow(() => parseMelody("C4 D4 E4 F4 | G4:2 R:2 | C4:4", 4));
  assert.doesNotThrow(() => parseMelody("C4:0.5 D4:0.5 E4 F4:2 | G4:4", 4));

  // 第 7 小節只有 3 拍
  const good = "C4:4 | ";
  const bad = good.repeat(6) + "E4 F4 G4 | C4:4";
  assert.throws(
    () => parseMelody(bad, 4),
    (err: unknown) => err instanceof Error && /7/.test(err.message)
  );

  // 第 7 小節多了拍（5 拍）
  const tooLong = good.repeat(6) + "E4 F4 G4:3 | C4:4";
  assert.throws(
    () => parseMelody(tooLong, 4),
    (err: unknown) => err instanceof Error && /7/.test(err.message)
  );
});

test("totalBeats 含休止加總", () => {
  assert.equal(
    totalBeats([
      { midi: 60, beats: 1 },
      { midi: null, beats: 2 },
      { midi: 62, beats: 0.5 },
    ]),
    3.5
  );
  assert.equal(totalBeats([]), 0);
  assert.equal(totalBeats(parseMelody("C4 R:1 G4:2 | A4:0.5 R:0.5 C4:3")), 8);
});
