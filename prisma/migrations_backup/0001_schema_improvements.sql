-- ============================================
-- Database Schema Improvements Migration
-- Run this after updating Prisma schema
-- ============================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add missing columns to existing tables

-- Sites table improvements
ALTER TABLE sites 
  ADD COLUMN IF NOT EXISTS "welcomeMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS "domain" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "scriptEmbedId" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}';

-- Documents table improvements
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS "fileType" TEXT,
  ADD COLUMN IF NOT EXISTS "fileSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

-- QAPairs table improvements
ALTER TABLE qa_pairs
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';

-- Conversations table improvements
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS "userId" TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "title" TEXT;

-- Vectors table improvements
-- Add embedding column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vectors' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE vectors ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Add botId to vectors (for RLS scoping)
-- Note: This assumes Site = Bot for now. Update after Bot migration.
ALTER TABLE vectors ADD COLUMN IF NOT EXISTS "botId" TEXT;

-- Step 3: Create new tables

-- Bots table
CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId" TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "welcomeMessage" TEXT,
  provider TEXT DEFAULT 'openai',
  "openaiApiKeyEncrypted" TEXT,
  status TEXT DEFAULT 'active',
  "widgetSettings" JSONB DEFAULT '{}',
  "scriptEmbedId" TEXT UNIQUE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bots_siteId ON bots("siteId");
CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
CREATE INDEX IF NOT EXISTS idx_bots_scriptEmbedId ON bots("scriptEmbedId");

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER,
  "latencyMs" INTEGER,
  metadata JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages("createdAt");
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- ApiKeys table (optional)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "botId" TEXT REFERENCES bots(id) ON DELETE CASCADE,
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT DEFAULT 'openai',
  "encryptedKey" TEXT NOT NULL,
  valid BOOLEAN DEFAULT true,
  "lastTestedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_botId ON api_keys("botId");
CREATE INDEX IF NOT EXISTS idx_api_keys_userId ON api_keys("userId");
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);

-- Step 4: Add indexes to existing tables

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sites_userId ON sites("userId");
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_documents_botId ON documents("botId");
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents("ingestionStatus");
CREATE INDEX IF NOT EXISTS idx_documents_sourceType ON documents("sourceType");
CREATE INDEX IF NOT EXISTS idx_qa_pairs_botId ON qa_pairs("botId");
CREATE INDEX IF NOT EXISTS idx_qa_pairs_status ON qa_pairs(status);
CREATE INDEX IF NOT EXISTS idx_vectors_botId ON vectors("botId");
CREATE INDEX IF NOT EXISTS idx_vectors_documentId ON vectors("documentId");
CREATE INDEX IF NOT EXISTS idx_conversations_botId ON conversations("botId");
CREATE INDEX IF NOT EXISTS idx_conversations_visitorId ON conversations("visitorId");
CREATE INDEX IF NOT EXISTS idx_conversations_userId ON conversations("userId");
CREATE INDEX IF NOT EXISTS idx_conversations_createdAt ON conversations("createdAt");

-- Step 5: Create vector similarity search index
-- Note: IVFFlat requires at least 1000 rows for optimal performance
-- For smaller datasets, consider HNSW instead

-- Check row count first
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM vectors;
  
  IF row_count >= 1000 THEN
    -- Create IVFFlat index
    CREATE INDEX IF NOT EXISTS vectors_embedding_ivfflat 
    ON vectors 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);
    
    RAISE NOTICE 'Created IVFFlat index (row count: %)', row_count;
  ELSE
    -- For smaller datasets, use HNSW or wait for more data
    RAISE NOTICE 'Skipping IVFFlat index - need at least 1000 rows (current: %). Consider HNSW for smaller datasets.', row_count;
    
    -- Alternative: HNSW index (works with any dataset size)
    CREATE INDEX IF NOT EXISTS vectors_embedding_hnsw
    ON vectors
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
    
    RAISE NOTICE 'Created HNSW index instead';
  END IF;
END $$;

-- Analyze tables for query planner
ANALYZE vectors;
ANALYZE bots;
ANALYZE documents;
ANALYZE conversations;
ANALYZE messages;

-- Step 6: Data migration (if migrating from Site to Bot)
-- Uncomment and run if migrating existing Site data to Bot model

/*
-- Migrate Site data to Bot (if using Option B from analysis)
INSERT INTO bots ("siteId", name, "welcomeMessage", "openaiApiKeyEncrypted", "widgetSettings", status, "createdAt", "updatedAt")
SELECT 
  id as "siteId",
  name,
  "welcomeMessage",
  "apiKeyEncrypted",
  COALESCE("widgetSettings", '{}'),
  COALESCE("status", 'active'),
  "createdAt",
  "updatedAt"
FROM sites
ON CONFLICT DO NOTHING;

-- Update vectors to reference bots
UPDATE vectors v
SET "botId" = (
  SELECT b.id FROM bots b 
  WHERE b."siteId" = v."siteId"
)
WHERE "botId" IS NULL AND EXISTS (
  SELECT 1 FROM bots b WHERE b."siteId" = v."siteId"
);

-- Migrate Conversation.messages JSON to Message table
INSERT INTO messages ("conversationId", role, content, "createdAt")
SELECT 
  c.id as "conversationId",
  (msg->>'role')::text as role,
  (msg->>'content')::text as content,
  COALESCE(
    (msg->>'timestamp')::timestamp,
    (msg->>'createdAt')::timestamp,
    c."createdAt"
  ) as "createdAt"
FROM conversations c,
LATERAL jsonb_array_elements(c.messages) AS msg
WHERE c.messages IS NOT NULL
ON CONFLICT DO NOTHING;
*/

-- Step 7: Enable Row Level Security (optional - uncomment if using Supabase RLS)
/*
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_pairs ENABLE ROW LEVEL SECURITY;

-- Site policies
CREATE POLICY "Users can view own sites"
  ON sites FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create own sites"
  ON sites FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own sites"
  ON sites FOR UPDATE
  USING (auth.uid()::text = "userId");

-- Bot policies
CREATE POLICY "Users can view bots in own sites"
  ON bots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites 
      WHERE sites.id = bots."siteId" 
      AND sites."userId" = auth.uid()::text
    )
  );

CREATE POLICY "Users can create bots in own sites"
  ON bots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites 
      WHERE sites.id = bots."siteId" 
      AND sites."userId" = auth.uid()::text
    )
  );

-- Document policies
CREATE POLICY "Users can view documents in own bots"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bots
      JOIN sites ON sites.id = bots."siteId"
      WHERE bots.id = documents."botId"
      AND sites."userId" = auth.uid()::text
    )
  );

-- Vector policies
CREATE POLICY "Users can view vectors in own bots"
  ON vectors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bots
      JOIN sites ON sites.id = bots."siteId"
      WHERE bots.id = vectors."botId"
      AND sites."userId" = auth.uid()::text
    )
  );

-- Conversation policies (public read for widget, but scoped)
CREATE POLICY "Conversations are scoped to bot"
  ON conversations FOR SELECT
  USING (true);

CREATE POLICY "Bot owners can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bots
      JOIN sites ON sites.id = bots."siteId"
      WHERE bots.id = conversations."botId"
      AND sites."userId" = auth.uid()::text
    )
  );
*/

-- Migration complete!
SELECT 'Schema improvements migration completed successfully!' AS status;

