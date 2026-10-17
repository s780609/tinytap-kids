import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENES, getScene, nextScene, pickScene } from "./scenes.ts";
import {
  bubbles,
  confetti,
  createWeather,
  splash,
  updateEffects,
  updateWeather,
} from "./effects.ts";

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test("場景 id 不重複，nextScene 轉一圈回到原點", () => {
  const ids = SCENES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  let id = SCENES[0].id;
  for (let i = 0; i < SCENES.length; i++) id = nextScene(id);
  assert.equal(id, SCENES[0].id);
  assert.ok(ids.includes(pickScene(seeded(3))));
  assert.equal(getScene("night").moon, true);
  assert.equal(getScene("winter").weather, "snow");
});

test("水花有漣漪和往上噴的水滴，時間到就消失", () => {
  let fx = splash(100, 100, 1, seeded(1));
  assert.ok(fx.some((e) => e.kind === "ripple"));
  const drops = fx.filter((e) => e.kind === "drop");
  assert.ok(drops.length > 0 && drops.every((d) => d.vy < 0), "水滴一開始往上");
  for (let i = 0; i < 60; i++) fx = updateEffects(fx, 0.05);
  assert.equal(fx.length, 0);
});

test("泡泡往上飄，彩帶往下掉", () => {
  let b = bubbles(50, 200, 4, seeded(2));
  b = updateEffects(b, 0.3);
  assert.ok(b.every((e) => e.y < 200));
  let c = confetti(300, 10, seeded(2));
  const y0 = c.map((e) => e.y);
  c = updateEffects(c, 0.3);
  assert.ok(c.every((e, i) => e.y > y0[i]));
});

test("天氣粒子掉出畫面會從上面重新出現，數量不變", () => {
  for (const kind of ["rain", "snow", "petals", "leaves", "fireflies"] as const) {
    const list = createWeather(kind, 400, 800, seeded(5));
    const n = list.length;
    assert.ok(n > 0);
    for (let i = 0; i < 400; i++) updateWeather(list, kind, 0.05, 400, 800, seeded(i));
    assert.equal(list.length, n);
    for (const p of list) assert.ok(p.y <= 820 && p.y >= -80, `${kind} 粒子跑出畫面 y=${p.y}`);
  }
  assert.equal(createWeather("none", 400, 800).length, 0);
});
