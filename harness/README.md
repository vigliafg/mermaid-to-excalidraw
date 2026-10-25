# Support matrix harness

Questo harness misura automaticamente quanti tipi Mermaid vengono convertiti
in elementi Excalidraw nativi e quanti finiscono nel fallback immagine.

## Comandi

```bash
pnpm harness
pnpm harness:check
pnpm harness:update
pnpm harness:strict
```

Richiede Playwright Chromium:

```bash
pnpm exec playwright install chromium
```

## File

- `support-matrix.json` — fixture, target e baseline.
- `report/latest.json` — risultato macchina.
- `report/latest.md` — report leggibile.
- `../scripts/support-matrix.mjs` — runner.
- `../visual-tests/main.ts` — espone `window.analyzeDefinitions`, che usa la
  stessa pipeline del playground (Mermaid → parser → Excalidraw).

## Baseline e target

`baseline` è la guardia contro le regressioni: se un tipo era `native` e torna
`image`, `--check` fallisce. `target` è invece l'obiettivo: `--strict` fallisce
finché un caso non lo raggiunge. Dopo un avanzamento intenzionale:

```bash
pnpm harness:update
```

## Aggiungere un caso

Aggiungere un oggetto a `support-matrix.json`:

```json
{
  "id": "timeline.basic",
  "mermaidType": "timeline",
  "name": "Timeline base",
  "target": "native",
  "baseline": "image",
  "definition": "timeline\n  title Test\n  2024 : Inizio\n  2025 : Fine"
}
```

Poi eseguire `pnpm harness`. La baseline va aggiornata solo quando il
cambiamento è voluto.
