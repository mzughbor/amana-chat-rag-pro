import "~/styles/globals.css";
import type React from "react";
import { Providers } from "./providers";
import dynamic from "next/dynamic";
import { appFont } from "~/styles/fonts";

const Navbar = dynamic(() => import("~/components/layout/Navbar"), { ssr: false });
const Footer = dynamic(() => import("~/components/layout/Footer"), { ssr: false });

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
    <html lang="en" className={appFont.variable}>
      <body className="font-sans min-h-screen flex flex-col bg-gray-50 antialiased">
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
