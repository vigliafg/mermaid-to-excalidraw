export interface GenericPoint {
  x: number;
  y: number;
}

export interface GenericRectangle {
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  opacity?: number;
}

export interface GenericEllipse {
  type: "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  opacity?: number;
}

export interface GenericLine {
  type: "line";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  opacity?: number;
  markerEnd?: boolean;
}

export interface GenericPath {
  type: "path";
  points: GenericPoint[];
  closed: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  opacity?: number;
}

export interface GenericText {
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  opacity?: number;
}

export interface GenericImage {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  dataURL: string;
  mimeType: string;
  opacity?: number;
}

export type GenericNode =
  | GenericRectangle
  | GenericEllipse
  | GenericLine
  | GenericPath
  | GenericText
  | GenericImage;

export interface Generic {
  type: "generic";
  nodes: GenericNode[];
}

export function emptyGeneric(): Generic {
  return { type: "generic", nodes: [] };
}
