import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/element/transform";
import type { LocalPoint } from "@excalidraw/excalidraw/math/types";
import { GraphConverter } from "../GraphConverter.js";
import { transformToExcalidrawTextSkeleton } from "../transformToExcalidrawSkeleton.js";
import type {
  Timeline,
  TimelineLine,
  TimelineNode,
} from "../../parser/timeline.js";

const strokeWidthOf = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 1;
};

const nodeSkeleton = (node: TimelineNode): ExcalidrawElementSkeleton => {
  return {
    type: "rectangle",
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    strokeColor: node.containerStyle.stroke ?? "#333333",
    backgroundColor: node.containerStyle.fill ?? "#ffffff",
    fillStyle: "solid",
    strokeStyle: "solid",
    strokeWidth: strokeWidthOf(node.containerStyle["stroke-width"]),
    roundness: { type: 3 },
    label: {
      text: node.text,
      fontSize: node.fontSize,
      textAlign: "center",
      verticalAlign: "middle",
      strokeColor: node.labelStyle.color ?? "#333333",
    },
  };
};

const lineSkeleton = (line: TimelineLine): ExcalidrawElementSkeleton => {
  const dx = line.endX - line.startX;
  const dy = line.endY - line.startY;
  return {
    type: line.markerEnd ? "arrow" : "line",
    id: line.id,
    x: line.startX,
    y: line.startY,
    width: dx,
    height: dy,
    points: [
      [0, 0],
      [dx, dy],
    ] as LocalPoint[],
    strokeColor: line.strokeColor ?? "#333333",
    strokeWidth: line.strokeWidth ?? 1,
    strokeStyle: line.strokeStyle ?? "solid",
    ...(line.markerEnd ? { endArrowhead: "arrow" as const } : {}),
  };
};

export const timelineToExcalidrawSkeletonConvertor = new GraphConverter({
  converter: (timeline: Timeline) => {
    const elements: ExcalidrawElementSkeleton[] = [];

    // Le linee stanno sotto i box: in Mermaid i box coprono le linee
    // verticali, mentre in Excalidraw l'ordine degli elementi è lo z-order.
    timeline.lines.forEach((line) => {
      elements.push(lineSkeleton(line));
    });

    timeline.nodes.forEach((node) => {
      elements.push(nodeSkeleton(node));
    });

    if (timeline.title) {
      elements.push(
        transformToExcalidrawTextSkeleton({
          type: "text",
          text: timeline.title.text,
          x: timeline.title.x,
          y: timeline.title.y,
          width: timeline.title.width,
          height: timeline.title.height,
          fontSize: timeline.title.fontSize,
          color: timeline.title.color,
        }),
      );
    }

    return { elements };
  },
});
