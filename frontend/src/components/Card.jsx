import React from "react";

export default function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
