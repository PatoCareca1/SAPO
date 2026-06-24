"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sapo-theme");
    if (stored === "dark") setDark(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute(
      "data-theme",
      next ? "dark" : "light",
    );
    localStorage.setItem("sapo-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Modo claro" : "Modo escuro"}
      style={{
        width: "2.25rem",
        height: "2.25rem",
        borderRadius: "50%",
        border: "1px solid var(--border-default)",
        background: "var(--bg-muted)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1rem",
        flexShrink: 0,
        transition: "background 0.15s",
      }}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
