import { test } from "node:test";
import assert from "node:assert/strict";
import { CATCH_TYPES } from "./fishingLogic.ts";
import { ART, catchSvg, catchUrl } from "./catchArt.ts";

test("每一種獵物都有自己畫的圖，是完整的 SVG", () => {
  for (const c of CATCH_TYPES) {
    assert.ok(ART[c.kind] && ART[c.kind].length > 100, `${c.kind} 沒有圖`);
    const svg = catchSvg(c.kind);
    assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"));
    assert.ok(!/NaN|undefined/.test(svg), `${c.kind} 的圖有壞掉的數字`);
    assert.ok(catchUrl(c.kind).startsWith("data:image/svg+xml"));
  }
});
