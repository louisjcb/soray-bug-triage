export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ALLOWED_LABELS = [
  "bug",
  "crash",
  "performance",
  "graphics",
  "audio",
  "network",
  "ui",
  "gameplay",
] as const;

export interface TriageResult {
  isBugReport: boolean;
  /** Model confidence between 0 and 1. */
  confidence: number;
  title: string;
  summary: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  platform: string;
  severity: Severity;
  labels: string[];
}
