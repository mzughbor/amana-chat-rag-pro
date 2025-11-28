"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Button from "~/components/ui/Button";

type Sender = "user" | "assistant";

interface ChatMessage {
  id: string;
  conversationId: string | null;
  sender: Sender;
  content: string;
  createdAt: string;
}

interface BotInfo {
  id: string;
  name: string;
  welcomeMessage: string;
}

const quickReplies = [
  "What can you help me with?",
  "Tell me about your services",
  "How do I get started?",
];

const generateVisitorId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export default function ChatPage() {
  const params = useParams();
  const botId = params.siteId as string;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null); // Add bot info state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const storageKey = typeof window !== "undefined" ? `chat-visitor-${botId}` : null;

  // Fetch bot info
  useEffect(() => {
    const fetchBotInfo = async () => {
      try {
        const response = await fetch(`/api/bots/${botId}`);
        if (response.ok) {
          const data = await response.json();
          setBotInfo(data);
        }
      } catch (err) {
        console.error("Failed to fetch bot info:", err);
      }
    };

    if (botId) {
      fetchBotInfo();
    }
  }, [botId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = storageKey ? localStorage.getItem(storageKey) : null;
    if (existing) {
      setVisitorId(existing);
    } else {
      const newId = generateVisitorId();
      if (storageKey) {
        localStorage.setItem(storageKey, newId);
      }
      setVisitorId(newId);
    }
  }, [botId, storageKey]);

  useEffect(() => {
    if (!visitorId) return;
    let cancelled = false;

    const fetchMessages = async () => {
      setInitialLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/chat/${botId}?visitorId=${encodeURIComponent(visitorId)}`,
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load messages.");
        }

        if (!cancelled) {
          setConversationId(data.conversationId || null);
          const fetched =
            data.messages?.map((msg: any) => ({
              id: msg.id,
              conversationId: msg.conversationId,
              sender: msg.sender as Sender,
              content: msg.content,
              createdAt: msg.createdAt,
            })) ?? [];
          setMessages(fetched);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load messages.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [botId, visitorId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const ensuredVisitorId = visitorId ?? generateVisitorId();
    if (!visitorId) {
      setVisitorId(ensuredVisitorId);
      if (storageKey) {
        localStorage.setItem(storageKey, ensuredVisitorId);
      }
    }

    const optimisticMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId: conversationId,
      sender: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setSending(true);
    setError("");

    try {
      const response = await fetch(`/api/chat/${botId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          visitorId: ensuredVisitorId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to send message (${response.status})`);
      }

      if (data.visitorId && data.visitorId !== ensuredVisitorId) {
        setVisitorId(data.visitorId);
        if (storageKey) {
          localStorage.setItem(storageKey, data.visitorId);
        }
      }

      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId);
      }

      if (data.message) {
        const assistantMessage: ChatMessage = {
          id: data.message.id,
          conversationId: data.message.conversationId,
          sender: data.message.sender,
          content: data.message.content,
          createdAt: data.message.createdAt,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send message.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          conversationId,
          sender: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="py-8">
      <div className="flex h-[calc(100vh-200px)] flex-col bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 border-b border-purple-500/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                {botInfo?.name || "Chat Assistant"}
              </h1>
              <p className="text-xs text-white/80 mt-0.5">Bot ID: {botId}</p>
            </div>
            <Link href="/dashboard">
              <button
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Close chat"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Link>
          </div>
        </div>

        {/* Error banner */}
        {error && !initialLoading && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {initialLoading ? (
            <div className="flex h-full items-center justify-center text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
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
                Loading conversation...
              </div>
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="text-center text-slate-700 mt-20">
                  <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-10 h-10 text-purple-600"
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
                  <p className="text-lg font-semibold text-slate-900 mb-1">
                    Start a conversation
                  </p>
                  <p className="text-sm text-slate-600">Send a message to get started</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.sender === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-white text-slate-900 border border-gray-200 shadow-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {!initialLoading && messages.length === 0 && (
          <div className="px-4 pb-3 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex flex-wrap gap-2 pt-3">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => setInput(reply)}
                  className="px-4 py-2 rounded-full text-sm bg-gray-100 text-slate-700 hover:bg-gray-200 transition-colors border border-gray-200"
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
          className="border-t border-gray-200 bg-white p-4 flex-shrink-0"
        >
          <div className="flex gap-2">
            <button
              type="button"
              className="p-2.5 rounded-lg border border-gray-200 bg-gray-50 text-slate-400 cursor-not-allowed flex-shrink-0"
              title="Attachments (coming soon)"
              disabled
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={sending || initialLoading}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-600 disabled:opacity-50 transition-all bg-white"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={sending || initialLoading || !input.trim()}
              className="flex-shrink-0"
            >
              {sending ? (
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
    </div>
  );
}
