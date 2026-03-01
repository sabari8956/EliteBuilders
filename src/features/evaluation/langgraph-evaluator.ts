import { randomUUID } from "node:crypto";
import { Daytona } from "@daytonaio/sdk";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { END, START, Annotation, StateGraph } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { traceable } from "langsmith/traceable";
import { z } from "zod";
import {
  createAzureChatModelFromEnv,
  llmProjectAnalysisSchema,
  type LlmProjectAnalysis,
} from "@/features/evaluation/llm-analysis";
import { makeSandboxTools } from "@/features/evaluation/sandbox-tools";
import { buildReport } from "@/features/evaluation/reporting";
import type {
  AgentOutputContract,
  Challenge,
  EvaluationAgentName,
  EvaluationEvidence,
  EvaluationPhaseResult,
  EvaluationReport,
  ProjectType,
  RuntimeCheckResult,
  RuntimeExecutionSummary,
  RuntimePath,
  Submission,
} from "@/features/evaluation/types";

const createTimeoutSeconds = 60;

type EvalSandbox = Awaited<ReturnType<Daytona["create"]>>;

type IntakeInput = {
  repo_url: string;
  rubric_id: string;
  branch: string | null;
};

type UnitTestExecutionResult = {
  status: "passed" | "failed" | "skipped";
  command: string | null;
  output: string;
  exit_code: number | null;
  generated: boolean;
  generated_test_file: string | null;
};

type EvaluationStateType = {
  run_id: string;
  submission: Submission;
  challenge: Challenge;
  intake_input: IntakeInput | null;
  sandbox_id: string | null;
  commit_sha: string | null;
  llm_analysis: LlmProjectAnalysis | null;
  unit_test_result: UnitTestExecutionResult | null;
  runtime: RuntimeExecutionSummary | null;
  evidence: EvaluationEvidence | null;
  report: EvaluationReport | null;
  phase_results: EvaluationPhaseResult[];
  failure_reason: string | null;
  should_stop: boolean;
};

const EvaluationState = Annotation.Root({
  run_id: Annotation<string>(),
  submission: Annotation<Submission>(),
  challenge: Annotation<Challenge>(),
  intake_input: Annotation<IntakeInput | null>(),
  sandbox_id: Annotation<string | null>(),
  commit_sha: Annotation<string | null>(),
  llm_analysis: Annotation<LlmProjectAnalysis | null>(),
  unit_test_result: Annotation<UnitTestExecutionResult | null>(),
  runtime: Annotation<RuntimeExecutionSummary | null>(),
  evidence: Annotation<EvaluationEvidence | null>(),
  report: Annotation<EvaluationReport | null>(),
  phase_results: Annotation<EvaluationPhaseResult[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  failure_reason: Annotation<string | null>(),
  should_stop: Annotation<boolean>(),
});

const sandboxRegistry = new Map<string, EvalSandbox>();

// Best-effort sandbox cleanup on process exit. Fires on SIGTERM / SIGINT.
// The 'exit' event is synchronous so we only clear the registry there.
function registerExitHandlers(): void {
  const cleanupAll = () => {
    if (sandboxRegistry.size === 0) return;
    try {
      const daytona = createDaytonaClient();
      for (const [runId, sandbox] of sandboxRegistry) {
        daytona.delete(sandbox, 5).catch(() => {});
        sandboxRegistry.delete(runId);
      }
    } catch {
      // createDaytonaClient may throw if env vars are missing; swallow.
    }
  };
  process.once("SIGTERM", cleanupAll);
  process.once("SIGINT", cleanupAll);
  process.once("exit", () => sandboxRegistry.clear());
}

registerExitHandlers();

const unitTestAgentSchema = z.object({
  status: z.enum(["passed", "failed", "skipped"]),
  command_used: z.string().nullable(),
  test_output_summary: z.string(),
  generated_test_file: z.string().nullable(),
  installed_deps: z.boolean(),
  exit_code: z.number().nullable(),
});

const runtimeAgentSchema = z.object({
  runtime_path: z.enum(["frontend/fullstack-ui", "backend/api", "both", "unknown"]),
  checks: z.array(
    z.object({
      kind: z.enum(["playwright", "api", "http-smoke"]),
      status: z.enum(["passed", "failed", "skipped"]),
      command: z.string().nullable(),
      output: z.string(),
      exit_code: z.number().nullable(),
    }),
  ),
  preview_url: z.string().nullable(),
  screenshot_taken: z.boolean(),
  overall_passed: z.boolean(),
  summary: z.string(),
});

const scoringSchema = z.object({
  criteria_scores: z.array(
    z.object({
      criterion_id: z.string(),
      reasoning: z.string(),
      raw_score: z.number().min(0),
      weighted_score: z.number().min(0),
      findings: z.array(z.string()),
    }),
  ),
  aggregate_score: z.number().min(0),
  overall_reasoning: z.string(),
});

export type CourseCorrectedEvaluationResult = {
  evidence: EvaluationEvidence;
  report: EvaluationReport;
  phase_results: EvaluationPhaseResult[];
  project_type: ProjectType;
  runtime_path: RuntimePath;
};

function nowIso(): string {
  return new Date().toISOString();
}

function compactOutput(output: string, max = 6000): string {
  return output.length <= max ? output : `${output.slice(0, max)}\n...[truncated]`;
}

function sanitizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 63);
}

