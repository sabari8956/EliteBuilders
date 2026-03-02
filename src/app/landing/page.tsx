"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GardenCanvas } from "./GardenCanvas";

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

export default function LandingPage() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const response = await fetch("/api/profile");
      const payload = (await response.json()) as ApiEnvelope<ProfilePayload>;
      if (!mounted) return;
      if (response.ok && payload.data) {
        setProfile(payload.data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    void load();
    return () => { mounted = false; };
  }, []);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.reload();
  }

  return (
    <>
      {/* ── WebGL background ── */}
      <GardenCanvas />

      {/* ── "Garden" title — dark CSS overlay matching the video ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "-0.18em",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "clamp(6rem, 21vw, 19rem)",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontWeight: 700,
          color: "rgba(255,255,255,0.065)",
          whiteSpace: "nowrap",
          zIndex: 1,
          pointerEvents: "none",
          userSelect: "none",
          letterSpacing: "-0.025em",
          lineHeight: 1,
        }}
      >
        Garden
      </div>

      {/* ── Hero (100 vh) ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-tagline">EliteBuilders</div>

          <h1 style={{ color: "#fff", maxWidth: "20ch", margin: "0 auto", lineHeight: 1.06 }}>
            Build. Compete. Get Ranked.
          </h1>

          <p style={{ color: "rgba(255,255,255,0.75)", maxWidth: "46ch", margin: "0 auto" }}>
            Submit your GitHub repo, get scored by autonomous AI agents, and
            climb the leaderboard — with human review to back it up.
          </p>

          {loading ? (
            <p style={{ color: "rgba(255,255,255,0.45)" }}>Loading session…</p>
          ) : null}

          {!loading && !profile ? (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
              <a className="btn btn-primary" href="/api/auth/github/start?role=builder">
                Sign in as Builder
              </a>
              <a className="btn lp-btn-ghost" href="/api/auth/github/start?role=sponsor">
                Sign in as Sponsor
              </a>
              <a className="btn lp-btn-ghost" href="/api/auth/github/start?role=evaluator">
                Sign in as Evaluator
              </a>
            </div>
          ) : null}

          {!loading && profile ? (
            <div
              className="panel"
              style={{
                padding: "1rem 1.25rem",
                display: "grid",
                gap: "0.55rem",
                background: "rgba(0,0,0,0.48)",
                border: "1px solid rgba(255,255,255,0.13)",
                maxWidth: 480,
                width: "100%",
              }}
            >
              <p style={{ color: "rgba(255,255,255,0.82)" }}>
                Signed in as{" "}
                <strong style={{ color: "#fff" }}>{profile.githubHandle}</strong>{" "}
                <span style={{ color: "rgba(255,255,255,0.45)" }}>({profile.role})</span>
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <Link className="btn lp-btn-ghost" href="/onboarding">
                  Profile
                </Link>
                {profile.role === "builder" ? (
                  <>
                    <Link className="btn btn-primary" href="/challenges">
                      Browse Challenges
                    </Link>
                    <Link className="btn lp-btn-ghost" href="/builder/dashboard">
                      My Submissions
                    </Link>
                  </>
                ) : null}
                {profile.role === "sponsor" ? (
                  <Link className="btn btn-primary" href="/sponsor/challenges">
                    Sponsor Dashboard
                  </Link>
                ) : null}
                {profile.role === "evaluator" ? (
                  <>
                    <Link className="btn btn-primary" href="/evaluator">
                      Evaluator Queue
                    </Link>
                    <Link className="btn lp-btn-ghost" href="/epic3">
                      Evaluation Hub
                    </Link>
                  </>
                ) : null}
                {profile.role === "admin" ? (
                  <>
                    <Link className="btn btn-primary" href="/admin">
                      Admin Dashboard
                    </Link>
                    <Link className="btn lp-btn-ghost" href="/sponsor/challenges">
                      Sponsor Dashboard
                    </Link>
                    <Link className="btn lp-btn-ghost" href="/evaluator">
                      Evaluator Queue
                    </Link>
                  </>
                ) : null}
                <button
                  className="btn lp-btn-ghost"
                  type="button"
                  onClick={() => void signOut()}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Below fold — dark glass panels ── */}
      <div className="lp-content">
        <section className="lp-features">
          {[
            {
              icon: "⚡",
              title: "For Builders",
              body: "Browse sponsor challenges, submit your GitHub repo, and get instant AI-powered scores. Climb the ranked leaderboard as you ship.",
            },
            {
              icon: "🎯",
              title: "For Sponsors",
              body: "Post bounties with custom rubrics. Our evaluation pipeline automatically screens submissions so you only review the best.",
            },
            {
              icon: "🤖",
              title: "AI Evaluation",
              body: "ReAct agents clone your repo into a sandbox, run tests, analyse code quality, and deliver a detailed score report in minutes.",
            },
          ].map((f) => (
            <div key={f.title} className="panel lp-feature-card">
              <span style={{ fontSize: "1.65rem" }}>{f.icon}</span>
              <h2 style={{ color: "#fff", fontSize: "1.08rem" }}>{f.title}</h2>
              <p style={{ color: "rgba(255,255,255,0.68)", fontSize: "0.91rem" }}>{f.body}</p>
            </div>
          ))}
        </section>

        <footer style={{ textAlign: "center", paddingBottom: "2rem" }}>
          <p style={{ color: "rgba(255,255,255,0.32)", fontSize: "0.8rem" }}>
            © {new Date().getFullYear()} EliteBuilders · Built for the 100x Hackathon
          </p>
        </footer>
      </div>

      {/* ── Scoped styles (no globals.css changes) ── */}
      <style>{`
        .lp-hero {
          position: relative;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          z-index: 2;
          padding: 1rem;
        }
        .lp-hero-inner {
          display: grid;
          gap: 1.2rem;
          align-items: center;
          justify-items: center;
          max-width: 680px;
          width: 100%;
        }
        .lp-tagline {
          width: fit-content;
          padding: 0.38rem 0.9rem;
          background: rgba(255,255,255,0.11);
          border: 1px solid rgba(255,255,255,0.26);
          border-radius: 999px;
          color: #fff;
          font-size: 0.77rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 700;
        }
        .lp-btn-ghost {
          color: #fff;
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.32) !important;
        }
        .lp-btn-ghost:hover {
          background: rgba(255,255,255,0.17);
        }
        .lp-content {
          position: relative;
          z-index: 2;
          padding: 0 1rem 4rem;
          width: min(1080px, 92vw);
          margin: 0 auto;
          display: grid;
          gap: 1.2rem;
        }
        .lp-features {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.15rem;
        }
        .lp-feature-card {
          padding: 1.5rem;
          display: grid;
          gap: 0.65rem;
          background: rgba(0,0,0,0.44) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        @media (max-width: 900px) {
          .lp-features { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
