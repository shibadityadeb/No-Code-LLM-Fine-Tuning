import React from "react";

const VARIANTS = {
  primary: "bg-green-500 text-white hover:bg-green-600 shadow-sm shadow-green-100",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  ghost: "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900",
};

export default function Button({
  children,
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
