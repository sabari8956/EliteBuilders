#!/usr/bin/env tsx
/**
 * Epic 3 Evaluation Pipeline — Step-by-Step Smoke Test
 *
 * Streams the LangGraph evaluation graph against a real public repo,
 * printing each node's output as it completes.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/smoke-test.ts
 *   npx tsx --env-file=.env.local scripts/smoke-test.ts https://github.com/owner/repo
 *
 * The script exits non-zero if any node marks should_stop=true or
 * the final state has no evidence/report.
 */

import {
  buildEvaluationInitialState,
  evaluationGraph,
} from "../src/features/evaluation/langgraph-evaluator";
import type { Challenge, EvaluationPhaseResult, Submission } from "../src/features/evaluation/types";

// ─── Config ──────────────────────────────────────────────────────────────────

const REPO_URL =
  process.argv[2] ??
  "https://github.com/colinhacks/zod.git";

const CHALLENGE: Challenge = {
  id: "smoke-challenge-001",
  title: "Smoke Test — TypeScript Library Evaluation",
  created_at: new Date().toISOString(),
  ai_weight: 0.8,
  rubric: [
    {
      id: "architecture",
      title: "Architecture & Design",
      description: "Code structure, modularity, and clarity",
      weight: 0.35,
      max_score: 100,
      keywords: ["modular", "layer", "interface", "separation", "structure"],
    },
    {
      id: "reliability",
      title: "Reliability & Testing",
      description: "Test coverage, error handling, and deterministic behaviour",
      weight: 0.4,
      max_score: 100,
      keywords: ["test", "error", "retry", "guard", "coverage", "vitest"],
    },
    {
      id: "dx",
      title: "Developer Experience",
      description: "Readability, TypeScript quality, and documentation",
      weight: 0.25,
      max_score: 100,
      keywords: ["readme", "typed", "docs", "lint", "types"],
    },
  ],
};

const SUBMISSION: Submission = {
  id: `smoke-sub-${Date.now()}`,
  challenge_id: CHALLENGE.id,
  builder_id: "smoke-tester",
  snapshot_ref: `snapshot://smoke/${REPO_URL}`,
  snapshot_context: `Smoke test submission for ${REPO_URL}`,
  repo_url: REPO_URL,
  repo_branch: null,
  rubric_id: CHALLENGE.id,
  state: "queued",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ai_score: null,
  human_score: null,
  final_score: null,
  ai_evidence_id: null,
  finalized_at: null,
  finalized_by: null,
  finalization_notes: null,
  timeline: [],
};

// ─── Formatting helpers ───────────────────────────────────────────────────────

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const CYAN   = "\x1b[36m";
const MAGENTA = "\x1b[35m";

function statusColor(status: string): string {
  if (status === "success" || status === "passed") return GREEN;
  if (status === "failed")  return RED;
  if (status === "skipped") return YELLOW;
  return DIM;
}

function hr(char = "─", width = 70): string {
  return char.repeat(width);
}

