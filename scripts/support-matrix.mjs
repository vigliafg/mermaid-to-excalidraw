#!/usr/bin/env node
/**
 * Progress harness for the Mermaid-to-Excalidraw fork.
 *
 * Runs every fixture in harness/support-matrix.json through the real browser
 * pipeline (Mermaid render -> parser -> Excalidraw skeleton conversion) and
 * produces a JSON + Markdown report.
 *
 * The matrix file is also the regression baseline. Use:
 *   pnpm harness                 run and report
 *   pnpm harness:check           fail on regressions
 *   pnpm harness:update          accept current statuses as the new baseline
 *   pnpm harness:strict          fail on regressions or missing target types
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const matrixPath = join(root, "harness", "support-matrix.json");
const reportDir = join(root, "harness", "report");
const PORT = Number(process.env.HARNESS_PORT) || 3431;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const args = new Set(process.argv.slice(2));
const updateBaseline = args.has("--update-baseline");
const strict = args.has("--strict");
const check = args.has("--check") || strict;

const SEVERITY = { error: 0, image: 1, native: 2 };

function packageVersion(name) {
  try {
    return JSON.parse(
      readFileSync(join(root, "node_modules", name, "package.json"), "utf8"),
    ).version;
  } catch {
    return "unknown";
  }
}

function forkVersion() {
  try {
    return JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  } catch {
    return "unknown";
  }
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
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // server not ready yet
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

function markdownReport(report) {
  const rows = report.results
    .map((item) => {
      const target = item.target === item.status ? "✅" : "—";
      const baseline =
        SEVERITY[item.status] < SEVERITY[item.baseline] ? "🔴 regressione" : item.baseline;
      const note = item.status === "error" ? item.error ?? "errore" : "";
      return `| ${item.mermaidType} | ${item.target} | ${baseline} | ${item.status} | ${target} | ${item.elementCount ?? "—"} | ${item.imageCount ?? "—"} | ${item.durationMs} ms | ${note.replace(/\|/g, "\\|").replace(/\n/g, " ")} |`;
    })
    .join("\n");

  const incomplete = report.results.filter(
    (item) => item.status !== item.target,
  );
  return `# Mermaid → Excalidraw support matrix

Generato: ${report.generatedAt}  
Mermaid: ${report.mermaidVersion}  
Fork: ${report.packageVersion}

## Riepilogo

- Casi: **${report.total}**
- Nativi: **${report.nativeCount}/${report.total}** (${report.nativePercent}%)
- Target nativi: **${report.targetNative}**
- Regressioni: **${report.regressions.length}**
- Errori: **${report.errorCount}**
- Casi non ancora al target: **${incomplete.length}**

## Matrice

| Tipo | Target | Baseline | Attuale | Target raggiunto | Elementi | Immagini | Tempo | Note |
|---|---|---|---|---|---|---|---|---|
${rows}

## Come si usa

- \`pnpm harness\` genera questo report.
- \`pnpm harness:check\` fallisce se un caso scende sotto la baseline.
- \`pnpm harness:update\` accetta gli stati attuali come nuova baseline.
- \`pnpm harness:strict\` fallisce anche se un caso non ha ancora raggiunto il target.
`;
}

async function main() {
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
  if (!Array.isArray(matrix.cases) || matrix.cases.length === 0) {
    throw new Error("harness/support-matrix.json non contiene casi");
  }
  if (!(await portAvailable(PORT))) {
    throw new Error(
      `La porta ${PORT} è occupata. Chiudi il processo o imposta HARNESS_PORT.`,
    );
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
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    },
  );
  let viteLog = "";
  vite.stdout.on("data", (chunk) => {
    viteLog += chunk.toString();
  });
  vite.stderr.on("data", (chunk) => {
    viteLog += chunk.toString();
  });

  let browser;
  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    await page.goto(`${BASE_URL}/?pw`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForFunction(
      () => window.__HARNESS_READY__ || window.__HARNESS_ERROR__,
      undefined,
      { timeout: 60_000 },
    );
    const harnessError = await page.evaluate(() => window.__HARNESS_ERROR__);
    if (harnessError) {
      throw new Error(`Harness browser non pronto: ${harnessError}`);
    }

    const results = await page.evaluate(
      (cases) => window.analyzeDefinitions(cases),
      matrix.cases.map((item) => ({
        id: item.id,
        definition: item.definition,
      })),
    );
    if (results.length !== matrix.cases.length) {
      throw new Error(
        `Risultati incompleti: ${results.length}/${matrix.cases.length}`,
      );
    }

    const byId = new Map(results.map((item) => [item.id, item]));
    const merged = matrix.cases.map((item) => {
      const result = byId.get(item.id);
      if (!result) {
        throw new Error(`Nessun risultato per il caso ${item.id}`);
      }
      return {
        id: item.id,
        mermaidType: item.mermaidType,
        name: item.name,
        target: item.target,
        baseline: item.baseline,
        status: result.status,
        graphType: result.graphType,
        elementCount: result.elementCount,
        imageCount: result.imageCount,
        fileCount: result.fileCount,
        elementTypes: result.elementTypes,
        durationMs: result.durationMs,
        error: result.error,
      };
    });

    const regressions = merged.filter(
      (item) => SEVERITY[item.status] < SEVERITY[item.baseline],
    );
    const progress = merged.filter(
      (item) => SEVERITY[item.status] > SEVERITY[item.baseline],
    );
    const nativeCount = merged.filter((item) => item.status === "native").length;
    const targetNative = merged.filter((item) => item.target === "native").length;
    const incomplete = merged.filter((item) => item.status !== item.target);
    const errorCount = merged.filter((item) => item.status === "error").length;

    if (updateBaseline) {
      matrix.cases = matrix.cases.map((item) => {
        const actual = merged.find((result) => result.id === item.id);
        return actual ? { ...item, baseline: actual.status } : item;
      });
      writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      packageVersion: forkVersion(),
      mermaidVersion: packageVersion("mermaid"),
      total: merged.length,
      nativeCount,
      nativePercent: Math.round((nativeCount / merged.length) * 100),
      targetNative,
      errorCount,
      regressions: regressions.map((item) => item.id),
      progress: progress.map((item) => item.id),
      incomplete: incomplete.map((item) => item.id),
      pageErrors,
      results: merged,
    };

    mkdirSync(reportDir, { recursive: true });
    writeFileSync(
      join(reportDir, "latest.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    writeFileSync(join(reportDir, "latest.md"), markdownReport(report));

    console.log(
      `\nMermaid ${report.mermaidVersion}: ${nativeCount}/${merged.length} nativi (${report.nativePercent}%)`,
    );
    console.log(
      `Target nativi: ${targetNative} · Non al target: ${incomplete.length} · Regressioni: ${regressions.length} · Errori: ${errorCount}`,
    );
    if (progress.length) {
      console.log(`Progressi: ${progress.map((item) => item.id).join(", ")}`);
    }
    if (regressions.length) {
      console.log("REGRESSIONI:");
      for (const item of regressions) {
        console.log(
          `  - ${item.id}: ${item.baseline} -> ${item.status}${item.error ? ` (${item.error})` : ""}`,
        );
      }
    }
    if (pageErrors.length) {
      console.log("Errori pagina:");
      for (const error of pageErrors.slice(0, 5)) console.log(`  - ${error}`);
    }
    console.log(`Report: ${join(reportDir, "latest.md")}\n`);

    if (check && regressions.length) process.exitCode = 1;
    if (strict && incomplete.length) process.exitCode = 1;
  } catch (error) {
    console.error(`Harness fallito: ${error}`);
    if (viteLog.trim()) console.error(viteLog.slice(-4000));
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => undefined);
    stopProcess(vite);
  }
}

main();
