"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "~/components/ui/Card";
import Button from "~/components/ui/Button";

interface Document {
  id: string;
  filename: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
}

interface QAPair {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
}

export default function UploadContent({
  siteId,
  documents,
  qaPairs,
}: {
  siteId: string;
  documents: Document[];
  qaPairs: QAPair[];
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showQAForm, setShowQAForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/content/upload", {
        method: "POST",
        body: formData,
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Upload failed");
      }

      // Reload page to show new document
      window.location.reload();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Upload failed",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleQASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQaSubmitting(true);

    try {
      const response = await fetch("/api/content/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add Q&A pair");
      }

      // Reset form and reload
      setQuestion("");
      setAnswer("");
      setShowQAForm(false);
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add Q&A pair");
    } finally {
      setQaSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Content Upload</h1>
          <p className="text-lg text-gray-600">
            Upload PDF documents or add Q&A pairs to train your chatbot
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* PDF Upload */}
          <Card hover className="animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900">
              Upload PDF Document
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Upload a PDF file. It will be processed and chunked for RAG.
            </p>

            <div className="mt-6">
              <label htmlFor="pdf-upload" className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors duration-300 cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Drag and drop your PDF here
                  </p>
                  <p className="text-xs text-gray-500 mb-4">or</p>
                  <span className="inline-block px-4 py-2 rounded-2xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors duration-300">
                    Browse Files
                  </span>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    aria-label="Upload PDF file"
                    className="hidden"
                  />
                </div>
              </label>
            </div>

            {uploading && (
              <p className="mt-2 text-sm text-gray-600">Uploading and processing...</p>
            )}

            {uploadError && (
              <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{uploadError}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Q&A Form */}
          <div style={{ animationDelay: '0.1s' }}>
            <Card hover className="animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Q&A Pair
              </h2>
              <button
                onClick={() => setShowQAForm(!showQAForm)}
                className="text-sm text-primary hover:text-primary/80"
              >
                {showQAForm ? "Cancel" : "Add New"}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Manually add question and answer pairs for your chatbot.
            </p>

            {showQAForm && (
              <form onSubmit={handleQASubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="qa-question" className="block text-sm font-medium text-gray-700">
                    Question
                  </label>
                  <textarea
                    id="qa-question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    required
                    rows={3}
                    placeholder="Enter your question"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="qa-answer" className="block text-sm font-medium text-gray-700">
                    Answer
                  </label>
                  <textarea
                    id="qa-answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    required
                    rows={4}
                    placeholder="Enter the answer"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={qaSubmitting}
                  className="w-full"
                >
                  {qaSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Adding...
                    </span>
                  ) : (
                    'Add Q&A Pair'
                  )}
                </Button>
              </form>
            )}
          </Card>
          </div>
        </div>

        {/* Documents List */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Documents</h2>
          <Card className="p-0 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {doc.filename}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          doc.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : doc.status === "processing"
                              ? "bg-yellow-100 text-yellow-800"
                              : doc.status === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {doc.status === "completed" ? "✓ Done" : doc.status === "processing" ? "⏳ Running" : doc.status === "error" ? "✕ Error" : "⏸ Queued"}
                      </span>
                      {doc.errorMessage && (
                        <p className="mt-1 text-xs text-red-600">
                          {doc.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      No documents uploaded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Q&A Pairs List */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Q&A Pairs</h2>
          <div className="space-y-4">
            {qaPairs.map((qa) => (
              <Card key={qa.id} hover>
                <p className="font-semibold text-gray-900 mb-2">Q: {qa.question}</p>
                <p className="text-sm text-gray-600">A: {qa.answer}</p>
              </Card>
            ))}
            {qaPairs.length === 0 && (
              <p className="text-center text-sm text-gray-500">
                No Q&A pairs added yet
              </p>
            )}
          </div>
        </div>
    </div>
  );
}

