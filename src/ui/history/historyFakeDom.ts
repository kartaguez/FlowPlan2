/** Native-DOM-shaped test double; no browser/E2E dependency. */
export class HistoryFakeDocument {
  activeElement: HistoryFakeElement | null = null;
  readonly frames = new Map<number, () => void>();
  frameId = 0; observers = 0;
  readonly defaultView = {
    requestAnimationFrame: (callback: () => void) => { const id = ++this.frameId; this.frames.set(id, callback); return id; },
    cancelAnimationFrame: (id: number) => { this.frames.delete(id); },
    ResizeObserver: class { observe() {} disconnect() {} },
  };
  createElement(tag: string) { return new HistoryFakeElement(this, tag); }
  createElementNS(_namespace: string, tag: string) { return this.createElement(tag); }
  flush() { for (const [id, callback] of [...this.frames]) { this.frames.delete(id); callback(); } }
}
export class HistoryFakeElement {
  readonly children: HistoryFakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Set<(event: any) => void>>();
  hidden = false; inert = false; disabled = false; className = ""; textContent = ""; id = ""; title = ""; type = "";
  scrollTop = 0; clientHeight = 600; style: Record<string, any> = { setProperty() {} };
  readonly classList = { add: (name: string) => { this.className += ` ${name}`; } };
  constructor(readonly ownerDocument: HistoryFakeDocument, readonly tagName: string) {}
  append(...nodes: HistoryFakeElement[]) { this.children.push(...nodes); }
  replaceChildren(...nodes: HistoryFakeElement[]) { this.children.splice(0, this.children.length, ...nodes); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); if (name === "class") this.className = value; }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  addEventListener(type: string, handler: (event: any) => void) { const set = this.listeners.get(type) ?? new Set(); set.add(handler); this.listeners.set(type, set); }
  removeEventListener(type: string, handler: (event: any) => void) { this.listeners.get(type)?.delete(handler); }
  emit(type: string, data: Record<string, unknown> = {}) {
    const event = { preventDefault() {}, stopPropagation() {}, ...data };
    for (const handler of [...this.listeners.get(type) ?? []]) handler(event); return event;
  }
  contains(element: HistoryFakeElement | null): boolean { return element === this || this.children.some((child) => child.contains(element)); }
  all(): HistoryFakeElement[] { return [this, ...this.children.flatMap((child) => child.all())]; }
  querySelector(selector: string): HistoryFakeElement | null { return this.all().slice(1).find((element) => selector.startsWith(".") && element.className.split(" ").includes(selector.slice(1))) ?? null; }
  querySelectorAll() { return this.all().filter((element) => element.getAttribute("data-screen-space-typography") === "true"); }
  focus(_options?: { preventScroll: boolean }) { this.ownerDocument.activeElement = this; this.emit("focus"); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: Number(this.getAttribute("height") ?? 44), right: 1000 }; }
  setPointerCapture() {} releasePointerCapture() {} hasPointerCapture() { return true; }
  text(): string { return [this.textContent, ...this.children.map((node) => node.text())].join(" "); }
}