function escapeShell(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function normalizeRuntimePath(
  runtimePath: LlmProjectAnalysis["runtime_path"],
  projectType: ProjectType,
): RuntimePath {
  if (runtimePath !== "unknown") {
    return runtimePath;
  }

  if (projectType === "frontend") {
    return "frontend/fullstack-ui";
  }

  if (projectType === "backend") {
    return "backend/api";
  }

  if (projectType === "fullstack") {
    return "both";
  }

  return "unknown";
}

function flattenRuntimeArtifacts(runtime: RuntimeExecutionSummary | null): string[] {
  if (!runtime) {
    return [];
  }

  return runtime.checks.flatMap((check) => check.artifacts);
}

function createDaytonaClient(): Daytona {
  const apiKey = process.env.DAYTONA_API_KEY;
  const apiUrl = process.env.DAYTONA_API_URL;
  const target = process.env.DAYTONA_TARGET;

  if (!apiKey || !apiUrl) {
    throw new Error("Daytona runtime requires DAYTONA_API_URL and DAYTONA_API_KEY.");
  }

  return new Daytona({ apiKey, apiUrl, target });
}

async function getSandboxOrThrow(runId: string): Promise<EvalSandbox> {
  const sandbox = sandboxRegistry.get(runId);

  if (!sandbox) {
    throw new Error(`Sandbox not found in registry for run ${runId}.`);
  }

  return sandbox;
}

function makeContract(
  status: AgentOutputContract["status"],
  summary: string,
  evidenceRefs: string[] = [],
  metrics: AgentOutputContract["metrics"] = {},
  nextHint: string | null = null,
): AgentOutputContract {
  return {
    status,
    summary,
    evidence_refs: evidenceRefs,
    metrics,
    next_hint: nextHint,
  };
}

function phaseEntry(
  agent: EvaluationAgentName,
  startedAt: string,
  contract: AgentOutputContract,
): EvaluationPhaseResult {
  const finishedAt = nowIso();

  return {
    agent,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: Math.max(1, Date.parse(finishedAt) - Date.parse(startedAt)),
    contract,
  };
}

async function executeAgent(
  state: typeof EvaluationState.State,
  agent: EvaluationAgentName,
  fn: () => Promise<{ contract: AgentOutputContract; update?: Partial<EvaluationStateType> }>,
): Promise<Partial<EvaluationStateType>> {
  const startedAt = nowIso();

  try {
    const result = await fn();
    const contract = result.contract;
    const update = result.update ?? {};

    const shouldStop = state.should_stop || contract.status === "failed" || update.should_stop === true;
    const failureReason =
      contract.status === "failed"
        ? update.failure_reason ?? contract.summary
        : update.failure_reason ?? state.failure_reason;

    return {
      ...update,
      should_stop: shouldStop,
      failure_reason: failureReason,
      phase_results: [phaseEntry(agent, startedAt, contract)],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Unknown ${agent} failure during evaluation.`;

    return {
      should_stop: true,
      failure_reason: message,
      phase_results: [
        phaseEntry(
          agent,
          startedAt,
          makeContract("failed", message, [], {
            exception: true,
          }),
        ),
      ],
    };
  }
}

const intakeValidationAgent = traceable(
  async (state: typeof EvaluationState.State): Promise<Partial<EvaluationStateType>> =>
    executeAgent(state, "IntakeValidationAgent", async () => {
      const repoUrl = state.submission.repo_url ?? state.submission.snapshot_ref;
      const intake = {
        repo_url: z.url().max(512).parse(repoUrl),
        rubric_id: z
          .string()
          .min(1)
          .max(128)
          .parse(state.submission.rubric_id ?? state.challenge.id),
        branch: state.submission.repo_branch ?? null,
      };

      if (state.challenge.rubric.length === 0) {
        throw new Error(`Challenge ${state.challenge.id} has an empty rubric.`);
      }

      return {
        contract: makeContract(
          "success",
          "Submission intake validated.",
          [`submission:${state.submission.id}`, `challenge:${state.challenge.id}`],
          {
            rubric_criteria: state.challenge.rubric.length,
            has_repo_branch: Boolean(intake.branch),
          },
          "Proceed to sandbox setup.",
        ),
        update: {
          intake_input: intake,
        },
      };
    }),
  {
    name: "IntakeValidationAgent",
    run_type: "chain",
  },
);

const sandboxSetupAgent = traceable(
  async (state: typeof EvaluationState.State): Promise<Partial<EvaluationStateType>> =>
    executeAgent(state, "SandboxSetupAgent", async () => {
      if (!state.intake_input) {
        throw new Error("Sandbox setup requires validated intake_input.");
      }

      const daytona = createDaytonaClient();
      const labels = {
        lane: "epic3-evaluator",
        submission_id: sanitizeLabel(state.submission.id),
        run_id: sanitizeLabel(state.run_id),
      };

      const envVars = state.submission.env_vars ?? {};
      const snapshot = process.env.DAYTONA_EVAL_SNAPSHOT;
      const createParams = snapshot
        ? {
            snapshot,
            language: "javascript",
            autoStopInterval: 10,
            autoDeleteInterval: 0,
            labels,
            envVars,
          }
        : {
            language: "javascript",
            autoStopInterval: 10,
            autoDeleteInterval: 0,
            labels,
            envVars,
          };

      const sandbox = await daytona.create(createParams, { timeout: createTimeoutSeconds });
      const sandboxId =
        typeof sandbox.id === "string" && sandbox.id.length > 0
          ? sandbox.id
          : `sandbox-${state.run_id}`;

      sandboxRegistry.set(state.run_id, sandbox);

      const branchPart = state.intake_input.branch
        ? ` --branch ${escapeShell(state.intake_input.branch)} `
        : " ";
      const cloneCommand = `git clone --depth 1${branchPart}${escapeShell(state.intake_input.repo_url)} repo`;

      const cloneResult = await sandbox.process.executeCommand(
        cloneCommand,
        undefined,
        undefined,
        180,
      );

      if (cloneResult.exitCode !== 0) {
        return {
          contract: makeContract(
            "failed",
            "Repository clone failed in sandbox setup.",
            [`sandbox:${sandboxId}`],
            {
              clone_exit_code: cloneResult.exitCode,
            },
          ),
          update: {
            sandbox_id: sandboxId,
            failure_reason: compactOutput(cloneResult.result),
          },
        };
      }

      const commitResult = await sandbox.process.executeCommand(
        "cd repo && git rev-parse HEAD",
        undefined,
        undefined,
        30,
      );

      if (commitResult.exitCode !== 0) {
        return {
          contract: makeContract(
            "failed",
            "Unable to lock deterministic commit SHA.",
            [`sandbox:${sandboxId}`],
            {
              commit_exit_code: commitResult.exitCode,
            },
          ),
          update: {
            sandbox_id: sandboxId,
            failure_reason: compactOutput(commitResult.result),
          },
        };
      }

      const commitSha = commitResult.result.trim();

      // Write builder-supplied env vars into the repo as .env and .env.local
      // so the app can load them at runtime via dotenv / Next.js / Vite etc.
      if (Object.keys(envVars).length > 0) {
        const envContent = Object.entries(envVars)
          .map(([k, v]) => `${k}=${v.replace(/\n/g, "\\n")}`)
          .join("\n");
        const encoded = Buffer.from(envContent, "utf8").toString("base64");
        const writeEnvScript = `
const fs = require('fs');
const content = Buffer.from(${JSON.stringify(encoded)}, 'base64').toString('utf8');
fs.writeFileSync('repo/.env', content, 'utf8');
fs.writeFileSync('repo/.env.local', content, 'utf8');
console.log('ENV_WRITTEN:' + Object.keys(JSON.parse('${JSON.stringify(Object.fromEntries(Object.keys(envVars).map(k => [k, "***"])))}')).join(','));
`;
        await sandbox.process.codeRun(writeEnvScript, undefined, 15);
      }

      return {
        contract: makeContract(
          "success",
          "Sandbox created and repository cloned at deterministic commit.",
          [`sandbox:${sandboxId}`, `git:commit:${commitSha}`],
          {
            clone_exit_code: cloneResult.exitCode,
            env_vars_injected: Object.keys(envVars).length,
          },
          "Proceed to LLM-first analysis planning.",
        ),
        update: {
          sandbox_id: sandboxId,
          commit_sha: commitSha,
        },
      };
    }),
  {
    name: "SandboxSetupAgent",
    run_type: "chain",
  },
);

const analysisPlanningAgent = traceable(
  async (state: typeof EvaluationState.State): Promise<Partial<EvaluationStateType>> =>
    executeAgent(state, "AnalysisPlanningAgent", async () => {
      if (!state.intake_input) {
        throw new Error("Analysis requires intake_input.");
      }

      const sandbox = await getSandboxOrThrow(state.run_id);
      const { bash, read_file, list_files } = makeSandboxTools(sandbox);

      const agent = createReactAgent({
        llm: createAzureChatModelFromEnv(),
        tools: [bash, read_file, list_files],
        prompt:
          "You are AnalysisPlanningAgent. Explore ./repo with list_files and read_file. " +
          "Determine project_type, runtime_path, primary_language, frameworks, " +
          "and the best unit test command from actual repo evidence.",
        responseFormat: llmProjectAnalysisSchema,
        name: "AnalysisPlanningAgent",
      });

      const agentInput = {
        messages: [
          new HumanMessage(
            `Analyze repo at ./repo\nURL: ${state.intake_input.repo_url}\nRubric: ${state.intake_input.rubric_id}`,
          ),
        ],
      };

      let llmAnalysis: LlmProjectAnalysis | undefined;
      let lastAnalysisError: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await agent.invoke(agentInput, { recursionLimit: 30 });
          llmAnalysis = llmProjectAnalysisSchema.parse(result.structuredResponse);
          break;
        } catch (err) {
          lastAnalysisError = err;
          console.warn(`[AnalysisPlanningAgent] Parse failure on attempt ${attempt}:`, err);
          if (attempt === 3) throw lastAnalysisError;
        }
      }

      if (!llmAnalysis) throw lastAnalysisError;
      const normalizedAnalysis: LlmProjectAnalysis = {
        ...llmAnalysis,
        runtime_path: normalizeRuntimePath(llmAnalysis.runtime_path, llmAnalysis.project_type),
      };

      return {
        contract: makeContract(
          "success",
          `LLM analysis: ${normalizedAnalysis.runtime_path}.`,
          normalizedAnalysis.evidence_files,
          {
            project_type: normalizedAnalysis.project_type,
            confidence: normalizedAnalysis.confidence,
          },
          "Proceed to unit test execution.",
        ),
        update: { llm_analysis: normalizedAnalysis },
      };
    }),
  {
    name: "AnalysisPlanningAgent",
    run_type: "chain",
  },
);

const unitTestExecutionAgent = traceable(
  async (state: typeof EvaluationState.State): Promise<Partial<EvaluationStateType>> =>
    executeAgent(state, "UnitTestExecutionAgent", async () => {
      if (!state.llm_analysis) {
        throw new Error("Unit test requires analysis output.");
      }

      const sandbox = await getSandboxOrThrow(state.run_id);
      const tools = makeSandboxTools(sandbox);

      const agent = createReactAgent({
        llm: createAzureChatModelFromEnv(),
        tools: [tools.bash, tools.read_file, tools.write_file, tools.list_files],
        prompt:
          "You are UnitTestExecutionAgent.\n" +
          "ALWAYS install deps first: cd repo && npm install (or pnpm/yarn based on lockfile).\n" +
          "Find test files (*.test.ts, *.spec.ts, __tests__/). Run them.\n" +
          "If no test files exist, generate ONE minimal test file with write_file, then run it.\n" +
          "Report status, command used, exit_code, whether you generated tests.",
        responseFormat: unitTestAgentSchema,
        name: "UnitTestExecutionAgent",
      });

      const unitAgentInput = {
        messages: [
          new HumanMessage(
            `Run unit tests for repo at ./repo\n` +
              `Type: ${state.llm_analysis.project_type}\n` +
              `Frameworks: ${state.llm_analysis.frameworks.join(", ")}\n` +
              `Suggested command: ${state.llm_analysis.recommended_unit_test_command}`,
          ),
        ],
      };

      let out: z.infer<typeof unitTestAgentSchema> | undefined;
      let lastUnitError: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await agent.invoke(unitAgentInput, { recursionLimit: 40 });
          out = unitTestAgentSchema.parse(result.structuredResponse);
          break;
        } catch (err) {
          lastUnitError = err;
          console.warn(`[UnitTestExecutionAgent] Parse failure on attempt ${attempt}:`, err);
          if (attempt === 3) throw lastUnitError;
        }
      }

      if (!out) throw lastUnitError;
      const unitResult: UnitTestExecutionResult = {
        status: out.status,
        command: out.command_used,
        output: out.test_output_summary,
        exit_code: out.exit_code,
        generated: out.generated_test_file !== null,
        generated_test_file: out.generated_test_file,
      };

      return {
        contract: makeContract(
          "success",
          out.status === "passed" ? "Unit tests passed." : `Unit tests ${out.status}.`,
          [
            ...(out.command_used ? [`unit-test:${out.command_used}`] : []),
            ...(out.generated_test_file ? [`generated:${out.generated_test_file}`] : []),
          ],
          { installed_deps: out.installed_deps, test_exit_code: out.exit_code },
          "Proceed to runtime.",
        ),
        update: { unit_test_result: unitResult },
      };
    }),
  {
    name: "UnitTestExecutionAgent",
    run_type: "chain",
  },
);

const runtimeExecutionAgent = traceable(
  async (state: typeof EvaluationState.State): Promise<Partial<EvaluationStateType>> =>
    executeAgent(state, "RuntimeExecutionAgent", async () => {
      if (!state.llm_analysis) {
        throw new Error("Runtime requires analysis.");
      }

      const sandbox = await getSandboxOrThrow(state.run_id);
      const { bash, read_file, list_files, start_display, get_preview_url, take_screenshot } =
        makeSandboxTools(sandbox);
      const runtimePath = normalizeRuntimePath(
        state.llm_analysis.runtime_path,
        state.llm_analysis.project_type,
      );

      const agent = createReactAgent({
        llm: createAzureChatModelFromEnv(),
        tools: [bash, read_file, list_files, start_display, get_preview_url, take_screenshot],
        prompt: [
          "You are RuntimeExecutionAgent. Run runtime checks for the repo cloned at ./repo.",
          "",
          "## For frontend/fullstack-ui repos:",
          "1. Call start_display to initialize the X11 display.",
          "2. Install Playwright browsers: bash('cd repo && npx playwright install chromium --with-deps 2>&1 | tail -5')",
          "3. Build the app: bash('cd repo && npm run build 2>&1 | tail -20')",
          "4. Start server in background: bash('cd repo && nohup npm start > /tmp/app.log 2>&1 & echo started')",
          "5. Wait and verify: bash('sleep 5 && curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3000')",
          "6. Get the public URL: get_preview_url(3000) — include this URL in preview_url field.",
          "7. Run Playwright if tests exist: bash('cd repo && npx playwright test --reporter=list 2>&1 | tail -30')",
          "8. Take a screenshot as visual evidence: take_screenshot()",
          "9. If the build failed or no start script, try 'npm run dev' instead.",
          "",
          "## For backend/api repos:",
          "1. Detect the start command: bash('cat repo/package.json | grep -A5 scripts')",
          "2. Start server: bash('cd repo && nohup npm start > /tmp/api.log 2>&1 & sleep 3 && echo started')",
          "3. Discover API routes: bash('find repo/src -name \"*.ts\" | xargs grep -l \"router\\|app\\.get\\|app\\.post\" 2>/dev/null | head -10')",
          "4. Probe each route with curl, report HTTP status codes.",
          "5. Get preview URL: get_preview_url(3000 or detected port).",
          "",
          "## For unknown/library repos:",
          "- Skip runtime checks. Explain why (e.g. no server, pure library).",
          "- Set screenshot_taken=false, preview_url=null.",
          "",
          "Always report each check with kind ('playwright', 'api', or 'http-smoke'), status, command, output, exit_code.",
          "Set overall_passed=true if at least one check passed.",
        ].join("\n"),
        responseFormat: runtimeAgentSchema,
        name: "RuntimeExecutionAgent",
      });

      const runtimeAgentInput = {
        messages: [
          new HumanMessage(
            `Run runtime checks. Path: ${runtimePath}\n` +
              `Frameworks: ${state.llm_analysis.frameworks.join(", ")}\n` +
              `Unit test status: ${state.unit_test_result?.status ?? "unknown"}`,
          ),
        ],
      };

      let out: z.infer<typeof runtimeAgentSchema> | undefined;
      let lastRuntimeError: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await agent.invoke(runtimeAgentInput, { recursionLimit: 50 });
          out = runtimeAgentSchema.parse(result.structuredResponse);
          break;
        } catch (err) {
          lastRuntimeError = err;
          console.warn(`[RuntimeExecutionAgent] Parse failure on attempt ${attempt}:`, err);
          if (attempt === 3) throw lastRuntimeError;
        }
      }

      if (!out) throw lastRuntimeError;
      const recordingRef =
        process.env.DAYTONA_RECORDING_ENABLED === "true" && state.sandbox_id
          ? `daytona-recording://${state.sandbox_id}/${state.run_id}`
          : null;

      const runtimeSummary: RuntimeExecutionSummary = {
        runtime_path: out.runtime_path,
        checks: out.checks.map((c) => ({
          ...c,
          artifacts: [
            ...(c.kind === "playwright"
              ? [
                  `playwright://trace/${state.run_id}.zip`,
                  `playwright://screenshot/${state.run_id}.png`,
                ]
              : c.kind === "http-smoke"
                ? [out.preview_url ? `preview://${out.preview_url}` : `http-smoke://result.json`]
                : [`api-check://result.json`]),
          ],
        })),
        recording_metadata_ref: recordingRef,
      };

      const evidenceRefs = [
        ...runtimeSummary.checks.flatMap((c) => c.artifacts),
        ...(out.preview_url ? [`preview-url:${out.preview_url}`] : []),
        ...(out.screenshot_taken ? [`screenshot://daytona/${state.run_id}.jpeg`] : []),
      ];

      const failedChecks = runtimeSummary.checks.filter((c) => c.status === "failed").length;
      return {
        contract: makeContract(
          "success",
          out.summary,
          evidenceRefs,
          { runtime_path: runtimePath, failed_checks: failedChecks },
          "Proceed to scoring.",
        ),
        update: { runtime: runtimeSummary },
      };
    }),
  {
    name: "RuntimeExecutionAgent",
    run_type: "chain",
  },
);

const scoringReportingAgent = traceable(
  async (state: typeof EvaluationState.State): Promise<Partial<EvaluationStateType>> =>
    executeAgent(state, "ScoringReportingAgent", async () => {
      if (!state.llm_analysis) {
        throw new Error("Scoring requires analysis output from AnalysisPlanningAgent.");
      }

      const model = createAzureChatModelFromEnv();
      const scorer = model.withStructuredOutput(scoringSchema, { name: "scoring_output" });

      const runtimeFailures =
        state.runtime?.checks.filter((c) => c.status === "failed").length ?? 0;

      const evidenceContext = JSON.stringify({
        project_type: state.llm_analysis.project_type,
        runtime_path: state.llm_analysis.runtime_path,
        reasoning: state.llm_analysis.reasoning,
        frameworks: state.llm_analysis.frameworks,
        unit_test: state.unit_test_result
          ? {
              status: state.unit_test_result.status,
              command: state.unit_test_result.command,
              output: state.unit_test_result.output.slice(0, 2000),
              exit_code: state.unit_test_result.exit_code,
            }
          : null,
        runtime: state.runtime
          ? {
              runtime_path: state.runtime.runtime_path,
              checks: state.runtime.checks.map((c) => ({
                kind: c.kind,
                status: c.status,
                output: c.output.slice(0, 1000),
              })),
            }
          : null,
      });

      const rubricContext = JSON.stringify(
        state.challenge.rubric.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          weight: c.weight,
          max_score: c.max_score,
        })),
      );

      const messages = [
        new SystemMessage(
          "You are ScoringReportingAgent. Score each rubric criterion based on the evaluation evidence. " +
            "Be fair but critical. Use the evidence to justify scores. " +
            "raw_score must be between 0 and the criterion's max_score. " +
            "weighted_score = raw_score * weight. " +
            "aggregate_score = sum of all weighted_scores.",
        ),
        new HumanMessage(
          `Rubric criteria:\n${rubricContext}\n\nEvaluation evidence:\n${evidenceContext}`,
        ),
      ];

      // Retry up to 3 attempts on parse failure before propagating.
      let out: z.infer<typeof scoringSchema> | undefined;
      let lastScoringError: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const scoringResult = await scorer.invoke(messages);
          out = scoringSchema.parse(scoringResult);
          break;
        } catch (err) {
          lastScoringError = err;
          console.warn(`[ScoringReportingAgent] Parse failure on attempt ${attempt}:`, err);
          if (attempt === 3) throw lastScoringError;
        }
      }

      if (!out) throw lastScoringError;

      const runtimeArtifacts = flattenRuntimeArtifacts(state.runtime);
      const phaseRefs = state.phase_results.flatMap((p) => p.contract.evidence_refs);
      const sensitiveCtx = `trace:${state.run_id};commit:${state.commit_sha ?? "unknown"}`;

      // Build scored criteria with clamped raw_score and recomputed weighted_score.
      const scoredCriteria = out.criteria_scores.map((score) => {
        const rubricItem = state.challenge.rubric.find((c) => c.id === score.criterion_id);
        const rubricMax = rubricItem?.max_score ?? 100;
        const rubricWeight = rubricItem?.weight ?? 1;
        const clampedRaw = Math.min(rubricMax, Math.max(0, score.raw_score));
        const recomputedWeighted = Number((clampedRaw * rubricWeight).toFixed(2));
        return {
          criterion_id: score.criterion_id,
          criterion_title: rubricItem?.title ?? score.criterion_id,
          weight: rubricWeight,
          max_score: rubricMax,
          raw_score: clampedRaw,
          weighted_score: recomputedWeighted,
          findings: score.findings,
          sensitive_context: sensitiveCtx,
          evidence_refs: [
            ...phaseRefs.slice(0, 8),
            ...runtimeArtifacts.slice(0, 6),
            `criterion:${score.criterion_id}`,
          ],
          metrics: {
            runtime_failures: runtimeFailures,
            llm_confidence: state.llm_analysis?.confidence ?? 0,
          },
        };
      });

      // Zero-fill any rubric criteria the LLM silently omitted.
      const scoredIds = new Set(scoredCriteria.map((c) => c.criterion_id));
      const zeroFilledCriteria = state.challenge.rubric
        .filter((r) => !scoredIds.has(r.id))
        .map((r) => ({
          criterion_id: r.id,
          criterion_title: r.title,
          weight: r.weight,
          max_score: r.max_score,
          raw_score: 0,
          weighted_score: 0,
          findings: ["Criterion not scored by LLM; defaulting to zero."],
          sensitive_context: sensitiveCtx,
          evidence_refs: [`criterion:${r.id}:zero-filled`],
          metrics: {
            runtime_failures: runtimeFailures,
            llm_confidence: state.llm_analysis?.confidence ?? 0,
            zero_filled: true,
          },
        }));

      const allCriteria = [...scoredCriteria, ...zeroFilledCriteria];

      // Recompute aggregate from criteria — do not trust the LLM's reported total.
      const aggregateScore = Number(
        allCriteria.reduce((sum, c) => sum + c.weighted_score, 0).toFixed(2),
      );

      const evidence: EvaluationEvidence = {
        id: `evidence-${randomUUID()}`,
        submission_id: state.submission.id,
        challenge_id: state.challenge.id,
        criteria: allCriteria,
        aggregate_score: aggregateScore,
        created_at: nowIso(),
        project_type: state.llm_analysis.project_type,
        runtime_path: state.llm_analysis.runtime_path,
        phase_results: state.phase_results,
        runtime_artifacts: runtimeArtifacts,
        runtime: state.runtime ?? undefined,
      };

      const report = buildReport(evidence);

      return {
        contract: makeContract(
          "success",
          "Scoring and evaluator/builder reports generated from evidence.",
          [
            `report:submission:${state.submission.id}`,
            ...(evidence.runtime_artifacts ?? []),
          ],
          {
            ai_score: aggregateScore,
            criteria_count: allCriteria.length,
            zero_filled_count: zeroFilledCriteria.length,
            runtime_failures: runtimeFailures,
          },
          "Proceed to cleanup.",
        ),
        update: {
          evidence,
          report,
        },
      };
    }),
  {
    name: "ScoringReportingAgent",
    run_type: "chain",
  },
);

