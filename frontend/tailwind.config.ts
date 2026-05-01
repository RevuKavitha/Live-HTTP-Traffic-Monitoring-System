import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0f172a",
        card: "#111827",
        accent: "#38bdf8",
        success: "#34d399",
        danger: "#f87171",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
