import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f0ff",
          100: "#e0e0ff",
          500: "#6c5ce7",
          700: "#4a3fd4",
          900: "#2d1b69",
        },
      },
    },
  },
  plugins: [],
};

export default config;
