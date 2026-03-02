"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { btnTap, cardHover, listContainer, listItem, pageIn } from "../components/animations";

type Challenge = {
    id: string; title: string; brief: string; deadline: string; prize?: string;
};
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

export default function LeaderboardIndexPage() {
    const [items, setItems] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoading(true); setError(null);
            const res = await fetch("/api/challenges?status=published");
            const payload = (await res.json()) as ApiEnvelope<{ items: Challenge[] }>;
            if (cancelled) return;
            if (!res.ok || payload.error || !payload.data) {
                setError(payload.error?.message ?? "Unable to load challenges.");
                setLoading(false); return;
            }
            setItems(payload.data.items); setLoading(false);
        }
        void run();
        return () => { cancelled = true; };
    }, []);

    return (
        <motion.main className="site-shell" {...pageIn}>
            <div className="page-header">
                <div className="page-header-meta">
                    <h1>Leaderboards</h1>
                    <p style={{ marginTop: "0.4rem" }}>View rankings for all active challenges.</p>
                </div>
            </div>

            {error ? <p className="error-text">{error}</p> : null}
            {loading ? <p style={{ color: "var(--ink-3)" }}>Loading challenges…</p> : null}

            {!loading && items.length === 0 ? (
                <div className="panel" style={{ padding: "2.5rem", textAlign: "center" }}>
                    <p style={{ color: "var(--ink-3)" }}>No published challenges yet.</p>
                </div>
            ) : null}

            <motion.div
                style={{ display: "grid", gap: "0.75rem" }}
                variants={listContainer} initial="hidden" animate={loading ? "hidden" : "show"}
            >
                {items.map((item) => (
                    <motion.article
                        key={item.id}
                        className="panel"
                        variants={listItem}
                        {...cardHover}
                        style={{ padding: "1.4rem 1.6rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem 1rem", alignItems: "center" }}
                    >
                        <div style={{ display: "grid", gap: "0.35rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                                <h2 style={{ fontSize: "1rem" }}>{item.title}</h2>
                                {item.prize ? <span className="tagline">{item.prize}</span> : null}
                            </div>
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                                DEADLINE · {new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                        </div>
                        <motion.div {...btnTap}>
                            <Link className="btn btn-primary" href={`/leaderboard/${item.id}`} style={{ fontSize: "0.8rem", padding: "0.45rem 1rem" }}>
                                View Ranking →
                            </Link>
                        </motion.div>
                    </motion.article>
                ))}
            </motion.div>
        </motion.main>
    );
}
