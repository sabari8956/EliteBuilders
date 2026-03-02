"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { btnTap, fadeIn, listContainer, listItem, pageIn } from "../../../components/animations";

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string; details?: unknown } | null };
type LeaderboardData = {
  challenge: { id: string; title: string };
  mode: "provisional" | "final";
  entries: { rank: number; submission_id: string; builder_id: string; score: number; state: string; updated_at: string }[];
};

export default function Epic3LeaderboardPage({ params }: { params: Promise<{ challengeId: string }> }) {
  const [challengeId, setChallengeId] = useState("challenge-demo-001");
  const [mode, setMode]   = useState<"provisional" | "final">("provisional");
  const [data, setData]   = useState<LeaderboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { params.then((v) => setChallengeId(v.challengeId)); }, [params]);

  const url = useMemo(() => `/api/epic3/challenges/${challengeId}/leaderboard?mode=${mode}`, [challengeId, mode]);

  useEffect(() => {
    async function load() {
      setError(null);
      const response = await fetch(url);
      const json = (await response.json()) as ApiEnvelope<LeaderboardData>;
      if (json.error || !json.data) { setError(json.error?.message ?? "Failed to load leaderboard"); return; }
      setData(json.data);
    }
    void load();
  }, [url]);

  return (
    <motion.main className="site-shell" {...pageIn}>

      <div className="page-header">
        <div className="page-header-meta">
          <h1>{data?.challenge.title ?? "Leaderboard"}</h1>
          <p style={{ marginTop: "0.4rem" }}>
            {mode === "provisional"
              ? "AI-scored ranking — subject to change after human review."
              : "Final ranking — immutable 80/20 weighted scores."}
          </p>
        </div>
        {/* Mode toggle */}
        <div style={{ display: "flex", gap: "0.4rem", alignSelf: "center" }}>
          {(["provisional", "final"] as const).map((m) => (
            <motion.button
              key={m}
              {...btnTap}
              type="button"
              onClick={() => setMode(m)}
              className="btn btn-ghost"
              style={{
                fontSize: "0.78rem", padding: "0.38rem 0.9rem",
                background: mode === m ? "var(--ink)" : undefined,
                color: mode === m ? "#fff" : undefined,
                borderColor: mode === m ? "transparent" : undefined,
              }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <AnimatePresence mode="wait">
        {data ? (
          <motion.div
            key={mode}
            className="panel"
            style={{ padding: "0 1.5rem" }}
            variants={fadeIn} initial="hidden" animate="show" exit="hidden"
          >
            {data.entries.length === 0 ? (
              <p style={{ padding: "2rem 0", color: "var(--ink-3)", textAlign: "center" }}>No entries for this mode yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>Rank</th>
                    <th>Submission</th>
                    <th>Builder</th>
                    <th style={{ textAlign: "right" }}>Score</th>
                    <th>State</th>
                  </tr>
                </thead>
                <motion.tbody variants={listContainer} initial="hidden" animate="show">
                  {data.entries.map((entry) => {
                    const rankCls = entry.rank === 1 ? "rank-1" : entry.rank === 2 ? "rank-2" : entry.rank === 3 ? "rank-3" : "";
                    return (
                      <motion.tr key={entry.submission_id} variants={listItem}>
                        <td><span className={rankCls}>{entry.rank}</span></td>
                        <td><code style={{ fontSize: "0.78rem" }}>{entry.submission_id}</code></td>
                        <td style={{ color: "var(--ink)" }}>{entry.builder_id}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.92rem" }}>{entry.score}</td>
                        <td><span className="chip chip-neutral">{entry.state}</span></td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

    </motion.main>
  );
}
