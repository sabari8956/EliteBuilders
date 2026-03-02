"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { btnTap, fadeIn, pageIn, slideUp } from "../../components/animations";

type Challenge = {
  id: string; title: string; brief: string; deadline: string;
  prize?: string; status: "draft" | "published"; rubric: Record<string, unknown>;
};
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [challengeId, setChallengeId] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotRef, setSnapshotRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true); setError(null);
    const response = await fetch(`/api/challenges/${id}`);
    const payload = (await response.json()) as ApiEnvelope<Challenge>;
    if (!response.ok || payload.error || !payload.data) {
      setError(payload.error?.message ?? "Unable to load challenge.");
      setLoading(false); return;
    }
    setChallenge(payload.data); setLoading(false);
  }, []);

  useEffect(() => {
    params.then((r) => { setChallengeId(r.id); void load(r.id); });
  }, [params, load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null); setSubmitting(true);
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, snapshotRef }),
    });
    const payload = (await response.json()) as ApiEnvelope<{ id: string }>;
    setSubmitting(false);
    if (!response.ok || payload.error || !payload.data) {
      setSubmitError(payload.error?.message ?? "Submission failed."); return;
    }
    setSubmittedId(payload.data.id); setSnapshotRef("");
  }

  return (
    <motion.main className="site-shell" {...pageIn}>
      <div style={{ marginBottom: "0.5rem" }}>
        <motion.div {...btnTap} style={{ display: "inline-block" }}>
          <Link className="btn btn-ghost" href="/challenges" style={{ padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>
            ← Challenges
          </Link>
        </motion.div>
      </div>

      {loading ? <p style={{ color: "var(--ink-3)" }}>Loading…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && challenge ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.5rem", alignItems: "start" }}>

          {/* Left: challenge info */}
          <motion.div style={{ display: "grid", gap: "1.25rem" }} variants={fadeIn} initial="hidden" animate="show">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                {challenge.prize ? <span className="tagline">{challenge.prize}</span> : null}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  DEADLINE · {new Date(challenge.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>{challenge.title}</h1>
            </div>

            <p style={{ fontSize: "1rem", lineHeight: 1.7 }}>{challenge.brief}</p>

            {Object.keys(challenge.rubric).length > 0 ? (
              <motion.div className="panel" style={{ padding: "1.5rem" }} variants={slideUp} initial="hidden" animate="show">
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.85rem" }}>
                  Evaluation Rubric
                </p>
                <pre>{JSON.stringify(challenge.rubric, null, 2)}</pre>
              </motion.div>
            ) : null}
          </motion.div>

          {/* Right: submit form */}
          <motion.div className="panel" style={{ padding: "1.75rem", display: "grid", gap: "1.1rem" }} variants={slideUp} initial="hidden" animate="show">
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "0.4rem" }}>
                Submit Project
              </p>
              <h2 style={{ fontSize: "1.15rem" }}>Enter your repo</h2>
            </div>

            {submittedId ? (
              <motion.div style={{ display: "grid", gap: "0.75rem" }} variants={fadeIn} initial="hidden" animate="show">
                <p className="success-text">Submission received!</p>
                <p style={{ fontSize: "0.82rem" }}>ID: <code>{submittedId}</code></p>
                <p style={{ fontSize: "0.875rem" }}>Queued for autonomous evaluation. Track progress on your dashboard.</p>
                <motion.div {...btnTap}>
                  <Link className="btn btn-primary" href="/builder/dashboard" style={{ width: "100%" }}>
                    View Dashboard →
                  </Link>
                </motion.div>
                <motion.button {...btnTap} className="btn btn-ghost" type="button" onClick={() => setSubmittedId(null)} style={{ width: "100%" }}>
                  Submit Another
                </motion.button>
              </motion.div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: "0.85rem" }}>
                <label>
                  Repository URL
                  <input
                    type="url"
                    placeholder="https://github.com/you/your-repo"
                    value={snapshotRef}
                    onChange={(e) => setSnapshotRef(e.target.value)}
                    required
                  />
                </label>
                {submitError ? <p className="error-text">{submitError}</p> : null}
                <motion.button {...btnTap} className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Project"}
                </motion.button>
              </form>
            )}
          </motion.div>

        </div>
      ) : null}
    </motion.main>
  );
}
