"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { btnTap, fadeIn, pageIn } from "../../../../components/animations";

type Challenge = {
  id: string; title: string; brief: string; rubric: Record<string, unknown>;
  deadline: string; prize?: string; status: "draft" | "published";
};
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

export default function EditChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId]           = useState("");
  const [title, setTitle]     = useState("");
  const [brief, setBrief]     = useState("");
  const [deadline, setDeadline] = useState("");
  const [prize, setPrize]     = useState("");
  const [rubric, setRubric]   = useState("{}");
  const [status, setStatus]   = useState<Challenge["status"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    params.then(async ({ id: value }) => {
      setId(value);
      const response = await fetch(`/api/challenges/${value}`);
      const payload = (await response.json()) as ApiEnvelope<Challenge>;
      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "Unable to load challenge."); return;
      }
      const item = payload.data;
      setTitle(item.title); setBrief(item.brief);
      setDeadline(new Date(item.deadline).toISOString().slice(0, 16));
      setPrize(item.prize ?? "");
      setRubric(JSON.stringify(item.rubric, null, 2));
      setStatus(item.status);
    });
  }, [params]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null);
    let rubricJson: Record<string, unknown>;
    try { rubricJson = JSON.parse(rubric); }
    catch { setError("Rubric must be valid JSON."); return; }

    const response = await fetch(`/api/challenges/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, brief, rubric: rubricJson, deadline: new Date(deadline).toISOString(), prize: prize || undefined }),
    });
    const payload = (await response.json()) as ApiEnvelope<Challenge>;
    if (!response.ok || payload.error || !payload.data) {
      setError(payload.error?.message ?? "Unable to update challenge."); return;
    }
    setMessage("Saved."); setStatus(payload.data.status);
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

      <div className="page-header" style={{ paddingBottom: "1.25rem" }}>
        <div className="page-header-meta">
          <h1>Edit Challenge</h1>
          <p style={{ marginTop: "0.3rem" }}>Update challenge details and rubric JSON.</p>
        </div>
        {status ? <span className={status === "published" ? "chip chip-success" : "chip chip-neutral"}>{status}</span> : null}
      </div>

      {error && !id ? <p className="error-text">{error}</p> : null}

      <motion.div className="panel" style={{ padding: "1.75rem" }} variants={fadeIn} initial="hidden" animate="show">
        <form onSubmit={(e) => void handleSave(e)} style={{ display: "grid", gap: "1rem" }}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
          </label>
          <label>
            Brief
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} required minLength={20} rows={6} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label>
              Deadline
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            </label>
            <label>
              Prize <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>(optional)</span>
              <input value={prize} onChange={(e) => setPrize(e.target.value)} />
            </label>
          </div>
          <label>
            Rubric JSON
            <textarea value={rubric} onChange={(e) => setRubric(e.target.value)} rows={8} required style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }} />
          </label>

          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}

          <motion.button {...btnTap} className="btn btn-primary" type="submit">Save Changes</motion.button>
        </form>
      </motion.div>
    </motion.main>
  );
}
