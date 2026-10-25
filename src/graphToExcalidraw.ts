import { ExcalidrawConfig } from "./index.js";
import { FlowchartToExcalidrawSkeletonConverter } from "./converter/types/flowchart.js";
import { GraphImageConverter } from "./converter/types/graphImage.js";
import { GraphImage, MermaidToExcalidrawResult } from "./interfaces.js";
import { SequenceToExcalidrawSkeletonConvertor } from "./converter/types/sequence.js";
import { Sequence } from "./parser/sequence.js";
import { Flowchart } from "./parser/flowchart.js";
import { Class } from "./parser/class.js";
import { classToExcalidrawSkeletonConvertor } from "./converter/types/class.js";
import { ERD } from "./parser/er.js";
import { erToExcalidrawSkeletonConvertor } from "./converter/types/er.js";
import { State } from "./parser/state.js";
import { stateToExcalidrawSkeletonConvertor } from "./converter/types/state.js";
import { Timeline } from "./parser/timeline.js";
import { timelineToExcalidrawSkeletonConvertor } from "./converter/types/timeline.js";
import { type Generic } from "./parser/genericTypes.js";
import { genericToExcalidrawSkeletonConvertor } from "./converter/types/generic.js";
import type { LocalPoint } from "@excalidraw/excalidraw/math/types";
import { dedupeConsecutivePoints } from "./utils.js";

const normalizeLinearElementPoints = (
  result: MermaidToExcalidrawResult
): MermaidToExcalidrawResult => {
  return {
    ...result,
    elements: result.elements.map((element) => {
      if (
        element.type === "freedraw" ||
        !("points" in element) ||
        !Array.isArray(element.points)
      ) {
        return element;
      }

      const points = element.points as readonly LocalPoint[];
      if (points.length < 2) {
        return element;
      }

      const dedupedPoints = dedupeConsecutivePoints(points);
      if (dedupedPoints.length === points.length) {
        return element;
      }

      return {
        ...element,
        points: dedupedPoints,
      };
    }),
  };
};

export const graphToExcalidraw = (
  graph:
    | Flowchart
    | GraphImage
    | Sequence
    | Class
    | ERD
    | State
    | Timeline
    | Generic,
  options: ExcalidrawConfig = {}
): MermaidToExcalidrawResult => {
  const result = (() => {
    switch (graph.type) {
      case "graphImage": {
        return GraphImageConverter.convert(graph, options);
      }

      case "flowchart": {
        return FlowchartToExcalidrawSkeletonConverter.convert(graph, options);
      }

      case "sequence": {
        return SequenceToExcalidrawSkeletonConvertor.convert(graph, options);
      }

      case "class": {
        return classToExcalidrawSkeletonConvertor.convert(graph, options);
      }

      case "erd": {
        return erToExcalidrawSkeletonConvertor.convert(graph, options);
      }

      case "state": {
        return stateToExcalidrawSkeletonConvertor.convert(graph, options);
      }

      case "timeline": {
        return timelineToExcalidrawSkeletonConvertor.convert(graph, options);
      }

      case "generic": {
        return genericToExcalidrawSkeletonConvertor.convert(graph, options);
      }

      default: {
        throw new Error(
          `graphToExcalidraw: unknown graph type "${
            (graph as any).type
          }, only flowcharts are supported!"`
        );
      }
    }
  })();

  return normalizeLinearElementPoints(result);
};
