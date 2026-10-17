import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TASK_FISH,
  applyCatch,
  createTask,
  isTaskDone,
  taskEmoji,
  taskFavor,
  taskText,
  type FishingTask,
} from "./fishingTasks.ts";
import { getCatchType } from "./fishingLogic.ts";

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test("任務只挑池裡有的魚（或垃圾），數量 1～3，不挑稀有的", () => {
  for (let seed = 1; seed < 60; seed++) {
    const t = createTask(["crab", "tire"], seeded(seed));
    assert.ok(t.target === "crab" || t.target === "junk", `挑到 ${t.target}`);
    assert.ok(t.need >= 1 && t.need <= 3);
    assert.equal(t.got, 0);
  }
  for (const k of TASK_FISH) assert.ok(!getCatchType(k).isRare && !getCatchType(k).isJunk);
});

test("要捲 5 圈的鯊魚，任務最多只要兩條", () => {
  for (let seed = 1; seed < 60; seed++) {
    const t = createTask(["shark"], seeded(seed));
    if (t.target === "shark") assert.ok(t.need <= 2);
  }
});

test("新任務不會跟上一個一樣", () => {
  for (let seed = 1; seed < 30; seed++) {
    assert.notEqual(createTask(["crab"], seeded(seed), "crab").target, "crab");
  }
});

test("applyCatch：符合的才加，滿了就不再加", () => {
  let t: FishingTask = { target: "crab", need: 2, got: 0 };
  assert.equal(applyCatch(t, "koi"), t, "不符合時原樣回傳");
  t = applyCatch(t, "crab");
  assert.equal(t.got, 1);
  assert.equal(isTaskDone(t), false);
  t = applyCatch(t, "crab");
  assert.equal(isTaskDone(t), true);
  assert.equal(applyCatch(t, "crab"), t);
});

test("垃圾任務：輪胎、靴子、鐵罐都算", () => {
  let t: FishingTask = { target: "junk", need: 3, got: 0 };
  for (const k of ["tire", "boot", "can"] as const) t = applyCatch(t, k);
  assert.equal(isTaskDone(t), true);
  assert.equal(applyCatch({ target: "junk", need: 1, got: 0 }, "shark").got, 0);
});

test("taskText 用中文數字和量詞", () => {
  assert.equal(taskText({ target: "crab", need: 3, got: 0 }), "釣三隻螃蟹");
  assert.equal(taskText({ target: "shark", need: 2, got: 0 }), "釣兩條鯊魚");
  assert.equal(taskText({ target: "junk", need: 1, got: 0 }), "撿一個垃圾");
  assert.equal(taskEmoji("crab"), "🦀");
  assert.equal(taskEmoji("junk"), "🗑️");
});

test("taskFavor：進行中的任務才偏好，完成後不偏好", () => {
  const favor = taskFavor({ target: "junk", need: 2, got: 0 })!;
  assert.equal(favor(getCatchType("tire")), true);
  assert.equal(favor(getCatchType("koi")), false);
  assert.equal(taskFavor({ target: "crab", need: 1, got: 1 }), undefined);
  assert.equal(taskFavor(null), undefined);
});
