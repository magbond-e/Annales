import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F0FDF4",
          100: "#E6F6F8",
          200: "#C4E8ED",
          300: "#8ACCD6",
          400: "#3E9CB0",
          500: "#13748A",
          DEFAULT: "#0F4C5C",
          hover: "#14647A",
          dark: "#092E38",
          light: "#EAF4F6",
          surface: "#F4FAFA",
        },
        knowledge: {
          DEFAULT: "#10B981",
          hover: "#059669",
          light: "#ECFDF5",
        },
        surface: {
          bg: "var(--bg-main)",
          card: "var(--bg-card)",
          border: "var(--border-color)",
          subtle: "var(--bg-subtle)",
        },
        ink: {
          primary: "var(--text-main)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        examType: {
          devoir: {
            text: "#1D4ED8",
            bg: "#EFF6FF",
            border: "#BFDBFE",
          },
          examen: {
            text: "#047857",
            bg: "#ECFDF5",
            border: "#A7F3D0",
          },
          rattrapage: {
            text: "#B45309",
            bg: "#FFFBEB",
            border: "#FDE68A",
          },
        },
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
        badge: "9999px",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)",
        card: "0 2px 10px -2px rgba(15, 23, 42, 0.05), 0 4px 16px -4px rgba(15, 23, 42, 0.03)",
        "card-hover": "0 16px 36px -8px rgba(15, 76, 92, 0.12), 0 4px 12px -2px rgba(15, 76, 92, 0.04)",
        glass: "0 8px 30px rgba(0, 0, 0, 0.06)",
        glow: "0 0 20px -2px rgba(16, 185, 129, 0.25)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        heading: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
