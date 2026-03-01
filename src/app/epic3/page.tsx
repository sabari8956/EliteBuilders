import Link from "next/link";

export default function Epic3IndexPage() {
  return (
    <main className="site-shell">
      <section className="panel hero">
        <div className="tagline">Epic 3 Sandbox</div>
        <h1>Autonomous Evaluation Pipeline</h1>
        <p>
          This is a standalone implementation surface for worker leasing, AI scoring,
          human finalization, and leaderboard publication.
        </p>

        <div className="hero-actions">
          <Link className="btn btn-primary" href="/epic3/worker">
            Open Worker Console
          </Link>
          <Link
            className="btn btn-ghost"
            href="/epic3/reviews/submission-demo-001"
          >
            Open Evaluator Review
          </Link>
          <Link
            className="btn btn-ghost"
            href="/epic3/leaderboard/challenge-demo-001"
          >
            Open Leaderboard
          </Link>
        </div>
      </section>
    </main>
  );
}
