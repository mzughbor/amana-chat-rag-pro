import "~/styles/globals.css";
import type React from "react";
import { appFont } from "~/styles/fonts";

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
    <div className={`${appFont.variable} font-sans min-h-screen flex flex-col bg-white`}>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}