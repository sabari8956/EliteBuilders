export default function DashboardPage() {
  return (
    <main className="site-shell" style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <section className="panel" style={{ padding: "1.25rem" }}>
        <h1>Private Dashboard</h1>
        <p>This page is protected by middleware and requires an active session cookie.</p>
      </section>
    </main>
  );
}
