"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { btnTap, listContainer, listItem, pageIn } from "../components/animations";

const LINKS = [
  { href: "/epic3/worker",                      label: "Worker Console",   desc: "Trigger evaluation jobs and inspect the queue." },
  { href: "/epic3/reviews/submission-demo-001", label: "Evaluator Review", desc: "Score a submission and finalize with human review." },
  { href: "/epic3/leaderboard/challenge-demo-001", label: "Leaderboard",  desc: "View provisional and finalized rankings." },
];

export default function Epic3IndexPage() {
  return (
    <motion.main className="site-shell" {...pageIn}>

      <div className="page-header">
        <div className="page-header-meta">
          <span className="tagline" style={{ marginBottom: "0.6rem" }}>Epic 3</span>
          <h1>Evaluation Hub</h1>
          <p style={{ marginTop: "0.4rem" }}>Autonomous AI evaluation pipeline — worker console, human review, and leaderboard.</p>
        </div>
      </div>

      <motion.div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}
        variants={listContainer} initial="hidden" animate="show"
      >
        {LINKS.map((l) => (
          <motion.div key={l.href} variants={listItem} {...{ whileHover: { y: -4 }, whileTap: { scale: 0.985 } }}>
            <Link href={l.href} style={{ textDecoration: "none" }}>
              <div className="panel" style={{ padding: "1.5rem", display: "grid", gap: "0.5rem", height: "100%" }}>
                <h2 style={{ fontSize: "1rem" }}>{l.label}</h2>
                <p style={{ fontSize: "0.875rem" }}>{l.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

    </motion.main>
  );
}
