"use client";

import { useState } from "react";

type ApiEnvelope<T> = {
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
};

type WorkerSnapshot = {
  runtime_mode: "daytona";
  jobs: {
    id: string;
    submission_id: string;
    status: string;
    attempt: number;
    max_attempts: number;
    last_error: string | null;
    next_retry_at: string | null;
  }[];
  submissions: {
    id: string;
    state: string;
    ai_score: number | null;
    updated_at: string;
  }[];
};

type WorkerRunResult = {
  status: "processed" | "idle";
  submission_id?: string;
  job_id?: string;
  ai_score?: number;
  message: string;
};

export default function Epic3WorkerPage() {
  const [result, setResult] = useState<WorkerRunResult | null>(null);
  const [snapshot, setSnapshot] = useState<WorkerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runOnce() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/epic3/worker/run-once", { method: "POST" });
      const json = (await response.json()) as ApiEnvelope<WorkerRunResult>;
      if (json.error || !json.data) {
        throw new Error(json.error?.message ?? "Worker run failed");
      }

      setResult(json.data);
      await loadSnapshot();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Worker run failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadSnapshot() {
    const response = await fetch("/api/epic3/worker/snapshot");
    const json = (await response.json()) as ApiEnvelope<WorkerSnapshot>;

    if (json.error || !json.data) {
      throw new Error(json.error?.message ?? "Snapshot read failed");
    }

    setSnapshot(json.data);
  }

  return (
    <main className="site-shell">
      <section className="panel hero">
        <div className="tagline">Epic 3 Worker</div>
        <h1>Queue Worker Console</h1>
        <p>
          Trigger one lease cycle manually to keep Epic 3 isolated from the rest of
          the app during implementation.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={runOnce} disabled={loading}>
            {loading ? "Running..." : "Run Worker Once"}
          </button>
          <button className="btn btn-ghost" onClick={loadSnapshot} disabled={loading}>
            Refresh Snapshot
          </button>
        </div>

        {result ? (
          <pre className="panel" style={{ padding: "1rem", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}

        {error ? (
          <p style={{ color: "#7f1d1d", fontWeight: 700 }}>Error: {error}</p>
        ) : null}
      </section>

      {snapshot ? (
        <section className="panel" style={{ padding: "1.5rem", display: "grid", gap: "0.8rem" }}>
          <h2>Worker Snapshot</h2>
          <p>
            Runtime mode: <strong>{snapshot.runtime_mode}</strong>
          </p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(snapshot, null, 2)}</pre>
        </section>
      ) : null}
    </main>
  );
}
