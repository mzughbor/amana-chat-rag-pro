import { notFound } from "next/navigation";
import Script from 'next/script';

export default function WidgetChatPage({ params }: { params: { siteId: string } }) {
  // Validate contextId (can be either siteId or botId)
  if (!params.siteId) {
    notFound();
  }

  // Return a completely static page that will be enhanced with client-side JavaScript
  return (
    <div id="amana-rag-widget-container" data-site-id={params.siteId} className="h-screen w-screen overflow-hidden bg-white">
      {/* This is a placeholder that will be replaced by client-side JavaScript */}
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
      <Script src="/widget-chat.js" strategy="afterInteractive" />
    </div>
  );
}