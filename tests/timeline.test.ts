import { graphToExcalidraw } from "../src/graphToExcalidraw.js";
import { parseMermaid } from "../src/parseMermaid.js";

const TIMELINE = `timeline
  title Storia del progetto
  2024 : Ideazione
  2025 : Prototipo : Primi utenti
  2026 : Lancio`;

describe("timeline", () => {
  it("estrae task, eventi e linee dal rendering Mermaid", async () => {
    const graph = await parseMermaid(TIMELINE);
    expect(graph.type).toBe("timeline");
    if (graph.type !== "timeline") throw new Error("expected timeline");

    expect(graph.nodes.length).toBe(7);
    expect(graph.nodes.map((node) => node.text)).toEqual(
      expect.arrayContaining(["Ideazione", "Prototipo", "Primi utenti", "Lancio"]),
    );
    expect(graph.nodes.every((node) => node.width > 0 && node.height > 0)).toBe(true);
    expect(graph.lines.length).toBe(4);
    expect(graph.title?.text).toBe("Storia del progetto");
  });

  it("produce rettangoli, frecce e testo in Excalidraw", async () => {
    const graph = await parseMermaid(TIMELINE);
    const result = graphToExcalidraw(graph);
    const types = result.elements.map((element) => element.type);

    expect(types.filter((type) => type === "rectangle").length).toBe(7);
    expect(types.filter((type) => type === "arrow").length).toBe(4);
    expect(types).toContain("text");
    expect(result.files).toBeUndefined();
  });
});
