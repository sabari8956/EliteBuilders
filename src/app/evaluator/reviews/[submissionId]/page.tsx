"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { btnTap, fadeIn, pageIn, slideUp } from "../../../components/animations";

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string; details?: unknown } | null };
type SubmissionPayload = {
    submission: {
        id: string;
        state: string;
        ai_score: number | null;
        final_score: number | null;
        human_score: number | null;
        finalized_at: string | null;
        finalization_notes: string | null;
        builder_id: string;
        challenge_id: string;
    };
    report: { evaluator_report: string; builder_report: string } | null;
    screenshot_base64: string | null;
    preview_url: string | null;
};

export default function EvaluatorReviewPage({ params }: { params: Promise<{ submissionId: string }> }) {
    const [submissionId, setSubmissionId] = useState<string>("");
    const [payload, setPayload] = useState<SubmissionPayload | null>(null);
    const [humanScore, setHumanScore] = useState(85);
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async (id: string) => {
        setError(null);
        const response = await fetch(`/api/epic3/submissions/${id}`);
        const json = (await response.json()) as ApiEnvelope<SubmissionPayload>;
        if (json.error || !json.data) { setError(json.error?.message ?? "Failed to load submission."); return; }
        setPayload(json.data);
    }, []);

    useEffect(() => {
        params.then((v) => { setSubmissionId(v.submissionId); void load(v.submissionId); });
    }, [params, load]);

    async function submitFinalization(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setStatus("Submitting…");
        setSubmitting(true);

        // POST to production route — evaluator_id comes from server-side session
        const response = await fetch(`/api/submissions/${submissionId}/finalize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ human_score: humanScore, notes }),
        });

        const json = (await response.json()) as ApiEnvelope<{ finalScore: number }>;
        setSubmitting(false);

        if (json.error) {
            setError(json.error.message);
            setStatus(null);
            return;
        }

        setStatus(`Finalized. Final score: ${json.data?.finalScore ?? "—"}`);
        await load(submissionId);
    }

    const isFinalized = Boolean(payload?.submission.finalized_at);

    return (
        <motion.main className="site-shell" {...pageIn}>

            <div className="page-header">
                <div className="page-header-meta">
                    <span className="tagline" style={{ marginBottom: "0.6rem" }}>Evaluator Review</span>
                    <h1>Finalization Console</h1>
                    <p style={{ marginTop: "0.3rem" }}>Review the AI report, enter a human score, and finalize with 80/20 weighting.</p>
                </div>
                <motion.div {...btnTap} style={{ alignSelf: "center" }}>
                    <Link className="btn btn-ghost" href="/evaluator" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>
                        ← Queue
                    </Link>
                </motion.div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", alignItems: "start" }}>

                {/* Score summary + AI report */}
                <div style={{ display: "grid", gap: "1.25rem" }}>
                    {payload ? (
                        <motion.div
                            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}
                            variants={fadeIn} initial="hidden" animate="show"
                        >
                            {[
                                { label: "AI Score", value: payload.submission.ai_score ?? "—" },
                                { label: "Human Score", value: payload.submission.human_score ?? "—" },
                                { label: "Final Score", value: payload.submission.final_score ?? "—" },
                            ].map((s) => (
                                <div key={s.label} className="panel" style={{ padding: "1.25rem", borderRadius: 0, textAlign: "center" }}>
                                    <p className="stat-number">{s.value}</p>
                                    <p className="stat-label">{s.label}</p>
                                </div>
                            ))}
                        </motion.div>
                    ) : null}

                    {payload?.report ? (
                        <motion.div className="panel" style={{ padding: "1.75rem", display: "grid", gap: "0.85rem" }} variants={slideUp} initial="hidden" animate="show">
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                                AI Evaluator Report
                            </p>
                            <pre style={{ fontSize: "0.78rem" }}>{payload.report.evaluator_report}</pre>
                            <hr className="divider" />
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                                Builder Report (Redacted)
                            </p>
                            <pre style={{ fontSize: "0.78rem" }}>{payload.report.builder_report}</pre>
                        </motion.div>
                    ) : null}

                    {/* Runtime screenshot + preview URL */}
                    {(payload?.screenshot_base64 || payload?.preview_url) ? (
                        <motion.div className="panel" style={{ padding: "1.75rem", display: "grid", gap: "1rem" }} variants={slideUp} initial="hidden" animate="show">
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                                Runtime Artifacts
                            </p>
                            {payload.preview_url ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>Preview URL:</span>
                                    <a
                                        href={payload.preview_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: "0.8rem", color: "var(--c-purple)", wordBreak: "break-all" }}
                                    >
                                        {payload.preview_url}
                                    </a>
                                </div>
                            ) : null}
                            {payload.screenshot_base64 ? (
                                <div style={{ display: "grid", gap: "0.5rem" }}>
                                    <p style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>App Screenshot (captured during evaluation):</p>
                                    <img
                                        src={`data:image/jpeg;base64,${payload.screenshot_base64}`}
                                        alt="Runtime screenshot captured by evaluation agent"
                                        style={{
                                            width: "100%",
                                            maxWidth: 720,
                                            borderRadius: 10,
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            objectFit: "contain",
                                            background: "#000",
                                        }}
                                    />
                                </div>
                            ) : null}
                        </motion.div>
                    ) : null}

                    {!payload && !error ? (
                        <p style={{ color: "var(--ink-3)" }}>Loading submission…</p>
                    ) : null}

                    {error ? <p className="error-text">{error}</p> : null}
                </div>

                {/* Finalization form */}
                <motion.div className="panel" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }} variants={fadeIn} initial="hidden" animate="show">
                    <div>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.3rem" }}>
                            Submission
                        </p>
                        <code style={{ fontSize: "0.78rem" }}>{submissionId || "…"}</code>
                        {payload ? (
                            <>
                                <br />
                                <span
                                    className={`chip ${isFinalized ? "chip-success" : "chip-warning"}`}
                                    style={{ marginTop: "0.5rem" }}
                                >
                                    {payload.submission.state}
                                </span>
                            </>
                        ) : null}
                    </div>

                    {payload?.submission.finalization_notes ? (
                        <div>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.3rem" }}>
                                Finalization Notes
                            </p>
                            <p style={{ fontSize: "0.82rem", color: "var(--ink-2)" }}>{payload.submission.finalization_notes}</p>
                        </div>
                    ) : null}

                    <hr className="divider" />

                    {isFinalized ? (
                        <p style={{ fontSize: "0.85rem", color: "var(--ink-3)", textAlign: "center" }}>
                            This submission has been finalized. Audit fields are immutable.
                        </p>
                    ) : (
                        <form onSubmit={(e) => void submitFinalization(e)} style={{ display: "grid", gap: "0.85rem" }}>
                            <label>
                                Human Score (0–100)
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={humanScore}
                                    onChange={(e) => setHumanScore(Number(e.target.value))}
                                    disabled={submitting}
                                />
                            </label>
                            <label>
                                Notes
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Observations on the submission…"
                                    disabled={submitting}
                                />
                            </label>

                            <p style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>
                                Final score = 0.8 × AI score + 0.2 × human score
                            </p>

                            <AnimatePresence>
                                {status ? <motion.p key="s" variants={fadeIn} initial="hidden" animate="show" exit="hidden" style={{ fontSize: "0.82rem", color: "var(--ink-3)" }}>{status}</motion.p> : null}
                                {error ? <motion.p key="e" variants={fadeIn} initial="hidden" animate="show" exit="hidden" className="error-text">{error}</motion.p> : null}
                            </AnimatePresence>

                            <motion.button {...btnTap} className="btn btn-primary" type="submit" disabled={submitting}>
                                {submitting ? "Finalizing…" : "Finalize Submission"}
                            </motion.button>
                        </form>
                    )}
                </motion.div>

            </div>
        </motion.main>
    );
}
