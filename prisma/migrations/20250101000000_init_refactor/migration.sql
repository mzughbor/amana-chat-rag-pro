-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 1: Ensure all Sites have a Bot (create if missing)
INSERT INTO bots ("siteId", name, "welcomeMessage", provider, status, "widgetSettings", "createdAt", "updatedAt")
SELECT 
  s.id as "siteId",
  COALESCE(s.name, 'Default Bot') as name,
  NULL as "welcomeMessage",
  'openai' as provider,
  'active' as status,
  COALESCE(s."widgetSettings", '{}') as "widgetSettings",
  s."createdAt",
  s."updatedAt"
FROM sites s
WHERE NOT EXISTS (
  SELECT 1 FROM bots b WHERE b."siteId" = s.id
)
ON CONFLICT ("siteId") DO NOTHING;

-- Step 2: Update Documents - migrate from siteId to botId, rename columns
-- First, ensure botId is populated from siteId if null
UPDATE documents d
SET "botId" = (
  SELECT b.id FROM bots b WHERE b."siteId" = d."siteId" LIMIT 1
)
WHERE d."botId" IS NULL AND d."siteId" IS NOT NULL;

-- Rename filename to fileName if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'filename'
  ) THEN
    ALTER TABLE documents RENAME COLUMN filename TO "fileName";
  END IF;
END $$;

-- Rename status to ingestionStatus if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'status'
  ) THEN
    ALTER TABLE documents RENAME COLUMN status TO "ingestionStatus";
  END IF;
END $$;

-- Add missing columns if they don't exist
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS "fileType" TEXT,
  ADD COLUMN IF NOT EXISTS "fileSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "storagePath" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

-- Make botId NOT NULL after ensuring all rows have it
ALTER TABLE documents 
  ALTER COLUMN "botId" SET NOT NULL;

-- Step 3: Update Vectors - migrate from siteId to botId, rename docId
-- Ensure botId is populated
UPDATE vectors v
SET "botId" = (
  SELECT b.id FROM bots b 
  INNER JOIN documents d ON d."siteId" = b."siteId"
  WHERE d.id = v."docId" LIMIT 1
)
WHERE v."botId" IS NULL AND v."docId" IS NOT NULL;

-- Fallback: set botId from siteId if docId is null
UPDATE vectors v
SET "botId" = (
  SELECT b.id FROM bots b WHERE b."siteId" = v."siteId" LIMIT 1
)
WHERE v."botId" IS NULL AND v."siteId" IS NOT NULL;

-- Rename docId to documentId if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vectors' AND column_name = 'docId'
  ) THEN
    ALTER TABLE vectors RENAME COLUMN "docId" TO "documentId";
  END IF;
END $$;

-- Add missing columns if they don't exist
ALTER TABLE vectors 
  ADD COLUMN IF NOT EXISTS "chunkId" INTEGER DEFAULT 0;

-- Ensure embedding column exists with correct type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vectors' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE vectors ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Make botId NOT NULL
ALTER TABLE vectors 
  ALTER COLUMN "botId" SET NOT NULL;

-- Step 4: Update QAPairs - migrate from siteId to botId
UPDATE qa_pairs q
SET "botId" = (
  SELECT b.id FROM bots b WHERE b."siteId" = q."siteId" LIMIT 1
)
WHERE q."botId" IS NULL AND q."siteId" IS NOT NULL;

-- Add missing status column if it doesn't exist
ALTER TABLE qa_pairs 
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';

-- Make botId NOT NULL
ALTER TABLE qa_pairs 
  ALTER COLUMN "botId" SET NOT NULL;

-- Step 5: Update Conversations - migrate from siteId to botId
UPDATE conversations c
SET "botId" = (
  SELECT b.id FROM bots b WHERE b."siteId" = c."siteId" LIMIT 1
)
WHERE c."botId" IS NULL AND c."siteId" IS NOT NULL;

