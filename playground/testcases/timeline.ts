import type { TestCase } from "../SingleTestCase";

export const TIMELINE_DIAGRAM_TESTCASES: TestCase[] = [
  {
    type: "timeline",
    name: "Timeline basic",
    definition: `timeline
  title Storia del progetto
  2024 : Ideazione
  2025 : Prototipo : Primi utenti
  2026 : Lancio`,
  },
  {
    type: "timeline",
    name: "Timeline sections",
    definition: `timeline
  title Tappe
  section Ricerca
    2024 : Interviste
    2025 : Report
  section Sviluppo
    2025 : MVP
    2026 : Rilascio`,
  },
];
