import { test } from "node:test";
import assert from "node:assert/strict";
import { FISHES } from "./fishes.ts";

test("十二種魚，代號、名字與顏色都不重複", () => {
  assert.equal(FISHES.length, 12);
  assert.equal(new Set(FISHES.map((f) => f.id)).size, 12);
  assert.equal(new Set(FISHES.map((f) => f.name)).size, 12);
  assert.equal(new Set(FISHES.map((f) => f.color)).size, 12);
});
