import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AzureChatOpenAI } from "@langchain/openai";
import { traceable } from "langsmith/traceable";
import { z } from "zod";

export const llmProjectAnalysisSchema = z.object({
  project_type: z.enum(["frontend", "backend", "fullstack", "unknown"]),
  project_kind: z.enum([
    "web_app",
    "api_service",
    "library",
    "cli",
    "monorepo",
    "unknown",
  ]),
  runtime_path: z.enum([
    "frontend/fullstack-ui",
    "backend/api",
    "both",
    "unknown",
  ]),
  primary_language: z.string().min(1),
  frameworks: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  reasoning: z.array(z.string()).min(1),
  evidence_files: z.array(z.string()).min(1),
  recommended_unit_test_command: z.string().min(1),
  alternate_unit_test_commands: z.array(z.string()).default([]),
  test_quality_observations: z.array(z.string()).default([]),
});

export type LlmProjectAnalysis = z.infer<typeof llmProjectAnalysisSchema>;

export type RepoContextForLLM = {
  repo_url: string;
  rubric_id: string;
  branch: string | null;
  total_files: number;
  file_list_sample: string[];
  key_files: Record<string, string>;
  signals: {
    package_manager: "npm" | "yarn" | "pnpm" | null;
    detected_languages: string[];
    has_frontend_signals: boolean;
    has_backend_signals: boolean;
  };
};

function trimContext(input: RepoContextForLLM): RepoContextForLLM {
  const keyFiles: Record<string, string> = {};
  let budget = 60_000;

  for (const [file, content] of Object.entries(input.key_files)) {
    if (budget <= 0) break;
    const slice = content.slice(0, Math.min(content.length, 6_000, budget));
    keyFiles[file] = slice;
    budget -= slice.length;
  }

  return {
    ...input,
    file_list_sample: input.file_list_sample.slice(0, 400),
    key_files: keyFiles,
  };
}

const tracedAnalyzeProject = traceable(
  async (context: RepoContextForLLM): Promise<LlmProjectAnalysis> => {
    const model = createAzureChatModelFromEnv();
    const runnable = model.withStructuredOutput(llmProjectAnalysisSchema, {
      name: "analysis_planning_output",
    });

    const response = await runnable.invoke([
      new SystemMessage(
        [
          "You are AnalysisPlanningAgent in a software evaluation graph.",
          "Use only repository evidence to infer project_type and runtime_path.",
          "Allowed runtime_path values: frontend/fullstack-ui, backend/api, both, unknown.",
          "Return strict JSON matching the schema.",
          "recommended_unit_test_command must be an executable shell command for this repo.",
        ].join(" "),
      ),
      new HumanMessage(
        `Analyze this repository context and produce strict JSON:\n${JSON.stringify(context)}`,
      ),
    ]);

    return llmProjectAnalysisSchema.parse(response);
  },
  {
    name: "AnalysisPlanningAgentLLM",
    run_type: "llm",
  },
);

export async function analyzeProjectWithLLM(
  rawContext: RepoContextForLLM,
): Promise<LlmProjectAnalysis> {
  const context = trimContext(rawContext);
  return tracedAnalyzeProject(context);
}

export function createAzureChatModelFromEnv(): AzureChatOpenAI {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
  const deployment =
    process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ??
    process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
  const model = process.env.AZURE_OPENAI_CHAT_MODEL ?? deployment;

  if (!apiKey) {
    throw new Error(
      "AZURE_OPENAI_API_KEY is required for LLM-based analysis planning.",
    );
  }

  if (!endpoint) {
    throw new Error(
      "AZURE_OPENAI_ENDPOINT is required for LLM-based analysis planning.",
    );
  }

  if (!apiVersion) {
    throw new Error(
      "AZURE_OPENAI_API_VERSION is required for LLM-based analysis planning.",
    );
  }

  if (!deployment) {
    throw new Error(
      "AZURE_OPENAI_CHAT_DEPLOYMENT (or AZURE_OPENAI_API_DEPLOYMENT_NAME) is required for LLM-based analysis planning.",
    );
  }

  return new AzureChatOpenAI({
    azureOpenAIApiKey: apiKey,
    azureOpenAIEndpoint: endpoint,
    azureOpenAIApiVersion: apiVersion,
    azureOpenAIApiDeploymentName: deployment,
    model,
  });
}
