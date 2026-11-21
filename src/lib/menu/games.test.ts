import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { GAMES, MODES, gamesOf, isGameMode } from "./games.ts";

const APP = new URL("../../app/", import.meta.url);

test("選單上的每個遊戲都有頁面，路徑不重複", () => {
  assert.equal(new Set(GAMES.map((x) => x.path)).size, GAMES.length);
  for (const x of GAMES) {
    assert.ok(existsSync(new URL(`.${x.path}/page.tsx`, APP)), `${x.title} 的頁面 ${x.path} 不存在`);
    assert.ok(x.path.startsWith(`/${x.mode}/`));
  }
});

test("每個遊戲頁面都有放進選單（新增遊戲忘了加到選單會失敗）", () => {
  for (const m of MODES) {
    const dirs = readdirSync(new URL(`./${m.id}/`, APP), { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(new URL(`./${m.id}/${d.name}/page.tsx`, APP)))
      .map((d) => `/${m.id}/${d.name}`);
    assert.deepEqual(
      dirs.sort(),
      gamesOf(m.id)
        .map((x) => x.path)
        .sort(),
      `${m.label}模式的選單跟頁面對不起來`
    );
  }
});

test("isGameMode", () => {
  assert.ok(isGameMode("toddler"));
  assert.ok(!isGameMode("ask"));
  assert.ok(!isGameMode(undefined));
});
