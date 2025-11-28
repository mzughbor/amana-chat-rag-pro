import "~/styles/globals.css";
import type React from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Chat Widget",
  description: "Chat widget for customer support",
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} min-h-screen flex flex-col bg-white`}>
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}