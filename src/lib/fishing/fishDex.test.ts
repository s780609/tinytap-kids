import { test } from "node:test";
import assert from "node:assert/strict";
import { DEX_TYPES, dexCount, emptyDex, isDexComplete, recordCatch } from "./fishDex.ts";

test("圖鑑收錄魚和稀有獵物，不收垃圾", () => {
  const kinds = DEX_TYPES.map((c) => c.kind);
  assert.ok(kinds.includes("shark"));
  assert.ok(kinds.includes("mermaid"));
  assert.ok(!kinds.includes("tire"));
  assert.ok(!kinds.includes("can"));
});

test("recordCatch：第一次釣到是新發現，第二次只加數量", () => {
  const a = recordCatch(emptyDex(), "koi");
  assert.equal(a.isNew, true);
  assert.equal(a.dex.caught.koi, 1);
  const b = recordCatch(a.dex, "koi");
  assert.equal(b.isNew, false);
  assert.equal(b.dex.caught.koi, 2);
  assert.equal(dexCount(b.dex), 1);
  assert.equal(a.dex.caught.koi, 1, "不改到原本的物件");
});

test("垃圾不會記進圖鑑", () => {
  const dex = emptyDex();
  const r = recordCatch(dex, "boot");
  assert.equal(r.isNew, false);
  assert.equal(r.dex, dex);
});

test("最後一種釣到時 justCompleted 只出現一次", () => {
  let dex = emptyDex();
  const results = DEX_TYPES.map((c) => {
    const r = recordCatch(dex, c.kind);
    dex = r.dex;
    return r.justCompleted;
  });
  assert.deepEqual(results.slice(0, -1).every((x) => !x), true);
  assert.equal(results[results.length - 1], true);
  assert.equal(isDexComplete(dex), true);
  assert.equal(recordCatch(dex, "koi").justCompleted, false, "之後再釣不會再慶祝");
});
