"use client";

import { useState } from "react";
import Link from "next/link";

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Reload page to show new document
      window.location.reload();
    } catch (error) {
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Content Upload</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload PDF documents or add Q&A pairs to train your chatbot
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* PDF Upload */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">
              Upload PDF Document
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Upload a PDF file. It will be processed and chunked for RAG.
            </p>

            <div className="mt-4">
              <label htmlFor="pdf-upload" className="block">
                <span className="sr-only">Choose PDF file</span>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  aria-label="Upload PDF file"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                />
              </label>
            </div>

            {uploading && (
              <p className="mt-2 text-sm text-gray-600">Uploading and processing...</p>
            )}

            {uploadError && (
              <div className="mt-2 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{uploadError}</p>
              </div>
            )}
          </div>

          {/* Q&A Form */}
          <div className="rounded-lg bg-white p-6 shadow">
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
                <button
                  type="submit"
                  disabled={qaSubmitting}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {qaSubmitting ? "Adding..." : "Add Q&A Pair"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
          <div className="mt-4 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
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
                        className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                          doc.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : doc.status === "processing"
                              ? "bg-yellow-100 text-yellow-800"
                              : doc.status === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {doc.status}
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
          </div>
        </div>

        {/* Q&A Pairs List */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Q&A Pairs</h2>
          <div className="mt-4 space-y-4">
            {qaPairs.map((qa) => (
              <div key={qa.id} className="rounded-lg bg-white p-4 shadow">
                <p className="font-medium text-gray-900">Q: {qa.question}</p>
                <p className="mt-2 text-sm text-gray-600">A: {qa.answer}</p>
              </div>
            ))}
            {qaPairs.length === 0 && (
              <p className="text-center text-sm text-gray-500">
                No Q&A pairs added yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

