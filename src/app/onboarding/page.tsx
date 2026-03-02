"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FormEvent, useState } from "react";
import { btnTap, fadeIn, pageIn } from "../components/animations";

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

export default function OnboardingPage() {
  const [githubUrl, setGithubUrl]     = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [cvMetadata, setCvMetadata]   = useState("");
  const [state, setState]             = useState<SaveState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "saving" });
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ githubUrl, portfolioUrl, cvMetadata: cvMetadata || undefined }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setState({ status: "error", message: payload?.error?.message ?? "Unable to save profile." }); return;
    }
    setState({ status: "saved", message: "Profile saved." });
  }

  return (
    <motion.main className="site-shell" style={{ maxWidth: 600 }} {...pageIn}>

      <div className="page-header" style={{ paddingBottom: "1.25rem" }}>
        <div className="page-header-meta">
          <h1>Profile Setup</h1>
          <p style={{ marginTop: "0.3rem" }}>Add your details for challenge participation.</p>
        </div>
      </div>

      <motion.div className="panel" style={{ padding: "1.75rem" }} variants={fadeIn} initial="hidden" animate="show">
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: "1rem" }}>
          <label>
            GitHub Profile URL
            <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} required type="url" placeholder="https://github.com/your-handle" />
          </label>
          <label>
            Portfolio URL
            <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} required type="url" placeholder="https://your-portfolio.com" />
          </label>
          <label>
            CV / Bio <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>(optional · max 250 chars)</span>
            <input value={cvMetadata} onChange={(e) => setCvMetadata(e.target.value)} maxLength={250} placeholder="Short bio or relevant background…" />
          </label>

          <AnimatePresence mode="wait">
            {state.status === "error" ? (
              <motion.p key="err" className="error-text" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {state.message}
              </motion.p>
            ) : state.status === "saved" ? (
              <motion.p key="ok" className="success-text" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {state.message}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <motion.button {...btnTap} className="btn btn-primary" type="submit" disabled={state.status === "saving"}>
            {state.status === "saving" ? "Saving…" : "Save Profile"}
          </motion.button>
        </form>
      </motion.div>

    </motion.main>
  );
}
