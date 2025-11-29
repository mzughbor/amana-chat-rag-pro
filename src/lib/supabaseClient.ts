"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Client-side Supabase client
 * This should only be used in client components ("use client")
 * Uses NEXT_PUBLIC_ prefixed environment variables that are available in the browser
 */
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
      "Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Export a singleton instance for client components
export const supabaseClient = createSupabaseClient();

