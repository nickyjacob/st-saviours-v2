import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        approved: 'rgb(var(--color-approved) / <alpha-value>)',
        pending: 'rgb(var(--color-pending) / <alpha-value>)',
        rejected: 'rgb(var(--color-rejected) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        neutral: 'rgb(var(--color-neutral) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
export default config;