"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FormEvent, useState } from "react";
import { btnTap, fadeIn, pageIn } from "../../../components/animations";

export default function NewChallengePage() {
  const [title, setTitle]   = useState("");
  const [brief, setBrief]   = useState("");
  const [deadline, setDeadline] = useState("");
  const [prize, setPrize]   = useState("");
  const [rubric, setRubric] = useState('{\n  "innovation": 40,\n  "technical_quality": 60\n}');
  const [error, setError]   = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setCreatedId(null);
    let rubricJson: Record<string, unknown>;
    try { rubricJson = JSON.parse(rubric); }
    catch { setError("Rubric must be valid JSON."); return; }

    const response = await fetch("/api/challenges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, brief, deadline: new Date(deadline).toISOString(), rubric: rubricJson, prize: prize || undefined }),
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload?.error?.message ?? "Failed to create challenge."); return; }
    setCreatedId(payload.data.id);
  }

  return (
    <motion.main className="site-shell" style={{ maxWidth: 680 }} {...pageIn}>
      <div style={{ marginBottom: "0.5rem" }}>
        <motion.div {...btnTap} style={{ display: "inline-block" }}>
          <Link className="btn btn-ghost" href="/sponsor/challenges" style={{ padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>
            ← Dashboard
          </Link>
        </motion.div>
      </div>

      <div className="page-header" style={{ paddingBottom: "1.25rem", marginBottom: "0.25rem" }}>
        <div className="page-header-meta">
          <h1>New Challenge</h1>
          <p style={{ marginTop: "0.3rem" }}>Create a draft challenge — you can publish it once ready.</p>
        </div>
      </div>

      {createdId ? (
        <motion.div className="panel" style={{ padding: "1.75rem", display: "grid", gap: "0.85rem" }} variants={fadeIn} initial="hidden" animate="show">
          <p className="success-text">Challenge created!</p>
          <p style={{ fontSize: "0.875rem" }}>ID: <code>{createdId}</code></p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <motion.div {...btnTap}>
              <Link className="btn btn-primary" href={`/sponsor/challenges/${createdId}/edit`}>Open Editor →</Link>
            </motion.div>
            <motion.div {...btnTap}>
              <Link className="btn btn-ghost" href="/sponsor/challenges">Back to Dashboard</Link>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div className="panel" style={{ padding: "1.75rem" }} variants={fadeIn} initial="hidden" animate="show">
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: "1rem" }}>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} placeholder="e.g. Build an AI coding assistant" />
            </label>
            <label>
              Brief
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} required minLength={20} rows={5} placeholder="Describe the challenge, goals, and expected deliverables…" />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label>
                Deadline
                <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="datetime-local" required />
              </label>
              <label>
                Prize <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>(optional)</span>
                <input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="e.g. $5,000" />
              </label>
            </div>
            <label>
              Rubric JSON
              <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} rows={6} required style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }} />
            </label>

            {error ? <p className="error-text">{error}</p> : null}

            <motion.button {...btnTap} className="btn btn-primary" type="submit">
              Create Draft Challenge
            </motion.button>
          </form>
        </motion.div>
      )}
    </motion.main>
  );
}
