import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/element/transform";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

export enum VERTEX_TYPE {
  ROUND = "round",
  STADIUM = "stadium",
  DOUBLECIRCLE = "doublecircle",
  CIRCLE = "circle",
  DIAMOND = "diamond",
  CYLINDER = "cylinder",
}
export enum LABEL_STYLE_PROPERTY {
  COLOR = "color",
}
export enum CONTAINER_STYLE_PROPERTY {
  FILL = "fill",
  STROKE = "stroke",
  STROKE_WIDTH = "stroke-width",
  STROKE_DASHARRAY = "stroke-dasharray",
}

export type ContainerStyle = {
  [key in CONTAINER_STYLE_PROPERTY]?: string;
};

export type LabelStyle = {
  [key in LABEL_STYLE_PROPERTY]?: string;
};

export interface Vertex {
  id: string;
  type: VERTEX_TYPE;
  labelType: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  link?: string;
  containerStyle: ContainerStyle;
  labelStyle: LabelStyle;
}

export interface SubGraph {
  id: string;
  nodeIds: string[];
  text: string;
  labelType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  containerStyle: ContainerStyle;
  labelStyle: LabelStyle;
}

export interface Position {
  x: number;
  y: number;
}

export interface GraphImage {
  type: "graphImage";
  mimeType: string;
  dataURL: string;
  width: number;
  height: number;
}

/**
 * How faithfully the Mermaid source was converted.
 *
 * - `semantic`: a dedicated adapter understood the diagram's model.
 * - `generic`: the generic SVG-primitive adapter produced editable elements.
 * - `image`: no adapter produced elements; the Mermaid SVG is embedded.
 */
export type MermaidConversionQuality = "semantic" | "generic" | "image";

export type MermaidDiagramKind =
  | "flowchart"
  | "sequence"
  | "class"
  | "erd"
  | "state"
  | "timeline"
  | "generic"
  | "graphImage";

/** What a single diagram adapter returns. */
export interface MermaidConversionPayload {
  elements: ExcalidrawElementSkeleton[];
  files?: BinaryFiles;
}

export interface MermaidToExcalidrawResult extends MermaidConversionPayload {
  /** Diagram family detected by the fork. */
  type: MermaidDiagramKind;
  /** Conversion fidelity, used by consumers to explain the result. */
  quality: MermaidConversionQuality;
}
