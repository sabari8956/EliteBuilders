"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function NewChallengePage() {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [deadline, setDeadline] = useState("");
  const [prize, setPrize] = useState("");
  const [rubric, setRubric] = useState('{"innovation": 40, "technical_quality": 60}');
  const [result, setResult] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setCreatedId(null);

    let rubricJson: Record<string, unknown>;

    try {
      rubricJson = JSON.parse(rubric);
    } catch {
      setResult("Rubric must be valid JSON.");
      return;
    }

    const response = await fetch("/api/challenges", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        brief,
        deadline: new Date(deadline).toISOString(),
        rubric: rubricJson,
        prize: prize || undefined,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setResult(payload?.error?.message ?? "Failed to create challenge.");
      return;
    }

    setCreatedId(payload.data.id);
    setResult(`Challenge created: ${payload.data.id}`);
  }

  return (
    <main className="site-shell" style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>
      <section className="panel" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <h1>Create Challenge</h1>
            <p>Sponsor-only draft challenge creation form.</p>
          </div>
          <Link className="btn btn-ghost" href="/sponsor/challenges">
            Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} />
          </label>
          <label>
            Brief
            <textarea value={brief} onChange={(event) => setBrief(event.target.value)} required minLength={20} rows={5} />
          </label>
          <label>
            Deadline
            <input value={deadline} onChange={(event) => setDeadline(event.target.value)} type="datetime-local" required />
          </label>
          <label>
            Prize (optional)
            <input value={prize} onChange={(event) => setPrize(event.target.value)} />
          </label>
          <label>
            Rubric JSON
            <textarea value={rubric} onChange={(event) => setRubric(event.target.value)} rows={5} required />
          </label>

          <button className="btn btn-primary" type="submit">Create Draft Challenge</button>
        </form>

        {result ? <p style={{ marginTop: "0.75rem" }}>{result}</p> : null}
        {createdId ? (
          <p style={{ marginTop: "0.35rem" }}>
            <Link href={`/sponsor/challenges/${createdId}/edit`}>Open challenge editor</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
