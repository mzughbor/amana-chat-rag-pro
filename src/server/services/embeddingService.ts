import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embeddings for text chunks using OpenAI API
 */
export async function generateEmbeddings(
  chunks: string[],
  apiKey: string,
): Promise<number[][]> {
  const openai = new OpenAI({
    apiKey,
  });

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: chunks,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
    throw new Error("Failed to generate embeddings: Unknown error");
  }
}

/**
 * Generate a single embedding for a query
 */
export async function generateQueryEmbedding(
  query: string,
  apiKey: string,
): Promise<number[]> {
  const embeddings = await generateEmbeddings([query], apiKey);
  return embeddings[0] ?? [];
}