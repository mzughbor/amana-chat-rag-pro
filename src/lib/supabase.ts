                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  import { createClient } from "@supabase/supabase-js";

// Lazy initialization of Supabase clients
let _supabase: ReturnType<typeof createClient> | null = null;
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (_supabase) return _supabase;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  // During build process, we can't connect to Supabase, so we return a dummy client
  // This is safe because we only use the client during runtime, not build time
  if (process.env.NEXT_PHASE === 'phase-production-build' && !supabaseUrl) {
    console.warn("⚠️  NEXT_PUBLIC_SUPABASE_URL not set during build phase - returning dummy client");
    // Return a properly typed dummy client that won't cause TypeScript errors
    const dummyClient: any = {
      auth: {
        signUp: (credentials: any) => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: (credentials: any) => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    };
    return dummyClient;
  }
  
  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set in environment variables.");
  }
  
  if (!supabaseAnonKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables.");
  }
  
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

export function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  
  // During build process, we can't connect to Supabase, so we return a dummy client
  // This is safe because we only use the client during runtime, not build time
  if (process.env.NEXT_PHASE === 'phase-production-build' && !supabaseUrl) {
    console.warn("⚠️  NEXT_PUBLIC_SUPABASE_URL not set during build phase - returning dummy admin client");
    // Return a properly typed dummy client that won't cause TypeScript errors
    const dummyClient: any = {
      auth: {
        signUp: (credentials: any) => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: (credentials: any) => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    };
    return dummyClient;
  }
  
  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set in environment variables.");
  }
  
  if (!supabaseServiceRoleKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.");
  }
  
  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _supabaseAdmin;
}

// Export getter functions instead of direct clients
export const supabase = getSupabase();
export const supabaseAdmin = getSupabaseAdmin();