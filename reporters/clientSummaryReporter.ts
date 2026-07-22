import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { formatViolation, type SortAnalysis } from "../helpers/sortAnalysis";

interface SummaryEntry {
  title: string;
  status: TestResult["status"];
  durationMs: number;
  analysis: SortAnalysis | undefined;
  driftCount: number;
}

const DIVIDER = "─".repeat(72);

function clockUtc(isoTimestamp: string): string {
  return isoTimestamp.length >= 16 ? isoTimestamp.slice(11, 16) : isoTimestamp;
}

function describeDrift(entry: SummaryEntry): string {
  if (entry.driftCount === 0) return "";
  const noun = entry.driftCount === 1 ? "story was" : "stories were";
  return `\n    ↳ ${entry.driftCount} ${noun} re-encountered across page boundaries while scraping — pagination drift from new submissions arriving mid-run, excluded from analysis, not a sort defect`;
}

function describeEntry(entry: SummaryEntry): string {
  const analysis = entry.analysis;
  if (analysis && analysis.sorted && entry.status === "passed") {
    return `✓ ${analysis.total}/${analysis.total} articles verified newest → oldest (span ${clockUtc(analysis.oldestIso)} → ${clockUtc(analysis.newestIso)} UTC, 0 violations) — ${entry.title}${describeDrift(entry)}`;
  }
  if (analysis && !analysis.sorted) {
    const violationLines = analysis.violations.map(
      (violation) => `    • ${formatViolation(violation)}`,
    );
    return `✗ ${entry.title} — ${analysis.violations.length} of ${analysis.total} articles out of order:\n${violationLines.join("\n")}${describeDrift(entry)}`;
  }
  if (entry.status === "passed") {
    return `✓ ${entry.title} (${(entry.durationMs / 1000).toFixed(1)}s)`;
  }
  return `✗ ${entry.title} — test ${entry.status} before sort analysis could complete; the HTML report (artifacts/html-report) has the full trace and screenshots`;
}

class ClientSummaryReporter implements Reporter {
  private entries: SummaryEntry[] = [];
  private rootDir = process.cwd();

  onBegin(config: FullConfig, _suite: Suite): void {
    this.rootDir = config.configFile ? dirname(config.configFile) : process.cwd();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const attachment = result.attachments.find(
      (candidate) => candidate.name === "sort-analysis.json",
    );
    const analysis = attachment?.body
      ? (JSON.parse(attachment.body.toString("utf-8")) as SortAnalysis)
      : undefined;
    const driftAttachment = result.attachments.find(
      (candidate) => candidate.name === "pagination-drift.json",
    );
    const driftCount = driftAttachment?.body
      ? (JSON.parse(driftAttachment.body.toString("utf-8")) as unknown[]).length
      : 0;
    this.entries.push({
      title: test.title,
      status: result.status,
      durationMs: result.duration,
      analysis,
      driftCount,
    });
  }

  onEnd(result: FullResult): void {
    const passed = result.status === "passed";
    const headline = passed
      ? "All checks passed — /newest is serving articles newest to oldest."
      : "Attention needed — at least one check did not pass. Details below.";
    const lines = this.entries.map(describeEntry);
    const block = [
      DIVIDER,
      " Client summary — Hacker News /newest sort validation",
      DIVIDER,
      headline,
      "",
      ...lines,
      DIVIDER,
    ].join("\n");
    console.log(`\n${block}`);
    const artifactsDir = join(this.rootDir, "artifacts");
    mkdirSync(artifactsDir, { recursive: true });
    const markdown = [
      "# Hacker News /newest — Sort Validation Summary",
      "",
      `Run finished: ${new Date().toISOString()}`,
      "",
      headline,
      "",
      ...lines.map((line) => `- ${line.replace(/\n/g, "\n  ")}`),
      "",
      "_Full technical detail (traces, screenshots, raw JSON evidence) lives in `artifacts/html-report`._",
      "",
    ].join("\n");
    writeFileSync(join(artifactsDir, "results-summary.md"), markdown);
    console.log(`Summary written to artifacts/results-summary.md\n`);
  }
}

export default ClientSummaryReporter;
