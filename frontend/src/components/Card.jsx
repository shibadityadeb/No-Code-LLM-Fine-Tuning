import React from "react";

export default function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid #e4e4e7",
      padding: "24px",
      ...style,
    }}>
      {children}
    </div>
  );
}
