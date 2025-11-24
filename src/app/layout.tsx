import "~/styles/globals.css";
import type React from "react";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import Navbar from "~/components/layout/Navbar";
import Footer from "~/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "AmanaRAG",
  description: "BYOK RAG-based chatbot platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} min-h-screen flex flex-col bg-gray-50`}>
        <Providers>
          <Navbar />
          <main className="flex-1">
            <div className="min-h-[calc(100vh-200px)] mx-auto max-w-[1200px] w-full px-6 md:px-8">
              {children}
            </div>
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

