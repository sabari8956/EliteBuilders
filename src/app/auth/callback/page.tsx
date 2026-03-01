"use client";

import { useEffect } from "react";

export default function AuthCallbackPage() {
  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const hashParams = new URLSearchParams(hash);
    const url = new URL(window.location.href);

    const code = url.searchParams.get("code");
    const role = url.searchParams.get("role") ?? "builder";
    const accessToken = hashParams.get("access_token") ?? url.searchParams.get("access_token");

    const redirect = new URL("/api/auth/callback", window.location.origin);
    redirect.searchParams.set("role", role);
    redirect.searchParams.set("next", "/");

    if (code) {
      redirect.searchParams.set("code", code);
    } else if (accessToken) {
      redirect.searchParams.set("access_token", accessToken);
    } else {
      window.location.replace("/?auth=callback-missing");
      return;
    }

    window.location.replace(redirect.toString());
  }, []);

  return (
    <main className="site-shell" style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>
      <section className="panel" style={{ padding: "1.25rem" }}>
        <h1>GitHub Sign-In</h1>
        <p>Completing sign-in...</p>
      </section>
    </main>
  );
}
