import { afterEach, describe, expect, it } from "vitest";
import {
  createAzureChatModelFromEnv,
  llmProjectAnalysisSchema,
} from "@/features/evaluation/llm-analysis";

describe("llm analysis", () => {
  afterEach(() => {
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_VERSION;
    delete process.env.AZURE_OPENAI_CHAT_DEPLOYMENT;
    delete process.env.AZURE_OPENAI_CHAT_MODEL;
  });

  it("llmProjectAnalysisSchema parses a valid analysis payload", () => {
    const result = llmProjectAnalysisSchema.parse({
      project_type: "fullstack",
      project_kind: "web_app",
      runtime_path: "both",
      primary_language: "typescript",
      frameworks: ["next.js"],
      confidence: 0.92,
      reasoning: ["Next.js app with API routes and frontend pages."],
      evidence_files: ["package.json", "src/app/page.tsx"],
      recommended_unit_test_command: "npm test -- --watch=false",
      alternate_unit_test_commands: ["pnpm test -- --watch=false"],
      test_quality_observations: ["Unit tests exist but integration coverage is unclear."],
    });

    expect(result.project_type).toBe("fullstack");
    expect(result.runtime_path).toBe("both");
    expect(result.recommended_unit_test_command).toContain("npm test");
  });

  it("llmProjectAnalysisSchema applies defaults for optional array fields", () => {
    const result = llmProjectAnalysisSchema.parse({
      project_type: "backend",
      project_kind: "api_service",
      runtime_path: "backend/api",
      primary_language: "go",
      confidence: 0.8,
      reasoning: ["Go service."],
      evidence_files: ["go.mod"],
      recommended_unit_test_command: "go test ./...",
    });

    expect(result.frameworks).toEqual([]);
    expect(result.alternate_unit_test_commands).toEqual([]);
    expect(result.test_quality_observations).toEqual([]);
  });

  it("createAzureChatModelFromEnv throws when AZURE_OPENAI_API_KEY is missing", () => {
    process.env.AZURE_OPENAI_ENDPOINT = "https://example.openai.azure.com";
    process.env.AZURE_OPENAI_API_VERSION = "2024-05-01-preview";
    process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = "gpt-5-chat";

    expect(() => createAzureChatModelFromEnv()).toThrow("AZURE_OPENAI_API_KEY");
  });

  it("createAzureChatModelFromEnv throws when AZURE_OPENAI_ENDPOINT is missing", () => {
    process.env.AZURE_OPENAI_API_KEY = "test-key";
    process.env.AZURE_OPENAI_API_VERSION = "2024-05-01-preview";
    process.env.AZURE_OPENAI_CHAT_DEPLOYMENT = "gpt-5-chat";

    expect(() => createAzureChatModelFromEnv()).toThrow("AZURE_OPENAI_ENDPOINT");
  });
});
