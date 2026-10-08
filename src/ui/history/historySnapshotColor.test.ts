import assert from "node:assert/strict";
import { it } from "node:test";
import { historyColorChannels, historySnapshotColor } from "./historySnapshotColor.js";
it("keeps snapshot colors ID-stable, in sRGB gamut and readable as saturated loads in both themes", () => {
  for (let i = 0; i < 50; i++) {
    const id = `ui-${String(i).padStart(2, "0")}`, color = historySnapshotColor(id);
    assert.deepEqual(historySnapshotColor(id), color);
    const channels = historyColorChannels(color.lightness, color.chroma, color.hue);
    assert.ok(channels.every((channel) => channel >= 0 && channel <= 1));
    const luminance = channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722;
    const lightContrast = 1.05 / (luminance + .05), darkContrast = (luminance + .05) / (.02 + .05);
    assert.ok(lightContrast > 3, `light ${id}: ${lightContrast}`); assert.ok(darkContrast > 3, `dark ${id}: ${darkContrast}`);
  }
});
it("uses multiple perceptual dimensions while allowing arbitrary-ID proximity without recoloring peers", () => {
  for (const count of [1, 8, 12, 24, 50]) {
    const colors = Array.from({ length: count }, (_, i) => historySnapshotColor(`ui-${String(i).padStart(2, "0")}`));
    assert.equal(new Set(colors.map((c) => c.actuals)).size, count);
    for (const color of colors) assert.deepEqual(historySnapshotColor(`ui-${String(colors.indexOf(color)).padStart(2, "0")}`), color);
    if (count > 1) { assert.ok(new Set(colors.map((c) => c.lightness)).size > 1); assert.ok(new Set(colors.map((c) => c.chroma)).size > 1); }
  }
});
