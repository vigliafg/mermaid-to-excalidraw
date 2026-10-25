/**
 * jsdom does not implement the SVG measurement APIs used by some Mermaid
 * renderers (e.g. timeline). Provide deterministic approximations so unit
 * tests can parse those diagrams. The browser harness always runs with the
 * real implementations.
 */
if (!("getComputedTextLength" in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value(this: SVGElement) {
      return (this.textContent?.length ?? 0) * 8;
    },
  });
}

if (!("getBBox" in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value(this: SVGElement) {
      const tag = this.tagName.toLowerCase();
      const isText = tag === "text" || tag === "tspan";
      return {
        x: 0,
        y: 0,
        width: isText ? Math.max(1, (this.textContent?.length ?? 0) * 8) : 0,
        height: isText ? 16 : 0,
      };
    },
  });
}
