import {
  emptyGeneric,
  type Generic,
  type GenericNode,
  type GenericPoint,
} from "./genericTypes.js";

const SKIP_TAGS = new Set([
  "defs",
  "style",
  "marker",
  "symbol",
  "title",
  "desc",
  "metadata",
  "clippath",
  "mask",
  "pattern",
  "lineargradient",
  "radialgradient",
  "filter",
  "script",
]);

const samePoint = (a: GenericPoint, b: GenericPoint): boolean =>
  Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;

const cleanText = (value: string): string =>
  value
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

const nodeText = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? "";
  if (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).tagName.toLowerCase() === "br"
  ) {
    return "\n";
  }
  return Array.from(node.childNodes).map(nodeText).join("");
};

const textContentOf = (element: Element): string => {
  const tspans = Array.from(element.children).filter(
    (child) => child.tagName.toLowerCase() === "tspan",
  );
  if (tspans.length > 1) {
    return cleanText(tspans.map((tspan) => nodeText(tspan)).join("\n"));
  }
  return cleanText(nodeText(element));
};

const parseNumber = (value: string | null, fallback = 0): number => {
  if (value === null) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computed = (element: Element, property: string): string => {
  try {
    return window.getComputedStyle(element).getPropertyValue(property).trim();
  } catch {
    return "";
  }
};

const isHidden = (element: Element): boolean => {
  if (computed(element, "display") === "none") return true;
  if (computed(element, "visibility") === "hidden") return true;
  if (computed(element, "opacity") === "0") return true;
  const attribute = element.getAttribute("opacity");
  return attribute !== null && Number(attribute) === 0;
};

const resolveGradient = (
  element: Element,
  value: string,
): string | undefined => {
  const match = value.match(/^url\(["']?#([^"')]+)["']?\)$/);
  if (!match) return undefined;
  const id = match[1];
  const root = outerSvg(element) ?? element.closest("svg");
  const safe = id.replace(/[^A-Za-z0-9_-]/g, "\\$&");
  const gradient =
    root?.querySelector(`#${safe}`) ??
    element.ownerDocument?.getElementById(id);
  if (!gradient) return undefined;
  const stops = Array.from(gradient.querySelectorAll<SVGStopElement>("stop"));
  const colors = stops
    .map((stop) => {
      const raw =
        stop.getAttribute("stop-color") ||
        (stop as SVGStopElement).style?.stopColor ||
        "";
      return paint(stop, raw);
    })
    .filter((color): color is string => Boolean(color));
  if (!colors.length) return undefined;
  return colors[0];
};

const paint = (
  element: Element,
  value: string | null | undefined,
): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized === "none" ||
    normalized === "transparent" ||
    normalized === "rgba(0, 0, 0, 0)" ||
    normalized.includes("NaN") ||
    normalized.includes("undefined")
  ) {
    return undefined;
  }
  if (normalized.startsWith("url(")) {
    return resolveGradient(element as Element, normalized);
  }
  return normalized;
};

const fillOf = (element: Element): string | undefined =>
  paint(element, computed(element, "fill")) ?? paint(element, element.getAttribute("fill"));

const strokeOf = (element: Element): string | undefined =>
  paint(element, computed(element, "stroke")) ?? paint(element, element.getAttribute("stroke"));

const strokeWidthOf = (element: Element): number => {
  const value =
    computed(element, "stroke-width") || element.getAttribute("stroke-width");
  return Math.max(0, parseNumber(value, 1));
};

const strokeStyleOf = (
  element: Element,
): "solid" | "dashed" | "dotted" => {
  const dash =
    computed(element, "stroke-dasharray") ||
    element.getAttribute("stroke-dasharray");
  if (!dash || dash === "none") return "solid";
  return dash.includes("2") ? "dotted" : "dashed";
};

const opacityOf = (element: Element): number => {
  const raw = computed(element, "opacity") || element.getAttribute("opacity");
  const value = parseNumber(raw, 1);
  return Math.max(0, Math.min(1, value));
};

const hasMarker = (element: Element): boolean => {
  const attribute =
    element.getAttribute("marker-end") || computed(element, "marker-end");
  return Boolean(attribute && attribute !== "none");
};

const outerSvg = (element: Element): SVGSVGElement | null => {
  let svg = (element as SVGElement).ownerSVGElement ?? null;
  while (svg?.ownerSVGElement) {
    svg = svg.ownerSVGElement;
  }
  return svg;
};

