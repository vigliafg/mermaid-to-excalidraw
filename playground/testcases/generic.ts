import type { TestCase } from "../SingleTestCase";

export const GENERIC_DIAGRAM_TESTCASES: TestCase[] = [
  {
    type: "gantt",
    name: "Gantt base",
    definition: "gantt\n  title Piano\n  dateFormat YYYY-MM-DD\n  section Build\n  Requisiti :a1, 2026-01-05, 10d\n  Design :a2, after a1, 8d\n  Sviluppo :a3, after a2, 20d",
  },
  {
    type: "pie",
    name: "Pie base",
    definition: "pie title Ripartizione\n  \"Sviluppo\" : 45\n  \"Riunioni\" : 20\n  \"Test\" : 25\n  \"Documentazione\" : 10",
  },
  {
    type: "mindmap",
    name: "Mindmap base",
    definition: "mindmap\n  root((Mermaid))\n    Diagrammi\n      Flowchart\n      Sequence\n    Strumenti\n      Editor\n      Export",
  },
  {
    type: "journey",
    name: "Journey base",
    definition: "journey\n  title Esperienza di acquisto\n  section Scoperta\n    Cerca : 5: Cliente\n    Confronta : 3: Cliente\n  section Acquisto\n    Paga : 4: Cliente\n    Riceve : 5: Cliente",
  },
  {
    type: "quadrantChart",
    name: "Quadrant base",
    definition: "quadrantChart\n  title Priorità\n  x-axis Basso impatto --> Alto impatto\n  y-axis Bassa urgenza --> Alta urgenza\n  quadrant-1 Fai subito\n  quadrant-2 Pianifica\n  quadrant-3 Scarta\n  quadrant-4 Delega\n  Feature A: [0.8, 0.9]\n  Feature B: [0.3, 0.7]",
  },
  {
    type: "xychart",
    name: "XY Chart base",
    definition: "xychart-beta\n  title Vendite mensili\n  x-axis [Gen, Feb, Mar, Apr, Mag]\n  y-axis \"Unità\" 0 --> 500\n  bar [120, 180, 150, 220, 260]",
  },
  {
    type: "sankey",
    name: "Sankey base",
    definition: "sankey-beta\n\nA,B,10\nA,C,5\nB,D,8\nC,D,7",
  },
  {
    type: "block",
    name: "Block base",
    definition: "block-beta\n  columns 3\n  A[\"A\"] B[\"B\"] C[\"C\"]\n  A --> B",
  },
  {
    type: "gitGraph",
    name: "GitGraph base",
    definition: "gitGraph\n  commit\n  branch develop\n  checkout develop\n  commit\n  checkout main\n  merge develop\n  commit",
  },
  {
    type: "requirementDiagram",
    name: "Requirement base",
    definition: "requirementDiagram\n  requirement test_req {\n    id: 1\n    text: the test text.\n    risk: high\n    verifymethod: test\n  }\n  element test_entity {\n    type: simulation\n  }\n  test_entity - satisfies -> test_req",
  },
  {
    type: "C4Context",
    name: "C4 base",
    definition: "C4Context\n  title System Context\n  Person(user, \"Utente\")\n  System(app, \"Applicazione\")\n  Rel(user, app, \"Usa\")",
  },
  {
    type: "architecture",
    name: "Architecture base",
    definition: "architecture-beta\n  group api(cloud)[API]\n  service db(database)[Database] in api\n  service server(server)[Server] in api\n  db:L -- R:server",
  },
  {
    type: "packet",
    name: "Packet base",
    definition: "packet-beta\n  0-15: \"Source Port\"\n  16-31: \"Destination Port\"\n  32-63: \"Sequence Number\"",
  },
  {
    type: "kanban",
    name: "Kanban base",
    definition: "kanban\n  Todo\n    [Create docs]\n    [Design API]\n  In Progress\n    [Implement parser]\n  Done\n    [Setup repo]",
  },
  {
    type: "radar",
    name: "Radar base",
    definition: "radar-beta\n  title Skills\n  axis a[\"Frontend\"], b[\"Backend\"], c[\"DevOps\"]\n  curve team[\"Team\"]{3,4,2}\n  max 5",
  },
  {
    type: "treemap",
    name: "Treemap base",
    definition: "treemap-beta\n\"Root\"\n    \"Branch A\"\n        \"Leaf 1\": 10\n        \"Leaf 2\": 20\n    \"Branch B\"\n        \"Leaf 3\": 30",
  },
];
