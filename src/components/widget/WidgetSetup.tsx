"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "~/components/ui/Card";
import Button from "~/components/ui/Button";

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
    <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Widget Setup</h1>
          <p className="text-lg text-gray-600">
            Copy and paste this script into your website to enable the chatbot
          </p>
        </div>

        <Card className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Embed Script
            </h2>
            <Button
              onClick={copyToClipboard}
              variant="primary"
              size="md"
            >
              {copied ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </span>
              ) : (
                'Copy Script'
              )}
            </Button>
          </div>

          <pre className="overflow-x-auto rounded-md bg-gray-900 p-4 text-sm text-gray-100">
            <code>{widgetScript}</code>
          </pre>

          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
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
        </Card>

        <div style={{ animationDelay: '0.1s' }}>
          <Card className="mt-8 animate-fade-in">
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
        </Card>
        </div>
    </div>
  );
}

