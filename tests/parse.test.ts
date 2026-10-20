import assert from "node:assert/strict";
import test from "node:test";
import { parseTriage } from "../src/parse.js";

test("parses a valid triage result", () => {
  const result = parseTriage({
    is_bug_report: true,
    confidence: 0.9,
    title: "Crash when opening the map",
    summary: "The game closes when the map is opened.",
    steps_to_reproduce: ["Start the game", "Press M"],
    expected_behavior: "The map opens",
    actual_behavior: "The game crashes",
    platform: "PC",
    severity: "high",
    labels: ["crash", "ui"],
  });
  assert.equal(result.isBugReport, true);
  assert.equal(result.severity, "high");
  assert.deepEqual(result.stepsToReproduce, ["Start the game", "Press M"]);
  assert.deepEqual(result.labels, ["bug", "crash", "ui"]);
});

test("falls back to safe defaults on garbage input", () => {
  const result = parseTriage("not an object");
  assert.equal(result.isBugReport, false);
  assert.equal(result.confidence, 0);
  assert.equal(result.severity, "medium");
  assert.equal(result.title, "Untitled bug report");
  assert.equal(result.platform, "Unknown");
  assert.deepEqual(result.labels, ["bug"]);
});

test("clamps confidence and rejects unknown severity", () => {
  const result = parseTriage({ is_bug_report: true, confidence: 7, severity: "apocalyptic" });
  assert.equal(result.confidence, 1);
  assert.equal(result.severity, "medium");
});

test("drops labels that are not in the allow-list", () => {
  const result = parseTriage({ labels: ["Crash", "hack-the-planet", 42] });
  assert.deepEqual(result.labels, ["bug", "crash"]);
});

test("truncates long titles and limits steps", () => {
  const result = parseTriage({
    title: "x".repeat(500),
    steps_to_reproduce: Array.from({ length: 30 }, (_, index) => `step ${index}`),
  });
  assert.equal(result.title.length, 100);
  assert.equal(result.stepsToReproduce.length, 10);
});
