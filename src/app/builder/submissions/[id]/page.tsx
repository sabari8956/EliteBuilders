"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { btnTap, fadeIn, listContainer, listItem, pageIn } from "../../../components/animations";

type SubmissionRecord = {
  id: string; challengeId: string; snapshotRef: string;
  status: string; createdAt: string; updatedAt: string;
};
type EvalPayload = {
  submission: {
    id: string; state: string;
    ai_score: number | null; final_score: number | null; human_score: number | null;
    finalized_at: string | null; finalization_notes: string | null;
  };
  report: { evaluator_report: string; builder_report: string } | null;
};
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "chip-neutral" },
  running: { label: "Evaluating", cls: "chip-purple" },
  ai_scored: { label: "AI Scored", cls: "chip-blue" },
  awaiting_human_review: { label: "Awaiting Review", cls: "chip-warning" },
  finalized: { label: "Finalized", cls: "chip-success" },
  failed: { label: "Failed", cls: "chip-danger" },
  disqualified: { label: "Disqualified", cls: "chip-danger" },
};

const FINAL_STATES = new Set(["finalized", "failed", "disqualified", "awaiting_human_review"]);

const STATE_DESCRIPTION: Record<string, string> = {
  queued: "Submission is in the queue — evaluation will start shortly.",
  running: "AI agents are cloning the repo, running tests, and analysing the code…",
  ai_scored: "AI evaluation complete. Waiting for human review to finalise.",
  awaiting_human_review: "AI evaluation complete. Waiting for human review to finalise.",
  finalized: "Evaluation finalised. Scores are locked.",
  failed: "Evaluation failed. Check the error details below.",
  disqualified: "Submission was disqualified.",
};

function PulsingDot() {
  return (
    <motion.span
      style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--c-purple)", marginRight: "0.5rem" }}
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
    />
  );
}

