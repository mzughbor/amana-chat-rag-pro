import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

// Import pdf-parse with explicit typing to avoid module loading issues
let pdfParse: any;

async function initializePdfParse() {
  if (!pdfParse) {
    try {
      // Try different import methods to handle different environments
      try {
        // First try direct import
        pdfParse = (await import("pdf-parse")).default;
      } catch (importError) {
        try {
          // Fallback to require
          pdfParse = require("pdf-parse");
        } catch (requireError) {
          // Final fallback - try to get default export
          const pdfParseModule = require("pdf-parse");
          pdfParse = pdfParseModule.default || pdfParseModule;
        }
      }
      
      // Validate that we have a function
      if (typeof pdfParse !== 'function') {
        throw new Error('pdf-parse did not export a function');
      }
    } catch (error) {
      console.error('Failed to initialize pdf-parse:', error);
      throw new Error(`PDF parser initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return pdfParse;
}

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface Chunk {
  text: string;
  metadata: {
    filename: string;
    pageNumber?: number;
    chunkIndex: number;
  };
}

/**
 * Extract text content from a PDF buffer
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer,
): Promise<string> {
  try {
    const pdfParseFunction = await initializePdfParse();
    // Ensure we're passing a proper buffer
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    const data = await pdfParseFunction(buffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Split document text into chunks using LangChain's RecursiveCharacterTextSplitter
 */
export async function chunkDocument(
  text: string,
  filename: string,
  options: ChunkOptions = {},
): Promise<Chunk[]> {
  const chunkSize = options.chunkSize ?? 1000;
  const chunkOverlap = options.chunkOverlap ?? 200;

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const chunks = await textSplitter.splitText(text);

  return chunks.map((chunkText, index) => ({
    text: chunkText,
    metadata: {
      filename,
      chunkIndex: index,
    },
  }));
}

/**
 * Process a PDF file: extract text and chunk it
 */
export async function processPDF(
  pdfBuffer: Buffer,
  filename: string,
  options?: ChunkOptions,
): Promise<Chunk[]> {
  const text = await extractTextFromPDF(pdfBuffer);
  return chunkDocument(text, filename, options);
}

