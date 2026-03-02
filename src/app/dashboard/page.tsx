"use client";

import { motion } from "framer-motion";
import { pageIn } from "../components/animations";

export default function DashboardPage() {
  return (
    <motion.main className="site-shell" {...pageIn}>
      <div className="page-header">
        <div className="page-header-meta">
          <h1>Dashboard</h1>
          <p style={{ marginTop: "0.3rem" }}>Protected area — session required.</p>
        </div>
      </div>
      <div className="panel" style={{ padding: "2rem" }}>
        <p>You are authenticated. Use the navbar to navigate to your role-specific dashboard.</p>
      </div>
    </motion.main>
  );
}
