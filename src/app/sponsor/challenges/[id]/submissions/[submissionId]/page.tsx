"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { btnTap, fadeIn, pageIn, slideUp } from "../../../../../components/animations";

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

type Submission = {
    id: string; challengeId: string; builderId: string; snapshotRef: string;
    status: string; createdAt: string; updatedAt: string;
};

type SubmissionPayload = {
    submission: {
        id: string;
        state: string;
        ai_score: number | null;
        final_score: number | null;
        human_score: number | null;
        finalized_at: string | null;
        finalization_notes: string | null;
        timeline?: { state: string; at: string; message: string }[];
    };
    report: { evaluator_report: string; builder_report: string } | null;
    screenshot_base64: string | null;
    preview_url: string | null;
};

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
    queued: { label: "Queued", cls: "chip-neutral" },
    running: { label: "Evaluating", cls: "chip-purple" },
    ai_scored: { label: "AI Scored", cls: "chip-blue" },
    awaiting_human_review: { label: "Awaiting Review", cls: "chip-warning" },
    finalized: { label: "Finalized", cls: "chip-success" },
    failed: { label: "Failed", cls: "chip-danger" },
    disqualified: { label: "Disqualified", cls: "chip-danger" },
};

export default function SponsorSubmissionDetailPage({ params }: { params: Promise<{ id: string; submissionId: string }> }) {
    const [challengeId, setChallengeId] = useState("");
    const [submissionId, setSubmissionId] = useState("");
    const [platformSub, setPlatformSub] = useState<Submission | null>(null);
    const [evalData, setEvalData] = useState<SubmissionPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        params.then(async ({ id: cId, submissionId: sId }) => {
            setChallengeId(cId);
            setSubmissionId(sId);
            setLoading(true);
            setError(null);
            try {
                const [sListRes, evalRes] = await Promise.all([
                    fetch(`/api/challenges/${cId}/submissions`),
                    fetch(`/api/epic3/submissions/${sId}`),
                ]);

                if (sListRes.ok) {
                    const listPayload = (await sListRes.json()) as ApiEnvelope<{ items: Submission[] }>;
                    if (listPayload.data) {
                        const found = listPayload.data.items.find((s) => s.id === sId);
                        if (found) setPlatformSub(found);
                    }
                }

                if (evalRes.ok) {
                    const ePayload = (await evalRes.json()) as ApiEnvelope<SubmissionPayload>;
                    if (ePayload.data) setEvalData(ePayload.data);
                }
            } catch {
                setError("Unable to load submission details.");
            }
            setLoading(false);
        });
    }, [params]);

    const activeStatus = evalData?.submission.state ?? platformSub?.status ?? null;
    const chip = activeStatus ? (STATUS_CHIP[activeStatus] ?? { label: activeStatus, cls: "chip-neutral" }) : null;

    return (
        <motion.main className="site-shell" {...pageIn}>
            <div style={{ marginBottom: "0.5rem" }}>
                <motion.div {...btnTap} style={{ display: "inline-block" }}>
                    <Link className="btn btn-ghost" href={`/sponsor/challenges/${challengeId}`} style={{ padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>
                        ← Back to Challenge
                    </Link>
                </motion.div>
            </div>

            {loading ? <p style={{ color: "var(--ink-3)" }}>Loading…</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            {!loading && platformSub ? (
                <div style={{ display: "grid", gap: "1.25rem" }}>
                    {/* Header */}
                    <motion.div variants={fadeIn} initial="hidden" animate="show" style={{ display: "grid", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                            {chip ? <span className={`chip ${chip.cls}`}>{chip.label}</span> : null}
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                                {platformSub.challengeId}
                            </span>
                        </div>
                        <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>Submission Details</h1>
                        <p style={{ marginTop: "0.2rem", fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-3)" }}>
                            Builder: {platformSub.builderId}
                        </p>
                    </motion.div>

                    {/* Meta grid */}
                    <motion.div
                        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}
                        variants={fadeIn} initial="hidden" animate="show"
                    >
                        {[
                            { label: "Submission ID", value: <code style={{ fontSize: "0.78rem" }}>{platformSub.id}</code> },
                            {
                                label: "Repository (Files)",
                                value: (
                                    <a
                                        href={platformSub.snapshotRef}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: "0.78rem", color: "var(--c-purple)", textDecoration: "underline", wordBreak: "break-all" }}
                                    >
                                        {platformSub.snapshotRef}
                                    </a>
                                )
                            },
                            { label: "Submitted", value: new Date(platformSub.createdAt).toLocaleString() },
                            { label: "Last Updated", value: new Date(platformSub.updatedAt).toLocaleString() },
                        ].map((row) => (
                            <motion.div key={row.label} className="panel" style={{ padding: "1rem 1.25rem", borderRadius: 0 }}>
                                <p className="stat-label">{row.label}</p>
                                <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "var(--ink)" }}>{row.value}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Scores */}
                    {evalData ? (
                        <motion.div
                            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}
                            variants={fadeIn} initial="hidden" animate="show"
                        >
                            {[
                                { label: "AI Score", value: evalData.submission.ai_score ?? "—" },
                                { label: "Human Score", value: evalData.submission.human_score ?? "—" },
                                { label: "Final Score", value: evalData.submission.final_score ?? "—" },
                            ].map((s) => (
                                <div key={s.label} className="panel" style={{ padding: "1.25rem 1.5rem", borderRadius: 0, textAlign: "center" }}>
                                    <p className="stat-number" style={{ color: s.value === "—" ? "var(--ink-3)" : "var(--ink)" }}>{s.value}</p>
                                    <p className="stat-label">{s.label}</p>
                                </div>
                            ))}
                        </motion.div>
                    ) : null}

                    {/* Evaluation Timeline (Logs) */}
                    {evalData?.submission.timeline && evalData.submission.timeline.length > 0 ? (
                        <motion.div className="panel" style={{ padding: "1.75rem", display: "grid", gap: "1rem" }} variants={slideUp} initial="hidden" animate="show">
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                                Evaluation Timeline & Logs
                            </p>
                            <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.5rem" }}>
                                {evalData.submission.timeline.map((log, idx) => (
                                    <div key={idx} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", fontSize: "0.85rem", paddingBottom: "0.75rem", borderBottom: idx < evalData.submission.timeline!.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--ink-3)", minWidth: "125px", paddingTop: "0.15rem" }}>
                                            {new Date(log.at).toLocaleString()}
                                        </div>
                                        <div>
                                            <span className={`chip ${STATUS_CHIP[log.state]?.cls ?? "chip-neutral"}`} style={{ display: "inline-block", marginBottom: "0.3rem" }}>
                                                {STATUS_CHIP[log.state]?.label ?? log.state}
                                            </span>
                                            <p style={{ color: "var(--ink-2)", lineHeight: "1.4" }}>{log.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ) : null}

                    {/* Evaluation Feedback */}
                    {evalData?.report ? (
                        <motion.div className="panel" style={{ padding: "1.75rem", display: "grid", gap: "0.85rem" }} variants={slideUp} initial="hidden" animate="show">
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                                AI Evaluator Logs & Report
                            </p>
                            <pre style={{ fontSize: "0.78rem", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", overflowX: "auto" }}>
                                {evalData.report.evaluator_report}
                            </pre>
                            <hr className="divider" />
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                                Builder Feedback
                            </p>
                            <pre style={{ fontSize: "0.78rem" }}>{evalData.report.builder_report}</pre>
                        </motion.div>
                    ) : null}

                    {/* Runtime Artifacts */}
                    {evalData && (evalData.screenshot_base64 || evalData.preview_url) ? (
                        <motion.div className="panel" style={{ padding: "1.75rem", display: "grid", gap: "1rem" }} variants={slideUp} initial="hidden" animate="show">
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                                Runtime Artifacts
                            </p>
                            {evalData.preview_url ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>Preview URL:</span>
                                    <a
                                        href={evalData.preview_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: "0.8rem", color: "var(--c-purple)", wordBreak: "break-all" }}
                                    >
                                        {evalData.preview_url}
                                    </a>
                                </div>
                            ) : null}
                            {evalData.screenshot_base64 ? (
                                <div style={{ display: "grid", gap: "0.5rem" }}>
                                    <p style={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>App Screenshot (captured during evaluation):</p>
                                    <img
                                        src={`data:image/jpeg;base64,${evalData.screenshot_base64}`}
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

                </div>
            ) : null}
        </motion.main>
    );
}
