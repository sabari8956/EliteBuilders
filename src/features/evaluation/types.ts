export const submissionStates = [
  "draft",
  "submitted",
  "queued",
  "running",
  "ai_scored",
  "awaiting_human_review",
  "finalized",
  "failed",
  "disqualified",
] as const;

export type SubmissionState = (typeof submissionStates)[number];

export type RubricCriterion = {
  id: string;
  title: string;
  description: string;
  weight: number;
  max_score: number;
  keywords: string[];
};

export type ProjectType = "frontend" | "backend" | "fullstack" | "unknown";
export type RuntimePath =
  | "frontend/fullstack-ui"
  | "backend/api"
  | "both"
  | "unknown";

export type Challenge = {
  id: string;
  title: string;
  rubric: RubricCriterion[];
  created_at: string;
  /** Fraction of the final score contributed by AI (0–1). Defaults to 0.8. */
  ai_weight?: number;
};

export type SubmissionTimelineEntry = {
  state: SubmissionState;
  at: string;
  message: string;
};

export type Submission = {
  id: string;
  challenge_id: string;
  builder_id: string;
  snapshot_ref: string;
  snapshot_context: string;
  repo_url?: string | null;
  repo_branch?: string | null;
  rubric_id?: string | null;
  /** Builder-supplied env vars injected into the sandbox at evaluation time. Values are secrets — never log or return in API responses. */
  env_vars?: Record<string, string> | null;
  state: SubmissionState;
  created_at: string;
  updated_at: string;
  ai_score: number | null;
  human_score: number | null;
  final_score: number | null;
  ai_evidence_id: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  finalization_notes: string | null;
  timeline: SubmissionTimelineEntry[];
};

export type EvaluationCriterionEvidence = {
  criterion_id: string;
  criterion_title: string;
  weight: number;
  max_score: number;
  raw_score: number;
  weighted_score: number;
  findings: string[];
  sensitive_context: string;
  evidence_refs?: string[];
  metrics?: Record<string, string | number | boolean | null>;
};

export type AgentOutputContract = {
  status: "success" | "failed" | "skipped";
  summary: string;
  evidence_refs: string[];
  metrics: Record<string, string | number | boolean | null>;
  next_hint?: string | null;
};

export type EvaluationAgentName =
  | "IntakeValidationAgent"
  | "SandboxSetupAgent"
  | "AnalysisPlanningAgent"
  | "UnitTestExecutionAgent"
  | "RuntimeExecutionAgent"
  | "ScoringReportingAgent"
  | "CleanupAgent";

export type EvaluationPhaseResult = {
  agent: EvaluationAgentName;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  contract: AgentOutputContract;
};

export type RuntimeCheckResult = {
  kind: "playwright" | "api" | "http-smoke";
  status: "passed" | "failed" | "skipped";
  command: string | null;
  output: string;
  exit_code: number | null;
  artifacts: string[];
};

export type RuntimeExecutionSummary = {
  runtime_path: RuntimePath;
  checks: RuntimeCheckResult[];
  recording_metadata_ref: string | null;
};

export type EvaluationEvidence = {
  id: string;
  submission_id: string;
  challenge_id: string;
  criteria: EvaluationCriterionEvidence[];
  aggregate_score: number;
  created_at: string;
  project_type?: ProjectType;
  runtime_path?: RuntimePath;
  phase_results?: EvaluationPhaseResult[];
  runtime_artifacts?: string[];
  runtime?: RuntimeExecutionSummary;
  /** Base64-encoded JPEG captured by take_screenshot during runtime evaluation. */
  screenshot_base64?: string | null;
  /** Public preview URL for the running app (e.g. Daytona getPreviewLink output). */
  preview_url?: string | null;
};

export type EvaluationReport = {
  submission_id: string;
  evaluator_report: string;
  builder_report: string;
  evidence: EvaluationEvidence;
  created_at: string;
  updated_at: string;
};

export type DemoDatabase = {
  challenges: Challenge[];
  submissions: Submission[];
  reports: EvaluationReport[];
};

export type LeaderboardMode = "provisional" | "final";

export type LeaderboardEntry = {
  rank: number;
  submission_id: string;
  builder_id: string;
  score: number;
  state: SubmissionState;
  updated_at: string;
  /**
   * True when this entry appears on the provisional board but has NOT been
   * human-reviewed. Provisional scores are unvalidated AI outputs and may
   * change after finalization.
   */
  is_provisional: boolean;
};
