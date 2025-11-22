import { type Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6B46C1",
          50: "#F3F0FF",
          100: "#E9E3FF",
          200: "#D1C7FF",
          300: "#B9ABFF",
          400: "#A18FFF",
          500: "#6B46C1",
          600: "#5B3AA8",
          700: "#4B2E8F",
          800: "#3B2276",
          900: "#2B165D",
        },
      },
    },
  },
  plugins: [],
};

export default config;

