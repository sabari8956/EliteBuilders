"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { btnTap, cardHover, listContainer, listItem, fadeIn, pageIn } from "../../../components/animations";

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

type Challenge = {
    id: string; title: string; brief: string; deadline: string;
    prize?: string; status: "draft" | "published";
};

type Submission = {
    id: string; challengeId: string; builderId: string; snapshotRef: string;
    status: string; createdAt: string; updatedAt: string;
};

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "chip-neutral" },
    submitted: { label: "Submitted", cls: "chip-blue" },
    queued: { label: "Queued", cls: "chip-neutral" },
    running: { label: "Evaluating", cls: "chip-purple" },
    ai_scored: { label: "AI Scored", cls: "chip-blue" },
    awaiting_human_review: { label: "Awaiting Review", cls: "chip-warning" },
    finalized: { label: "Finalized", cls: "chip-success" },
    failed: { label: "Failed", cls: "chip-danger" },
    disqualified: { label: "Disqualified", cls: "chip-danger" },
};

export default function SponsorChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [id, setId] = useState("");
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        params.then(async ({ id: value }) => {
            setId(value);
            setLoading(true);
            setError(null);
            try {
                const [cRes, sRes] = await Promise.all([
                    fetch(`/api/challenges/${value}`),
                    fetch(`/api/challenges/${value}/submissions`),
                ]);
                const cPayload = (await cRes.json()) as ApiEnvelope<Challenge>;
                if (!cRes.ok || cPayload.error || !cPayload.data) {
                    setError(cPayload.error?.message ?? "Unable to load challenge.");
                    setLoading(false);
                    return;
                }
                setChallenge(cPayload.data);
                if (sRes.ok) {
                    const sPayload = (await sRes.json()) as ApiEnvelope<{ items: Submission[]; count: number }>;
                    if (sPayload.data) setSubmissions(sPayload.data.items);
                }
            } catch {
                setError("Unable to load challenge details.");
            }
            setLoading(false);
        });
    }, [params]);

    const finalized = submissions.filter((s) => s.status === "finalized").length;
    const inProgress = submissions.filter((s) => !["finalized", "failed", "disqualified"].includes(s.status)).length;

    return (
        <motion.main className="site-shell" {...pageIn}>

            <div style={{ marginBottom: "0.5rem" }}>
                <motion.div {...btnTap} style={{ display: "inline-block" }}>
                    <Link className="btn btn-ghost" href="/sponsor/challenges" style={{ padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>
                        ← Dashboard
                    </Link>
                </motion.div>
            </div>

            {loading ? <p style={{ color: "var(--ink-3)" }}>Loading…</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            {!loading && challenge ? (
                <div style={{ display: "grid", gap: "1.25rem" }}>

                    <motion.div className="page-header" variants={fadeIn} initial="hidden" animate="show">
                        <div className="page-header-meta">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                                <span className={challenge.status === "published" ? "chip chip-success" : "chip chip-neutral"}>
                                    {challenge.status}
                                </span>
                                {challenge.prize ? <span className="tagline">{challenge.prize}</span> : null}
                            </div>
                            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>{challenge.title}</h1>
                            <p style={{ marginTop: "0.4rem", fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                                DEADLINE · {new Date(challenge.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-start", flexWrap: "wrap" }}>
                            <motion.div {...btnTap}>
                                <Link className="btn btn-ghost" href={`/sponsor/challenges/${id}/edit`} style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>
                                    Edit Challenge
                                </Link>
                            </motion.div>
                            {challenge.status === "published" ? (
                                <motion.div {...btnTap}>
                                    <Link className="btn btn-ghost" href={`/leaderboard/${id}`} style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>
                                        View Leaderboard →
                                    </Link>
                                </motion.div>
                            ) : null}
                        </div>
                    </motion.div>

                    {/* Stat strip */}
                    <motion.div
                        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}
                        variants={listContainer} initial="hidden" animate="show"
                    >
                        {[
                            { label: "Total Submissions", value: submissions.length },
                            { label: "Finalized", value: finalized },
                            { label: "In Progress", value: inProgress },
                        ].map((s) => (
                            <motion.div key={s.label} variants={listItem} className="panel" style={{ padding: "1.25rem 1.5rem", borderRadius: 0, display: "grid", gap: "0.3rem" }}>
                                <p className="stat-number" style={{ fontSize: "1.8rem" }}>{s.value}</p>
                                <p className="stat-label">{s.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Submissions list */}
                    <div>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.85rem" }}>
                            Builder Submissions
                        </p>

                        {submissions.length === 0 ? (
                            <div className="panel" style={{ padding: "2.5rem", textAlign: "center" }}>
                                <p style={{ color: "var(--ink-3)" }}>No submissions yet for this challenge.</p>
                            </div>
                        ) : null}

                        <motion.div
                            style={{ display: "grid", gap: "0.6rem" }}
                            variants={listContainer} initial="hidden" animate="show"
                        >
                            {submissions.map((sub) => {
                                const chip = STATUS_CHIP[sub.status] ?? { label: sub.status, cls: "chip-neutral" };
                                return (
                                    <motion.article
                                        key={sub.id}
                                        className="panel"
                                        variants={listItem}
                                        {...cardHover}
                                        style={{ padding: "1.1rem 1.4rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem 1rem", alignItems: "center" }}
                                    >
                                        <div style={{ display: "grid", gap: "0.3rem" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
                                                <span className={`chip ${chip.cls}`}>{chip.label}</span>
                                                <code style={{ fontSize: "0.78rem" }}>{sub.id}</code>
                                            </div>
                                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                                                Builder: {sub.builderId} · {new Date(sub.createdAt).toLocaleDateString()}
                                            </p>
                                            <a
                                                href={sub.snapshotRef}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--c-purple)", textDecoration: "underline", wordBreak: "break-all" }}
                                            >
                                                {sub.snapshotRef}
                                            </a>
                                        </div>
                                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                            <motion.div {...btnTap}>
                                                <Link className="btn btn-ghost" href={`/sponsor/challenges/${id}/submissions/${sub.id}`} style={{ fontSize: "0.78rem", padding: "0.42rem 0.85rem" }}>
                                                    View Details →
                                                </Link>
                                            </motion.div>
                                            {sub.status === "awaiting_human_review" || sub.status === "ai_scored" ? (
                                                <motion.div {...btnTap}>
                                                    <Link className="btn btn-primary" href={`/evaluator/reviews/${sub.id}`} style={{ fontSize: "0.78rem", padding: "0.42rem 0.85rem" }}>
                                                        Review →
                                                    </Link>
                                                </motion.div>
                                            ) : null}
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </motion.div>
                    </div>

                </div>
            ) : null}
        </motion.main>
    );
}
