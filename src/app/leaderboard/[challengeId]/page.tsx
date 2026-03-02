"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { btnTap, fadeIn, listContainer, listItem, pageIn } from "../../components/animations";

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string; details?: unknown } | null };
type LeaderboardEntry = {
    rank: number;
    submission_id: string;
    builder_id: string;
    score: number;
    state: string;
    updated_at: string;
    is_provisional?: boolean;
};
type LeaderboardData = {
    challenge: { id: string; title: string };
    mode: "provisional" | "final";
    entries: LeaderboardEntry[];
};

export default function LeaderboardPage({ params }: { params: Promise<{ challengeId: string }> }) {
    const [challengeId, setChallengeId] = useState("");
    const [mode, setMode] = useState<"provisional" | "final">("provisional");
    const [data, setData] = useState<LeaderboardData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        params.then((v) => setChallengeId(v.challengeId));
    }, [params]);

    const url = useMemo(
        () => (challengeId ? `/api/epic3/challenges/${challengeId}/leaderboard?mode=${mode}` : null),
        [challengeId, mode],
    );

    useEffect(() => {
        if (!url) return;
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            const response = await fetch(url!);
            const json = (await response.json()) as ApiEnvelope<LeaderboardData>;
            if (cancelled) return;
            if (json.error || !json.data) {
                setError(json.error?.message ?? "Failed to load leaderboard");
                setLoading(false);
                return;
            }
            setData(json.data);
            setLoading(false);
        }
        void load();
        return () => { cancelled = true; };
    }, [url]);

    const medal = (rank: number) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return null;
    };

    return (
        <motion.main className="site-shell" {...pageIn}>

            <div style={{ marginBottom: "0.5rem" }}>
                <motion.div {...btnTap} style={{ display: "inline-block" }}>
                    <Link className="btn btn-ghost" href="/challenges" style={{ padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>
                        ← Challenges
                    </Link>
                </motion.div>
            </div>

            <div className="page-header">
                <div className="page-header-meta">
                    <h1>{data?.challenge.title ?? "Leaderboard"}</h1>
                    <p style={{ marginTop: "0.4rem" }}>
                        {mode === "provisional"
                            ? "AI-scored ranking — subject to change after human review."
                            : "Final ranking — immutable 80/20 weighted scores."}
                    </p>
                </div>
                {/* Mode toggle */}
                <div style={{ display: "flex", gap: "0.4rem", alignSelf: "center" }}>
                    {(["provisional", "final"] as const).map((m) => (
                        <motion.button
                            key={m}
                            {...btnTap}
                            type="button"
                            onClick={() => setMode(m)}
                            className="btn btn-ghost"
                            style={{
                                fontSize: "0.78rem", padding: "0.38rem 0.9rem",
                                background: mode === m ? "var(--ink)" : undefined,
                                color: mode === m ? "#fff" : undefined,
                                borderColor: mode === m ? "transparent" : undefined,
                            }}
                        >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                        </motion.button>
                    ))}
                </div>
            </div>

            {error ? <p className="error-text">{error}</p> : null}
            {loading ? <p style={{ color: "var(--ink-3)" }}>Loading leaderboard…</p> : null}

            <AnimatePresence mode="wait">
                {!loading && data ? (
                    <motion.div
                        key={mode}
                        variants={fadeIn} initial="hidden" animate="show" exit="hidden"
                    >
                        {data.entries.length === 0 ? (
                            <div className="panel" style={{ padding: "3rem", textAlign: "center" }}>
                                <p style={{ color: "var(--ink-3)" }}>
                                    {mode === "provisional"
                                        ? "No AI-scored submissions yet. Evaluation is in progress."
                                        : "No finalized scores yet. Waiting for human review completion."}
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gap: "0.5rem" }}>
                                {/* Top 3 podium cards */}
                                {data.entries.slice(0, 3).length > 0 ? (
                                    <motion.div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                            gap: "0.75rem",
                                            marginBottom: "0.5rem",
                                        }}
                                        variants={listContainer} initial="hidden" animate="show"
                                    >
                                        {data.entries.slice(0, 3).map((entry) => (
                                            <motion.div
                                                key={entry.submission_id}
                                                className="panel"
                                                variants={listItem}
                                                style={{
                                                    padding: "1.5rem",
                                                    display: "grid",
                                                    gap: "0.5rem",
                                                    textAlign: "center",
                                                    borderTop: entry.rank === 1 ? "2px solid var(--c-warning)" : undefined,
                                                }}
                                            >
                                                <p style={{ fontSize: "2rem" }}>{medal(entry.rank)}</p>
                                                <p style={{
                                                    fontWeight: 800,
                                                    fontSize: "1.6rem",
                                                    letterSpacing: "-0.04em",
                                                    color: "var(--ink)",
                                                    fontFamily: "var(--font-mono)",
                                                }}>
                                                    {typeof entry.score === "number" ? entry.score.toFixed(1) : entry.score}
                                                </p>
                                                <p style={{ fontSize: "0.75rem", color: "var(--ink-2)", fontWeight: 600, wordBreak: "break-all" }}>
                                                    {entry.builder_id}
                                                </p>
                                                <code style={{ fontSize: "0.7rem", color: "var(--ink-3)" }}>
                                                    {entry.submission_id.slice(0, 16)}…
                                                </code>
                                                {entry.is_provisional ? (
                                                    <span className="chip chip-warning" style={{ justifySelf: "center" }}>provisional</span>
                                                ) : null}
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                ) : null}

                                {/* Full table */}
                                <motion.div className="panel" style={{ padding: "0 1.5rem" }} variants={fadeIn} initial="hidden" animate="show">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 56 }}>Rank</th>
                                                <th>Submission</th>
                                                <th>Builder</th>
                                                <th style={{ textAlign: "right" }}>Score</th>
                                                <th>State</th>
                                            </tr>
                                        </thead>
                                        <motion.tbody variants={listContainer} initial="hidden" animate="show">
                                            {data.entries.map((entry) => {
                                                const rankCls = entry.rank === 1 ? "rank-1" : entry.rank === 2 ? "rank-2" : entry.rank === 3 ? "rank-3" : "";
                                                return (
                                                    <motion.tr key={entry.submission_id} variants={listItem}>
                                                        <td>
                                                            <span className={rankCls} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                                                {medal(entry.rank) ?? entry.rank}
                                                            </span>
                                                        </td>
                                                        <td><code style={{ fontSize: "0.78rem" }}>{entry.submission_id}</code></td>
                                                        <td style={{ color: "var(--ink)", fontWeight: 600 }}>{entry.builder_id}</td>
                                                        <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.92rem" }}>
                                                            {typeof entry.score === "number" ? entry.score.toFixed(1) : entry.score}
                                                        </td>
                                                        <td>
                                                            <span className={`chip ${entry.state === "finalized" ? "chip-success" : entry.is_provisional ? "chip-warning" : "chip-blue"}`}>
                                                                {entry.state}
                                                            </span>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </motion.tbody>
                                    </table>
                                </motion.div>
                            </div>
                        )}
                    </motion.div>
                ) : null}
            </AnimatePresence>

        </motion.main>
    );
}