export default function BuilderSubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [submissionId, setSubmissionId] = useState("");
  const [submission, setSubmission] = useState<SubmissionRecord | null>(null);
  const [evalData, setEvalData] = useState<EvalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startMsg, setStartMsg] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [workerTriggered, setWorkerTriggered] = useState(false);

  const load = useCallback(async (id: string) => {
    const [subRes, evalRes] = await Promise.all([
      fetch(`/api/submissions/${id}`),
      fetch(`/api/epic3/submissions/${id}`),
    ]);
    const subPayload = (await subRes.json()) as ApiEnvelope<SubmissionRecord>;
    if (!subRes.ok || subPayload.error || !subPayload.data) {
      setError(subPayload.error?.message ?? "Unable to load submission.");
      setLoading(false); return;
    }
    setSubmission(subPayload.data);
    if (evalRes.ok) {
      const evalPayload = (await evalRes.json()) as ApiEnvelope<EvalPayload>;
      if (evalPayload.data) setEvalData(evalPayload.data);
    }
    setLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    params.then((r) => { setSubmissionId(r.id); void load(r.id); });
  }, [params, load]);

  // Auto-trigger the worker when the submission is queued and nothing is running yet.
  // This is needed because fire-and-forget runWorkerOnce() in request handlers gets
  // killed by Next.js as soon as the HTTP response is sent.
  useEffect(() => {
    if (!submissionId || loading || workerTriggered) return;
    const evalState = evalData?.submission.state ?? null;
    const platformStatus = submission?.status ?? null;
    const isQueued = (evalState === "queued" || evalState === null) &&
      (platformStatus === "queued" || platformStatus === "submitted");
    if (!isQueued) return;

    setWorkerTriggered(true);
    void fetch("/api/epic3/worker/run-once", { method: "POST" })
      .then(() => load(submissionId))
      .then(() => setPollCount((n) => n + 1))
      .catch((err) => console.error("[Worker auto-trigger]", err));
  }, [submissionId, submission, evalData, loading, workerTriggered, load]);

  // Auto-poll every 4s while evaluation is in progress
  useEffect(() => {
    if (!submissionId || loading) return;
    const evalState = evalData?.submission.state ?? null;
    const platformStatus = submission?.status ?? null;
    // Stop polling once we reach a terminal state in either store
    const isDone = evalState
      ? FINAL_STATES.has(evalState)
      : platformStatus
        ? FINAL_STATES.has(platformStatus)
        : false;
    if (isDone) return;

    const timer = setTimeout(() => {
      void load(submissionId).then(() => setPollCount((n) => n + 1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [submissionId, submission, evalData, loading, pollCount, load]);

  async function startEvaluation() {
    setStarting(true); setStartMsg(null); setWorkerTriggered(true);
    // POST directly to the worker endpoint — it properly awaits the full evaluation run.
    // The /evaluate route uses fire-and-forget which gets killed when Next.js closes the request.
    const res = await fetch("/api/epic3/worker/run-once", { method: "POST" });
    const json = (await res.json()) as ApiEnvelope<{ status: string; message: string }>;
    if (!res.ok || json.error) {
      setStartMsg(`Error: ${json.error?.message ?? "Failed to start evaluation."}`);
      setWorkerTriggered(false); // allow retry
    } else {
      setStartMsg(json.data?.status === "idle" ? "No queued jobs found." : "Evaluation started.");
      void load(submissionId).then(() => setPollCount((n) => n + 1));
    }
    setStarting(false);
  }

  const evalState = evalData?.submission.state ?? null;
  // Use Epic3 eval state as the primary chip when available — it's the live source of truth.
  // Fall back to platform status only when no eval data has loaded yet.
  const activeStatus = evalState ?? submission?.status ?? null;
  const chip = activeStatus ? (STATUS_CHIP[activeStatus] ?? { label: activeStatus, cls: "chip-neutral" }) : null;
  const isRunning = evalState === "running" || (evalState === null && submission?.status === "running");
  // Show manual start only when eval data is absent AND the platform record isn't already running/done
  const needsManualStart = submission && !evalData && ["queued", "submitted", "draft"].includes(submission.status);
  const isDone = evalState ? FINAL_STATES.has(evalState) : submission ? FINAL_STATES.has(submission.status) : false;

  return (
    <motion.main className="site-shell" {...pageIn}>
      <div style={{ marginBottom: "0.5rem" }}>
        <motion.div {...btnTap} style={{ display: "inline-block" }}>
          <Link className="btn btn-ghost" href="/builder/dashboard" style={{ padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>
            ← Dashboard
          </Link>
        </motion.div>
      </div>

      {loading ? <p style={{ color: "var(--ink-3)" }}>Loading…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && submission ? (
        <div style={{ display: "grid", gap: "1.25rem" }}>

          {/* Header */}
          <motion.div variants={fadeIn} initial="hidden" animate="show" style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
              {chip ? <span className={`chip ${chip.cls}`}>{chip.label}</span> : null}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                {submission.challengeId}
              </span>
              {!isDone && (evalData || isRunning) ? (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--ink-3)" }}>
                  · auto-refreshing
                </span>
              ) : null}
            </div>
            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>Submission Details</h1>
          </motion.div>

          {/* Live status banner */}
          <AnimatePresence>
            {evalState && !isDone ? (
              <motion.div
                key={evalState}
                className="panel"
                style={{ padding: "1rem 1.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isRunning ? <PulsingDot /> : null}
                <p style={{ fontSize: "0.875rem", color: "var(--ink-2)", maxWidth: "none" }}>
                  {STATE_DESCRIPTION[evalState] ?? `Current state: ${evalState}`}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Meta grid */}
          <motion.div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}
            variants={listContainer} initial="hidden" animate="show"
          >
            {[
              { label: "Submission ID", value: <code style={{ fontSize: "0.78rem" }}>{submission.id}</code> },
              { label: "Repository", value: <code style={{ fontSize: "0.78rem" }}>{submission.snapshotRef}</code> },
              { label: "Submitted", value: new Date(submission.createdAt).toLocaleString() },
              { label: "Last Updated", value: new Date(submission.updatedAt).toLocaleString() },
            ].map((row) => (
              <motion.div key={row.label} variants={listItem} className="panel" style={{ padding: "1rem 1.25rem", borderRadius: 0 }}>
                <p className="stat-label">{row.label}</p>
                <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "var(--ink)" }}>{row.value}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Scores */}
          {evalData ? (
            <motion.div
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}
              variants={listContainer} initial="hidden" animate="show"
            >
              {[
                { label: "AI Score", value: evalData.submission.ai_score ?? "—" },
                { label: "Human Score", value: evalData.submission.human_score ?? "—" },
                { label: "Final Score", value: evalData.submission.final_score ?? "—" },
              ].map((s) => (
                <motion.div key={s.label} variants={listItem} className="panel" style={{ padding: "1.25rem 1.5rem", borderRadius: 0, textAlign: "center" }}>
                  <p className="stat-number" style={{ color: s.value === "—" ? "var(--ink-3)" : "var(--ink)" }}>{s.value}</p>
                  <p className="stat-label">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : needsManualStart ? (
            <motion.div
              className="panel"
              style={{ padding: "1.5rem", display: "grid", gap: "0.85rem" }}
              variants={fadeIn} initial="hidden" animate="show"
            >
              <p style={{ fontSize: "0.875rem", color: "var(--ink-2)" }}>
                AI evaluation has not started yet for this submission.
              </p>
              {startMsg ? <p style={{ fontSize: "0.82rem", color: "var(--ink-3)" }}>{startMsg}</p> : null}
              <motion.button
                {...btnTap}
                className="btn btn-primary"
                type="button"
                onClick={() => void startEvaluation()}
                disabled={starting}
                style={{ justifySelf: "start" }}
              >
                {starting ? "Starting…" : "Start Evaluation Now"}
              </motion.button>
            </motion.div>
          ) : null}

          {/* Feedback report */}
          {evalData?.report ? (
            <motion.div
              className="panel"
              style={{ padding: "1.75rem", display: "grid", gap: "1rem" }}
              variants={fadeIn} initial="hidden" animate="show"
            >
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                Evaluator Feedback
              </p>
              <pre>{evalData.report.builder_report}</pre>
            </motion.div>
          ) : null}

        </div>
      ) : null}
    </motion.main>
  );
}
