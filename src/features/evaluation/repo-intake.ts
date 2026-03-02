import { Daytona } from "@daytonaio/sdk";
import { z } from "zod";
import {
  analyzeProjectWithLLM,
  type LlmProjectAnalysis,
  type RepoContextForLLM,
} from "@/features/evaluation/llm-analysis";

const createTimeoutSeconds = 60;
const commandTimeoutSeconds = 240;

const intakeSchema = z.object({
  repo_url: z.url().max(512),
  rubric_id: z.string().min(1).max(128),
  branch: z.string().min(1).max(128).optional(),
  env_vars: z.record(z.string().min(1).max(256), z.string().max(4096)).optional(),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

export function parseIntakeInput(rawInput: unknown): IntakeInput {
  return intakeSchema.parse(rawInput);
}

export type IntakeStepResult = {
  step: string;
  status: "success" | "failed" | "skipped";
  message: string;
};

export type UnitTestResult = {
  status: "passed" | "failed" | "skipped";
  command: string | null;
  output: string;
  exit_code: number | null;
};

export type RepoIntakeResult = {
  input: {
    repo_url: string;
    rubric_id: string;
    branch: string | null;
  };
  project_type: "frontend" | "backend" | "fullstack" | "unknown";
  llm_analysis: LlmProjectAnalysis;
  steps: IntakeStepResult[];
  analysis_context: RepoContextForLLM;
  unit_tests: UnitTestResult;
};

function sanitizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 63);
}

function escapeShell(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function compactOutput(output: string, max = 6000): string {
  return output.length <= max ? output : `${output.slice(0, max)}\n...[truncated]`;
}

function parseJsonFromCommandOutput(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    const lines = output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const candidate = lines[index];
      if (!candidate.startsWith("{") || !candidate.endsWith("}")) {
        continue;
      }

      try {
        return JSON.parse(candidate);
      } catch {
        // keep scanning older lines
      }
    }

    throw new Error(`Could not parse JSON from command output: ${compactOutput(output, 1200)}`);
  }
}

function isSafeTestCommand(command: string): boolean {
  const normalized = command.trim();
  if (normalized.length === 0 || normalized.length > 300) {
    return false;
  }

  const allowedPrefix = /^(npm|pnpm|yarn|bun|pytest|python -m pytest|go test|cargo test|mvn test|gradle test|dotnet test)/;
  if (!allowedPrefix.test(normalized)) {
    return false;
  }

  const blockedTokens = ["rm -rf", "curl ", "wget ", "| sh", "| bash", "sudo "];
  const lower = normalized.toLowerCase();
  return !blockedTokens.some((token) => lower.includes(token));
}

