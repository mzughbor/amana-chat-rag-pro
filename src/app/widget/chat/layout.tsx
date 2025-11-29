import "~/styles/globals.css";
import type React from "react";
import { appFont } from "~/styles/fonts";

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
    <div className={`${appFont.variable} font-sans h-screen w-screen overflow-hidden m-0 p-0 bg-white`}>
      <div className="h-full w-full">
        {children}
      </div>
    </div>
  );
}