import React from "react";

export function FieldLabel({ children, className = "" }) {
  return <label className={`mb-2 block text-sm text-gray-500 ${className}`}>{children}</label>;
}

export function FieldHint({ children, className = "" }) {
  return <p className={`mt-2 text-xs text-gray-400 ${className}`}>{children}</p>;
}

export default function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:ring-2 focus:ring-green-400 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 focus:ring-2 focus:ring-green-400 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:ring-2 focus:ring-green-400 ${className}`}
      {...props}
    />
  );
}
