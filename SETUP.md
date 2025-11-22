# AmanaRAG Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. Supabase account and project
3. OpenAI API key (for testing, users will provide their own)

## Step 1: Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Encryption (32+ character random string)
ENCRYPTION_KEY="your-32-character-encryption-key-here"

# OpenAI (optional, for testing)
OPENAI_API_KEY="your-openai-api-key"
```

## Step 2: Supabase Setup

### 2.1 Enable pgvector Extension

In your Supabase SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2.2 Create Storage Bucket

1. Go to Storage in Supabase dashboard
2. Create a new bucket named `documents`
3. Set it to public (or configure RLS policies)

### 2.3 Update Database Schema

The Prisma schema defines the database structure, but you need to manually add the `embedding` column to the `vectors` table since Prisma doesn't support pgvector directly.

After running `npm run db:push`, execute this SQL in Supabase:

```sql
-- Add embedding column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vectors' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE vectors ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS vectors_embedding_idx ON vectors 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Database Migration

```bash
npm run db:push
```

This will create all tables except the `embedding` column (which you added manually above).

## Step 5: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 6: First User Setup

1. Register a new account at `/register`
2. Login at `/login`
3. Go to `/api-key` and enter your OpenAI API key
4. Upload documents at `/upload`
5. Get your widget script at `/widget`

## Troubleshooting

### pgvector Issues

If you encounter errors with vector operations:
- Ensure pgvector extension is enabled: `CREATE EXTENSION vector;`
- Verify the embedding column exists: `\d vectors` in psql
- Check the column type: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vectors';`

### Supabase Storage

If file uploads fail:
- Verify the `documents` bucket exists
- Check bucket permissions (should be public or have proper RLS)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct

### API Key Encryption

If API key encryption fails:
- Ensure `ENCRYPTION_KEY` is set and is at least 32 characters
- The key should be a random string (use `openssl rand -hex 32`)

## Production Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add all environment variables
4. Deploy

### Database

- Use Supabase production database
- Ensure pgvector is enabled in production
- Run the same SQL setup as in Step 2.3

### Environment Variables

Make sure all environment variables are set in Vercel dashboard under Project Settings > Environment Variables.

