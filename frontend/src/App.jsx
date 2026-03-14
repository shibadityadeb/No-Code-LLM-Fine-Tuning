import React, { useState } from "react";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";

// A minimal app shell with a simple mode toggle for home/dashboard.
export default function App() {
  const [page, setPage] = useState("home");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 20 }}>
      <header style={{ marginBottom: 20 }}>
        <h1>LLM Fine-tune Studio</h1>
        <nav>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("dashboard")}>Dashboard</button>
        </nav>
      </header>

      <main>
        {page === "home" ? <Home /> : <Dashboard />}
      </main>
    </div>
  );
}
