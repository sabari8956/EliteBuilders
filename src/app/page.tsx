"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProfilePayload = {
  userId: string;
  githubHandle: string;
  role: "builder" | "sponsor" | "evaluator" | "admin";
  profile: {
    githubUrl: string;
    portfolioUrl: string;
    cvMetadata?: string;
  } | null;
};

type ApiEnvelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

export default function Home() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const response = await fetch("/api/profile");
      const payload = (await response.json()) as ApiEnvelope<ProfilePayload>;

      if (!mounted) {
        return;
      }

      if (response.ok && payload.data) {
        setProfile(payload.data);
      } else {
        setProfile(null);
      }

      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.reload();
  }

  return (
    <main className="site-shell" style={{ maxWidth: 980, margin: "0 auto", padding: "2.2rem 1rem" }}>
      <section className="panel hero" style={{ padding: "1.5rem", gap: "1rem" }}>
        <div className="tagline">100x Hackathon Platform</div>
        <h1>GitHub OAuth, Role-Based Access, Challenge CRUD</h1>
        <p>
          Epic 1 foundation is live with Supabase-backed APIs for profile onboarding,
          challenge lifecycle management, and deterministic submissions.
        </p>

        {loading ? <p>Loading session...</p> : null}

        {!loading && !profile ? (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a className="btn btn-primary" href="/api/auth/github/start?role=builder">
              Sign in with GitHub (Builder)
            </a>
            <a className="btn btn-ghost" href="/api/auth/github/start?role=sponsor">
              Sign in with GitHub (Sponsor)
            </a>
          </div>
        ) : null}

        {!loading && profile ? (
          <div className="panel" style={{ padding: "1rem", display: "grid", gap: "0.55rem" }}>
            <p>
              Signed in as <strong>{profile.githubHandle}</strong> ({profile.role})
            </p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <Link className="btn btn-ghost" href="/onboarding">
                Onboarding Profile
              </Link>
              {profile.role === "sponsor" || profile.role === "admin" ? (
                <Link className="btn btn-primary" href="/sponsor/challenges">
                  Sponsor Dashboard
                </Link>
              ) : null}
              <button className="btn btn-ghost" type="button" onClick={() => void signOut()}>
                Sign Out
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel" style={{ padding: "1.25rem", display: "grid", gap: "0.65rem" }}>
        <h2>Core API Paths</h2>
        <p>
          <code>/api/profile</code>, <code>/api/challenges</code>, <code>/api/challenges/:id</code>,
          <code>/api/challenges/:id/publish</code>, <code>/api/submissions</code>, <code>/api/submissions/:id</code>
        </p>
      </section>
    </main>
  );
}
