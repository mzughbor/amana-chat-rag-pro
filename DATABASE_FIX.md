# Fix Database Connection Error

## The Error
```
Authentication failed against database server at `aws-1-eu-north-1.pooler.supabase.com`, 
the provided database credentials for `postgres` are not valid.
```

This means your `DATABASE_URL` in `.env` is incorrect.

## Quick Fix Steps

### 1. Get Your Correct Database Connection String

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Click on **Connection pooling** tab
6. Select **Session mode** (not Transaction mode)
7. Copy the **URI** format connection string

It should look like:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 2. Update Your .env File

Open your `.env` file and update the `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Important:**
- Replace `xxxxx` with your actual project reference ID
- Replace `YOUR_PASSWORD` with your actual database password
- **NO QUOTES** around the value
- Make sure there are no spaces

### 3. If You Don't Know Your Database Password

1. In Supabase Dashboard → **Settings** → **Database**
2. Scroll to **Database password** section
3. If you see "Reset database password", click it
4. Copy the new password (or set a new one you'll remember)
5. Use this password in your `DATABASE_URL`

### 4. Special Characters in Password

If your password contains special characters like `@`, `#`, `%`, `&`, `?`, you need to **URL encode** them:

- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`
- `?` → `%3F`
- `/` → `%2F`
- `:` → `%3A`

**OR** better yet: **change your password to one without special characters** (letters, numbers, and dashes only).

### 5. Restart Your Dev Server

After updating `.env`:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### 6. Test the Connection

Try logging in again. If it still fails, check:

1. **Password is correct** - no typos
2. **No quotes** around DATABASE_URL value
3. **No spaces** around the `=` sign
4. **Project reference ID** is correct (the part after `postgres.`)
5. **Region matches** - your error shows `aws-1-eu-north-1`, make sure your connection string uses the same region

### 7. Alternative: Use Direct Connection (Not Recommended)

If the pooler connection doesn't work, you can try the direct connection:

1. In Supabase Dashboard → **Settings** → **Database**
2. Click **Connection string** tab (not Connection pooling)
3. Select **URI** format
4. Copy and use that (port 5432 instead of 6543)

But the pooler connection (port 6543) is recommended for Prisma.

## Example .env File

```env
# Database - Connection Pooling (Recommended)
DATABASE_URL=postgresql://postgres.abcdefghijklmnop:mypassword123@aws-0-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Encryption
ENCRYPTION_KEY=your-32-character-key-here
```

## Still Not Working?

1. Double-check your password in Supabase Dashboard
2. Make sure you're using the **pooler connection** (port 6543) with `?pgbouncer=true`
3. Verify your project reference ID is correct
4. Check that the region in the URL matches your Supabase project region
5. Try resetting your database password and using the new one