const rootPoint = (
  element: Element,
  x: number,
  y: number,
): GenericPoint => {
  try {
    const own = (element as SVGGraphicsElement).getScreenCTM();
    const root = outerSvg(element)?.getScreenCTM();
    if (own && root && typeof DOMPoint !== "undefined") {
      const matrix = root.inverse().multiply(own);
      const point = new DOMPoint(x, y).matrixTransform(matrix);
      return { x: point.x, y: point.y };
    }
  } catch {
    // jsdom / detached SVG
  }
  return { x, y };
};

const rootScale = (element: Element): number => {
  try {
    const own = (element as SVGGraphicsElement).getScreenCTM();
    const root = outerSvg(element)?.getScreenCTM();
    if (own && root) {
      const matrix = root.inverse().multiply(own);
      return Math.max(0.01, Math.hypot(matrix.a, matrix.b));
    }
  } catch {
    // fallback below
  }
  return 1;
};

const boxOf = (
  element: Element,
): { x: number; y: number; width: number; height: number } | null => {
  try {
    const box = (element as SVGGraphicsElement).getBBox();
    if (!box || (box.width <= 0 && box.height <= 0)) return null;
    const corners = [
      rootPoint(element, box.x, box.y),
      rootPoint(element, box.x + box.width, box.y),
      rootPoint(element, box.x, box.y + box.height),
      rootPoint(element, box.x + box.width, box.y + box.height),
    ];
    const xs = corners.map((point) => point.x);
    const ys = corners.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      x: minX,
      y: minY,
      width: Math.max(0.5, Math.max(...xs) - minX),
      height: Math.max(0.5, Math.max(...ys) - minY),
    };
  } catch {
    return null;
  }
};

const pointsFromAttribute = (
  element: Element,
  attribute = "points",
): GenericPoint[] => {
  const raw = element.getAttribute(attribute);
  if (!raw) return [];
  const numbers = raw
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const points: GenericPoint[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push(rootPoint(element, numbers[index], numbers[index + 1]));
  }
  return points;
};

const samplePathPart = (
  element: SVGPathElement,
  d: string,
  root: SVGSVGElement | null,
): GenericPoint[] => {
  let temporary: SVGPathElement | null = null;
  try {
    let path = element;
    if (root) {
      temporary = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      temporary.setAttribute("d", d);
      temporary.setAttribute("visibility", "hidden");
      root.appendChild(temporary);
      path = temporary;
    }
    const total = path.getTotalLength();
    if (Number.isFinite(total) && total > 0) {
      const steps = Math.max(2, Math.min(320, Math.ceil(total / 4)));
      const points: GenericPoint[] = [];
      for (let index = 0; index <= steps; index += 1) {
        const point = path.getPointAtLength((total * index) / steps);
        points.push(rootPoint(element, point.x, point.y));
      }
      return points;
    }
  } catch {
    // jsdom / detached SVG
  } finally {
    temporary?.remove();
  }
  return [];
};

const samplePath = (element: SVGPathElement): GenericPoint[][] => {
  const d = element.getAttribute("d") ?? "";
  if (!d) return [];
  const root = outerSvg(element);
  const parts = d
    .split(/(?=[Mm])/)
    .map((part) => part.trim())
    .filter(Boolean);
  const absolute = parts.every((part) => part.startsWith("M"));
  if (absolute && parts.length > 1) {
    return parts
      .map((part) => {
        const points = samplePathPart(element, part, root);
        return points;
      })
      .filter((points) => points.length >= 2);
  }
  const points = samplePathPart(element, d, root);
  return points.length >= 2 ? [points] : [];
};

const textOf = (element: Element): string => textContentOf(element);

const fontScaleOf = (element: Element): number => {
  const raw =
    computed(element, "font-size") || element.getAttribute("font-size") || "16";
  const size = parseNumber(raw.replace("px", ""), 16);
  return Math.max(4, Math.min(120, size * rootScale(element)));
};

const textAlignOf = (element: Element): "left" | "center" | "right" => {
  const anchor =
    computed(element, "text-anchor") || element.getAttribute("text-anchor");
  if (anchor === "middle") return "center";
  if (anchor === "end") return "right";
  const align = computed(element, "text-align");
  if (align === "center" || align === "right") return align;
  return "left";
};

const parseText = (
  element: Element,
  text: string,
): GenericNode | null => {
  const clean = cleanText(text);
  if (!clean) return null;
  const box = boxOf(element);
  if (!box) return null;
  const color =
    paint(element, computed(element, "fill")) ??
    paint(element, computed(element, "color")) ??
    paint(element, element.getAttribute("fill"));
  return {
    type: "text",
    text: clean,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    fontSize: fontScaleOf(element),
    color,
    textAlign: textAlignOf(element),
    opacity: opacityOf(element),
  };
};

