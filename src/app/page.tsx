"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { btnTap, fadeIn, listContainer, listItem, pageIn } from "./components/animations";

type ProfilePayload = {
  userId: string;
  githubHandle: string;
  role: "builder" | "sponsor" | "evaluator" | "admin";
  profile: { githubUrl: string; portfolioUrl: string; cvMetadata?: string } | null;
};
type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

const ROLE_LINKS: Record<string, { href: string; label: string; primary?: boolean }[]> = {
  builder:   [{ href: "/challenges", label: "Browse Challenges", primary: true }, { href: "/builder/dashboard", label: "My Submissions" }],
  sponsor:   [{ href: "/sponsor/challenges", label: "Sponsor Dashboard", primary: true }],
  evaluator: [{ href: "/evaluator", label: "Review Queue", primary: true }, { href: "/epic3", label: "Eval Hub" }],
  admin:     [{ href: "/admin", label: "Admin", primary: true }, { href: "/sponsor/challenges", label: "Sponsor" }, { href: "/evaluator", label: "Queue" }],
};

const STEPS = [
  { n: "01", title: "Browse", body: "Sponsors post challenges with prize pools and AI-graded rubrics." },
  { n: "02", title: "Build & Submit", body: "Builders submit their GitHub repo before the deadline closes." },
  { n: "03", title: "Get Scored", body: "Autonomous AI agents evaluate your project, then human review finalises the score." },
];

export default function Home() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((payload: ApiEnvelope<ProfilePayload>) => {
        if (!mounted) return;
        setProfile(payload.data);
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.reload();
  }

  const links = profile ? ROLE_LINKS[profile.role] ?? [] : [];

  return (
    <motion.main className="site-shell" {...pageIn}>

      {/* ── HERO ── */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2rem", alignItems: "start" }}>
        <div style={{ display: "grid", gap: "1rem" }}>
          <span className="tagline">EliteBuilders</span>
          <h1 style={{ fontSize: "clamp(2.4rem, 6vw, 4.2rem)", maxWidth: "14ch" }}>
            Compete.<br />Build.<br />Get Evaluated.
          </h1>
          <p style={{ fontSize: "1.05rem", maxWidth: "44ch" }}>
            Open challenges. Autonomous AI scoring. Human-validated final scores. The arena for elite builders.
          </p>
        </div>

        {/* Auth panel */}
        <motion.div
          className="panel"
          style={{ padding: "1.75rem", minWidth: 280, display: "grid", gap: "1rem" }}
          variants={fadeIn} initial="hidden" animate="show"
        >
          {loading ? (
            <p style={{ color: "var(--ink-3)", fontSize: "0.875rem" }}>Loading…</p>
          ) : !profile ? (
            <>
              <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>Sign in to get started</p>
              <div style={{ display: "grid", gap: "0.55rem" }}>
                {(["builder", "sponsor", "evaluator"] as const).map((role) => (
                  <motion.a
                    key={role}
                    {...btnTap}
                    className={role === "builder" ? "btn btn-primary" : "btn btn-ghost"}
                    href={`/api/auth/github/start?role=${role}`}
                    style={{ justifyContent: "flex-start" }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: "0.3rem" }}>
                      {role}
                    </span>
                    Sign in with GitHub
                  </motion.a>
                ))}
              </div>
            </>
          ) : (
            <>
              <div>
                <p style={{ fontSize: "0.82rem", color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Signed in as</p>
                <p style={{ fontWeight: 700, marginTop: "0.2rem" }}>{profile.githubHandle}</p>
                <span className="chip chip-neutral" style={{ marginTop: "0.4rem" }}>{profile.role}</span>
              </div>
              <hr className="divider" />
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {links.map((l) => (
                  <motion.div key={l.href} {...btnTap}>
                    <Link
                      className={l.primary ? "btn btn-primary" : "btn btn-ghost"}
                      href={l.href}
                      style={{ width: "100%", justifyContent: "flex-start" }}
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div {...btnTap}>
                  <Link className="btn btn-ghost" href="/onboarding" style={{ width: "100%", justifyContent: "flex-start" }}>
                    Edit Profile
                  </Link>
                </motion.div>
                <motion.button {...btnTap} className="btn btn-ghost" type="button" onClick={() => void signOut()} style={{ width: "100%", justifyContent: "flex-start" }}>
                  Sign Out
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <motion.section
        className="panel"
        style={{ padding: "2rem 2.4rem" }}
        variants={listContainer} initial="hidden" animate="show"
      >
        <motion.p
          variants={listItem}
          style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: "1.5rem" }}
        >
          How it works
        </motion.p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem" }}>
          {STEPS.map((s) => (
            <motion.div key={s.n} variants={listItem} style={{ display: "grid", gap: "0.5rem" }}>
              <p className="step-number">{s.n}</p>
              <h3 style={{ fontSize: "1.05rem" }}>{s.title}</h3>
              <p style={{ fontSize: "0.875rem" }}>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

    </motion.main>
  );
}
