# Environment Variables Check

## Current Error
`supabaseKey is required` - This means your Supabase environment variables are not set.

## Required Environment Variables

Make sure your `.env` file in the root directory has these variables:

```env
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Encryption
ENCRYPTION_KEY=your-32-character-key-here
```

## How to Get Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## After Adding Variables

1. **Restart your dev server**:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

2. **Clear browser cache** or do a hard refresh (Ctrl+Shift+R)

## Important Notes

- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Never commit your `.env` file to git (it's in `.gitignore`)
- The `SUPABASE_SERVICE_ROLE_KEY` should NEVER be exposed to the client
- Make sure there are **NO QUOTES** around values in `.env`

## Quick Check

Run this to verify your variables are loaded:
```bash
node -e "console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING'); console.log('KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');"
```

If it says "MISSING", your `.env` file is not being loaded properly.

