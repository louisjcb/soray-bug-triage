import assert from "node:assert/strict";
import test from "node:test";
import { buildIssueBody, buildIssueTitle, neutralizeMentions } from "../src/format.js";
import { parseTriage } from "../src/parse.js";

const triage = parseTriage({
  is_bug_report: true,
  confidence: 0.9,
  title: "Crash @everyone when opening the map",
  summary: "The game closes when the map is opened.",
  steps_to_reproduce: ["Start the game", "Press M"],
  severity: "high",
  platform: "PC",
});

test("neutralizes mentions", () => {
  assert.ok(!neutralizeMentions("hello @octocat").includes("@octocat"));
});

test("issue title never contains a raw mention", () => {
  assert.ok(!buildIssueTitle(triage).includes("@everyone"));
});

test("issue body numbers the steps and links the source", () => {
  const body = buildIssueBody(triage, {
    messageUrl: "https://discord.com/channels/1/2/3",
    attachments: ["https://cdn.example.com/screenshot.png"],
    reviewed: true,
  });
  assert.ok(body.includes("1. Start the game"));
  assert.ok(body.includes("2. Press M"));
  assert.ok(body.includes("https://discord.com/channels/1/2/3"));
  assert.ok(body.includes("screenshot.png"));
  assert.ok(body.includes("approved by a moderator"));
});

test("issue body says when no moderator reviewed it", () => {
  const body = buildIssueBody(triage, { messageUrl: "https://discord.com/x", attachments: [], reviewed: false });
  assert.ok(body.includes("without moderator review"));
});
