import React, { useState } from "react";
import { CircleHelp, MoonStar, Sparkles, SunMedium } from "lucide-react";
import Studio from "./pages/Studio.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ExportPage from "./pages/ExportPage.jsx";
import RecipesPage from "./pages/RecipesPage.jsx";

const TABS = ["Dashboard", "Recipes", "Export", "Chat"];

function LogoMark() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 text-white shadow-sm shadow-emerald-200">
      <Sparkles size={18} />
    </div>
  );
}

function IconButton({ children, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
    >
      {children}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div
      className={`min-h-screen font-sans transition-all duration-200 ${
        darkMode
          ? "bg-[#0f1720] text-gray-100"
          : "bg-[radial-gradient(circle_at_top,_rgba(187,247,208,0.45),_rgba(249,250,251,1)_35%,_rgba(243,244,246,1)_100%)] text-gray-900"
      }`}
    >
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur ${
          darkMode
            ? "border-white/10 bg-[#0f1720]/85"
            : "border-white/70 bg-white/85"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div className="flex flex-col">
              <span
                className={`text-sm font-semibold tracking-tight ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                LLM Studio
              </span>
              <span
                className={`text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Fine-tuning workspace
              </span>
            </div>
          </div>

          <nav
            className={`mx-auto flex items-center gap-1 rounded-2xl border p-1 ${
              darkMode
                ? "border-white/10 bg-white/5"
                : "border-gray-200 bg-white/80 shadow-sm"
            }`}
          >
            {TABS.map((item) => {
              const active = tab === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                    active
                      ? darkMode
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-green-500 text-white shadow-sm"
                      : darkMode
                        ? "text-gray-300 hover:bg-white/5 hover:text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <IconButton
              onClick={() => setDarkMode((current) => !current)}
              label="Toggle theme"
            >
              {darkMode ? <SunMedium size={18} /> : <MoonStar size={18} />}
            </IconButton>
            <IconButton onClick={() => window.alert("LLM Studio help is coming soon.")} label="Help">
              <CircleHelp size={18} />
            </IconButton>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-6 py-4">
        {tab === "Dashboard" && <Studio darkMode={darkMode} />}
        {tab === "Recipes" && <RecipesPage darkMode={darkMode} />}
        {tab === "Export" && <ExportPage darkMode={darkMode} />}
        {tab === "Chat" && <ChatPage darkMode={darkMode} />}
      </main>
    </div>
  );
}
