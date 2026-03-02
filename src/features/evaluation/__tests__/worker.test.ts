import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const deleteMock = vi.fn();
const executeCommandMock = vi.fn();
const codeRunMock = vi.fn();

vi.mock("@daytonaio/sdk", () => {
  return {
    Daytona: vi.fn(function DaytonaMock() {
      return {
        create: createMock,
        delete: deleteMock,
      };
    }),
  };
});

vi.mock("@/features/evaluation/llm-analysis", () => {
  return {
    createAzureChatModelFromEnv: vi.fn(() => ({
      withStructuredOutput: vi.fn(() => ({
        invoke: vi.fn(async () => ({
          criteria_scores: [
            {
              criterion_id: "architecture",
              reasoning: "Clean modular structure.",
              raw_score: 80,
              weighted_score: 28,
              findings: ["Modular design detected."],
            },
            {
              criterion_id: "reliability",
              reasoning: "Error handling present.",
              raw_score: 75,
              weighted_score: 30,
              findings: ["Retry logic found."],
            },
            {
              criterion_id: "developer_experience",
              reasoning: "Tests and docs present.",
              raw_score: 70,
              weighted_score: 17.5,
              findings: ["README exists."],
            },
          ],
          aggregate_score: 75.5,
          overall_reasoning: "Solid implementation across all criteria.",
        })),
      })),
    })),
    llmProjectAnalysisSchema: { parse: (d: unknown) => d },
  };
});

vi.mock("@langchain/langgraph/prebuilt", () => {
  return {
    createReactAgent: vi.fn(() => ({
      invoke: vi.fn(async (input: { messages: Array<{ content: string }> }) => {
        const msg =
          typeof input.messages[0]?.content === "string" ? input.messages[0].content : "";

        if (msg.includes("Analyze repo")) {
          return {
            structuredResponse: {
              project_type: "backend",
              project_kind: "api_service",
              runtime_path: "backend/api",
              primary_language: "typescript",
              frameworks: ["next.js"],
              confidence: 0.88,
              reasoning: ["API-like repository with route files."],
              evidence_files: ["package.json", "src/app/api/health/route.ts"],
              recommended_unit_test_command: "npm test -- --watch=false",
              alternate_unit_test_commands: [],
              test_quality_observations: [],
            },
          };
        }

        if (msg.includes("Run unit tests")) {
          return {
            structuredResponse: {
              status: "passed",
              command_used: "npm test -- --watch=false",
              test_output_summary: "all tests passed",
              generated_test_file: null,
              installed_deps: true,
              exit_code: 0,
            },
          };
        }

        if (msg.includes("Run runtime checks")) {
          return {
            structuredResponse: {
              runtime_path: "backend/api",
              checks: [
                {
                  kind: "api",
                  status: "passed",
                  command: "curl http://localhost:3000/api/health",
                  output: "API health check passed.",
                  exit_code: 0,
                },
              ],
              preview_url: null,
              screenshot_taken: false,
              overall_passed: true,
              summary: "Backend API checks passed.",
            },
          };
        }

        return { structuredResponse: {} };
      }),
    })),
  };
});

async function setupIsolatedDb() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "epic3-worker-test-"));
  const file = path.join(dir, "db.json");
  process.env.EPIC3_DB_FILE = file;
  process.env.DAYTONA_API_URL = "https://app.daytona.io/api";
  process.env.DAYTONA_API_KEY = "test-key";

  return async () => {
    delete process.env.EPIC3_DB_FILE;
    delete process.env.DAYTONA_API_URL;
    delete process.env.DAYTONA_API_KEY;
    delete process.env.EPIC3_PLAYWRIGHT_COMMAND;
    delete process.env.EPIC3_API_CHECK_COMMAND;
    await rm(dir, { recursive: true, force: true });
  };
}

describe("epic3 worker with course-corrected graph", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("processes a submission immediately and persists ai_scored + report", async () => {
    const teardown = await setupIsolatedDb();

    try {
      createMock.mockResolvedValue({
        id: "sandbox-123",
        process: {
          executeCommand: executeCommandMock,
          codeRun: codeRunMock,
        },
      });

      deleteMock.mockResolvedValue(undefined);

      executeCommandMock.mockImplementation(async (command: string) => {
        if (command.startsWith("git clone")) {
          return { exitCode: 0, result: "cloned" };
        }

        if (command.includes("git rev-parse HEAD")) {
          return { exitCode: 0, result: "abc123\n" };
        }

        return { exitCode: 0, result: "ok" };
      });

      codeRunMock.mockResolvedValue({
        exitCode: 0,
        result: "{}",
        artifacts: undefined,
      });

      const { evaluateSubmission } = await import("@/features/evaluation/worker");
      const { getDatabase } = await import("@/features/evaluation/store");

      const result = await evaluateSubmission("submission-demo-001");
      expect(result.status).toBe("processed");
      expect(result.submission_id).toBe("submission-demo-001");
      expect(result.ai_score).toBeTypeOf("number");

      const db = await getDatabase();
      const submission = db.submissions.find((item) => item.id === "submission-demo-001");

      expect(submission?.state).toBe("awaiting_human_review");
      expect(submission?.ai_score).not.toBeNull();
      expect(db.reports.length).toBe(1);
      expect(db.reports[0]?.evidence.runtime_path).toBe("backend/api");
    } finally {
      await teardown();
    }
  });

  it("fails submission when graph setup fails", async () => {
    const teardown = await setupIsolatedDb();

    try {
      createMock.mockRejectedValue(new Error("daytona unavailable"));

      const { evaluateSubmission } = await import("@/features/evaluation/worker");
      const { getDatabase } = await import("@/features/evaluation/store");

      const result = await evaluateSubmission("submission-demo-001");
      expect(result.status).toBe("error");
      expect(result.message).toContain("daytona unavailable");

      const db = await getDatabase();
      const submission = db.submissions.find((item) => item.id === "submission-demo-001");

      expect(submission?.state).toBe("failed");
    } finally {
      await teardown();
    }
  });
});
