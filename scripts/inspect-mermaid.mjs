#!/usr/bin/env node
/**
 * Developer helper for adapter work.
 *
 *   node scripts/inspect-mermaid.mjs --id timeline.basic
 *   node scripts/inspect-mermaid.mjs --file /tmp/timeline.mmd
 *
 * Writes the rendered Mermaid SVG to harness/report/inspect.svg and prints a
 * compact inventory of classes, data-id and tag names to guide a new parser.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reportDir = join(root, "harness", "report");
const PORT = Number(process.env.HARNESS_PORT) || 3432;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const args = process.argv.slice(2);
const valueOf = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

function readDefinition() {
  const file = valueOf("--file");
  if (file) return readFileSync(file, "utf8");
  const id = valueOf("--id");
  if (id) {
    const matrix = JSON.parse(
      readFileSync(join(root, "harness", "support-matrix.json"), "utf8"),
    );
    const found = matrix.cases.find((item) => item.id === id);
    if (!found) throw new Error(`Caso non trovato: ${id}`);
    return found.definition;
  }
  throw new Error("Serve --id <case> oppure --file <path.mmd>");
}

function portAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not ready
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Vite harness did not start on ${url}`);
}

function stopProcess(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
  }, 2000).unref();
}

async function main() {
  const definition = readDefinition();
  if (!(await portAvailable(PORT))) {
    throw new Error(`Porta ${PORT} occupata`);
  }
  const vite = spawn(
    process.execPath,
    [
      join(root, "node_modules", "vite", "bin", "vite.js"),
      "--config",
      join(root, "visual-tests", "vite.config.ts"),
      "--host",
      "127.0.0.1",
      "--port",
      String(PORT),
      "--strictPort",
    ],
    { cwd: root, stdio: "ignore", env: process.env },
  );

  let browser;
  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/?pw`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForFunction(
      () => window.__HARNESS_READY__ || window.__HARNESS_ERROR__,
      undefined,
      { timeout: 60_000 },
    );
    const harnessError = await page.evaluate(() => window.__HARNESS_ERROR__);
    if (harnessError) throw new Error(harnessError);
    const svg = await page.evaluate((source) => window.renderMermaidSvg(source), definition);

    mkdirSync(reportDir, { recursive: true });
    writeFileSync(join(reportDir, "inspect.svg"), svg);

    const inventory = await page.evaluate((source) => {
      const container = document.createElement("div");
      container.innerHTML = source;
      const elements = Array.from(container.querySelectorAll("*"));
      const tags = {};
      const classes = {};
      const dataIds = [];
      for (const element of elements) {
        tags[element.tagName] = (tags[element.tagName] ?? 0) + 1;
        for (const cls of Array.from(element.classList)) {
          classes[cls] = (classes[cls] ?? 0) + 1;
        }
        const dataId = element.getAttribute("data-id");
        if (dataId) dataIds.push(dataId);
      }
      return { tags, classes, dataIds };
    }, svg);

    console.log(`SVG: ${join(reportDir, "inspect.svg")}`);
    console.log("Tag:", inventory.tags);
    console.log("Classi:", inventory.classes);
    console.log("data-id:", inventory.dataIds.slice(0, 80));
  } finally {
    await browser?.close().catch(() => undefined);
    stopProcess(vite);
  }
}

main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
