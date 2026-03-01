import {
  type EvaluationEvidence,
  type EvaluationReport,
} from "@/features/evaluation/types";

const sensitivePatterns = [
  /sk-[a-z0-9-]+/gi,
  /token\s*=\s*[^\s]+/gi,
  /password\s*=\s*[^\s]+/gi,
  /api[_-]?key\s*=\s*[^\s]+/gi,
  /dtn_[a-z0-9]+/gi,
];

function redact(text: string): string {
  return sensitivePatterns.reduce(
    (current, pattern) => current.replace(pattern, "[REDACTED]"),
    text,
  );
}

function formatPhaseSection(evidence: EvaluationEvidence): string[] {
  if (!evidence.phase_results || evidence.phase_results.length === 0) {
    return [];
  }

  const lines = ["", "## Phase Contracts"];

  for (const phase of evidence.phase_results) {
    lines.push(
      `- ${phase.agent}: ${phase.contract.status} (${phase.duration_ms}ms)`,
    );
    lines.push(`  Summary: ${phase.contract.summary}`);

    if (phase.contract.evidence_refs.length > 0) {
      lines.push(`  Evidence refs: ${phase.contract.evidence_refs.join(" | ")}`);
    }
  }

  return lines;
}

function formatRuntimeSection(evidence: EvaluationEvidence): string[] {
  if (!evidence.runtime) {
    return [];
  }

  const lines = [
    "",
    "## Runtime Artifacts",
    `- Runtime path: ${evidence.runtime.runtime_path}`,
  ];

  for (const check of evidence.runtime.checks) {
    lines.push(
      `- ${check.kind}: ${check.status} (exit ${check.exit_code ?? "n/a"})`,
    );

    if (check.artifacts.length > 0) {
      lines.push(`  Artifacts: ${check.artifacts.join(" | ")}`);
    }
  }

  if (evidence.runtime.recording_metadata_ref) {
    lines.push(`- Daytona recording: ${evidence.runtime.recording_metadata_ref}`);
  }

  return lines;
}

function formatEvaluatorReport(evidence: EvaluationEvidence): string {
  const lines = [
    "# Evaluator Report",
    `Submission: ${evidence.submission_id}`,
    `AI score: ${evidence.aggregate_score}`,
    `Project type: ${evidence.project_type ?? "unknown"}`,
    `Runtime path: ${evidence.runtime_path ?? "unknown"}`,
    "",
    "## Criteria",
  ];

  for (const criterion of evidence.criteria) {
    lines.push(
      `- ${criterion.criterion_title}: ${criterion.raw_score}/${criterion.max_score} (weighted ${criterion.weighted_score})`,
    );
    lines.push(`  Findings: ${criterion.findings.join(" | ")}`);

    if (criterion.evidence_refs && criterion.evidence_refs.length > 0) {
      lines.push(`  Evidence refs: ${criterion.evidence_refs.join(" | ")}`);
    }

    lines.push(`  Internal context: ${criterion.sensitive_context}`);
  }

  lines.push(...formatRuntimeSection(evidence));
  lines.push(...formatPhaseSection(evidence));

  return lines.join("\n");
}

function formatBuilderReport(evidence: EvaluationEvidence): string {
  const lines = [
    "# Builder Report",
    `Submission: ${evidence.submission_id}`,
    `AI score: ${evidence.aggregate_score}`,
    `Project type: ${evidence.project_type ?? "unknown"}`,
    `Runtime path: ${evidence.runtime_path ?? "unknown"}`,
    "",
    "## Rubric Summary",
  ];

  for (const criterion of evidence.criteria) {
    lines.push(
      `- ${criterion.criterion_title}: ${criterion.raw_score}/${criterion.max_score}`,
    );
    lines.push(`  Key findings: ${criterion.findings.join(" | ")}`);
  }

  if (evidence.runtime_artifacts && evidence.runtime_artifacts.length > 0) {
    lines.push("", "## Runtime Artifacts", ...evidence.runtime_artifacts.map((entry) => `- ${entry}`));
  }

  return lines.join("\n");
}

export function buildReport(evidence: EvaluationEvidence): EvaluationReport {
  const evaluatorReport = formatEvaluatorReport(evidence);
  const builderReport = redact(formatBuilderReport(evidence));
  const now = new Date().toISOString();

  return {
    submission_id: evidence.submission_id,
    evaluator_report: evaluatorReport,
    builder_report: builderReport,
    evidence,
    created_at: now,
    updated_at: now,
  };
}

export function redactEvaluatorReport(report: string): string {
  return redact(report);
}
