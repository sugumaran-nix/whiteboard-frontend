import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Drafting desk" token system — paper + ink in light mode,
        // blueprint navy + ink in dark mode. See app/globals.css for the
        // CSS-variable values per mode.
        paper: "var(--paper)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        line: "var(--line)",
        surface: "var(--surface)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        amber: "var(--amber)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "dot-grid":
          "radial-gradient(circle, var(--line) 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-grid": "22px 22px",
      },
    },
  },
  plugins: [],
};
export default config;
