"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "~/components/common/Card";
import Modal from "~/components/common/Modal";
import Button from "~/components/common/Button";
import Toast from "~/components/common/Toast";
import { ChatBubbleIcon } from "~/components/icons/ChatBubbleIcon";

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

interface Bot {
  id: string;
  name: string;
  siteId: string;
}

interface Site {
  id: string;
  name: string;
  userId: string;
  bots: Bot[];
}

export default function UploadContent({
  botId: initialBotId,
  documents: initialDocuments,
  qaPairs: initialQaPairs,
  sites,
  bots,
}: {
  botId?: string;
  documents: Document[];
  qaPairs: QAPair[];
  sites: Site[];
  bots: Bot[];
}) {
  const [botId, setBotId] = useState(initialBotId || bots[0]?.id || "");
  const [documents, setDocuments] = useState(initialDocuments);
  const [qaPairs, setQaPairs] = useState(initialQaPairs);
  
  // Log hydration success in production
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      console.log("[Hydration Debug] UploadContent component mounted successfully");
    }
  }, []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [showQAForm, setShowQAForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [qaSubmitting, setQaSubmitting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [editingQaId, setEditingQaId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [deletingQaId, setDeletingQaId] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [showDeleteQaModal, setShowDeleteQaModal] = useState(false);
  const [qaToDelete, setQaToDelete] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  // Fetch data when bot selection changes
  const fetchBotData = async (targetBotId: string) => {
    if (!targetBotId) return;
    
    // Use useEffect-safe navigation instead of direct window access
    if (typeof window !== "undefined") {
      try {
        // Reload page to fetch fresh data for the selected bot
        // This ensures we get the latest documents and Q&A pairs from the server
        window.location.href = `/upload?botId=${targetBotId}`;
      } catch (error) {
        console.error("Error fetching bot data:", error);
        setToastMessage("Failed to load bot data");
        setToastType("error");
        setToastVisible(true);
      }
    }
  };

  // Update data when bot selection changes
  useEffect(() => {
    if (botId && botId !== initialBotId) {
      fetchBotData(botId);
    }
  }, [botId, initialBotId]);

  const handleBotChange = async (newBotId: string) => {
    setBotId(newBotId);
    await fetchBotData(newBotId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Set the selected file name
    setSelectedFileName(file.name);

    if (file.type !== "application/pdf") {
      setUploadError("Please upload a PDF file");
      setSelectedFileName("");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB limit");
      setSelectedFileName("");
      return;
    }

    setUploadError("");
    setUploading(true);
    setUploadProgress("Uploading file...");

    if (!botId) {
      setUploadError("Please select a bot first");
      setSelectedFileName("");
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    // Add botId to form data
    formData.append("botId", botId);

    try {
      const response = await fetch("/api/content/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Reset file input and clear selected file name
      e.target.value = "";
      setSelectedFileName("");
      
      // Show success message
      setToastMessage("Document uploaded successfully! Processing...");
      setToastType("success");
      setToastVisible(true);
      
      // Refresh documents list
      await fetchBotData(botId);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploading(false);
      setSelectedFileName("");
      
      if (error.name === "AbortError") {
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

  const handleRemoveFile = () => {
    setSelectedFileName("");
    // Clear the file input - only access document in browser
    if (typeof document !== "undefined") {
      const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    }
  }

  const startEditingQa = (qa: any) => {
    setEditingQaId(qa.id);
    setEditQuestion(qa.question);
    setEditAnswer(qa.answer);
  };

  const cancelEditingQa = () => {
    setEditingQaId(null);
    setEditQuestion("");
    setEditAnswer("");
  };

  const handleEditQaSubmit = async (e: React.FormEvent, qaId: string) => {
    e.preventDefault();
    
    if (!botId) {
      setToastMessage("Please select a bot first");
      setToastType("error");
      setToastVisible(true);
      return;
    }
    
    setQaSubmitting(true);

    try {
      const response = await fetch("/api/content/qa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: qaId, question: editQuestion, answer: editAnswer, botId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update Q&A pair");
      }

      // Reset editing state
      setEditingQaId(null);
      setEditQuestion("");
      setEditAnswer("");
      
      // Show success message
      setToastMessage("Q&A pair updated successfully");
      setToastType("success");
      setToastVisible(true);
      
      // Refresh Q&A pairs list
      await fetchBotData(botId);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to update Q&A pair");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setQaSubmitting(false);
    }
  };

  const handleDeleteQaClick = (qaId: string) => {
    setQaToDelete(qaId);
    setShowDeleteQaModal(true);
  };

  const handleDeleteQaConfirm = async () => {
    if (!qaToDelete || !botId) return;

    setDeletingQaId(qaToDelete);
    setShowDeleteQaModal(false);

    try {
      const response = await fetch("/api/content/qa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: qaToDelete, botId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete Q&A pair");
      }

      // Show success message
      setToastMessage("Q&A pair deleted successfully");
      setToastType("success");
      setToastVisible(true);
      
      // Refresh Q&A pairs list
      await fetchBotData(botId);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to delete Q&A pair");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setDeletingQaId(null);
      setQaToDelete(null);
    }
  };

  const handleDeleteQaCancel = () => {
    setShowDeleteQaModal(false);
    setQaToDelete(null);
  };

  const handleDeleteQa = async (qaId: string) => {
    // This function is kept for backward compatibility but now uses modal
    handleDeleteQaClick(qaId);
  };

  const handleDeleteDocumentClick = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    setDocToDelete(docId);
    setShowDeleteDocModal(true);
  };

  const handleDeleteDocumentConfirm = async () => {
    if (!docToDelete) return;

    setDeletingDoc(true);
    setShowDeleteDocModal(false);

    try {
      const response = await fetch(`/api/content/documents/${docToDelete}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ botId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete document");
      }

      // Show success message
      setToastMessage("Document deleted successfully");
      setToastType("success");
      setToastVisible(true);
      
      // Refresh documents list
      await fetchBotData(botId);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to delete document");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setDeletingDoc(false);
      setDocToDelete(null);
    }
  };

  const handleDeleteDocumentCancel = () => {
    setShowDeleteDocModal(false);
    setDocToDelete(null);
  };

  const handleDeleteDocument = async (docId: string) => {
    // This function is kept for backward compatibility but now uses modal
    handleDeleteDocumentClick(docId);
  };

  const handleQASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!botId) {
      setToastMessage("Please select a bot first");
      setToastType("error");
      setToastVisible(true);
      return;
    }
    
    setQaSubmitting(true);

    try {
      const response = await fetch("/api/content/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, botId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add Q&A pair");
      }

      // Reset form
      setQuestion("");
      setAnswer("");
      setShowQAForm(false);
      
      // Show success message
      setToastMessage("Q&A pair added successfully");
      setToastType("success");
      setToastVisible(true);
      
      // Refresh Q&A pairs list
      await fetchBotData(botId);
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : "Failed to add Q&A pair");
      setToastType("error");
      setToastVisible(true);
    } finally {
      setQaSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1200px] px-6 md:px-8 py-8">
        {/* Back to Dashboard Link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600 transition-colors group"
          >
            <svg 
              className="w-4 h-4 transition-transform group-hover:-translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Content Upload</h1>
          <p className="text-lg text-gray-600">
            Upload PDF documents or add Q&A pairs to train your chatbot
          </p>
        </div>

        {/* Bot Selection Dropdown */}
        {bots.length > 0 ? (
          <Card className="mb-6 animate-fade-in">
            <div className="space-y-2">
              <label htmlFor="bot-select" className="block text-sm font-medium text-gray-700">
                Select Bot:
              </label>
              <select
                id="bot-select"
                value={botId}
                onChange={(e) => handleBotChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
              >
                {bots.map((bot) => {
                  const site = sites.find(s => s.id === bot.siteId);
                  return (
                    <option key={bot.id} value={bot.id}>
                      {bot.name} {site?.name ? `(${site.name})` : ""}
                    </option>
                  );
                })}
              </select>
              {botId && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: <span className="font-medium">{bots.find(b => b.id === botId)?.name}</span>
                  {sites.find(s => s.bots.some(b => b.id === botId)) && (
                    <span className="text-gray-500"> • {sites.find(s => s.bots.some(b => b.id === botId))?.name}</span>
                  )}
                </p>
              )}
            </div>
          </Card>
        ) : (
          <Card className="mb-6 animate-fade-in bg-yellow-50 border-yellow-200">
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-yellow-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Bots Found</h3>
              <p className="text-yellow-800 mb-4">
                You need to create a bot before you can upload content. Please create a bot from the dashboard first.
              </p>
              <Link href="/dashboard">
                <Button variant="primary">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {bots.length > 0 && botId && (
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
              <div className="flex items-center justify-center w-full">
                <label htmlFor="pdf-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF files only</p>
                  </div>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    aria-label="Upload PDF file"
                    className="hidden"
                  />
                </label>
              </div>
              
              {selectedFileName && (
                <div className="mt-2 flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-md p-2">
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 mr-2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">{selectedFileName}</span>
                  </div>
                  {!uploading && (
                    <button 
                      onClick={handleRemoveFile}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Remove file"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
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
        )}

        {/* Documents List */}
        {bots.length > 0 && botId && (
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
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
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
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteDocumentClick(doc.id)}
                        disabled={deletingDoc && docToDelete === doc.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingDoc && docToDelete === doc.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No documents uploaded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Q&A Pairs List */}
        {bots.length > 0 && botId && (
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
                {editingQaId === qa.id ? (
                  <form onSubmit={(e) => handleEditQaSubmit(e, qa.id)} className="space-y-4">
                    <div>
                      <label htmlFor={`edit-question-${qa.id}`} className="block text-sm font-medium text-gray-700">
                        Question
                      </label>
                      <textarea
                        id={`edit-question-${qa.id}`}
                        value={editQuestion}
                        onChange={(e) => setEditQuestion(e.target.value)}
                        required
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-answer-${qa.id}`} className="block text-sm font-medium text-gray-700">
                        Answer
                      </label>
                      <textarea
                        id={`edit-answer-${qa.id}`}
                        value={editAnswer}
                        onChange={(e) => setEditAnswer(e.target.value)}
                        required
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={cancelEditingQa}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={qaSubmitting}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      >
                        {qaSubmitting ? (
                          <>
                            <svg className="mr-2 h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Updating...
                          </>
                        ) : (
                          "Update"
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1 text-purple-600">
                      <ChatBubbleIcon className="h-5 w-5" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900">Q: {qa.question}</p>
                      <p className="mt-2 text-sm text-gray-600">A: {qa.answer}</p>
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => startEditingQa(qa)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQaClick(qa.id)}
                          disabled={deletingQaId === qa.id}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          {deletingQaId === qa.id ? (
                            <>
                              <svg className="mr-1 h-3 w-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {qaPairs.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <ChatBubbleIcon className="mx-auto h-12 w-12" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Q&A pairs</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first question and answer pair.</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Delete Document Confirmation Modal */}
        <Modal
          isOpen={showDeleteDocModal}
          onClose={handleDeleteDocumentCancel}
          title="Delete Document"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Are you sure you want to delete this document?
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-slate-600 space-y-1 mb-4 list-disc list-inside">
                  <li>The document</li>
                  <li>All associated vectors</li>
                  <li>All related data</li>
                </ul>
                <p className="text-sm font-medium text-red-600">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={handleDeleteDocumentCancel}
                disabled={deletingDoc}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteDocumentConfirm}
                disabled={deletingDoc}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingDoc ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  "Delete Document"
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Q&A Confirmation Modal */}
        <Modal
          isOpen={showDeleteQaModal}
          onClose={handleDeleteQaCancel}
          title="Delete Q&A Pair"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Are you sure you want to delete this Q&A pair?
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-slate-600 space-y-1 mb-4 list-disc list-inside">
                  <li>The Q&A pair</li>
                  <li>Associated vector embeddings</li>
                </ul>
                <p className="text-sm font-medium text-red-600">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={handleDeleteQaCancel}
                disabled={deletingQaId !== null}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteQaConfirm}
                disabled={deletingQaId !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingQaId ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  "Delete Q&A Pair"
                )}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Toast Notification */}
        <Toast
          message={toastMessage}
          type={toastType}
          isVisible={toastVisible}
          onClose={() => setToastVisible(false)}
          duration={3000}
        />
      </div>
    </div>
  );
}