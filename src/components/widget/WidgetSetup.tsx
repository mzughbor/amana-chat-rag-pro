"use client";

import { useState } from "react";
import Link from "next/link";

export default function WidgetSetup({ siteId }: { siteId: string }) {
  const [copied, setCopied] = useState(false);

  const widgetScript = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${typeof window !== "undefined" ? window.location.origin : ""}/widget.js?siteId=${siteId}';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(widgetScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/dashboard" className="text-xl font-semibold text-gray-900">
              AmanaRAG
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-primary hover:text-primary/80"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Widget Setup</h1>
        <p className="mt-1 text-sm text-gray-600">
          Copy and paste this script into your website to enable the chatbot
        </p>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Embed Script
            </h2>
            <button
              onClick={copyToClipboard}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              {copied ? "Copied!" : "Copy Script"}
            </button>
          </div>

          <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100">
            <code>{widgetScript}</code>
          </pre>

          <div className="mt-6 rounded-md bg-blue-50 p-4">
            <h3 className="text-sm font-medium text-blue-900">
              Installation Instructions
            </h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-blue-800">
              <li>Copy the script above</li>
              <li>Paste it before the closing &lt;/body&gt; tag in your HTML</li>
              <li>The chatbot widget will appear in the bottom-right corner</li>
              <li>Visitors can click it to start chatting</li>
            </ol>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
          <p className="mt-2 text-sm text-gray-600">
            The widget will appear as a chat button in the bottom-right corner
            of your website.
          </p>
          <div className="mt-4 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="mt-2 text-sm text-gray-500">Chat Widget Preview</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

