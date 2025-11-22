# PDF Upload Troubleshooting

## The Error
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
POST http://localhost:3000/api/content/upload 500 (Internal Server Error)
```

This means the server is returning an HTML error page instead of JSON. Check the **server terminal** for the actual error.

## Common Issues & Fixes

### 1. Vectors Table Missing Embedding Column

**Most Likely Issue!** The `vectors` table exists but doesn't have the `embedding` column yet.

**Fix:**
1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Check if embedding column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vectors' AND column_name = 'embedding';

-- If it doesn't exist, add it:
ALTER TABLE vectors ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS vectors_embedding_idx ON vectors 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 2. Supabase Storage Bucket Doesn't Exist

**Error:** "Bucket not found" or "Storage upload failed"

**Fix:**
1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name it: `documents`
4. Make it **Public** (or configure RLS policies)
5. Click "Create bucket"

### 3. Check Server Terminal for Actual Error

The browser shows a generic error, but the **real error** is in your terminal where `npm run dev` is running.

Look for lines like:
```
Error: ...
Upload error: ...
```

### 4. Database Tables Not Created

If tables don't exist:

```bash
npm run db:push
```

Then add the embedding column manually (see #1 above).

### 5. OpenAI API Key Issues

**Error:** "Embedding generation failed" or "Invalid API key"

- Make sure you've set your API key in `/api-key` page
- Verify the key is valid
- Check if you have credits/quota

### 6. PDF Processing Issues

**Error:** "PDF processing failed" or "No text could be extracted"

- Make sure the PDF has selectable text (not just images)
- Try a different PDF file
- Check file size (max 10MB)

## Step-by-Step Debugging

1. **Check server terminal** - Look for the actual error message
2. **Verify database setup:**
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM vectors LIMIT 1;
   ```
   If this fails, the table structure is wrong.

3. **Verify storage bucket:**
   - Go to Supabase Dashboard → Storage
   - Check if `documents` bucket exists

4. **Test API key:**
   - Go to `/api-key` page
   - Try saving your API key again
   - Make sure it validates successfully

5. **Check environment variables:**
   - `ENCRYPTION_KEY` is set
   - `SUPABASE_SERVICE_ROLE_KEY` is set
   - All Supabase keys are correct

## Quick Test

After fixing issues, try uploading a small PDF again. The improved error handling should now show you the specific error message instead of the generic HTML error.

## Still Not Working?

Share the **exact error message from your server terminal** (not the browser console) - that will show what's actually failing.

