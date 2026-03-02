"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { btnTap, cardHover, listContainer, listItem, pageIn } from "../components/animations";

type Challenge = {
  id: string; title: string; brief: string;
  deadline: string; prize?: string; status: "draft" | "published"; createdAt: string;
};
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

export default function ChallengesPage() {
  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true); setError(null);
      const response = await fetch("/api/challenges?status=published");
      const payload = (await response.json()) as ApiEnvelope<{ items: Challenge[] }>;
      if (cancelled) return;
      if (!response.ok || payload.error || !payload.data) {
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
          <h1>Open Challenges</h1>
          <p style={{ marginTop: "0.4rem" }}>Browse active hackathon challenges and submit your project.</p>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p style={{ color: "var(--ink-3)" }}>Loading challenges…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="panel" style={{ padding: "2.5rem", textAlign: "center" }}>
          <p>No open challenges right now. Check back soon.</p>
        </div>
      ) : null}

      <motion.div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "1rem" }}
        variants={listContainer} initial="hidden" animate={loading ? "hidden" : "show"}
      >
        {items.map((item) => (
          <motion.article
            key={item.id}
            className="panel"
            variants={listItem}
            {...cardHover}
            style={{ padding: "1.75rem", display: "grid", gap: "1rem", cursor: "default" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
              <h2 style={{ fontSize: "1.15rem", lineHeight: 1.2 }}>{item.title}</h2>
              {item.prize ? <span className="tagline">{item.prize}</span> : null}
            </div>

            <p style={{ fontSize: "0.875rem" }}>{item.brief}</p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                DEADLINE · {new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <motion.div {...btnTap}>
                <Link className="btn btn-primary" href={`/challenges/${item.id}`} style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}>
                  View &amp; Submit →
                </Link>
              </motion.div>
            </div>
          </motion.article>
        ))}
      </motion.div>

    </motion.main>
  );
}