const parseRect = (element: Element): GenericNode | null => {
  const box = boxOf(element);
  if (!box) return null;
  const fill = fillOf(element);
  const stroke = strokeOf(element);
  if (!fill && !stroke) return null;
  return {
    type: "rectangle",
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    radius: Math.max(0, parseNumber(element.getAttribute("rx"), 0) * rootScale(element)),
    fill,
    stroke,
    strokeWidth: strokeWidthOf(element) * rootScale(element),
    strokeStyle: strokeStyleOf(element),
    opacity: opacityOf(element),
  };
};

const parseEllipse = (element: Element): GenericNode | null => {
  const box = boxOf(element);
  if (!box) return null;
  const fill = element.classList.contains("radarGraticule")
    ? undefined
    : fillOf(element);
  const stroke = strokeOf(element);
  if (!fill && !stroke) return null;
  return {
    type: "ellipse",
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    fill,
    stroke,
    strokeWidth: strokeWidthOf(element) * rootScale(element),
    strokeStyle: strokeStyleOf(element),
    opacity: opacityOf(element),
  };
};

const parseLine = (element: SVGLineElement): GenericNode | null => {
  const start = rootPoint(
    element,
    parseNumber(element.getAttribute("x1")),
    parseNumber(element.getAttribute("y1")),
  );
  const end = rootPoint(
    element,
    parseNumber(element.getAttribute("x2")),
    parseNumber(element.getAttribute("y2")),
  );
  const stroke = strokeOf(element);
  if (!stroke) return null;
  return {
    type: "line",
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    stroke,
    strokeWidth: strokeWidthOf(element) * rootScale(element),
    strokeStyle: strokeStyleOf(element),
    opacity: opacityOf(element),
    markerEnd: hasMarker(element),
  };
};

const parsePolyShape = (element: Element): GenericNode | null => {
  const points = pointsFromAttribute(element);
  if (points.length < 2) return null;
  const fill = fillOf(element);
  const closed = element.tagName.toLowerCase() === "polygon" || Boolean(fill);
  const stroke = strokeOf(element);
  if (!fill && !stroke) return null;
  return {
    type: "path",
    points: closed ? [...points, points[0]] : points,
    closed,
    fill,
    stroke,
    strokeWidth: strokeWidthOf(element) * rootScale(element),
    strokeStyle: strokeStyleOf(element),
    opacity: opacityOf(element),
  };
};

const parsePath = (element: SVGPathElement): GenericNode[] => {
  const parts = samplePath(element);
  if (!parts.length) return [];
  const d = element.getAttribute("d") ?? "";
  const closed = /z/i.test(d);
  const fill = fillOf(element);
  const stroke = strokeOf(element);
  if (!fill && !stroke) return [];
  const strokeWidth = strokeWidthOf(element) * rootScale(element);
  const strokeStyle = strokeStyleOf(element);
  const opacity = opacityOf(element);

  return parts.map((points) => {
    // Axis-aligned rectangular paths are common in Mermaid (requirement,
    // architecture, class boxes). A freedraw approximation would produce a
    // fuzzy blob; use a native rectangle instead.
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const axisAligned =
      maxX - minX > 1 &&
      maxY - minY > 1 &&
      points.every(
        (point) =>
          (Math.abs(point.x - minX) < 0.5 || Math.abs(point.x - maxX) < 0.5) &&
          (Math.abs(point.y - minY) < 0.5 || Math.abs(point.y - maxY) < 0.5),
      );
    if (axisAligned) {
      return {
        type: "rectangle" as const,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        fill,
        stroke,
        strokeWidth,
        strokeStyle,
        opacity,
      };
    }
    return {
      type: "path" as const,
      points:
        (closed || fill) && !samePoint(points[0], points[points.length - 1])
          ? [...points, points[0]]
          : points,
      closed: closed || Boolean(fill),
      fill,
      stroke,
      strokeWidth,
      strokeStyle,
      opacity,
    };
  });
};

const parseImage = (element: SVGImageElement): GenericNode | null => {
  const href =
    element.getAttribute("href") ??
    element.getAttributeNS("http://www.w3.org/1999/xlink", "href");
  if (!href || !href.startsWith("data:")) return null;
  const match = href.match(/^data:([^;,]+)[;,]/);
  if (!match) return null;
  const box = boxOf(element);
  if (!box) return null;
  return {
    type: "image",
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    dataURL: href,
    mimeType: match[1],
    opacity: opacityOf(element),
  };
};

