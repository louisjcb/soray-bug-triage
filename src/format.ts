import type { TriageResult } from "./types.js";

/** Prevents accidental pings of GitHub users when text is posted in an issue. */
export function neutralizeMentions(text: string): string {
  return text.replace(/@/g, "@\u200b");
}

export function buildIssueTitle(triage: TriageResult): string {
  return neutralizeMentions(triage.title).slice(0, 120);
}

export interface IssueContext {
  messageUrl: string;
  attachments: string[];
  /** True when a moderator approved the issue before it was created. */
  reviewed: boolean;
}

export function buildIssueBody(triage: TriageResult, context: IssueContext): string {
  const steps = triage.stepsToReproduce.length
    ? triage.stepsToReproduce.map((step, index) => `${index + 1}. ${step}`).join("\n")
    : "_Not provided by the reporter._";

  const lines = [
    "## Summary",
    triage.summary || "_No summary._",
    "",
    "## Steps to reproduce",
    steps,
    "",
    "## Expected behavior",
    triage.expectedBehavior,
    "",
    "## Actual behavior",
    triage.actualBehavior,
    "",
    "## Environment",
    `- Platform: ${triage.platform}`,
    `- Suggested severity: ${triage.severity}`,
  ];

  if (context.attachments.length > 0) {
    lines.push("", "## Attachments", ...context.attachments.map((url) => `- ${url}`));
  }

  const footer = context.reviewed
    ? "approved by a moderator before creation"
    : "created automatically without moderator review";

  return (
    `${neutralizeMentions(lines.join("\n"))}\n\n---\n` +
    `_Created from a [Discord report](${context.messageUrl}) by ` +
    `[soray-bug-triage](https://github.com/louisjcb/soray-bug-triage). ` +
    `Fields were extracted by an AI model and ${footer}._`
  );
}
