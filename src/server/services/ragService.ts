import { db } from "~/lib/db";
import { generateQueryEmbedding } from "./embeddingService";

const DEFAULT_TOP_K = 5;

/**
 * Retrieve top-k most relevant document chunks for a query using pgvector similarity search
 */
export async function retrieveContext(
  query: string,
  siteId: string,
  apiKey: string,
  k: number = DEFAULT_TOP_K,
): Promise<Array<{ text: string; metadata: any; similarity: number }>> {
  // Generate query embedding
  const queryEmbedding = await generateQueryEmbedding(query, apiKey);

  // Convert embedding array to PostgreSQL vector format string
  const embeddingString = `[${queryEmbedding.join(",")}]`;

  // Perform cosine similarity search using raw SQL (pgvector)
  // Note: Prisma doesn't support pgvector directly, so we use raw SQL
  // Using $queryRawUnsafe with proper escaping for the vector
  const results = await db.$queryRawUnsafe<
    Array<{
      id: string;
      chunk_text: string;
      metadata: any;
      similarity: number;
    }>
  >(
    `SELECT 
      id,
      chunk_text,
      metadata,
      1 - (embedding <=> '${embeddingString}'::vector) as similarity
    FROM vectors
    WHERE site_id = '${siteId}'
    ORDER BY embedding <=> '${embeddingString}'::vector
    LIMIT ${k}`,
  );

  return results.map((r) => ({
    text: r.chunk_text,
    metadata: r.metadata,
    similarity: Number(r.similarity),
  }));
}

/**
 * Build context string from retrieved chunks
 */
export function buildContext(
  chunks: Array<{ text: string; metadata: any }>,
): string {
  return chunks
    .map((chunk, index) => {
      const source = chunk.metadata?.filename ?? "Unknown";
      return `[Source ${index + 1}: ${source}]\n${chunk.text}`;
    })
    .join("\n\n---\n\n");
}

