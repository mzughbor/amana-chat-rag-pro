-- ============================================
-- Migration: Refactor to Site + Bot Model
-- User → Site (1:many) → Bot (1:1)
-- ============================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Create bots table
CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId" TEXT UNIQUE NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
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

-- Step 3: Create messages table
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

-- Step 4: Add missing columns to sites table
ALTER TABLE sites 
  ADD COLUMN IF NOT EXISTS "domain" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "settings" JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites("domain");

-- Step 5: Add missing columns to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS "fileType" TEXT,
  ADD COLUMN IF NOT EXISTS "fileSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "botId" TEXT;

-- Step 6: Add missing columns to qa_pairs table
ALTER TABLE qa_pairs
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "botId" TEXT;

CREATE INDEX IF NOT EXISTS idx_qa_pairs_status ON qa_pairs(status);
CREATE INDEX IF NOT EXISTS idx_qa_pairs_botId ON qa_pairs("botId");

-- Step 7: Add missing columns to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS "userId" TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "botId" TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_userId ON conversations("userId");
CREATE INDEX IF NOT EXISTS idx_conversations_botId ON conversations("botId");

-- Step 8: Add missing columns to vectors table
ALTER TABLE vectors
  ADD COLUMN IF NOT EXISTS "botId" TEXT,
  ADD COLUMN IF NOT EXISTS "chunkId" INTEGER DEFAULT 0;

-- Step 9: Add embedding column to vectors (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vectors' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE vectors ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Step 10: Migrate existing Site data to Bot
-- Create a bot for each existing site
INSERT INTO bots ("siteId", name, "welcomeMessage", "openaiApiKeyEncrypted", "widgetSettings", status, "createdAt", "updatedAt")
SELECT 
  id as "siteId",
  name,
  NULL as "welcomeMessage", -- Will be populated from application
  "apiKeyEncrypted",
  COALESCE("widgetSettings", '{}'),
  'active' as status,
  "createdAt",
  "updatedAt"
FROM sites
ON CONFLICT ("siteId") DO NOTHING;

-- Step 11: Update documents to reference bots
UPDATE documents d
SET "botId" = (
  SELECT b.id FROM bots b 
  WHERE b."siteId" = d."siteId"
)
WHERE "botId" IS NULL AND EXISTS (
  SELECT 1 FROM bots b WHERE b."siteId" = d."siteId"
);

-- Step 12: Update qa_pairs to reference bots
UPDATE qa_pairs q
SET "botId" = (
  SELECT b.id FROM bots b 
  WHERE b."siteId" = q."siteId"
)
WHERE "botId" IS NULL AND EXISTS (
  SELECT 1 FROM bots b WHERE b."siteId" = q."siteId"
);

-- Step 13: Update conversations to reference bots
UPDATE conversations c
SET "botId" = (
  SELECT b.id FROM bots b 
  WHERE b."siteId" = c."siteId"
)
WHERE "botId" IS NULL AND EXISTS (
  SELECT 1 FROM bots b WHERE b."siteId" = c."siteId"
);

-- Step 14: Update vectors to reference bots
UPDATE vectors v
SET "botId" = (
  SELECT b.id FROM bots b 
  WHERE b."siteId" = v."siteId"
)
WHERE "botId" IS NULL AND EXISTS (
  SELECT 1 FROM bots b WHERE b."siteId" = v."siteId"
);

-- Step 15: Migrate Conversation.messages JSON to Message table
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
WHERE c.messages IS NOT NULL AND jsonb_typeof(c.messages) = 'array'
ON CONFLICT DO NOTHING;

-- Step 16: Add foreign key constraints
-- Note: These may fail if data doesn't match, adjust as needed

-- Documents botId foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'documents_botId_fkey'
  ) THEN
    ALTER TABLE documents 
    ADD CONSTRAINT documents_botId_fkey 
    FOREIGN KEY ("botId") REFERENCES bots(id) ON DELETE CASCADE;
  END IF;
END $$;

-- QAPairs botId foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'qa_pairs_botId_fkey'
  ) THEN
    ALTER TABLE qa_pairs 
    ADD CONSTRAINT qa_pairs_botId_fkey 
    FOREIGN KEY ("botId") REFERENCES bots(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Conversations botId foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversations_botId_fkey'
  ) THEN
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_botId_fkey 
    FOREIGN KEY ("botId") REFERENCES bots(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Vectors botId foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vectors_botId_fkey'
  ) THEN
    ALTER TABLE vectors 
    ADD CONSTRAINT vectors_botId_fkey 
    FOREIGN KEY ("botId") REFERENCES bots(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 17: Create vector similarity search index
-- Use HNSW for better performance (works with any dataset size)
CREATE INDEX IF NOT EXISTS vectors_embedding_hnsw
ON vectors
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat (requires 1000+ rows)
-- CREATE INDEX IF NOT EXISTS vectors_embedding_ivfflat 
-- ON vectors 
-- USING ivfflat (embedding vector_cosine_ops) 
-- WITH (lists = 100);

-- Step 18: Update indexes
CREATE INDEX IF NOT EXISTS idx_documents_botId ON documents("botId");
CREATE INDEX IF NOT EXISTS idx_vectors_botId ON vectors("botId");

-- Step 19: Analyze tables for query planner
ANALYZE bots;
ANALYZE documents;
ANALYZE vectors;
ANALYZE conversations;
ANALYZE messages;

-- Migration complete!
SELECT 'Site + Bot model migration completed successfully!' AS status;

