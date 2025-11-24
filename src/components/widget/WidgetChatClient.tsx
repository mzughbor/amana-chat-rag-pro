"use client";

import { useState, useEffect, useRef } from "react";
import Button from "~/components/ui/Button";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function WidgetChatClient({ siteId }: { siteId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`/api/chat/${siteId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = [
    "What can you help me with?",
    "Tell me about your services",
    "How do I get started?",
  ];

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header - Simplified for widget */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 border-b border-purple-500/20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Chat Assistant</h1>
          </div>
          {/* Close button for widget */}
          <button 
            onClick={() => {
              // Notify parent window to close the widget
              window.parent.postMessage({ type: 'CLOSE_WIDGET' }, '*');
            }}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Close chat"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-slate-700 mt-10">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-900 mb-1">
              Start a conversation
            </p>
            <p className="text-sm text-slate-600">Send a message to get started</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
              msg.role === "user"
                ? "bg-purple-600 text-white"
                : "bg-white text-slate-900 border border-gray-200 shadow-sm"
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"></div>
                <div
                  className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {messages.length === 0 && (
        <div className="px-3 pb-2 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex flex-wrap gap-1.5 pt-2">
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(reply);
                  setTimeout(() => {
                    const form = document.querySelector('form');
                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }, 100);
                }}
                className="px-2.5 py-1.5 rounded-full text-xs bg-gray-100 text-slate-700 hover:bg-gray-200 transition-colors border border-gray-200"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="border-t border-gray-200 bg-white p-3 flex-shrink-0"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-600 disabled:opacity-50 transition-all bg-white"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !input.trim()}
            className="flex-shrink-0 px-3 py-2 text-sm"
          >
            {loading ? (
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              "Send"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}