"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { btnTap, cardHover, listContainer, listItem, pageIn } from "../components/animations";

type Submission = {
  id: string; challengeId: string; snapshotRef: string;
  status: string; createdAt: string; updatedAt: string;
};
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

export default function EvaluatorDashboardPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true); setError(null);
      const response = await fetch("/api/evaluator/submissions");
      const payload = (await response.json()) as ApiEnvelope<{ items: Submission[] }>;
      if (cancelled) return;
      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "Unable to load queue.");
        setLoading(false); return;
      }
      setItems(payload.data.items); setLoading(false);
    }
    void run();
    return () => { cancelled = true; };
  }, [reloadKey]);

  return (
    <motion.main className="site-shell" {...pageIn}>

      <div className="page-header">
        <div className="page-header-meta">
          <h1>Review Queue</h1>
          <p style={{ marginTop: "0.4rem" }}>Submissions awaiting human evaluation.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <motion.button {...btnTap} className="btn btn-ghost" type="button" onClick={() => setReloadKey((k) => k + 1)} style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>
            Refresh
          </motion.button>
          <motion.div {...btnTap}>
            <Link className="btn btn-ghost" href="/epic3/worker" style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>
              Worker Console
            </Link>
          </motion.div>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p style={{ color: "var(--ink-3)" }}>Loading queue…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="panel" style={{ padding: "2.5rem", textAlign: "center" }}>
          <p>No submissions awaiting review.</p>
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
            style={{ padding: "1.25rem 1.6rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem 1.5rem", alignItems: "center" }}
          >
            <div style={{ display: "grid", gap: "0.3rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                <span className="chip chip-warning">Awaiting Review</span>
                <code style={{ fontSize: "0.78rem" }}>{item.id}</code>
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                {item.challengeId} · Updated {new Date(item.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <motion.div {...btnTap}>
              <Link className="btn btn-primary" href={`/evaluator/reviews/${item.id}`} style={{ fontSize: "0.8rem", padding: "0.45rem 1rem" }}>
                Review &amp; Score →
              </Link>
            </motion.div>
          </motion.article>
        ))}
      </motion.div>

    </motion.main>
  );
}
