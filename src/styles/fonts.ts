import { Poppins } from "next/font/google";

export const appFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "arial", "sans-serif"], // Fallback fonts if Google Fonts fails
  preload: true, // Preload font for better performance
});

