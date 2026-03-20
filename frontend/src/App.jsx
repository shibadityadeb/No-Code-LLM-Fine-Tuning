import React, { useState } from "react";
import Studio from "./pages/Studio.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ExportPage from "./pages/ExportPage.jsx";

const NAV = ["Studio", "Chat", "Export"];

export default function App() {
  const [tab, setTab] = useState("Studio");

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f5" }}>
      {/* Navbar */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e4e4e7",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        height: 56,
        gap: 8,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ fontWeight: 700, fontSize: 18, marginRight: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            borderRadius: 8,
            width: 28, height: 28,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 14,
          }}>✦</span>
          FineTune Studio
        </span>

        <nav style={{ display: "flex", gap: 4, background: "#f4f4f5", borderRadius: 24, padding: "4px" }}>
          {NAV.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "6px 18px",
              borderRadius: 20,
              border: "none",
              background: tab === t ? "#18181b" : "transparent",
              color: tab === t ? "#fff" : "#71717a",
              fontWeight: 500,
              fontSize: 14,
              transition: "all .15s",
            }}>{t}</button>
          ))}
        </nav>
      </header>

      <main style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>
        {tab === "Studio" && <Studio />}
        {tab === "Chat" && <ChatPage />}
        {tab === "Export" && <ExportPage />}
      </main>
    </div>
  );
}
