import "~/styles/globals.css";
import type React from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Chat Widget",
  description: "Embedded chat widget",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function WidgetChatLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} h-screen w-screen overflow-hidden m-0 p-0 bg-white`}>
        <div className="h-full w-full">
          {children}
        </div>
      </body>
    </html>
  );
}