export function selectSafeUnitTestCommand(
  primary: string,
  alternates: string[],
): string | null {
  if (isSafeTestCommand(primary)) {
    return primary;
  }

  for (const candidate of alternates) {
    if (isSafeTestCommand(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function collectRepoContext(
  sandbox: Awaited<ReturnType<Daytona["create"]>>,
  input: IntakeInput,
): Promise<RepoContextForLLM> {
  const script = `
const fs = require('fs');
const path = require('path');
const root = 'repo';
const skipDirs = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage', '.turbo']);
const maxFiles = 1500;
const files = [];

function walk(dir) {
  if (files.length >= maxFiles) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (files.length >= maxFiles) return;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\\\/g, '/');

    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(full);
      continue;
    }

    files.push(rel);
  }
}

walk(root);

const keyCandidates = [
  'package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json',
  'tsconfig.json', 'next.config.js', 'next.config.ts', 'vite.config.ts', 'vite.config.js',
  'pyproject.toml', 'requirements.txt', 'go.mod', 'pom.xml',
  'README.md', 'Dockerfile', 'docker-compose.yml'
];

const keyFiles = {};
for (const file of keyCandidates) {
  const full = path.join(root, file);
  if (fs.existsSync(full) && fs.statSync(full).isFile()) {
    keyFiles[file] = fs.readFileSync(full, 'utf8').slice(0, 8000);
  }
}

const srcLike = files
  .filter((f) =>
    f.startsWith('src/') ||
    f.startsWith('app/') ||
    f.startsWith('server/') ||
    f.startsWith('api/') ||
    f.startsWith('services/') ||
    f.startsWith('packages/')
  )
  .slice(0, 60);
for (const file of srcLike) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;
  if (!/\.(ts|tsx|js|jsx|py|go|java|rs|md|json|yaml|yml)$/.test(file)) continue;
  keyFiles[file] = fs.readFileSync(full, 'utf8').slice(0, 2500);
}

const detectedLanguages = Array.from(new Set(files.map((f) => {
  const ext = path.extname(f).toLowerCase();
  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') return 'javascript/typescript';
  if (ext === '.py') return 'python';
  if (ext === '.go') return 'go';
  if (ext === '.java') return 'java';
  if (ext === '.rs') return 'rust';
  return null;
}).filter(Boolean)));

const hasPackageJson = files.includes('package.json');
const packageManager = files.includes('pnpm-lock.yaml')
  ? 'pnpm'
  : files.includes('yarn.lock')
    ? 'yarn'
    : hasPackageJson
      ? 'npm'
      : null;

const textBlob = Object.values(keyFiles).join('\\n').toLowerCase();
const hasFrontendSignals = /(react|next|vue|svelte|angular|tailwind|vite)/.test(textBlob);
const hasBackendSignals = /(express|fastify|koa|nestjs|hono|django|fastapi|flask|spring|gin|echo)/.test(textBlob);

console.log(JSON.stringify({
  repo_url: ${JSON.stringify(input.repo_url)},
  rubric_id: ${JSON.stringify(input.rubric_id)},
  branch: ${JSON.stringify(input.branch ?? null)},
  total_files: files.length,
  file_list_sample: files.slice(0, 500),
  key_files: keyFiles,
  signals: {
    package_manager: packageManager,
    detected_languages: detectedLanguages,
    has_frontend_signals: hasFrontendSignals,
    has_backend_signals: hasBackendSignals,
  },
}));
`;

  const result = await sandbox.process.codeRun(script, undefined, 60);
  if (result.exitCode !== 0) {
    throw new Error(`CollectRepoContext failed: ${result.result}`);
  }

  const payloadText = result.artifacts?.stdout ?? result.result;
  return parseJsonFromCommandOutput(payloadText) as RepoContextForLLM;
}

export async function runRepoIntake(rawInput: unknown): Promise<RepoIntakeResult> {
  const input = parseIntakeInput(rawInput);

  const apiKey = process.env.DAYTONA_API_KEY;
  const apiUrl = process.env.DAYTONA_API_URL;
  const target = process.env.DAYTONA_TARGET;
  const snapshot = process.env.DAYTONA_EVAL_SNAPSHOT;

  if (!apiKey || !apiUrl) {
    throw new Error("Daytona runtime requires DAYTONA_API_URL and DAYTONA_API_KEY.");
  }

  const daytona = new Daytona({ apiKey, apiUrl, target });

  const labels = {
    lane: "epic3-intake",
    rubric_id: sanitizeLabel(input.rubric_id),
  };

  const envVars = input.env_vars ?? {};
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

  const steps: IntakeStepResult[] = [
    { step: "ValidateInput", status: "success", message: "Input validated." },
  ];

  const sandbox = await daytona.create(createParams, { timeout: createTimeoutSeconds });

  try {
    steps.push({
      step: "CreateSandbox",
      status: "success",
      message: `Sandbox ${sandbox.id} created.`,
    });

    let cloneResult = await sandbox.process.executeCommand(
      `git clone --depth 1${input.branch ? ` --branch ${escapeShell(input.branch)}` : " --branch main"} ${escapeShell(input.repo_url)} repo`,
      undefined,
      undefined,
      120,
    );

    if (cloneResult.exitCode !== 0 && !input.branch) {
      cloneResult = await sandbox.process.executeCommand(
        `git clone --depth 1 --branch master ${escapeShell(input.repo_url)} repo`,
        undefined,
        undefined,
        120,
      );

      if (cloneResult.exitCode !== 0) {
        cloneResult = await sandbox.process.executeCommand(
          `git clone --depth 1 ${escapeShell(input.repo_url)} repo`,
          undefined,
          undefined,
          120,
        );
      }
    }

    if (cloneResult.exitCode !== 0) {
      steps.push({
        step: "CloneRepo",
        status: "failed",
        message: compactOutput(cloneResult.result),
      });
      throw new Error(`CloneRepo failed: ${compactOutput(cloneResult.result)}`);
    }

    steps.push({
      step: "CloneRepo",
      status: "success",
      message: "Repository cloned into sandbox.",
    });

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
console.log('ENV_WRITTEN');
`;
      await sandbox.process.codeRun(writeEnvScript, undefined, 15);
      steps.push({
        step: "InjectEnvVars",
        status: "success",
        message: `Injected ${Object.keys(envVars).length} env var(s) into repo/.env and repo/.env.local.`,
      });
    }

    const repoContext = await collectRepoContext(sandbox, input);

    steps.push({
      step: "AnalyzeCodebase",
      status: "success",
      message: `Collected context from ${repoContext.total_files} files.`,
    });

    const llmAnalysis = await analyzeProjectWithLLM(repoContext);

    steps.push({
      step: "LLMAnalyzeCodebase",
      status: "success",
      message: `LLM classified project as ${llmAnalysis.project_type} (${llmAnalysis.project_kind}).`,
    });

    const chosenCommand = selectSafeUnitTestCommand(
      llmAnalysis.recommended_unit_test_command,
      llmAnalysis.alternate_unit_test_commands,
    );

    let unitTests: UnitTestResult;

    if (!chosenCommand) {
      unitTests = {
        status: "skipped",
        command: null,
        output:
          "LLM did not provide a safe executable unit test command for sandbox execution.",
        exit_code: null,
      };

      steps.push({
        step: "RunUnitTests",
        status: "skipped",
        message: unitTests.output,
      });
    } else {
      const testResult = await sandbox.process.executeCommand(
        `cd repo && ${chosenCommand}`,
        undefined,
        undefined,
        commandTimeoutSeconds,
      );

      unitTests = {
        status: testResult.exitCode === 0 ? "passed" : "failed",
        command: chosenCommand,
        output: compactOutput(testResult.result),
        exit_code: testResult.exitCode,
      };

      steps.push({
        step: "RunUnitTests",
        status: testResult.exitCode === 0 ? "success" : "failed",
        message: unitTests.status === "passed" ? "Unit tests passed." : "Unit tests failed.",
      });
    }

    return {
      input: {
        repo_url: input.repo_url,
        rubric_id: input.rubric_id,
        branch: input.branch ?? null,
      },
      project_type: llmAnalysis.project_type,
      llm_analysis: llmAnalysis,
      steps,
      analysis_context: repoContext,
      unit_tests: unitTests,
    };
  } finally {
    await daytona
      .delete(sandbox, 30)
      .then(() => {
        steps.push({
          step: "CleanupSandbox",
          status: "success",
          message: "Sandbox cleanup completed.",
        });
      })
      .catch(() => {
        steps.push({
          step: "CleanupSandbox",
          status: "failed",
          message: "Sandbox cleanup failed.",
        });
      });
  }
}