function printNodeResult(nodeName: string, update: Record<string, unknown>, elapsedMs: number) {
  console.log(`\n${BOLD}${CYAN}▶ ${nodeName}${RESET}  ${DIM}(${elapsedMs}ms)${RESET}`);
  console.log(DIM + hr() + RESET);

  // Print the phase_results entry for this node if present
  const phaseResults = update.phase_results as EvaluationPhaseResult[] | undefined;
  if (phaseResults && phaseResults.length > 0) {
    const phase = phaseResults[phaseResults.length - 1];
    const c = phase.contract;
    const col = statusColor(c.status);
    console.log(`  Status : ${col}${BOLD}${c.status.toUpperCase()}${RESET}`);
    console.log(`  Summary: ${c.summary}`);

    if (c.evidence_refs.length > 0) {
      console.log(`  Refs   : ${DIM}${c.evidence_refs.slice(0, 5).join(", ")}${c.evidence_refs.length > 5 ? " …" : ""}${RESET}`);
    }

    if (Object.keys(c.metrics).length > 0) {
      const metricsStr = Object.entries(c.metrics)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join("  ");
      console.log(`  Metrics: ${DIM}${metricsStr}${RESET}`);
    }

    if (c.next_hint) {
      console.log(`  Next   : ${DIM}${c.next_hint}${RESET}`);
    }
  }

  // Print key state fields that changed
  const stateChanges: string[] = [];

  if (update.sandbox_id)    stateChanges.push(`sandbox_id=${update.sandbox_id}`);
  if (update.commit_sha)    stateChanges.push(`commit_sha=${String(update.commit_sha).slice(0, 8)}`);
  if (update.intake_input) {
    const i = update.intake_input as { repo_url: string; rubric_id: string; branch: string | null };
    stateChanges.push(`repo=${i.repo_url}`);
  }
  if (update.llm_analysis) {
    const a = update.llm_analysis as { project_type: string; runtime_path: string; confidence: number; frameworks: string[] };
    stateChanges.push(`project_type=${a.project_type}`);
    stateChanges.push(`runtime_path=${a.runtime_path}`);
    stateChanges.push(`confidence=${a.confidence}`);
    stateChanges.push(`frameworks=[${a.frameworks.join(", ")}]`);
  }
  if (update.unit_test_result) {
    const u = update.unit_test_result as { status: string; command: string | null; exit_code: number | null; generated: boolean };
    stateChanges.push(`test_status=${u.status}`);
    stateChanges.push(`test_command=${u.command ?? "none"}`);
    stateChanges.push(`exit_code=${u.exit_code ?? "n/a"}`);
    stateChanges.push(`generated=${u.generated}`);
  }
  if (update.runtime) {
    const r = update.runtime as { runtime_path: string; checks: Array<{ kind: string; status: string; exit_code: number | null }> };
    stateChanges.push(`runtime_path=${r.runtime_path}`);
    for (const check of r.checks) {
      stateChanges.push(`  check[${check.kind}]=${check.status} (exit ${check.exit_code ?? "n/a"})`);
    }
  }
  if (update.evidence) {
    const e = update.evidence as { aggregate_score: number; criteria: Array<{ criterion_id: string; raw_score: number; weighted_score: number }> };
    stateChanges.push(`aggregate_score=${e.aggregate_score}`);
    for (const c of e.criteria) {
      stateChanges.push(`  criterion[${c.criterion_id}]: raw=${c.raw_score}  weighted=${c.weighted_score}`);
    }
  }
  if (update.failure_reason) stateChanges.push(`${RED}failure_reason=${update.failure_reason}${RESET}`);

  if (stateChanges.length > 0) {
    console.log(`  State  :`);
    for (const line of stateChanges) {
      console.log(`    ${DIM}${line}${RESET}`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(BOLD + "\n" + hr("═") + RESET);
  console.log(BOLD + "  Epic 3 Evaluation Pipeline — Smoke Test" + RESET);
  console.log(BOLD + hr("═") + RESET);
  console.log(`  Repo   : ${MAGENTA}${REPO_URL}${RESET}`);
  console.log(`  Run ID : ${DIM}(will be assigned by IntakeValidationAgent)${RESET}`);
  console.log(DIM + hr() + RESET + "\n");

  const initialState = buildEvaluationInitialState(SUBMISSION, CHALLENGE);
  console.log(`  run_id : ${DIM}${initialState.run_id}${RESET}\n`);

  const nodeOrder: string[] = [];
  const startTimes = new Map<string, number>();
  let lastNodeStart = Date.now();

  const stream = await evaluationGraph.stream(initialState, { streamMode: "updates" });

  let shouldStop = false;
  let finalEvidence: unknown = null;
  let failureReason: string | null = null;

  for await (const chunk of stream) {
    const chunkRecord = chunk as Record<string, Record<string, unknown>>;
    const nodeName = Object.keys(chunkRecord)[0];
    const update = chunkRecord[nodeName] ?? {};

    const elapsed = Date.now() - lastNodeStart;
    lastNodeStart = Date.now();

    nodeOrder.push(nodeName);
    printNodeResult(nodeName, update, elapsed);

    if (update.should_stop === true) shouldStop = true;
    if (update.failure_reason) failureReason = update.failure_reason as string;
    if (update.evidence) finalEvidence = update.evidence;
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + BOLD + hr("═") + RESET);
  console.log(BOLD + "  Summary" + RESET);
  console.log(DIM + hr() + RESET);
  console.log(`  Nodes executed : ${nodeOrder.join(" → ")}`);
  console.log(`  Pipeline status: ${shouldStop && !finalEvidence ? RED + "FAILED" : GREEN + "COMPLETED"}${RESET}`);

  if (failureReason) {
    console.log(`  Failure reason : ${RED}${failureReason}${RESET}`);
  }

  if (finalEvidence) {
    const ev = finalEvidence as { aggregate_score: number; project_type: string; runtime_path: string };
    console.log(`  Final AI score : ${BOLD}${GREEN}${ev.aggregate_score}${RESET}`);
    console.log(`  Project type   : ${ev.project_type}`);
    console.log(`  Runtime path   : ${ev.runtime_path}`);
  }

  console.log(BOLD + hr("═") + RESET + "\n");

  process.exit(shouldStop && !finalEvidence ? 1 : 0);
}

main().catch((err) => {
  console.error(RED + "\nFatal smoke-test error:" + RESET, err);
  process.exit(1);
});
