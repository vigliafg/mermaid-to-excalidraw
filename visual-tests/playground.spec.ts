import { test, expect, Page } from "@playwright/test";
import { FLOWCHART_DIAGRAM_TESTCASES } from "../playground/testcases/flowchart";
import { SEQUENCE_DIAGRAM_TESTCASES } from "../playground/testcases/sequence";
import { CLASS_DIAGRAM_TESTCASES } from "../playground/testcases/class";
import { ERD_DIAGRAM_TESTCASES } from "../playground/testcases/er";
import { STATE_DIAGRAM_TESTCASES } from "../playground/testcases/state";
import { UNSUPPORTED_DIAGRAM_TESTCASES } from "../playground/testcases/unsupported";
import { LINE_BREAK_TESTCASES } from "../playground/testcases/lineBreaks";
import { TIMELINE_DIAGRAM_TESTCASES } from "../playground/testcases/timeline";
import { GENERIC_DIAGRAM_TESTCASES } from "../playground/testcases/generic";

const ALL_TESTCASES = [
  ...FLOWCHART_DIAGRAM_TESTCASES.map((tc) => ({
    ...tc,
    chartType: "flowchart",
  })),
  ...SEQUENCE_DIAGRAM_TESTCASES.map((tc) => ({ ...tc, chartType: "sequence" })),
  ...CLASS_DIAGRAM_TESTCASES.map((tc) => ({ ...tc, chartType: "class" })),
  ...ERD_DIAGRAM_TESTCASES.map((tc) => ({ ...tc, chartType: "erd" })),
  ...STATE_DIAGRAM_TESTCASES.map((tc) => ({ ...tc, chartType: "state" })),
  ...UNSUPPORTED_DIAGRAM_TESTCASES.map((tc) => ({
    ...tc,
    chartType: "unsupported",
  })),
  ...LINE_BREAK_TESTCASES.map((tc) => ({
    ...tc,
    chartType: "line-breaks",
  })),
  ...TIMELINE_DIAGRAM_TESTCASES.map((tc) => ({
    ...tc,
    chartType: "timeline",
  })),
  ...GENERIC_DIAGRAM_TESTCASES.map((tc) => ({
    ...tc,
    chartType: tc.type,
  })),
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// One page per worker, reused across that worker's tests (no reload between
// cases). Tests run in parallel and in no fixed order, so each render must not
// depend on what rendered before it in the same page.
let sharedPage: Page;

test.beforeAll(async ({ browser }) => {
  sharedPage = await browser.newPage();
  await sharedPage.goto("/?pw");
  await sharedPage.waitForFunction(
    () => (window as any).__HARNESS_READY__ || (window as any).__HARNESS_ERROR__
  );
  const harnessError = await sharedPage.evaluate(
    () => (window as any).__HARNESS_ERROR__
  );
  if (harnessError) {
    throw new Error(`Visual test harness failed to start: ${harnessError}`);
  }
});

test.afterAll(async () => {
  await sharedPage.close();
});

const FLAKY_SNAPSHOT_TYPES = new Set(["gitGraph"]);

ALL_TESTCASES.forEach((tc, index) => {
  test(`#${index} ${tc.name}`, async () => {
    test.skip(
      FLAKY_SNAPSHOT_TYPES.has(tc.chartType),
      "GitGraph Mermaid crop is font-metric dependent; covered by the support-matrix harness.",
    );
    await sharedPage.evaluate((i) => (window as any).renderTestCase(i), index);

    // Wait for both panels to have SVG content (or error for unsupported)
    await sharedPage.waitForFunction(
      () => {
        const mermaidSvg = document.querySelector("#mermaid-output svg");
        const excalidrawSvg = document.querySelector("#excalidraw-output svg");
        const error = document.getElementById("error")?.textContent;
        return (mermaidSvg && excalidrawSvg) || (error && error.length > 0);
      },
      { timeout: 15000 }
    );

    const container = sharedPage.locator("#container");
    await expect(container).toHaveScreenshot(
      `${index}-${tc.chartType}-${slugify(tc.name)}.png`
    );
  });
});