-- Migrate old messages JSON to Message table if needed
INSERT INTO messages ("conversationId", role, content, "createdAt", "tokens", "latencyMs", metadata)
SELECT 
  c.id as "conversationId",
  (msg->>'role')::text as role,
  (msg->>'content')::text as content,
  COALESCE(
    (msg->>'createdAt')::timestamp,
    (msg->>'timestamp')::timestamp,
    c."createdAt"
  ) as "createdAt",
  (msg->>'tokens')::integer as "tokens",
  (msg->>'latencyMs')::integer as "latencyMs",
  COALESCE((msg->>'metadata')::jsonb, '{}') as metadata
FROM conversations c,
LATERAL jsonb_array_elements(c.messages) AS msg
WHERE c.messages IS NOT NULL 
  AND jsonb_typeof(c.messages) = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM messages m WHERE m."conversationId" = c.id
  )
ON CONFLICT DO NOTHING;

-- Make botId NOT NULL
ALTER TABLE conversations 
  ALTER COLUMN "botId" SET NOT NULL;

-- Step 6: Remove old foreign keys and columns
-- Drop old siteId foreign keys
ALTER TABLE documents DROP CONSTRAINT IF EXISTS "documents_siteid_fkey";
ALTER TABLE qa_pairs DROP CONSTRAINT IF EXISTS "qa_pairs_siteid_fkey";
ALTER TABLE vectors DROP CONSTRAINT IF EXISTS "vectors_siteid_fkey";
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS "conversations_siteid_fkey";

-- Drop old siteId columns
ALTER TABLE documents DROP COLUMN IF EXISTS "siteId";
ALTER TABLE qa_pairs DROP COLUMN IF EXISTS "siteId";
ALTER TABLE vectors DROP COLUMN IF EXISTS "siteId";
ALTER TABLE conversations DROP COLUMN IF EXISTS "siteId";

-- Drop old messages JSON column from conversations
ALTER TABLE conversations DROP COLUMN IF EXISTS messages;

-- Step 7: Add proper foreign keys
ALTER TABLE documents 
  ADD CONSTRAINT "documents_botId_fkey" 
  FOREIGN KEY ("botId") REFERENCES bots(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE qa_pairs 
  ADD CONSTRAINT "qa_pairs_botId_fkey" 
  FOREIGN KEY ("botId") REFERENCES bots(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE vectors 
  ADD CONSTRAINT "vectors_botId_fkey" 
  FOREIGN KEY ("botId") REFERENCES bots(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE vectors 
  ADD CONSTRAINT "vectors_documentId_fkey" 
  FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE conversations 
  ADD CONSTRAINT "conversations_botId_fkey" 
  FOREIGN KEY ("botId") REFERENCES bots(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS "documents_botId_idx" ON documents("botId");
CREATE INDEX IF NOT EXISTS "documents_ingestionStatus_idx" ON documents("ingestionStatus");
CREATE INDEX IF NOT EXISTS "documents_sourceType_idx" ON documents("sourceType");

CREATE INDEX IF NOT EXISTS "qa_pairs_botId_idx" ON qa_pairs("botId");
CREATE INDEX IF NOT EXISTS "qa_pairs_status_idx" ON qa_pairs("status");

CREATE INDEX IF NOT EXISTS "vectors_botId_idx" ON vectors("botId");
CREATE INDEX IF NOT EXISTS "vectors_documentId_idx" ON vectors("documentId");

CREATE INDEX IF NOT EXISTS "conversations_botId_idx" ON conversations("botId");
CREATE INDEX IF NOT EXISTS "conversations_visitorId_idx" ON conversations("visitorId");
CREATE INDEX IF NOT EXISTS "conversations_userId_idx" ON conversations("userId");
CREATE INDEX IF NOT EXISTS "conversations_createdAt_idx" ON conversations("createdAt");

CREATE INDEX IF NOT EXISTS "messages_conversationId_idx" ON messages("conversationId");
CREATE INDEX IF NOT EXISTS "messages_createdAt_idx" ON messages("createdAt");
CREATE INDEX IF NOT EXISTS "messages_role_idx" ON messages("role");

-- Step 9: Create HNSW index for vector similarity search
DROP INDEX IF EXISTS vectors_embedding_hnsw;
CREATE INDEX vectors_embedding_hnsw ON vectors 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Step 10: Clean up old Site relations (remove from Site model)
-- These are handled by Bot relations now, so we don't need them on Site

