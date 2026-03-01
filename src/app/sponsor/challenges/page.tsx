"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Challenge = {
  id: string;
  title: string;
  brief: string;
  deadline: string;
  prize?: string;
  status: "draft" | "published";
  createdAt: string;
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
      setLoading(true);
      setError(null);
      const query = new URLSearchParams();
      query.set("mine", "true");
      if (status !== "all") {
        query.set("status", status);
      }

      const response = await fetch(`/api/challenges?${query.toString()}`);
      const payload = (await response.json()) as ApiEnvelope<{ items: Challenge[] }>;

      if (cancelled) {
        return;
      }

      if (!response.ok || payload.error || !payload.data) {
        setError(payload.error?.message ?? "Unable to load challenges.");
        setLoading(false);
        return;
      }

      setItems(payload.data.items);
      setLoading(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [status, reloadKey]);

  async function publish(id: string) {
    setError(null);
    const response = await fetch(`/api/challenges/${id}/publish`, { method: "POST" });
    const payload = (await response.json()) as ApiEnvelope<{ id: string }>;

    if (!response.ok || payload.error) {
      setError(payload.error?.message ?? "Unable to publish challenge.");
      return;
    }

    setReloadKey((value) => value + 1);
  }

  async function remove(id: string) {
    setError(null);
    const response = await fetch(`/api/challenges/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as ApiEnvelope<{ deleted: boolean }>;

    if (!response.ok || payload.error) {
      setError(payload.error?.message ?? "Unable to delete challenge.");
      return;
    }

    setReloadKey((value) => value + 1);
  }

  const emptyMessage = useMemo(() => {
    if (status === "draft") {
      return "No draft challenges yet.";
    }
    if (status === "published") {
      return "No published challenges yet.";
    }
    return "No challenges yet.";
  }, [status]);

  return (
    <main className="site-shell" style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1rem" }}>
      <section className="panel" style={{ padding: "1.25rem", display: "grid", gap: "0.8rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <h1>Sponsor Challenge Dashboard</h1>
            <p>Manage your draft and published challenges.</p>
          </div>
          <Link className="btn btn-primary" href="/sponsor/challenges/new">
            New Challenge
          </Link>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => setStatus("all")} type="button">All</button>
          <button className="btn btn-ghost" onClick={() => setStatus("draft")} type="button">Draft</button>
          <button className="btn btn-ghost" onClick={() => setStatus("published")} type="button">Published</button>
        </div>

        {error ? <p style={{ color: "#991b1b", fontWeight: 700 }}>{error}</p> : null}

        {loading ? <p>Loading challenges...</p> : null}

        {!loading && items.length === 0 ? <p>{emptyMessage}</p> : null}

        {!loading
          ? items.map((item) => (
              <article key={item.id} className="panel" style={{ padding: "1rem", display: "grid", gap: "0.55rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "1.2rem" }}>{item.title}</h2>
                  <span className="tagline">{item.status}</span>
                </div>

                <p>{item.brief}</p>
                <p>Deadline: {new Date(item.deadline).toLocaleString()}</p>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <Link className="btn btn-ghost" href={`/sponsor/challenges/${item.id}/edit`}>
                    Edit
                  </Link>
                  {item.status === "draft" ? (
                    <>
                      <button className="btn btn-primary" onClick={() => void publish(item.id)} type="button">
                        Publish
                      </button>
                      <button className="btn btn-ghost" onClick={() => void remove(item.id)} type="button">
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))
          : null}
      </section>
    </main>
  );
}