const cleanupAgent = traceable(
  async (state: typeof EvaluationState.State): Promise<Partial<EvaluationStateType>> =>
    executeAgent(state, "CleanupAgent", async () => {
      const sandbox = sandboxRegistry.get(state.run_id);
      sandboxRegistry.delete(state.run_id);

      if (!sandbox) {
        return {
          contract: makeContract(
            "skipped",
            "No sandbox found for cleanup.",
            [],
            {
              sandbox_present: false,
            },
          ),
          update: {},
        };
      }

      const daytona = createDaytonaClient();

      try {
        await daytona.delete(sandbox, 30);

        return {
          contract: makeContract(
            "success",
            "Sandbox cleanup completed.",
            state.sandbox_id ? [`sandbox:${state.sandbox_id}:deleted`] : [],
            {
              sandbox_present: true,
            },
          ),
          update: {},
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Sandbox cleanup failed with unknown error.";

        return {
          contract: makeContract(
            "failed",
            message,
            state.sandbox_id ? [`sandbox:${state.sandbox_id}:cleanup-failed`] : [],
            {
              sandbox_present: true,
            },
          ),
          update: {
            failure_reason: state.failure_reason ?? message,
          },
        };
      }
    }),
  {
    name: "CleanupAgent",
    run_type: "chain",
  },
);

function routeTo(nextNode: string) {
  return (state: typeof EvaluationState.State) =>
    state.should_stop ? "CleanupAgent" : nextNode;
}

const evaluationGraph = new StateGraph(EvaluationState)
  .addNode("IntakeValidationAgent", (s) => intakeValidationAgent(s))
  .addNode("SandboxSetupAgent", (s) => sandboxSetupAgent(s))
  .addNode("AnalysisPlanningAgent", (s) => analysisPlanningAgent(s))
  .addNode("UnitTestExecutionAgent", (s) => unitTestExecutionAgent(s))
  .addNode("RuntimeExecutionAgent", (s) => runtimeExecutionAgent(s))
  .addNode("ScoringReportingAgent", (s) => scoringReportingAgent(s))
  .addNode("CleanupAgent", (s) => cleanupAgent(s))
  .addEdge(START, "IntakeValidationAgent")
  .addConditionalEdges("IntakeValidationAgent", routeTo("SandboxSetupAgent"), [
    "SandboxSetupAgent",
    "CleanupAgent",
  ])
  .addConditionalEdges("SandboxSetupAgent", routeTo("AnalysisPlanningAgent"), [
    "AnalysisPlanningAgent",
    "CleanupAgent",
  ])
  .addConditionalEdges("AnalysisPlanningAgent", routeTo("UnitTestExecutionAgent"), [
    "UnitTestExecutionAgent",
    "CleanupAgent",
  ])
  .addConditionalEdges("UnitTestExecutionAgent", routeTo("RuntimeExecutionAgent"), [
    "RuntimeExecutionAgent",
    "CleanupAgent",
  ])
  .addConditionalEdges("RuntimeExecutionAgent", routeTo("ScoringReportingAgent"), [
    "ScoringReportingAgent",
    "CleanupAgent",
  ])
  .addEdge("ScoringReportingAgent", "CleanupAgent")
  .addEdge("CleanupAgent", END)
  .compile({ name: "epic3-course-corrected-graph" });

const tracedEvaluationRun = traceable(
  async (
    submission: Submission,
    challenge: Challenge,
  ): Promise<CourseCorrectedEvaluationResult> => {
    const initialState: EvaluationStateType = {
      run_id: randomUUID(),
      submission,
      challenge,
      intake_input: null,
      sandbox_id: null,
      commit_sha: null,
      llm_analysis: null,
      unit_test_result: null,
      runtime: null,
      evidence: null,
      report: null,
      phase_results: [],
      failure_reason: null,
      should_stop: false,
    };

    const finalState = await evaluationGraph.invoke(initialState);

    if (!finalState.evidence || !finalState.report) {
      throw new Error(
        finalState.failure_reason ??
          "Evaluation graph finished without scoring/report outputs.",
      );
    }

    return {
      evidence: finalState.evidence,
      report: finalState.report,
      phase_results: finalState.phase_results,
      project_type: finalState.evidence.project_type ?? "unknown",
      runtime_path: finalState.evidence.runtime_path ?? "unknown",
    };
  },
  {
    name: "Epic3CourseCorrectedEvaluation",
    run_type: "chain",
  },
);

/** Compiled evaluation graph — exported for streaming in smoke tests / observability. */
export { evaluationGraph };

/** Build the initial state for a fresh evaluation run. */
export function buildEvaluationInitialState(
  submission: Submission,
  challenge: Challenge,
): EvaluationStateType {
  return {
    run_id: randomUUID(),
    submission,
    challenge,
    intake_input: null,
    sandbox_id: null,
    commit_sha: null,
    llm_analysis: null,
    unit_test_result: null,
    runtime: null,
    evidence: null,
    report: null,
    phase_results: [],
    failure_reason: null,
    should_stop: false,
  };
}

export async function runCourseCorrectedEvaluation(
  submission: Submission,
  challenge: Challenge,
): Promise<CourseCorrectedEvaluationResult> {
  return tracedEvaluationRun(submission, challenge);
}
