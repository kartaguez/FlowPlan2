import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCivilDate, type DomainResult } from "../../domain/index.js";
import { renderTimelineCursor } from "./renderTimelineCursor.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function must<T>(result: DomainResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

class FakeDocument {
  createElementNS(namespaceURI: string, tagName: string): FakeSvgElement {
    return new FakeSvgElement(this, namespaceURI, tagName);
  }
}

class FakeSvgElement {
  readonly attributes = new Map<string, string>();
  childNodes: FakeSvgElement[] = [];

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly namespaceURI: string,
    readonly tagName: string,
  ) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: FakeSvgElement[]): void {
    this.childNodes.push(...nodes);
  }

  replaceChildren(...nodes: FakeSvgElement[]): void {
    this.childNodes = [...nodes];
  }

  querySelector(selector: string): FakeSvgElement | null {
    const className = selector.startsWith(".") ? selector.slice(1) : undefined;
    for (const child of this.childNodes) {
      if (
        className !== undefined &&
        child.getAttribute("class")?.split(/\s+/).includes(className)
      ) {
        return child;
      }
      const nested = child.querySelector(selector);
      if (nested !== null) return nested;
    }
    return null;
  }
}

function svgWithLayer(): FakeSvgElement {
  const document = new FakeDocument();
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  const layer = document.createElementNS(SVG_NAMESPACE, "g");
  layer.setAttribute("class", "timeline-cursor-layer");
  svg.append(layer);
  return svg;
}

describe("renderTimelineCursor", () => {
  it("replaces only the cursor layer with supplied line geometry", () => {
    const svg = svgWithLayer();
    const layer = svg.querySelector(".timeline-cursor-layer")!;
    layer.append(svg.ownerDocument.createElementNS(SVG_NAMESPACE, "rect"));

    renderTimelineCursor({
      svg: svg as unknown as SVGSVGElement,
      cursor: {
        date: must(createCivilDate("2025-01-02")),
        x: 150,
        y1: 56,
        y2: 356,
      },
    });

    assert.equal(layer.childNodes.length, 1);
    assert.equal(layer.childNodes[0]?.tagName, "line");
    assert.deepEqual(Object.fromEntries(layer.childNodes[0]!.attributes), {
      class: "timeline-cursor",
      x1: "150",
      x2: "150",
      y1: "56",
      y2: "356",
      "data-selected-date": "2025-01-02",
    });
    assert.equal(svg.getAttribute("aria-valuetext"), "2025-01-02");
  });

  it("is deterministic and never duplicates cursor lines", () => {
    const svg = svgWithLayer();
    const input = {
      svg: svg as unknown as SVGSVGElement,
      cursor: {
        date: must(createCivilDate("2025-01-01")),
        x: 50,
        y1: 56,
        y2: 356,
      },
    };

    renderTimelineCursor(input);
    renderTimelineCursor(input);

    assert.equal(
      svg.querySelector(".timeline-cursor-layer")?.childNodes.length,
      1,
    );
  });

  it("rejects an SVG without the static cursor layer", () => {
    const document = new FakeDocument();
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");

    assert.throws(
      () =>
        renderTimelineCursor({
          svg: svg as unknown as SVGSVGElement,
          cursor: {
            date: must(createCivilDate("2025-01-01")),
            x: 50,
            y1: 56,
            y2: 356,
          },
        }),
      TypeError,
    );
  });
});
