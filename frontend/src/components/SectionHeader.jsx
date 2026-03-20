import React from "react";

export default function SectionHeader({ icon, title, subtitle, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: "#f4f4f5", border: "1px solid #e4e4e7",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20,
      }}>{icon}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          {badge && (
            <span style={{
              background: "#dcfce7", color: "#16a34a",
              fontSize: 11, fontWeight: 600, padding: "2px 8px",
              borderRadius: 20, border: "1px solid #bbf7d0",
            }}>{badge}</span>
          )}
        </div>
        <div style={{ color: "#71717a", fontSize: 13, marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}
