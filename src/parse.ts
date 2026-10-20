import { ALLOWED_LABELS, SEVERITIES, type Severity, type TriageResult } from "./types.js";

function clean(value: unknown, max: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Validates and normalizes the raw tool input returned by the model.
 * Nothing the model returns is trusted as-is: every field is type-checked,
 * length-limited and, where relevant, restricted to an allow-list.
 */
export function parseTriage(input: unknown): TriageResult {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;

  const severity: Severity = SEVERITIES.includes(raw.severity as Severity)
    ? (raw.severity as Severity)
    : "medium";

  const steps = Array.isArray(raw.steps_to_reproduce)
    ? raw.steps_to_reproduce
        .map((step) => clean(step, 200))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const allowed = ALLOWED_LABELS as readonly string[];
  const requestedLabels = Array.isArray(raw.labels)
    ? raw.labels
        .filter((label): label is string => typeof label === "string")
        .map((label) => label.toLowerCase().trim())
        .filter((label) => allowed.includes(label))
    : [];
  const labels = [...new Set(["bug", ...requestedLabels])];

  const confidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.min(1, Math.max(0, raw.confidence))
      : 0;

  return {
    isBugReport: raw.is_bug_report === true,
    confidence,
    title: clean(raw.title, 100, "Untitled bug report"),
    summary: clean(raw.summary, 500),
    stepsToReproduce: steps,
    expectedBehavior: clean(raw.expected_behavior, 300, "Not specified"),
    actualBehavior: clean(raw.actual_behavior, 300, "Not specified"),
    platform: clean(raw.platform, 80, "Unknown"),
    severity,
    labels,
  };
}
