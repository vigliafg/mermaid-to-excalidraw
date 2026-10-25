import { describe, expect, it } from "vitest";

import {
  parseMermaidToExcalidraw,
  runMermaidTaskSequentially,
} from "../src/index.js";

describe("public API surface", () => {
  it("exposes the shared Mermaid queue from the package index", async () => {
    const order: number[] = [];
    await Promise.all([
      runMermaidTaskSequentially(async () => {
        order.push(1);
      }),
      runMermaidTaskSequentially(async () => {
        order.push(2);
      }),
    ]);
    expect(order).toEqual([1, 2]);
  });

  it("reports diagram type and semantic quality", async () => {
    const result = await parseMermaidToExcalidraw(`flowchart LR
  A[Uno] --> B[Due]`);
    expect(result.type).toBe("flowchart");
    expect(result.quality).toBe("semantic");
    expect(result.elements.length).toBeGreaterThan(0);
  });

  it("reports image quality for the GraphImage fallback", async () => {
    const { graphToExcalidraw } = await import("../src/graphToExcalidraw.js");
    const result = graphToExcalidraw({
      type: "graphImage",
      mimeType: "image/svg+xml",
      dataURL: "data:image/svg+xml;base64,PHN2Zy8+",
      width: 120,
      height: 60,
    });
    expect(result.type).toBe("graphImage");
    expect(result.quality).toBe("image");
  });
});
