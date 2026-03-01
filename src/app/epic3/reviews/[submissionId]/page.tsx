"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ApiEnvelope<T> = {
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
};

type SubmissionPayload = {
  submission: {
    id: string;
    state: string;
    ai_score: number | null;
    final_score: number | null;
    human_score: number | null;
    finalized_at: string | null;
    finalization_notes: string | null;
  };
  report: {
    evaluator_report: string;
    builder_report: string;
  } | null;
};

export default function Epic3ReviewPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const [submissionId, setSubmissionId] = useState<string>("submission-demo-001");
  const [payload, setPayload] = useState<SubmissionPayload | null>(null);
  const [humanScore, setHumanScore] = useState<number>(85);
  const [notes, setNotes] = useState<string>("Solid implementation with clear guardrails.");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setError(null);
    const response = await fetch(`/api/epic3/submissions/${id}`);
    const json = (await response.json()) as ApiEnvelope<SubmissionPayload>;

    if (json.error || !json.data) {
      setError(json.error?.message ?? "Failed to load submission.");
      return;
    }

    setPayload(json.data);
  }, []);

  useEffect(() => {
    params.then((value) => {
      setSubmissionId(value.submissionId);
      void load(value.submissionId);
    });
  }, [params, load]);

  async function submitFinalization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("Submitting final score...");

    const response = await fetch(`/api/epic3/submissions/${submissionId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evaluator_id: "evaluator-demo",
        human_score: humanScore,
        notes,
      }),
    });

    const json = (await response.json()) as ApiEnvelope<{ submission: unknown }>;

    if (json.error) {
      setError(json.error.message);
      setStatus(null);
      return;
    }

    setStatus("Finalization saved.");
    await load(submissionId);
  }

  return (
    <main className="site-shell">
      <section className="panel hero">
        <div className="tagline">Epic 3 Review</div>
        <h1>Evaluator Finalization Console</h1>
        <p>
          Review AI report, submit human score, and finalize using the strict
          80/20 formula.
        </p>

        {payload ? (
          <div className="panel" style={{ padding: "1rem", display: "grid", gap: "0.7rem" }}>
            <strong>Submission: {payload.submission.id}</strong>
            <span>State: {payload.submission.state}</span>
            <span>AI Score: {payload.submission.ai_score ?? "n/a"}</span>
            <span>Human Score: {payload.submission.human_score ?? "n/a"}</span>
            <span>Final Score: {payload.submission.final_score ?? "n/a"}</span>
          </div>
        ) : null}

        <form onSubmit={submitFinalization} className="panel" style={{ padding: "1rem", display: "grid", gap: "0.7rem" }}>
          <label>
            Human score (0-100)
            <input
              type="number"
              min={0}
              max={100}
              value={humanScore}
              onChange={(event) => setHumanScore(Number(event.target.value))}
              style={{ width: "100%", marginTop: "0.4rem", padding: "0.45rem" }}
            />
          </label>
          <label>
            Finalization notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              style={{ width: "100%", marginTop: "0.4rem", padding: "0.45rem" }}
            />
          </label>

          <button className="btn btn-primary" type="submit">
            Finalize Submission
          </button>
        </form>

        {status ? <p>{status}</p> : null}
        {error ? <p style={{ color: "#7f1d1d", fontWeight: 700 }}>Error: {error}</p> : null}
      </section>

      {payload?.report ? (
        <section className="panel" style={{ padding: "1.5rem", display: "grid", gap: "0.8rem" }}>
          <h2>Evaluator Report</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{payload.report.evaluator_report}</pre>
          <h2>Builder Report (Redacted)</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{payload.report.builder_report}</pre>
        </section>
      ) : null}
    </main>
  );
}
