import { nanoid } from "nanoid";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/element/transform";
import type { FileId } from "@excalidraw/excalidraw/element/types";
import type { LocalPoint } from "@excalidraw/excalidraw/math/types";
import { GraphConverter } from "../GraphConverter.js";
import type {
  Generic,
  GenericImage,
  GenericLine,
  GenericPath,
  GenericRectangle,
  GenericText,
} from "../../parser/genericTypes.js";

const opacity = (value: number | undefined): number =>
  Math.round(Math.max(0, Math.min(1, value ?? 1)) * 100);

const strokeWidth = (value: number | undefined): number =>
  Math.max(0.5, Math.min(24, value ?? 1));

const pointsOf = (path: GenericPath): LocalPoint[] => {
  const minX = Math.min(...path.points.map((point) => point.x));
  const minY = Math.min(...path.points.map((point) => point.y));
  return path.points.map((point) => [point.x - minX, point.y - minY] as LocalPoint);
};

const boundsOf = (path: GenericPath) => {
  const xs = path.points.map((point) => point.x);
  const ys = path.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(0.5, Math.max(...xs) - minX),
    height: Math.max(0.5, Math.max(...ys) - minY),
  };
};

const linearElement = (line: GenericLine): ExcalidrawElementSkeleton => {
  const dx = line.endX - line.startX;
  const dy = line.endY - line.startY;
  return {
    type: line.markerEnd ? "arrow" : "line",
    id: nanoid(),
    x: line.startX,
    y: line.startY,
    width: dx,
    height: dy,
    points: [
      [0, 0],
      [dx, dy],
    ] as LocalPoint[],
    strokeColor: line.stroke ?? "#333333",
    strokeWidth: strokeWidth(line.strokeWidth),
    strokeStyle: line.strokeStyle ?? "solid",
    opacity: opacity(line.opacity),
    ...(line.markerEnd ? { endArrowhead: "arrow" as const } : {}),
  };
};

const pathOutline = (path: GenericPath): ExcalidrawElementSkeleton => {
  const bounds = boundsOf(path);
  return {
    type: "line",
    id: nanoid(),
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points: pointsOf(path),
    strokeColor: path.stroke ?? "#333333",
    strokeWidth: strokeWidth(path.strokeWidth),
    strokeStyle: path.strokeStyle ?? "solid",
    opacity: opacity(path.opacity),
  };
};

/**
 * Excalidraw's fillable primitive for arbitrary SVG paths is freedraw: its
 * renderer fills the sampled path with strokeColor instead of drawing a line.
 * The element is passed through `convertToExcalidrawElements` as-is.
 */
const filledPath = (path: GenericPath): ExcalidrawElementSkeleton | null => {
  if (!path.fill || path.points.length < 3) return null;
  const bounds = boundsOf(path);
  const points = pointsOf(path);
  return {
    type: "freedraw",
    id: nanoid(),
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    strokeColor: path.fill,
    backgroundColor: path.fill,
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roundness: null,
    roughness: 1,
    opacity: opacity(path.opacity),
    angle: 0,
    seed: 1,
    version: 1,
    versionNonce: 1,
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    points,
    pressures: new Array(points.length).fill(0.5),
    simulatePressure: false,
  } as unknown as ExcalidrawElementSkeleton;
};

const rectangleElement = (
  rect: GenericRectangle,
): ExcalidrawElementSkeleton => ({
  type: "rectangle",
  id: nanoid(),
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
  strokeColor: rect.stroke ?? "transparent",
  backgroundColor: rect.fill ?? "transparent",
  fillStyle: rect.fill ? "solid" : "hachure",
  strokeWidth: strokeWidth(rect.strokeWidth),
  strokeStyle: rect.strokeStyle ?? "solid",
  opacity: opacity(rect.opacity),
  ...(rect.radius && rect.radius > 0
    ? { roundness: { type: 3 as const, value: rect.radius } }
    : {}),
});

const textElement = (text: GenericText): ExcalidrawElementSkeleton => ({
  type: "text",
  id: nanoid(),
  x: text.x,
  y: text.y,
  width: text.width,
  height: text.height,
  text: text.text,
  fontSize: text.fontSize,
  fontFamily: 2,
  textAlign: text.textAlign ?? "left",
  verticalAlign: "top",
  strokeColor: text.color ?? "#333333",
  opacity: opacity(text.opacity),
});

const imageElement = (
  image: GenericImage,
): { element: ExcalidrawElementSkeleton; files: Record<string, unknown> } => {
  const fileId = nanoid() as FileId;
  return {
    element: {
      type: "image",
      id: nanoid(),
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height,
      status: "saved",
      fileId,
      opacity: opacity(image.opacity),
    },
    files: {
      [fileId]: {
        id: fileId,
        mimeType: image.mimeType,
        dataURL: image.dataURL,
      },
    },
  };
};

export const genericToExcalidrawSkeletonConvertor = new GraphConverter({
  converter: (graph: Generic) => {
    const elements: ExcalidrawElementSkeleton[] = [];
    const files: Record<string, unknown> = {};

    graph.nodes.forEach((node) => {
      switch (node.type) {
        case "rectangle":
          elements.push(rectangleElement(node));
          break;
        case "ellipse":
          elements.push({
            type: "ellipse",
            id: nanoid(),
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            strokeColor: node.stroke ?? "transparent",
            backgroundColor: node.fill ?? "transparent",
            fillStyle: node.fill ? "solid" : "hachure",
            strokeWidth: strokeWidth(node.strokeWidth),
            strokeStyle: node.strokeStyle ?? "solid",
            opacity: opacity(node.opacity),
          });
          break;
        case "line":
          elements.push(linearElement(node));
          break;
        case "path": {
          const fill = filledPath(node);
          if (fill) elements.push(fill);
          if (node.stroke) elements.push(pathOutline(node));
          break;
        }
        case "text":
          elements.push(textElement(node));
          break;
        case "image": {
          const result = imageElement(node);
          elements.push(result.element);
          Object.assign(files, result.files);
          break;
        }
      }
    });

    return Object.keys(files).length
      ? { elements, files: files as any }
      : { elements };
  },
});
