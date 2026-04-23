import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0a0f",
          secondary: "#12121a",
          tertiary: "#1a1a25",
          hover: "#22222f",
        },
        accent: {
          primary: "#6c5ce7",
          secondary: "#a29bfe",
          hover: "#7c6ff0",
        },
        text: {
          primary: "#f0f0f5",
          secondary: "#8888a0",
          muted: "#55556a",
        },
        border: {
          primary: "#2a2a3a",
          secondary: "#1e1e2e",
        },
        status: {
          online: "#00d26a",
          offline: "#55556a",
          busy: "#ff4757",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
