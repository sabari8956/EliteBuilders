export default function Home() {
  return (
    <main className="site-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <section className="hero panel">
        <div className="tagline">Elite Builders</div>
        <h1>Built to last. Designed to impress.</h1>
        <p>
          We shape luxury homes and commercial spaces with precise execution,
          transparent timelines, and modern craftsmanship.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary" type="button">
            Request Estimate
          </button>
          <button className="btn btn-ghost" type="button">
            View Projects
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="panel stat-card">
          <span>Projects Completed</span>
          <strong>240+</strong>
        </article>
        <article className="panel stat-card">
          <span>Client Satisfaction</span>
          <strong>98%</strong>
        </article>
        <article className="panel stat-card">
          <span>Years in Business</span>
          <strong>14</strong>
        </article>
      </section>

      <section className="services-grid">
        <article className="panel service-card">
          <h2>Custom Residences</h2>
          <p>
            End-to-end home construction with premium finishes and architectural
            clarity.
          </p>
        </article>
        <article className="panel service-card">
          <h2>Commercial Fit-Outs</h2>
          <p>
            Scalable spaces engineered for brand presence, flow, and
            performance.
          </p>
        </article>
        <article className="panel service-card">
          <h2>Renovation & Expansion</h2>
          <p>
            Precision upgrades that elevate existing structures without
            disrupting your daily operations.
          </p>
        </article>
      </section>

      <section className="panel cta-banner">
        <h2>Start your next signature project with Elite Builders.</h2>
        <p>Consultations available this week for residential and commercial builds.</p>
      </section>
    </main>
  );
}
