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
  const [uploadProgress, setUploadProgress] = useState("");
  const [showQAForm, setShowQAForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type on frontend
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed");
      return;
    }

    // Validate file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadProgress("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress("Processing document...");
      const response = await fetch("/api/content/upload", {
        method: "POST",
        body: formData,
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(120000), // 2 minutes timeout
      });

      // Handle response based on content type
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        // Handle error responses
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
        } else {
          // Non-JSON error response (likely HTML error page)
          const text = await response.text();
          console.error("Server error response:", text.substring(0, 500));
          throw new Error(`Server error: ${response.status} - Please check the server logs for details`);
        }
      }

      // Success response - should be JSON
      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        console.error("Unexpected non-JSON success response:", text);
        throw new Error("Unexpected server response format");
      }

      const data = await response.json();

      // Success - show success message and reload
      setUploadProgress("Successfully processed!");
      setUploadError("");
      alert(`Successfully processed ${data.chunksProcessed || 0} chunks from the document!`);
      window.location.reload();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress("");
      if (error instanceof Error && error.name === 'TimeoutError') {
        setUploadError("Upload timeout - file may be too large or processing is taking too long");
      } else if (error instanceof Error && error.message.includes('PDF processing failed')) {
        setUploadError(`PDF processing failed. This may be due to: 
        - The PDF contains only images (not text)
        - The PDF is password protected
        - The PDF is corrupted
        - The PDF is too large
        
        Please try a different PDF file.`);
      } else {
        setUploadError(
          error instanceof Error ? error.message : "Upload failed - please try again",
        );
      }
    } finally {
      setUploading(false);
      setUploadProgress("");
      // Reset file input
      e.target.value = "";
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
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <p className="text-sm text-gray-600">{uploadProgress || "Processing..."}</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full animate-pulse" style={{width: "100%"}}></div>
                </div>
                <p className="text-xs text-gray-500">This may take a few minutes for large documents</p>
              </div>
            )}

            {uploadError && (
              <div className="mt-2 rounded-md bg-red-50 p-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{uploadError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Q&A Form */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Q&A Pair
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Manually add question and answer pairs for your chatbot.
                </p>
              </div>
              <button
                onClick={() => setShowQAForm(!showQAForm)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {showQAForm ? (
                  <>
                    <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </>
                ) : (
                  <>
                    <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New
                  </>
                )}
              </button>
            </div>
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
                  className="w-full inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                >
                  {qaSubmitting ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    "Add Q&A Pair"
                  )}
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Q&A Pairs</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {qaPairs.length}
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {qaPairs.map((qa) => (
              <div key={qa.id} className="rounded-lg bg-white p-4 shadow border border-gray-200 hover:border-purple-300 transition-colors">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">Q: {qa.question}</p>
                    <p className="mt-2 text-sm text-gray-600">A: {qa.answer}</p>
                  </div>
                </div>
              </div>
            ))}
            {qaPairs.length === 0 && (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Q&A pairs</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first question and answer pair.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

