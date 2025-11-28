// Fallback client for Supabase REST API when direct database connection fails
import { SupabaseClient, createClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase REST client
let _supabaseRestClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseRestClient() {
  if (_supabaseRestClient) return _supabaseRestClient;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  // During build process, we can't connect to Supabase, so we return a dummy client
  // This is safe because we only use the client during runtime, not build time
  if (process.env.NEXT_PHASE === 'phase-production-build' && !supabaseUrl) {
    console.warn("⚠️  NEXT_PUBLIC_SUPABASE_URL not set during build phase - returning dummy REST client");
    return createClient("", "") as ReturnType<typeof createClient>;
  }
  
  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set in environment variables.");
  }
  
  if (!supabaseServiceRoleKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.");
  }
  
  _supabaseRestClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  return _supabaseRestClient;
}

// Export getter function instead of direct client
export const supabaseRestClient = getSupabaseRestClient();

// Fallback functions for database operations
export async function getSitesByUserEmail(email: string) {
  try {
    // First get the user ID by email
    const { data: users, error: userError } = await getSupabaseRestClient()
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) throw userError;
    if (!users) throw new Error('User not found');

    // Then get sites for that user
    const { data: sites, error: siteError } = await getSupabaseRestClient()
      .from('sites')
      .select('id, name, createdAt, widgetSettings')
      .eq('userId', users.id)
      .order('createdAt', { ascending: false });

    if (siteError) throw siteError;
    
    return sites || [];
  } catch (error) {
    console.error('Error fetching sites via REST API:', error);
    throw error;
  }
}

export async function getSiteByUserId(userId: string) {
  try {
    const { data: sites, error: siteError } = await getSupabaseRestClient()
      .from('sites')
      .select('id, name, userId, bots(id, name, welcomeMessage, widgetSettings, scriptEmbedId)')
      .eq('userId', userId)
      .limit(1)
      .single();

    if (siteError) throw siteError;
    
    return sites || null;
  } catch (error) {
    console.error('Error fetching site by user ID via REST API:', error);
    throw error;
  }
}

export async function createSite(userId: string, name: string, widgetSettings: any = {}) {
  try {
    const { data, error } = await getSupabaseRestClient()
      .from('sites')
      .insert({
        userId,
        name,
        widgetSettings,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating site via REST API:', error);
    throw error;
  }
}

export async function updateWidgetSettings(siteId: string, widgetSettings: any) {
  try {
    const { data, error } = await getSupabaseRestClient()
      .from('sites')
      .update({ widgetSettings })
      .eq('id', siteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating widget settings via REST API:', error);
    throw error;
  }
}

export async function getSiteById(siteId: string) {
  try {
    const { data, error } = await getSupabaseRestClient()
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching site via REST API:', error);
    throw error;
  }
}