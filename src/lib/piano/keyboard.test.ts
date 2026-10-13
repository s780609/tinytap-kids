import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANIMAL_KEYS,
  KEYBOARD_HIGH,
  KEYBOARD_LOW,
  RAINBOW,
  animalRate,
  buildKeys,
  demoNotes,
  songsInRange,
} from "./keyboard.ts";
import { SONGS, type Song } from "../rhythm/songs.ts";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("buildKeys(C4~C5) 有 8 個白鍵、5 個黑鍵，依音高排序", () => {
  const keys = buildKeys(KEYBOARD_LOW, KEYBOARD_HIGH);
  assert.equal(keys.length, 13);
  assert.deepEqual(
    keys.map((k) => k.midi),
    [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72]
  );
  assert.equal(keys.filter((k) => !k.black).length, 8);
  assert.deepEqual(
    keys.filter((k) => k.black).map((k) => k.midi),
    [61, 63, 66, 68, 70]
  );
});

test("白鍵依序編號 0～7，有唱名與彩虹色；黑鍵記錄左邊白鍵的編號", () => {
  const keys = buildKeys(KEYBOARD_LOW, KEYBOARD_HIGH);
  const whites = keys.filter((k) => !k.black);
  assert.deepEqual(whites.map((k) => k.whiteIndex), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(
    whites.map((k) => k.label),
    ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do"]
  );
  assert.deepEqual(whites.map((k) => k.color), RAINBOW.slice(0, 8));
  // C#4 在 C4(0) 右邊、F#4 在 F4(3) 右邊、A#4 在 A4(5) 右邊
  const blackPos = Object.fromEntries(
    keys.filter((k) => k.black).map((k) => [k.midi, k.whiteIndex])
  );
  assert.deepEqual(blackPos, { 61: 0, 63: 1, 66: 3, 68: 4, 70: 5 });
});

test("demoNotes 依 bpm 換算秒數、休止只推進時間", () => {
  const song: Song = {
    id: "t",
    title: "測試",
    emoji: "🎵",
    bpm: 120,
    beatsPerBar: 4,
    melody: "C4 R:1 E4:2",
  };
  const notes = demoNotes(song);
  assert.equal(notes.length, 2);
  assert.equal(notes[0].midi, 60);
  assert.ok(close(notes[0].time, 0));
  assert.ok(close(notes[0].duration, 0.5));
  assert.equal(notes[1].midi, 64);
  assert.ok(close(notes[1].time, 1));
  assert.ok(close(notes[1].duration, 1));
});

test("songsInRange 只留下所有音都在鍵盤上的兒歌，且至少有小星星", () => {
  const inRange = songsInRange(SONGS, KEYBOARD_LOW, KEYBOARD_HIGH);
  assert.ok(inRange.some((s) => s.id === "twinkle"));
  for (const s of inRange) {
    for (const n of demoNotes(s)) {
      assert.ok(n.midi >= KEYBOARD_LOW && n.midi <= KEYBOARD_HIGH, `${s.id} 有音超出鍵盤`);
    }
  }
  // 兩隻老虎有 G3，不在鍵盤上
  assert.ok(!inRange.some((s) => s.id === "tigers"));
});

test("動物鍵盤：6 隻動物由低到高，聲音檔不重複", () => {
  assert.equal(ANIMAL_KEYS.length, 6);
  const midis = ANIMAL_KEYS.map((k) => k.midi);
  assert.deepEqual(midis, [...midis].sort((a, b) => a - b));
  assert.equal(new Set(midis).size, 6);
  assert.equal(new Set(ANIMAL_KEYS.map((k) => k.sound)).size, 6);
  for (const k of ANIMAL_KEYS) {
    assert.match(k.sound, /^\/sounds\/animals\/\w+\.mp3$/);
  }
});

test("animalRate：C4 原速、高八度兩倍、每半音 2^(1/12)", () => {
  assert.ok(close(animalRate(60), 1));
  assert.ok(close(animalRate(72), 2));
  assert.ok(close(animalRate(67), Math.pow(2, 7 / 12)));
});
