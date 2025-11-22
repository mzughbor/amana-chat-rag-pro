import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import pdf from "pdf-parse";

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
    const data = await pdf(pdfBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error}`);
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

