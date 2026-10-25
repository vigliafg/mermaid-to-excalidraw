import type { MermaidConfig as CoreMermaidConfig } from "mermaid";

import { DEFAULT_FONT_SIZE } from "./constants.js";
import { graphToExcalidraw } from "./graphToExcalidraw.js";
import type { MermaidToExcalidrawResult } from "./interfaces.js";
import { parseMermaid } from "./parseMermaid.js";

export { runMermaidTaskSequentially } from "./mermaidExecutionQueue.js";
export type {
  MermaidConversionPayload,
  MermaidConversionQuality,
  MermaidDiagramKind,
  MermaidToExcalidrawResult,
} from "./interfaces.js";

export interface MermaidConfig {
  /**
   * Whether to start the diagram automatically when the page loads.
   * @default false
   */
  startOnLoad?: boolean;
  /**
   * The flowchart curve style.
   * @default "linear"
   */
  flowchart?: {
    curve?: "linear" | "basis";
  };
  /**
   * Mermaid theme name used while rendering the source for conversion.
   * @default "base" (from the fork's own config)
   */
  theme?: CoreMermaidConfig["theme"];
  /**
   * Font family used while rendering the source for conversion.
   */
  fontFamily?: string;
  /**
   * Theme variables passed to Mermaid. The fork only reads `fontSize` for
   * element geometry; the app passes the full palette so the rendered SVG and
   * its embedded fallback keep the diagram's colours.
   * @default { fontSize: "25px" }
   */
  themeVariables?: Record<string, string> & { fontSize?: string };
  /**
   * Maximum number of edges to be rendered.
   * @default 1000
   */
  maxEdges?: number;
  /**
   * Maximum number of characters to be rendered.
   * @default 1000
   */
  maxTextSize?: number;
}

export interface ExcalidrawConfig {
  fontSize?: number;
}

const parseMermaidToExcalidraw = async (
  definition: string,
  config?: MermaidConfig,
): Promise<MermaidToExcalidrawResult> => {
  const mermaidConfig = config || {};
  const fontSize =
    parseInt(mermaidConfig.themeVariables?.fontSize ?? "") || DEFAULT_FONT_SIZE;
  const parsedMermaidData = await parseMermaid(definition, {
    ...mermaidConfig,
    themeVariables: {
      ...mermaidConfig.themeVariables,
    },
  });
  // Only font size supported for excalidraw elements
  const excalidrawElements = graphToExcalidraw(parsedMermaidData, {
    fontSize,
  });
  return excalidrawElements;
};

export { parseMermaidToExcalidraw };
