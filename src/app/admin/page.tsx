"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { btnTap, listContainer, listItem, pageIn } from "../components/animations";

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

const QUICK_LINKS = [
  { href: "/challenges", label: "Challenge Catalog" },
  { href: "/sponsor/challenges", label: "Sponsor Dashboard" },
  { href: "/evaluator", label: "Evaluator Queue" },
  { href: "/epic3", label: "Evaluation Hub" },
  { href: "/epic3/worker", label: "Worker Console" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function AdminDashboardPage() {
  const [challengeCount, setChallengeCount] = useState<number | null>(null);
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true); setError(null);
      const [cRes, sRes] = await Promise.all([
        fetch("/api/challenges?mine=false"),
        fetch("/api/submissions"),
      ]);
      if (cancelled) return;
      if (!cRes.ok || !sRes.ok) {
        setError("Unable to load overview. Ensure you are signed in as admin.");
        setLoading(false); return;
      }
      const cPayload = (await cRes.json()) as ApiEnvelope<{ count: number }>;
      const sPayload = (await sRes.json()) as ApiEnvelope<{ count: number }>;
      if (cancelled) return;
      setChallengeCount(cPayload.data?.count ?? null);
      setSubmissionCount(sPayload.data?.count ?? null);
      setLoading(false);
    }
    void run();
    return () => { cancelled = true; };
  }, []);

  return (
    <motion.main className="site-shell" {...pageIn}>

      <div className="page-header">
        <div className="page-header-meta">
          <h1>Admin</h1>
          <p style={{ marginTop: "0.4rem" }}>Platform overview and management.</p>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {/* Stats grid */}
      <motion.div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1px", background: "rgba(0,0,0,0.08)", borderRadius: 14, overflow: "hidden" }}
        variants={listContainer} initial="hidden" animate={loading ? "hidden" : "show"}
      >
        {[
          { label: "Challenges", value: challengeCount },
          { label: "Submissions", value: submissionCount },
        ].map((s) => (
          <motion.div key={s.label} variants={listItem} className="panel" style={{ padding: "1.75rem 2rem", borderRadius: 0, display: "grid", gap: "0.35rem" }}>
            <p className="stat-number">{loading ? "—" : (s.value ?? "—")}</p>
            <p className="stat-label">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick links */}
      <motion.div className="panel" style={{ padding: "1.5rem 1.75rem" }} variants={listContainer} initial="hidden" animate="show">
        <motion.p variants={listItem} style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "1rem" }}>
          Quick Links
        </motion.p>
        <motion.div variants={listItem} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {QUICK_LINKS.map((l) => (
            <motion.div key={l.href} {...btnTap}>
              <Link className="btn btn-ghost" href={l.href} style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem" }}>
                {l.label}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

    </motion.main>
  );
}
