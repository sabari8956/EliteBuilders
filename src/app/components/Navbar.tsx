"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Profile = {
  role: "builder" | "sponsor" | "evaluator" | "admin";
  githubHandle: string;
};

type ApiEnvelope<T> = { data: T | null; error: { code: string; message: string } | null };

const MotionLink = motion(Link);

const itemMotion = {
  whileHover: { scale: 1.04, transition: { duration: 0.14 } },
  whileTap:   { scale: 0.93, transition: { duration: 0.10 } },
};

function NavLink({ href, children, cta }: { href: string; children: React.ReactNode; cta?: boolean }) {
  return (
    <MotionLink {...itemMotion} href={href} className={cta ? "navbar-cta" : undefined}>
      {children}
    </MotionLink>
  );
}

function NavButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button {...itemMotion} type="button" onClick={onClick}>
      {children}
    </motion.button>
  );
}

export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((payload: ApiEnvelope<Profile>) => {
        if (payload.data) setProfile(payload.data);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <motion.nav
      className="navbar"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.44, ease: [0.4, 0, 0.2, 1] }}
    >
      <MotionLink {...itemMotion} href="/" className="navbar-brand">
        EliteBuilders
      </MotionLink>

      <motion.div
        className="navbar-links"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.28, delay: 0.18 }}
      >
        {ready && !profile ? (
          <>
            <NavLink href="/challenges">Challenges</NavLink>
            <NavLink href="/api/auth/github/start?role=builder" cta>Sign In</NavLink>
          </>
        ) : null}

        {ready && profile?.role === "builder" ? (
          <>
            <NavLink href="/challenges">Challenges</NavLink>
            <NavLink href="/builder/dashboard">My Submissions</NavLink>
            <NavButton onClick={() => void signOut()}>Sign Out</NavButton>
          </>
        ) : null}

        {ready && profile?.role === "sponsor" ? (
          <>
            <NavLink href="/sponsor/challenges">Dashboard</NavLink>
            <NavButton onClick={() => void signOut()}>Sign Out</NavButton>
          </>
        ) : null}

        {ready && profile?.role === "evaluator" ? (
          <>
            <NavLink href="/evaluator">Queue</NavLink>
            <NavLink href="/epic3">Eval Hub</NavLink>
            <NavButton onClick={() => void signOut()}>Sign Out</NavButton>
          </>
        ) : null}

        {ready && profile?.role === "admin" ? (
          <>
            <NavLink href="/admin">Admin</NavLink>
            <NavLink href="/challenges">Challenges</NavLink>
            <NavLink href="/evaluator">Queue</NavLink>
            <NavButton onClick={() => void signOut()}>Sign Out</NavButton>
          </>
        ) : null}
      </motion.div>
    </motion.nav>
  );
}
