"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Challenge = {
  id: string;
  title: string;
  brief: string;
  rubric: Record<string, unknown>;
  deadline: string;
  prize?: string;
  status: "draft" | "published";
};

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

export default function EditChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [deadline, setDeadline] = useState("");
  const [prize, setPrize] = useState("");
  const [rubric, setRubric] = useState("{}");
  const [status, setStatus] = useState<Challenge["status"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(async ({ id: value }) => {
      setId(value);
      const response = await fetch(`/api/challenges/${value}`);
      const payload = (await response.json()) as ApiEnvelope<Challenge>;

      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "Unable to load challenge.");
        return;
      }

      const item = payload.data;
      setTitle(item.title);
      setBrief(item.brief);
      setDeadline(new Date(item.deadline).toISOString().slice(0, 16));
      setPrize(item.prize ?? "");
      setRubric(JSON.stringify(item.rubric, null, 2));
      setStatus(item.status);
    });
  }, [params]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    let rubricJson: Record<string, unknown>;
    try {
      rubricJson = JSON.parse(rubric);
    } catch {
      setError("Rubric must be valid JSON.");
      return;
    }

    const response = await fetch(`/api/challenges/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        brief,
        rubric: rubricJson,
        deadline: new Date(deadline).toISOString(),
        prize: prize || undefined,
      }),
    });

    const payload = (await response.json()) as ApiEnvelope<Challenge>;

    if (!response.ok || payload.error || !payload.data) {
      setError(payload.error?.message ?? "Unable to update challenge.");
      return;
    }

    setMessage("Challenge updated.");
    setStatus(payload.data.status);
  }

  return (
    <main className="site-shell" style={{ maxWidth: 820, margin: "0 auto", padding: "2rem 1rem" }}>
      <section className="panel" style={{ padding: "1.25rem", display: "grid", gap: "0.8rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <h1>Edit Challenge</h1>
            <p>Update challenge details and rubric JSON.</p>
          </div>
          <Link className="btn btn-ghost" href="/sponsor/challenges">
            Back to Dashboard
          </Link>
        </div>

        {status ? <p>Current status: <strong>{status}</strong></p> : null}

        <form onSubmit={handleSave} style={{ display: "grid", gap: "0.75rem" }}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} />
          </label>

          <label>
            Brief
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} required minLength={20} rows={6} />
          </label>

          <label>
            Deadline
            <input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} required />
          </label>

          <label>
            Prize (optional)
            <input value={prize} onChange={(event) => setPrize(event.target.value)} />
          </label>

          <label>
            Rubric JSON
            <textarea value={rubric} onChange={(event) => setRubric(event.target.value)} rows={8} required />
          </label>

          <button className="btn btn-primary" type="submit">Save Changes</button>
        </form>

        {message ? <p style={{ color: "#166534", fontWeight: 700 }}>{message}</p> : null}
        {error ? <p style={{ color: "#991b1b", fontWeight: 700 }}>{error}</p> : null}
      </section>
    </main>
  );
}
