# Login Troubleshooting Guide

## Common Issues and Solutions

### 1. "Invalid email or password" Error

**Most Common Causes:**

#### A. Email Not Verified (Most Likely!)
Supabase requires email verification by default. If you just registered:

1. **Check your email inbox** (and spam folder) for a verification email from Supabase
2. **Click the verification link** in the email
3. **Then try logging in again**

#### B. User Doesn't Exist in Supabase
If you registered but the account wasn't created:

1. Try registering again
2. Check the browser console for any errors during registration
3. Make sure Supabase environment variables are set correctly

#### C. Wrong Password
- Make sure you're using the exact password you set during registration
- Check for typos or extra spaces
- Try resetting your password (if password reset is set up)

### 2. How to Check if Your Email is Verified

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Users**
4. Find your email address
5. Check the **Email Confirmed** column

### 3. Disable Email Verification (For Development Only)

If you want to disable email verification for testing:

1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Under **Email Auth**, find **Enable email confirmations**
3. **Turn it OFF** (only for development!)
4. **Save changes**

⚠️ **Warning:** Only disable this in development. Always require email verification in production!

### 4. Reset Your Password

If you forgot your password:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find your user
3. Click the three dots (⋯) → **Reset password**
4. Or use the password reset flow (if implemented)

### 5. Check Server Logs

The improved error handling will now show more specific error messages. Check:

1. **Browser console** (F12) for client-side errors
2. **Terminal/Server logs** for server-side errors
3. Look for messages like:
   - "Email not confirmed"
   - "Invalid login credentials"
   - "User not found"

### 6. Verify Supabase Configuration

Make sure your `.env` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

And that you've **restarted the dev server** after adding them.

### 7. Test Direct Supabase Login

You can test if Supabase authentication works directly:

1. Go to your Supabase project dashboard
2. **Authentication** → **Users** → **Add user**
3. Create a test user manually
4. Try logging in with that user

If that works, the issue is with the registration flow. If it doesn't, check your Supabase project settings.

## Quick Fix Checklist

- [ ] Checked email inbox (and spam) for verification link
- [ ] Clicked verification link in email
- [ ] Verified Supabase environment variables are set
- [ ] Restarted dev server after setting env variables
- [ ] Checked browser console for errors
- [ ] Checked server terminal for errors
- [ ] Verified user exists in Supabase Dashboard
- [ ] Verified email is confirmed in Supabase Dashboard
- [ ] Tried registering a new account
- [ ] Checked Supabase Auth settings

## Still Having Issues?

1. Check the **browser console** (F12) for detailed error messages
2. Check the **server terminal** for backend errors
3. The error messages should now be more specific and helpful