/**
 * Last-resort native converter for Mermaid diagram types that do not have a
 * semantic adapter yet. It walks the rendered SVG and maps primitives to
 * Excalidraw elements. Fidelity is intentionally approximate, but the output
 * remains editable and is no longer a single flat image.
 */
export const parseMermaidGenericDiagram = (
  svgContainer: HTMLDivElement,
): Generic => {
  const root = svgContainer.querySelector<SVGSVGElement>("svg");
  if (!root) return emptyGeneric();
  const nodes: GenericNode[] = [];
  const walk = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag) || isHidden(element)) return;
    if (element.classList.contains("today")) return;

    if (tag === "text") {
      if (element.closest("foreignObject")) return;
      const node = parseText(element, textOf(element));
      if (node) nodes.push(node);
      return;
    }

    if (tag === "foreignobject") {
      const node = parseText(element, element.textContent ?? "");
      if (node) nodes.push(node);
      return;
    }

    if (tag === "image") {
      const node = parseImage(element as SVGImageElement);
      if (node) nodes.push(node);
      return;
    }

    if (tag === "use") {
      const href =
        element.getAttribute("href") ??
        element.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (!href || !href.startsWith("#")) return;
      const target =
        root.querySelector(href) ?? element.ownerDocument?.getElementById(href.slice(1));
      if (!target || target === element) return;
      const wrapper = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      const transform = element.getAttribute("transform") ?? "";
      const x = parseNumber(element.getAttribute("x"), 0);
      const y = parseNumber(element.getAttribute("y"), 0);
      wrapper.setAttribute(
        "transform",
        `${transform} translate(${x}, ${y})`.trim(),
      );
      const source = target.tagName.toLowerCase() === "symbol" ? target : target;
      for (const child of Array.from(source.children)) {
        wrapper.appendChild(child.cloneNode(true));
      }
      root.appendChild(wrapper);
      try {
        walk(wrapper);
      } finally {
        wrapper.remove();
      }
      return;
    }

    if (tag === "rect") {
      const node = parseRect(element);
      if (node) nodes.push(node);
      return;
    }

    if (tag === "circle" || tag === "ellipse") {
      const node = parseEllipse(element);
      if (node) nodes.push(node);
      return;
    }

    if (tag === "line") {
      const node = parseLine(element as SVGLineElement);
      if (node) nodes.push(node);
      return;
    }

    if (tag === "polyline" || tag === "polygon") {
      const node = parsePolyShape(element);
      if (node) nodes.push(node);
      return;
    }

    if (tag === "path") {
      for (const node of parsePath(element as SVGPathElement)) {
        nodes.push(node);
      }
      return;
    }

    for (const child of Array.from(element.children)) walk(child);
  };

  walk(root);

  const boundsOfNode = (node: GenericNode) => {
    if (node.type === "line") {
      return {
        x: Math.min(node.startX, node.endX),
        y: Math.min(node.startY, node.endY),
        width: Math.abs(node.endX - node.startX),
        height: Math.abs(node.endY - node.startY),
      };
    }
    if (node.type === "path") {
      const xs = node.points.map((point) => point.x);
      const ys = node.points.map((point) => point.y);
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }
    return node;
  };

  const viewBox = root.viewBox?.baseVal;
  const margin = 24;
  const inView = (node: GenericNode) => {
    if (!viewBox || viewBox.width <= 0 || viewBox.height <= 0) return true;
    const box = boundsOfNode(node);
    return !(
      box.x + box.width < viewBox.x - margin ||
      box.x > viewBox.x + viewBox.width + margin ||
      box.y + box.height < viewBox.y - margin ||
      box.y > viewBox.y + viewBox.height + margin
    );
  };

  const z = (node: GenericNode): number => {
    if (node.type === "text") return 3;
    if (node.type === "line") return 1;
    if (node.type === "path") return node.fill ? 2 : 1;
    if (node.type === "image") return 2;
    return 2;
  };

  return {
    type: "generic",
    nodes: nodes
      .filter((node) => {
        if (node.type !== "path") return true;
        const box = boundsOfNode(node);
        return box.width >= 1.5 || box.height >= 1.5;
      })
      .filter(inView)
      .map((node, index) => ({ node, index }))
      .sort((a, b) => z(a.node) - z(b.node) || a.index - b.index)
      .map(({ node }) => node),
  };
};
