import assert from "node:assert/strict";
import { it } from "node:test";
import { createWorkspaceModeController } from "./createWorkspaceModeController.js";

it("mode shell rejects modals, hides the entire Planning surface, and restores focus without rebuilding", () => {
  const document = { activeElement: null as any };
  class Element extends EventTarget {
    hidden = false; inert = false; disabled = false; isConnected = true; attributes = new Map();
    ownerDocument = document;
    setAttribute(key: string, value: string) { this.attributes.set(key, value); }
    focus() { document.activeElement = this; }
    closest() { return null; }
  }
  const controls = { planning: new Element(), history: new Element(), planningSurface: new Element(), historySurface: new Element() };
  const field = new Element(); field.focus(); let modal = true, suspend = 0, resume = 0, historyResume = 0;
  const shell = createWorkspaceModeController({ controls: controls as any,
    planning: { isModalOpen: () => modal, suspend: () => { suspend++; return true; }, resume: () => { resume++; } },
    history: { resume: () => { historyResume++; }, suspend() {}, destroy() {} } });
  assert.equal(controls.history.disabled, true); assert.equal(shell.setMode("History"), false); assert.equal(suspend, 0);
  modal = false;
  for (let n = 0; n < 6; n++) {
    assert.equal(shell.setMode("History"), true); assert.equal(shell.setMode("History"), true);
    assert.equal(controls.planningSurface.hidden, true); assert.equal(controls.planningSurface.inert, true);
    assert.strictEqual(document.activeElement, controls.historySurface);
    assert.equal(shell.setMode("Planning"), true); assert.equal(shell.setMode("Planning"), true);
    assert.equal(controls.historySurface.hidden, true); assert.equal(controls.historySurface.inert, true);
    assert.strictEqual(document.activeElement, field);
  }
  assert.equal(suspend, 6); assert.equal(resume, 6); assert.equal(historyResume, 6);
  shell.destroy(); assert.equal(shell.setMode("History"), false);
});
