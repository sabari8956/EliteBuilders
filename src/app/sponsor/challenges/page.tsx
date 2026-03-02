"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { btnTap, cardHover, listContainer, listItem, pageIn } from "../../components/animations";

type Challenge = {
  id: string; title: string; brief: string; deadline: string;
  prize?: string; status: "draft" | "published"; createdAt: string;
};
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

export default function SponsorChallengesPage() {
  const [items, setItems] = useState<Challenge[]>([]);
  const [status, setStatus] = useState<"all" | "draft" | "published">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true); setError(null);
      const q = new URLSearchParams({ mine: "true" });
      if (status !== "all") q.set("status", status);
      const response = await fetch(`/api/challenges?${q.toString()}`);
      const payload = (await response.json()) as ApiEnvelope<{ items: Challenge[] }>;
      if (cancelled) return;
      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "Unable to load challenges.");
        setLoading(false); return;
      }
      setItems(payload.data.items); setLoading(false);
    }
    void run();
    return () => { cancelled = true; };
  }, [status, reloadKey]);

  async function publish(id: string) {
    const r = await fetch(`/api/challenges/${id}/publish`, { method: "POST" });
    const p = (await r.json()) as ApiEnvelope<{ id: string }>;
    if (!r.ok || p.error) { setError(p.error?.message ?? "Unable to publish."); return; }
    setReloadKey((k) => k + 1);
  }

  async function remove(id: string) {
    const r = await fetch(`/api/challenges/${id}`, { method: "DELETE" });
    const p = (await r.json()) as ApiEnvelope<{ deleted: boolean }>;
    if (!r.ok || p.error) { setError(p.error?.message ?? "Unable to delete."); return; }
    setReloadKey((k) => k + 1);
  }

  const emptyMsg = useMemo(() => {
    if (status === "draft") return "No draft challenges.";
    if (status === "published") return "No published challenges.";
    return "No challenges yet.";
  }, [status]);

  return (
    <motion.main className="site-shell" {...pageIn}>

      <div className="page-header">
        <div className="page-header-meta">
          <h1>Sponsor Dashboard</h1>
          <p style={{ marginTop: "0.4rem" }}>Manage your draft and published challenges.</p>
        </div>
        <motion.div {...btnTap}>
          <Link className="btn btn-primary" href="/sponsor/challenges/new">+ New Challenge</Link>
        </motion.div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {(["all", "draft", "published"] as const).map((tab) => (
          <motion.button
            key={tab}
            {...btnTap}
            type="button"
            onClick={() => setStatus(tab)}
            className="btn btn-ghost"
            style={{
              padding: "0.38rem 0.9rem",
              fontSize: "0.78rem",
              background: status === tab ? "var(--ink)" : undefined,
              color: status === tab ? "#fff" : undefined,
              borderColor: status === tab ? "transparent" : undefined,
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </motion.button>
        ))}
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p style={{ color: "var(--ink-3)" }}>Loading…</p> : null}
      {!loading && items.length === 0 ? <p style={{ color: "var(--ink-3)" }}>{emptyMsg}</p> : null}

      <motion.div
        style={{ display: "grid", gap: "0.75rem" }}
        variants={listContainer} initial="hidden" animate={loading ? "hidden" : "show"}
      >
        {items.map((item) => (
          <motion.article
            key={item.id}
            className="panel"
            variants={listItem}
            {...cardHover}
            style={{ padding: "1.4rem 1.6rem", display: "grid", gap: "0.75rem" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: "0.3rem" }}>
                <h2 style={{ fontSize: "1.1rem" }}>{item.title}</h2>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                  DEADLINE · {new Date(item.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {item.prize ? ` · ${item.prize}` : ""}
                </p>
              </div>
              <span className={item.status === "published" ? "chip chip-success" : "chip chip-neutral"}>
                {item.status}
              </span>
            </div>

            <p style={{ fontSize: "0.875rem" }}>{item.brief}</p>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <motion.div {...btnTap}>
                <Link className="btn btn-ghost" href={`/sponsor/challenges/${item.id}`} style={{ fontSize: "0.8rem", padding: "0.42rem 0.9rem" }}>
                  View Submissions →
                </Link>
              </motion.div>
              <motion.div {...btnTap}>
                <Link className="btn btn-ghost" href={`/sponsor/challenges/${item.id}/edit`} style={{ fontSize: "0.8rem", padding: "0.42rem 0.9rem" }}>
                  Edit
                </Link>
              </motion.div>
              {item.status === "published" ? (
                <motion.div {...btnTap}>
                  <Link className="btn btn-ghost" href={`/leaderboard/${item.id}`} style={{ fontSize: "0.8rem", padding: "0.42rem 0.9rem" }}>
                    Leaderboard
                  </Link>
                </motion.div>
              ) : null}
              {item.status === "draft" ? (
                <>
                  <motion.button {...btnTap} className="btn btn-primary" type="button" onClick={() => void publish(item.id)} style={{ fontSize: "0.8rem", padding: "0.42rem 0.9rem" }}>
                    Publish
                  </motion.button>
                  <motion.button {...btnTap} className="btn btn-ghost" type="button" onClick={() => void remove(item.id)} style={{ fontSize: "0.8rem", padding: "0.42rem 0.9rem", color: "var(--c-danger)", borderColor: "rgba(220,38,38,0.2)" }}>
                    Delete
                  </motion.button>
                </>
              ) : null}
            </div>
          </motion.article>
        ))}
      </motion.div>

    </motion.main>
  );
}
