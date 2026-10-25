import type { ContainerStyle, LabelStyle } from "../interfaces.js";
import { getTextContentWithLineBreaks } from "../text.js";
import { getTransformAttr } from "../utils.js";

export interface TimelineDb {
  getCommonDb(): { getDiagramTitle(): string };
}

export interface TimelineNode {
  id: string;
  kind: "task" | "event";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  containerStyle: ContainerStyle;
  labelStyle: LabelStyle;
  fontSize: number;
}

export interface TimelineLine {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  markerEnd: boolean;
}

export interface TimelineTitle {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  color?: string;
}

export interface Timeline {
  type: "timeline";
  title?: TimelineTitle;
  nodes: TimelineNode[];
  lines: TimelineLine[];
}

const styleValue = (
  element: Element,
  property: string,
  fallback = "",
): string => {
  try {
    const value = window.getComputedStyle(element).getPropertyValue(property);
    return value && value !== "none" ? value : fallback;
  } catch {
    return fallback;
  }
};

const colorValue = (element: Element, property: string): string | undefined => {
  const attr = element.getAttribute(property);
  if (attr && attr !== "none" && attr !== "transparent") return attr;
  const computed = styleValue(element, property);
  if (computed && computed !== "none" && computed !== "transparent") {
    return computed;
  }
  return undefined;
};

const numberValue = (value: string | null, fallback = 0): number => {
  if (value === null) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cleanText = (value: string): string =>
  value
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

const fontSizeOf = (element: Element): number => {
  const raw = styleValue(element, "font-size", "20px");
  return numberValue(raw.replace("px", ""), 20);
};

const bboxOf = (element: Element) => {
  try {
    const bbox = (element as SVGGraphicsElement).getBBox();
    if (bbox && bbox.width > 0 && bbox.height > 0) return bbox;
  } catch {
    // jsdom and some SVG elements do not implement getBBox
  }
  return null;
};

const strokeStyleFromLine = (line: SVGLineElement): "solid" | "dashed" | "dotted" => {
  const dash = line.getAttribute("stroke-dasharray");
  if (!dash) return "solid";
  if (dash.includes("2")) return "dotted";
  return "dashed";
};

const parseNode = (
  wrapper: Element,
  kind: "task" | "event",
  index: number,
): TimelineNode | null => {
  const nodeGroup = wrapper.querySelector<SVGGElement>(".timeline-node");
  const background = wrapper.querySelector<SVGPathElement>(".node-bkg");
  const underline = wrapper.querySelector<SVGLineElement>("line");
  const textElement = wrapper.querySelector<SVGTextElement>("text");
  if (!nodeGroup || !background || !underline || !textElement) return null;

  const { transformX, transformY } = getTransformAttr(wrapper);
  const width = numberValue(underline.getAttribute("x2"), 190);
  const height = Math.max(1, numberValue(underline.getAttribute("y1"), 0) - 5);
  const x = transformX;
  const y = transformY + 5;

  const label: LabelStyle = {};
  const textColor = colorValue(textElement, "fill") ?? colorValue(nodeGroup, "color");
  if (textColor) label.color = textColor;

  const container: ContainerStyle = {};
  const fill = colorValue(background, "fill");
  const stroke = colorValue(underline, "stroke");
  if (fill) container.fill = fill;
  if (stroke) container.stroke = stroke;
  const strokeWidth = underline.getAttribute("stroke-width");
  if (strokeWidth) container["stroke-width"] = strokeWidth;

  return {
    id: `timeline-node-${index}`,
    kind,
    text: cleanText(getTextContentWithLineBreaks(textElement)),
    x,
    y,
    width,
    height,
    containerStyle: container,
    labelStyle: label,
    fontSize: fontSizeOf(textElement),
  };
};

const parseLine = (
  line: SVGLineElement,
  index: number,
): TimelineLine | null => {
  const startX = numberValue(line.getAttribute("x1"), Number.NaN);
  const startY = numberValue(line.getAttribute("y1"), Number.NaN);
  const endX = numberValue(line.getAttribute("x2"), Number.NaN);
  const endY = numberValue(line.getAttribute("y2"), Number.NaN);
  if (![startX, startY, endX, endY].every(Number.isFinite)) return null;
  return {
    id: `timeline-line-${index}`,
    startX,
    startY,
    endX,
    endY,
    strokeColor: colorValue(line, "stroke"),
    strokeWidth: numberValue(line.getAttribute("stroke-width"), 1),
    strokeStyle: strokeStyleFromLine(line),
    markerEnd: Boolean(line.getAttribute("marker-end")),
  };
};

const parseTitle = (
  svgContainer: HTMLDivElement,
  db: TimelineDb,
): TimelineTitle | undefined => {
  const titleText = db.getCommonDb().getDiagramTitle();
  if (!titleText) return undefined;
  const textElement = Array.from(
    svgContainer.querySelectorAll<SVGTextElement>("text"),
  ).find(
    (element) =>
      !element.closest(".taskWrapper") &&
      !element.closest(".eventWrapper") &&
      !element.closest(".lineWrapper"),
  );
  if (!textElement) return undefined;

  const bbox = bboxOf(textElement);
  const x = bbox?.x ?? numberValue(textElement.getAttribute("x"), 0);
  const y = bbox?.y ?? numberValue(textElement.getAttribute("y"), 0);
  return {
    text: cleanText(getTextContentWithLineBreaks(textElement) || titleText),
    x,
    y,
    width: bbox?.width,
    height: bbox?.height,
    fontSize: fontSizeOf(textElement),
    color: colorValue(textElement, "fill"),
  };
};

export const parseMermaidTimelineDiagram = (
  db: TimelineDb,
  svgContainer: HTMLDivElement,
): Timeline => {
  const nodes: TimelineNode[] = [];
  const wrappers = Array.from(
    svgContainer.querySelectorAll<SVGGElement>(".taskWrapper, .eventWrapper"),
  );
  wrappers.forEach((wrapper, index) => {
    const kind = wrapper.classList.contains("taskWrapper") ? "task" : "event";
    const node = parseNode(wrapper, kind, index);
    if (node && node.text) nodes.push(node);
  });

  const lines: TimelineLine[] = [];
  Array.from(svgContainer.querySelectorAll<SVGLineElement>(".lineWrapper line"))
    .forEach((line, index) => {
      const parsed = parseLine(line, index);
      if (parsed) lines.push(parsed);
    });

  return {
    type: "timeline",
    title: parseTitle(svgContainer, db),
    nodes,
    lines,
  };
};
