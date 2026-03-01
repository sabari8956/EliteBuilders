"use client";

import { useEffect, useMemo, useState } from "react";

type ApiEnvelope<T> = {
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
};

type LeaderboardData = {
  challenge: { id: string; title: string };
  mode: "provisional" | "final";
  entries: {
    rank: number;
    submission_id: string;
    builder_id: string;
    score: number;
    state: string;
    updated_at: string;
  }[];
};

export default function Epic3LeaderboardPage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const [challengeId, setChallengeId] = useState("challenge-demo-001");
  const [mode, setMode] = useState<"provisional" | "final">("provisional");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => {
      setChallengeId(value.challengeId);
    });
  }, [params]);

  const url = useMemo(
    () => `/api/epic3/challenges/${challengeId}/leaderboard?mode=${mode}`,
    [challengeId, mode],
  );

  useEffect(() => {
    async function load() {
      setError(null);
      const response = await fetch(url);
      const json = (await response.json()) as ApiEnvelope<LeaderboardData>;
      if (json.error || !json.data) {
        setError(json.error?.message ?? "Failed to load leaderboard");
        return;
      }

      setData(json.data);
    }

    void load();
  }, [url]);

  return (
    <main className="site-shell">
      <section className="panel hero">
        <div className="tagline">Epic 3 Leaderboard</div>
        <h1>Provisional and Final Rankings</h1>
        <p>
          Provisional ranking uses AI score after autonomous evaluation. Final
          ranking uses immutable 80/20 finalized score.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            onClick={() => setMode("provisional")}
            className="btn btn-primary"
            disabled={mode === "provisional"}
          >
            Provisional
          </button>
          <button
            type="button"
            onClick={() => setMode("final")}
            className="btn btn-ghost"
            disabled={mode === "final"}
          >
            Final
          </button>
        </div>

        {error ? <p style={{ color: "#7f1d1d", fontWeight: 700 }}>{error}</p> : null}
      </section>

      {data ? (
        <section className="panel" style={{ padding: "1.5rem", display: "grid", gap: "0.8rem" }}>
          <h2>{data.challenge.title}</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Rank</th>
                <th align="left">Submission</th>
                <th align="left">Builder</th>
                <th align="left">Score</th>
                <th align="left">State</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.submission_id}>
                  <td>{entry.rank}</td>
                  <td>{entry.submission_id}</td>
                  <td>{entry.builder_id}</td>
                  <td>{entry.score}</td>
                  <td>{entry.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.entries.length === 0 ? <p>No entries in this mode yet.</p> : null}
        </section>
      ) : null}
    </main>
  );
}
