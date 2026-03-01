"use client";

import { FormEvent, useState } from "react";

type SaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message?: string;
};

export default function OnboardingPage() {
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [cvMetadata, setCvMetadata] = useState("");
  const [state, setState] = useState<SaveState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "saving" });

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        githubUrl,
        portfolioUrl,
        cvMetadata: cvMetadata || undefined,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setState({
        status: "error",
        message: payload?.error?.message ?? "Unable to save profile.",
      });
      return;
    }

    setState({ status: "saved", message: "Profile saved." });
  }

  return (
    <main className="site-shell" style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <section className="panel" style={{ padding: "1.25rem" }}>
        <h1>Onboarding</h1>
        <p>Add profile metadata for challenge participation.</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <label>
            GitHub URL
            <input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} required type="url" />
          </label>
          <label>
            Portfolio URL
            <input value={portfolioUrl} onChange={(event) => setPortfolioUrl(event.target.value)} required type="url" />
          </label>
          <label>
            CV metadata (optional)
            <input value={cvMetadata} onChange={(event) => setCvMetadata(event.target.value)} maxLength={250} />
          </label>

          <button className="btn btn-primary" type="submit" disabled={state.status === "saving"}>
            {state.status === "saving" ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {state.status === "error" ? <p style={{ color: "#f87171" }}>{state.message}</p> : null}
        {state.status === "saved" ? <p style={{ color: "#4ade80" }}>{state.message}</p> : null}
      </section>
    </main>
  );
}
