"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { btnTap, fadeIn, pageIn, slideUp } from "../../components/animations";

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string; details?: unknown } | null };
type WorkerSnapshot = {
  runtime_mode: "daytona";
  active_evaluations: number;
  concurrency_limit: number;
  submissions: { id: string; state: string; ai_score: number | null; updated_at: string }[];
};
type WorkerRunResult = { status: "processed" | "error" | "busy"; submission_id?: string; ai_score?: number; message: string };

export default function Epic3WorkerPage() {
  const [result, setResult] = useState<WorkerRunResult | null>(null);
  const [snapshot, setSnapshot] = useState<WorkerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSnapshot() {
    const response = await fetch("/api/epic3/worker/snapshot");
    const json = (await response.json()) as ApiEnvelope<WorkerSnapshot>;
    if (json.error || !json.data) throw new Error(json.error?.message ?? "Snapshot read failed");
    setSnapshot(json.data);
  }

  async function runOnce() {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/epic3/worker/run-once", { method: "POST" });
      const json = (await response.json()) as ApiEnvelope<WorkerRunResult>;
      if (json.error || !json.data) throw new Error(json.error?.message ?? "Worker run failed");
      setResult(json.data);
      await loadSnapshot();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Worker run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.main className="site-shell" {...pageIn}>

      <div className="page-header">
        <div className="page-header-meta">
          <span className="tagline" style={{ marginBottom: "0.6rem" }}>Epic 3</span>
          <h1>Worker Console</h1>
          <p style={{ marginTop: "0.4rem" }}>Trigger one evaluation lease cycle manually.</p>
        </div>
        <motion.div {...btnTap} style={{ alignSelf: "center" }}>
          <Link className="btn btn-ghost" href="/epic3" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>
            ← Hub
          </Link>
        </motion.div>
      </div>

      <motion.div className="panel" style={{ padding: "1.75rem", display: "grid", gap: "1.1rem" }} variants={fadeIn} initial="hidden" animate="show">
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          <motion.button {...btnTap} className="btn btn-primary" type="button" onClick={() => void runOnce()} disabled={loading}>
            {loading ? "Running…" : "Run Worker Once"}
          </motion.button>
          <motion.button {...btnTap} className="btn btn-ghost" type="button" onClick={() => void loadSnapshot()} disabled={loading}>
            Refresh Snapshot
          </motion.button>
        </div>

        {error ? <p className="error-text">Error: {error}</p> : null}

        <AnimatePresence>
          {result ? (
            <motion.div variants={slideUp} initial="hidden" animate="show" exit="hidden">
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.5rem" }}>
                Last Run Result
              </p>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {snapshot ? (
          <motion.div className="panel" style={{ padding: "1.75rem", display: "grid", gap: "1rem" }} variants={slideUp} initial="hidden" animate="show" exit="hidden">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                Worker Snapshot
              </p>
              <span className="chip chip-neutral">{snapshot.runtime_mode}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", marginBottom: "0.5rem" }}>
              {[{ label: "Active", value: snapshot.active_evaluations }, { label: "Submissions", value: snapshot.submissions.length }].map((s) => (
                <div key={s.label} className="panel" style={{ padding: "0.75rem 1rem", borderRadius: 0 }}>
                  <p className="stat-number" style={{ fontSize: "1.5rem" }}>{s.value}</p>
                  <p className="stat-label">{s.label}</p>
                </div>
              ))}
            </div>
            <pre style={{ fontSize: "0.75rem" }}>{JSON.stringify(snapshot, null, 2)}</pre>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </motion.main>
  );
}
