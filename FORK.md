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
Mermaid `11.17.2` invece della versione attesa. I parser dipendono da classi DOM
e DB interni di Mermaid, quindi il drift rompeva decine di test e faceva
scattare il fallback immagine anche su flowchart, class ed ER.

Per questo, nel fork:

- `mermaid` è pinnato a `12.2.0`, la stessa versione usata dall'app
  Mermaid Creator
- `@excalidraw/excalidraw` è pinnato a `0.18.0-a9ca16e`
- `@excalidraw/common` e `@excalidraw/element` sono dipendenze dirette, perché
  con il node_modules strict di pnpm gli import transitivi dell'harness non
  sarebbero risolvibili

**Non aggiornare Mermaid senza aver prima aggiornato gli adapter e rieseguito
l'harness.** Il fork è già allineato a Mermaid `12.2.0`; gli ID DOM di Mermaid
12 includono il prefisso del render e i parser usano `findElementBySuffix` per
restare compatibili.

## Stato attuale

La matrice copre **22 casi e 22 sono convertiti nativamente**:

- Flowchart, Sequence, Class, State, ER, Timeline: adapter semantici.
- Gantt, Pie, Mindmap, Journey, Quadrant, XY Chart, Sankey, Block, GitGraph,
  Requirement, C4, Architecture, Packet, Kanban, Radar, Treemap: adapter
  generico `generic`, che mappa le primitive SVG in elementi Excalidraw.

L'adapter generico non è un fallback immagine: produce rettangoli, ellissi,
linee, frecce, testi, immagini icona e riempimenti freedraw editabili. La
fedeltà è approssimata per i tipi con path complessi (Pie, Sankey, Radar); il
piano è sostituire progressivamente questi casi con adapter semantici dedicati,
senza perdere il supporto nativo già acquisito.

Il fallback `GraphImage` resta come rete di sicurezza se l'adapter generico non
produce elementi o se la conversione fallisce.

Il report aggiornato è in `harness/report/latest.md`.

I visual snapshot upstream sono stati rigenerati con il Chromium/Playwright del
fork. Non vanno riallineati a quelli originali: il set di dipendenze pinnato e
il browser di CI sono ora la baseline. La suite `pnpm test:visual` gira con 146
casi; GitGraph è escluso dallo snapshot perché il crop Mermaid dipende dalle
metriche font, ed è comunque coperto dal support-matrix harness.

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

Con l'adapter `generic`, un tipo Mermaid sconosciuto viene già convertito in
elementi nativi. Per un tipo nuovo o per migliorare la fedeltà:

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

## Prossimo criterio di priorità

Tutti i tipi sono già nativi tramite l'adapter generico. Il lavoro successivo è
di qualità, non di copertura:

1. sostituire l'adapter generico con parser semantici per Gantt, Pie,
   Mindmap, Journey, Quadrant, XY Chart, Block, GitGraph, Requirement, C4,
   Architecture, Packet, Kanban, Radar e Treemap;
2. migliorare i path complessi (Pie, Sankey, Radar) e gli stili;
3. mantenere la matrice come guardia: ogni sostituzione deve restare `native`
   e non introdurre regressioni visive.

## Licenza

MIT, come l'upstream. Conservare LICENSE e attribuzione.
