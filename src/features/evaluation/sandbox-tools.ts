import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { Daytona } from "@daytonaio/sdk";

type EvalSandbox = Awaited<ReturnType<Daytona["create"]>>;

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,
  /curl\s+.*\|\s*(sh|bash)/,
  /wget\s+.*\|\s*(sh|bash)/,
  /sudo\s+(rm|chmod|chown|dd)\s+\//,
];

function sanitizeSandboxPath(userPath: string): string {
  const normalized = userPath.replace(/^\.\/+/, "").replace(/\\/g, "/").replace(/\/+/g, "/");
  if (normalized.startsWith("/") || normalized.includes("../")) {
    throw new Error(`Path traversal detected: ${userPath}`);
  }
  return normalized;
}

export function makeSandboxTools(sandbox: EvalSandbox) {
  const bash = tool(
    async ({ command }) => {
      if (BLOCKED_PATTERNS.some((p) => p.test(command))) {
        return "BLOCKED: Command contains a dangerous pattern.";
      }
      const result = await sandbox.process.executeCommand(command, undefined, undefined, 180);
      const out = result.artifacts?.stdout ?? result.result;
      const truncated = out.length > 8000 ? out.slice(0, 8000) + "\n...[truncated]" : out;
      return `exit_code:${result.exitCode}\n${truncated}`;
    },
    {
      name: "bash",
      description: "Run a shell command in the Daytona sandbox. Repo is cloned at ./repo.",
      schema: z.object({
        command: z.string().min(1).max(1000).describe("Shell command to run"),
      }),
    },
  );

  const read_file = tool(
    async ({ path: userPath }) => {
      const safe = sanitizeSandboxPath(userPath);
      const script = `
const fs = require('fs'), path = require('path');
const full = path.join('repo', ${JSON.stringify(safe)});
if (!fs.existsSync(full)) { console.error('NOT_FOUND'); process.exit(1); }
process.stdout.write(fs.readFileSync(full, 'utf8').slice(0, 10000));
`;
      const result = await sandbox.process.codeRun(script, undefined, 30);
      if (result.exitCode !== 0) return `ERROR: file not found: ${safe}`;
      return result.artifacts?.stdout ?? result.result;
    },
    {
      name: "read_file",
      description: "Read a file from the cloned repo. Path relative to repo root.",
      schema: z.object({
        path: z.string().min(1).describe("Path relative to repo root"),
      }),
    },
  );

  const write_file = tool(
    async ({ path: userPath, content }) => {
      const safe = sanitizeSandboxPath(userPath);
      const encoded = Buffer.from(content, "utf8").toString("base64");
      const script = `
const fs = require('fs'), path = require('path');
const target = path.join('repo', ${JSON.stringify(safe)});
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, Buffer.from(${JSON.stringify(encoded)}, 'base64').toString('utf8'));
console.log('WRITTEN:' + ${JSON.stringify(safe)});
`;
      const result = await sandbox.process.codeRun(script, undefined, 30);
      if (result.exitCode !== 0) return `ERROR writing: ${result.result}`;
      return `SUCCESS: Written to repo/${safe}`;
    },
    {
      name: "write_file",
      description: "Write a file into the cloned repo. Path relative to repo root.",
      schema: z.object({
        path: z.string().min(1),
        content: z.string().describe("File content. No markdown code fences."),
      }),
    },
  );

  const list_files = tool(
    async ({ path: userPath }) => {
      const safe = userPath ? sanitizeSandboxPath(userPath) : "";
      const target = safe ? `repo/${safe}` : "repo";
      const result = await sandbox.process.executeCommand(
        `ls -la ${target}`,
        undefined,
        undefined,
        30,
      );
      const out = result.artifacts?.stdout ?? result.result;
      return out.length > 5000 ? out.slice(0, 5000) + "\n...[truncated]" : out;
    },
    {
      name: "list_files",
      description: "List directory contents in the repo. Default = repo root.",
      schema: z.object({
        path: z.string().optional().describe("Optional relative path"),
      }),
    },
  );

  const start_display = tool(
    async () => {
      try {
        const result = await sandbox.computerUse.start();
        return `SUCCESS: ${result.message ?? "X11 display initialized (Xvfb + XFCE4 + VNC)"}`;
      } catch (err) {
        return `ERROR starting display: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    {
      name: "start_display",
      description:
        "Initialize the X11 display server (Xvfb + XFCE4 + VNC) in the sandbox. " +
        "Call this before running any GUI or browser-based tools. Idempotent.",
      schema: z.object({}),
    },
  );

  const get_preview_url = tool(
    async ({ port }) => {
      try {
        const preview = await sandbox.getPreviewLink(port);
        const url = preview.url ?? "";
        const token = preview.token ?? "";
        return `url:${url}\ntoken:${token}\nNote: This is a public URL. Use token in Authorization header if the sandbox is private.`;
      } catch (err) {
        return `ERROR getting preview URL for port ${port}: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    {
      name: "get_preview_url",
      description:
        "Get a public preview URL for a port running inside the sandbox. " +
        "Use this after starting a server (e.g. npm start on port 3000) to get the external URL.",
      schema: z.object({
        port: z.number().int().min(1).max(65535).describe("Port the server is listening on"),
      }),
    },
  );

  const take_screenshot = tool(
    async () => {
      try {
        const result = await sandbox.computerUse.screenshot.takeCompressed({
          format: "jpeg",
          quality: 20,
          scale: 0.5,
        });
        const sizeKb = Math.round((result.sizeBytes ?? 0) / 1024);
        return `SUCCESS: Screenshot captured (${sizeKb}KB JPEG). The display is running and rendering content.`;
      } catch (err) {
        return `ERROR taking screenshot: ${err instanceof Error ? err.message : String(err)}. ` +
          `Make sure start_display was called first.`;
      }
    },
    {
      name: "take_screenshot",
      description:
        "Take a compressed screenshot of the sandbox display. " +
        "Use after start_display and after launching a browser or app to visually verify it is rendering. " +
        "Returns size in KB — non-zero size confirms the display is active.",
      schema: z.object({}),
    },
  );

  return { bash, read_file, write_file, list_files, start_display, get_preview_url, take_screenshot };
}
