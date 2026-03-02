"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { btnTap, cardHover, listContainer, listItem, pageIn } from "../../components/animations";

type Submission = {
  id: string; challengeId: string; snapshotRef: string;
  status: string; createdAt: string; updatedAt: string;
};
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  draft:                 { label: "Draft",            cls: "chip-neutral" },
  submitted:             { label: "Submitted",        cls: "chip-blue"    },
  queued:                { label: "Queued",            cls: "chip-neutral" },
  running:               { label: "Evaluating",       cls: "chip-purple"  },
  ai_scored:             { label: "AI Scored",        cls: "chip-blue"    },
  awaiting_human_review: { label: "Awaiting Review",  cls: "chip-warning" },
  finalized:             { label: "Finalized",        cls: "chip-success" },
  failed:                { label: "Failed",           cls: "chip-danger"  },
  disqualified:          { label: "Disqualified",     cls: "chip-danger"  },
};

export default function BuilderDashboardPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true); setError(null);
      const response = await fetch("/api/submissions");
      const payload = (await response.json()) as ApiEnvelope<{ items: Submission[] }>;
      if (cancelled) return;
      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "Unable to load submissions.");
        setLoading(false); return;
      }
      setItems(payload.data.items); setLoading(false);
    }
    void run();
    return () => { cancelled = true; };
  }, []);

  const finalized = items.filter((i) => i.status === "finalized").length;
  const pending   = items.filter((i) => !["finalized","failed","disqualified"].includes(i.status)).length;

  return (
    <motion.main className="site-shell" {...pageIn}>

      <div className="page-header">
        <div className="page-header-meta">
          <h1>My Submissions</h1>
          <p style={{ marginTop: "0.4rem" }}>Track your submitted projects and evaluation status.</p>
        </div>
        <motion.div {...btnTap}>
          <Link className="btn btn-primary" href="/challenges">Browse Challenges →</Link>
        </motion.div>
      </div>

      {/* stat strip */}
      {!loading && items.length > 0 ? (
        <motion.div
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}
          variants={listContainer} initial="hidden" animate="show"
        >
          {[
            { label: "Total",     value: items.length },
            { label: "Finalized", value: finalized    },
            { label: "In Progress", value: pending    },
          ].map((s) => (
            <motion.div key={s.label} variants={listItem} className="panel" style={{ padding: "1.25rem 1.5rem", borderRadius: 0, display: "grid", gap: "0.3rem" }}>
              <p className="stat-number" style={{ fontSize: "1.8rem" }}>{s.value}</p>
              <p className="stat-label">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p style={{ color: "var(--ink-3)" }}>Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="panel" style={{ padding: "2.5rem", display: "grid", gap: "1rem", textAlign: "center" }}>
          <p>No submissions yet.</p>
          <motion.div {...btnTap} style={{ justifySelf: "center" }}>
            <Link className="btn btn-primary" href="/challenges">Browse Open Challenges →</Link>
          </motion.div>
        </div>
      ) : null}

      <motion.div
        style={{ display: "grid", gap: "0.75rem" }}
        variants={listContainer} initial="hidden" animate={loading ? "hidden" : "show"}
      >
        {items.map((item) => {
          const chip = STATUS_CHIP[item.status] ?? { label: item.status, cls: "chip-neutral" };
          return (
            <motion.article
              key={item.id}
              className="panel"
              variants={listItem}
              {...cardHover}
              style={{ padding: "1.25rem 1.5rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem 1rem", alignItems: "center" }}
            >
              <div style={{ display: "grid", gap: "0.3rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                  <span className={`chip ${chip.cls}`}>{chip.label}</span>
                  <code style={{ fontSize: "0.8rem" }}>{item.id}</code>
                </div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                  {item.challengeId} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <motion.div {...btnTap}>
                <Link className="btn btn-ghost" href={`/builder/submissions/${item.id}`} style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>
                  Details →
                </Link>
              </motion.div>
            </motion.article>
          );
        })}
      </motion.div>

    </motion.main>
  );
}
