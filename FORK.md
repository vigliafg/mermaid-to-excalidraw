# Fork notes

Questo repository è un fork di
[`excalidraw/mermaid-to-excalidraw`](https://github.com/excalidraw/mermaid-to-excalidraw),
licenza MIT.

L'obiettivo del fork è estendere la conversione nativa a tutti i tipi Mermaid
usati da Mermaid Creator. La nostra app integrerà in futuro un editor
Excalidraw completo; fino ad allora questo fork resta un progetto separato con
un proprio harness di verifica.

## Remotes

`origin` è stato rinominato in `upstream` per evitare push accidentali al
progetto originale. Quando il fork avrà un repository GitHub:

```bash
git remote add origin git@github.com:<org>/mermaid-to-excalidraw.git
git push -u origin master
```

## Toolchain

- Node.js 24+
- pnpm 12 (`pnpm-lock.yaml`)
- Playwright Chromium per l'harness

```bash
pnpm install --allow-build=@swc/core --allow-build=esbuild
pnpm exec playwright install chromium
```

Il file `pnpm-workspace.yaml` contiene le autorizzazioni di build per
`@swc/core` ed `esbuild`.

## Perché le versioni sono pinnate

L'upstream usa `yarn.lock`; pnpm, partendo dal solo `package.json`, risolveva
Mermaid `11.17.2` invece di `11.12.1`. I parser dipendono da classi DOM e DB
interni di Mermaid, quindi il drift rompeva 46 test su 98 e faceva scattare il
fallback immagine anche su flowchart, class ed ER.

Per questo, nel fork:

- `mermaid` è pinnato a `11.12.1`
- `@excalidraw/excalidraw` è pinnato a `0.18.0-a9ca16e`
- `@excalidraw/common` e `@excalidraw/element` sono dipendenze dirette, perché
  con il node_modules strict di pnpm gli import transitivi dell'harness non
  sarebbero risolvibili

**Non aggiornare Mermaid senza aver prima aggiornato gli adapter e rieseguito
l'harness.** L'app Mermaid Creator usa oggi Mermaid `12.2.0`: l'allineamento a
Mermaid 12 è un passo esplicito del piano di integrazione.

## Stato di partenza

Tipi convertiti nativamente oggi:

- Flowchart
- Sequence
- Class
- State (presente nella libreria; l'interfaccia Excalidraw ne dichiara solo
  quattro)
- ER
- Timeline

Tutti gli altri tipi vengono incorporati come immagine SVG (`GraphImage`).
Il report aggiornato è in `harness/report/latest.md`.

I visual snapshot upstream sono stati rigenerati con il Chromium/Playwright del
fork. Non vanno riallineati a quelli originali: il set di dipendenze pinnato e
il browser di CI sono ora la baseline. La suite `pnpm test:visual` gira con 130
casi, inclusi i due nuovi timeline.

## Harness

```bash
pnpm harness          # genera il report
pnpm harness:check    # fallisce se un tipo regredisce
pnpm harness:update   # accetta lo stato attuale come nuova baseline
pnpm harness:strict   # fallisce finché non tutti i target sono nativi
```

La matrice vive in `harness/support-matrix.json`. Ogni caso ha:

- `id`
- `mermaidType`
- `definition`
- `target`: stato finale desiderato (`native` o `image`)
- `baseline`: stato attuale, usato come guardia contro le regressioni

Il runner:

1. avvia il Vite harness già usato dai visual test;
2. renderizza ogni definizione con Mermaid nel browser;
3. esegue `parseMermaid` → `graphToExcalidraw` →
   `convertToExcalidrawElements`;
4. classifica il risultato come `native`, `image` o `error`;
5. confronta con baseline e target;
6. scrive `harness/report/latest.json` e `harness/report/latest.md`.

I visual test upstream restano separati e coprono le regressioni grafiche dei
tipi già supportati.

## Aggiungere un tipo

1. Aggiungere un fixture in `harness/support-matrix.json` con `target:
   "native"`.
2. Aggiungere il parser in `src/parser/<tipo>.ts` e il converter in
   `src/converter/types/<tipo>.ts`.
3. Estendere il tipo `Graph` e lo switch in `src/parseMermaid.ts`.
4. Estendere `graphToExcalidraw.ts`.
5. Aggiungere un test unitario e, quando il rendering è stabile, un caso in
   `visual-tests`.
6. Eseguire `pnpm harness`. Se il caso passa da `image` a `native`,
   aggiornare la baseline con `pnpm harness:update`.
7. Solo dopo aggiornare il report committato o la documentazione.

## Criterio di priorità

Tipi a grafo (mente, requisiti, block, gitGraph, C4, architecture) prima;
layout temporali e grafici (gantt, timeline, journey, quadrant, xychart) dopo;
visualizzazioni con path complessi (pie, sankey, radar, venn) per ultime, con
fallback immagine dichiarato finché non esiste un'adattazione soddisfacente.

## Licenza

MIT, come l'upstream. Conservare LICENSE e attribuzione.
